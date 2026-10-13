import { isRemotePath, resolvePath, toFetchableUrl } from "./filesystem";

/** Thumbnails for remote PDFs are written here so they can be served statically. */
const REMOTE_THUMBNAIL_DIRECTORY = "public/_thumbnails";

/** Derive a safe, readable file stem from a remote URL. */
function remoteFileStem(url: string) {
  const last =
    url
      .split("/")
      .at(-1)
      ?.replace(/[?#].*/, "") ?? "";
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {}

  return (
    name
      .replace(/\.pdf$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

async function fetchRemotePDF(url: string) {
  const remote = await fetch(toFetchableUrl(url)).catch(() => undefined);

  if (!remote?.ok) {
    console.warn(
      `[PDF Thumbnailer] Could not fetch remote PDF ${url}${remote ? `: ${remote.status} - ${remote.statusText}` : ""}`,
    );
    return;
  }

  return Buffer.from(await remote.arrayBuffer());
}

/**
 * Astro copies `public/` into the output directory before pages render, so a
 * thumbnail generated during a build would otherwise only appear on the next
 * build. Mirror it straight into the output directory as well.
 */
async function publishToOutDir(thumbPath: string) {
  if (!import.meta.env.PROD) return;

  const [fs, path, { fileURLToPath }, config] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("node:url"),
    import("astro:config/server").catch(() => undefined),
  ]);
  if (!config?.outDir) return;

  const relative = thumbPath.replace(/^\/?public\//, "");
  const target = path.join(fileURLToPath(config.outDir), relative);

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(thumbPath, target);
  } catch (e) {
    console.warn(
      `[PDF Thumbnailer] Could not copy ${thumbPath} to ${target}`,
      e,
    );
  }
}

export async function getPDFThumbnail(file: string, pageNum = 0, res = 512) {
  if (ENV_BOOKSHOP_LIVE) return;

  const [fs, path, pdf, sharp, crypto] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("mupdf"),
    import("sharp"),
    import("crypto"),
  ]);

  const remote = isRemotePath(file);
  const filePath = remote ? undefined : await resolvePath(file);
  if (!remote && !filePath) return;

  const hash = crypto.createHash("md5");
  hash.update(`${file}${pageNum}${res}`, "utf-8");
  const digest = hash.digest("hex").slice(0, 6);

  const thumbPath = remote
    ? path.join(
        REMOTE_THUMBNAIL_DIRECTORY,
        `${remoteFileStem(file)}.${digest}.webp`,
      )
    : `${filePath}.${digest}.webp`;

  if (fs.existsSync(thumbPath)) return thumbPath;
  const time = performance.now();

  const data = remote ? await fetchRemotePDF(file) : fs.readFileSync(filePath!);
  if (!data) return;

  const doc = pdf.PDFDocument.openDocument(data, "application/pdf");

  const page = doc.loadPage(pageNum);

  const [, , bound_w, bound_h] = page.getBounds();
  const [scale_w, scale_h] = [res / bound_w, res / bound_h];
  const scale = Math.min(scale_w, scale_h);

  let pixmap = page.toPixmap(
    pdf.Matrix.scale(scale, scale),
    pdf.ColorSpace.DeviceRGB,
    false,
    true,
  );

  fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
  await sharp.default(pixmap.asPNG()).webp({ quality: 60 }).toFile(thumbPath);
  await publishToOutDir(thumbPath);

  console.log(
    `[PDF Thumbnailer] Generated ${thumbPath} in ${(performance.now() - time).toFixed(0)}ms`,
  );

  return thumbPath;
}
