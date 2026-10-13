import { z } from "astro/zod";
import {
  REMOTE_DEFAULT_TTL,
  downloadRemoteFile,
  getCacheFile,
  getPublicDir,
  getRemoteFileInfo,
  isRemotePath,
  resolvePath,
  setCacheFile,
} from "./filesystem";

/** Thumbnails for remote PDFs are written here (inside `publicDir`) so they can be served statically. */
const REMOTE_THUMBNAIL_DIRECTORY = "_thumbnails";

/** Records which version of a remote PDF a thumbnail was generated from. */
const thumbnailSourceSchema = z.object({
  url: z.string(),
  version: z.string().nullish(),
  generated: z.coerce.number().min(0),
  /** The download wasn't a PDF, so don't retry until the file changes. */
  invalid: z.boolean().optional(),
});

/** How long a thumbnail result is reused in-process (a build, or a dev server session). */
const THUMBNAIL_MEMO_TTL = 5 * 60 * 1000;

/** Thumbnail jobs, so pages sharing a PDF don't each check or render it. */
const thumbnailJobs = new Map<
  string,
  { at: number; job: Promise<string | undefined> }
>();

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

/**
 * Astro copies `publicDir` into the build output before pages render, so a
 * thumbnail generated during a build would otherwise only appear on the next
 * build. Mirror it straight into the client output directory as well.
 */
async function publishToOutDir(publicPath: string, thumbPath: string) {
  if (!import.meta.env.PROD) return;

  const [fs, path, { fileURLToPath }, config] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("node:url"),
    import("astro:config/server").catch(() => undefined),
  ]);
  if (!config?.outDir) return;

  // Static files are served from `build.client` for server output (and some
  // adapters), otherwise from `outDir`. Astro empties `outDir` and runs the
  // client build before pages render, so `build.client` only exists when it's
  // the served directory.
  const client = config.build?.client && fileURLToPath(config.build.client);
  const outDir =
    client && fs.existsSync(client) ? client : fileURLToPath(config.outDir);
  const target = path.join(outDir, publicPath);

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

/** PDFs must start with `%PDF-`, though readers allow leading junk within the first 1KB. */
function isPDF(data: Buffer) {
  return data.subarray(0, 1024).includes("%PDF-");
}

/**
 * Returns the site path (e.g. `/_thumbnails/brochure.abc123.webp`) of a webp
 * thumbnail of the given page of a local or remote PDF.
 */
export function getPDFThumbnail(file: string, pageNum = 0, res = 512) {
  if (ENV_BOOKSHOP_LIVE) return Promise.resolve(undefined);

  const key = `${pageNum}:${res}:${file}`;
  const memo = thumbnailJobs.get(key);
  if (memo && Date.now() - memo.at < THUMBNAIL_MEMO_TTL) return memo.job;

  const job = generatePDFThumbnail(file, pageNum, res).catch((e) => {
    console.warn(
      `[PDF Thumbnailer] Could not generate thumbnail for ${file}`,
      e,
    );
    return undefined;
  });
  thumbnailJobs.set(key, { at: Date.now(), job });
  return job;
}

async function generatePDFThumbnail(file: string, pageNum: number, res: number) {
  const [fs, path, pdf, sharp, crypto] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("mupdf"),
    import("sharp"),
    import("crypto"),
  ]);

  const publicDir = await getPublicDir();
  const remote = isRemotePath(file);
  const filePath = remote ? undefined : await resolvePath(file);
  if (!remote && !filePath) return;

  const hash = crypto.createHash("md5");
  hash.update(`${file}${pageNum}${res}`, "utf-8");
  const digest = hash.digest("hex").slice(0, 6);

  const thumbPath = remote
    ? path.join(
        publicDir,
        REMOTE_THUMBNAIL_DIRECTORY,
        `${remoteFileStem(file)}.${digest}.webp`,
      )
    : `${filePath}.${digest}.webp`;

  const publicPath = path.relative(publicDir, thumbPath);
  if (publicPath.startsWith("..") || path.isAbsolute(publicPath)) {
    console.warn(
      `[PDF Thumbnailer] ${file} is outside ${publicDir}, so its thumbnail can't be served.`,
    );
    return;
  }
  const src = `/${publicPath.split(path.sep).join("/")}`;
  const exists = fs.existsSync(thumbPath);

  let data: Buffer;
  let source: z.infer<typeof thumbnailSourceSchema> | undefined;
  const sourceCacheFile = `thumbnail.${path.basename(thumbPath)}.json`;

  if (remote) {
    const info = await getRemoteFileInfo(file);
    // Keep serving the last thumbnail if the remote is unreachable.
    if (!info) return exists ? src : undefined;

    const prior = await getCacheFile(
      sourceCacheFile,
      thumbnailSourceSchema,
    ).catch(() => undefined);
    const current = info.version
      ? prior?.version === info.version
      : prior && Date.now() - prior.generated < REMOTE_DEFAULT_TTL;
    // Keep serving the last good thumbnail if the file stops being a PDF.
    if (current && prior?.invalid) return exists ? src : undefined;
    if (current && exists) return src;

    const download = await downloadRemoteFile(file);
    if (!download) return exists ? src : undefined;
    if (!isPDF(download.data)) {
      console.warn(
        `[PDF Thumbnailer] ${file} is not a PDF (Content-Type: ${download.contentType ?? "none"})`,
      );
      await setCacheFile(sourceCacheFile, {
        url: file,
        version: info.version,
        generated: Date.now(),
        invalid: true,
      });
      return exists ? src : undefined;
    }

    data = download.data;
    source = { url: file, version: info.version, generated: Date.now() };
  } else {
    if (exists) return src;
    data = fs.readFileSync(filePath!);
  }

  const time = performance.now();

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
  if (source) await setCacheFile(sourceCacheFile, source);
  await publishToOutDir(publicPath, thumbPath);

  console.log(
    `[PDF Thumbnailer] Generated ${thumbPath} in ${(performance.now() - time).toFixed(0)}ms`,
  );

  return src;
}
