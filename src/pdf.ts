import { z } from "astro/zod";
import {
  CACHE_DIRECTORY,
  REMOTE_DEFAULT_TTL,
  downloadRemoteFile,
  getCacheFile,
  getRemoteFileInfo,
  isRemotePath,
  PUBLIC_DIRECTORY,
  resolvePath,
  setCacheFile,
} from "./filesystem";

/**
 * Thumbnails for remote PDFs are cached here (inside the cache directory) and
 * served from the same path inside `publicDir`.
 */
const REMOTE_THUMBNAIL_DIRECTORY = "_thumbnails";

/** Records which version of a remote PDF a thumbnail was generated from. */
const thumbnailSourceSchema = z.object({
  url: z.string(),
  version: z.string().nullish(),
  generated: z.coerce.number().min(0),
  /** The download couldn't be rendered, so don't retry until the file changes. */
  invalid: z.boolean().optional(),
  /** File name of the current thumbnail, in the remote thumbnail directory. */
  thumbnail: z.string().optional(),
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
 * Where builds are served from. Assumed rather than read from Astro's config,
 * which Bookshop can't bundle. Sites with server output (served from
 * `dist/client`) aren't supported.
 */
const OUT_DIRECTORY = "dist";

/**
 * Node-only modules. Bookshop bundles components for the browser with
 * `ENV_BOOKSHOP_LIVE` set, so the guard lets it drop these imports.
 */
async function loadModules() {
  if (!ENV_BOOKSHOP_LIVE) {
    const [fs, path, crypto, pdf, sharp] = await Promise.all([
      import("node:fs"),
      import("node:path"),
      import("node:crypto"),
      import("mupdf"),
      import("sharp"),
    ]);
    return { fs, path, crypto, pdf, sharp };
  }
  throw Error("[PDF Thumbnailer] Not available in Bookshop live editing.");
}

/**
 * Make a thumbnail servable at `publicPath`. Remote thumbnails live in the
 * cache directory (preserved between CI builds, unlike `publicDir`), so are
 * copied into `publicDir` for the dev server. Astro copies `publicDir` into the
 * build output before pages render, so in builds the thumbnail is also copied
 * straight into the build output. `updated` overwrites existing
 * copies.
 */
async function publishThumbnail(
  thumbPath: string,
  publicPath: string,
  updated = false,
) {
  const { fs, path } = await loadModules();

  const targets = [path.join(PUBLIC_DIRECTORY, publicPath)];
  if (import.meta.env.PROD) targets.push(path.join(OUT_DIRECTORY, publicPath));

  for (const target of targets) {
    if (path.resolve(target) === path.resolve(thumbPath)) continue;
    if (!updated && fs.existsSync(target)) continue;
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

/** Render a page of a PDF to a webp thumbnail `res` pixels on its longest side. */
async function renderThumbnail(data: Buffer, pageNum: number, res: number) {
  const { pdf, sharp } = await loadModules();
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

  return sharp.default(pixmap.asPNG()).webp({ quality: 60 }).toBuffer();
}

async function generatePDFThumbnail(file: string, pageNum: number, res: number) {
  const { fs, path, crypto } = await loadModules();

  const digest = crypto
    .createHash("md5")
    .update(`${file}${pageNum}${res}`, "utf-8")
    .digest("hex")
    .slice(0, 6);
  const toSrc = (publicPath: string) =>
    `/${publicPath.split(path.sep).join("/")}`;

  if (!isRemotePath(file)) {
    const filePath = await resolvePath(file);
    if (!filePath) return;

    const thumbPath = `${filePath}.${digest}.webp`;
    const publicPath = path.relative(PUBLIC_DIRECTORY, thumbPath);
    if (publicPath.startsWith("..") || path.isAbsolute(publicPath)) {
      console.warn(
        `[PDF Thumbnailer] ${file} is outside ${PUBLIC_DIRECTORY}, so its thumbnail can't be served.`,
      );
      return;
    }

    if (fs.existsSync(thumbPath)) {
      await publishThumbnail(thumbPath, publicPath);
      return toSrc(publicPath);
    }

    const time = performance.now();
    fs.writeFileSync(
      thumbPath,
      await renderThumbnail(fs.readFileSync(filePath), pageNum, res),
    );
    await publishThumbnail(thumbPath, publicPath, true);
    console.log(
      `[PDF Thumbnailer] Generated ${thumbPath} in ${(performance.now() - time).toFixed(0)}ms`,
    );
    return toSrc(publicPath);
  }

  // Remote thumbnails are named by their content, so a changed PDF gets a new
  // URL that browsers and CDNs haven't cached. The source record tracks which
  // thumbnail is current.
  const stem = remoteFileStem(file);
  const thumbDir = path.join(CACHE_DIRECTORY, REMOTE_THUMBNAIL_DIRECTORY);
  const sourceCacheFile = `thumbnail.${stem}.${digest}.json`;

  const prior = await getCacheFile(
    sourceCacheFile,
    thumbnailSourceSchema,
  ).catch(() => undefined);
  const priorThumbnail =
    prior?.thumbnail && fs.existsSync(path.join(thumbDir, prior.thumbnail))
      ? prior.thumbnail
      : undefined;

  const serve = async (name: string | undefined, updated = false) => {
    if (!name) return;
    const publicPath = path.join(REMOTE_THUMBNAIL_DIRECTORY, name);
    await publishThumbnail(path.join(thumbDir, name), publicPath, updated);
    return toSrc(publicPath);
  };

  const info = await getRemoteFileInfo(file);
  // Keep serving the last thumbnail if the remote is unreachable.
  if (!info) return serve(priorThumbnail);

  const current = info.version
    ? prior?.version === info.version
    : prior && Date.now() - prior.generated < REMOTE_DEFAULT_TTL;
  // Keep serving the last good thumbnail if the file can't be rendered.
  if (current && (prior?.invalid || priorThumbnail))
    return serve(priorThumbnail);

  /** Don't download or render this version again; keep the last good thumbnail. */
  const markInvalid = async () => {
    await setCacheFile(sourceCacheFile, {
      url: file,
      version: info.version,
      generated: Date.now(),
      invalid: true,
      thumbnail: priorThumbnail,
    });
    return serve(priorThumbnail);
  };

  const download = await downloadRemoteFile(file);
  if (!download) return serve(priorThumbnail);
  if (!isPDF(download.data)) {
    console.warn(
      `[PDF Thumbnailer] ${file} is not a PDF (Content-Type: ${download.contentType ?? "none"})`,
    );
    return markInvalid();
  }

  const time = performance.now();
  let webp: Buffer;
  try {
    webp = await renderThumbnail(download.data, pageNum, res);
  } catch (e) {
    console.warn(`[PDF Thumbnailer] Could not render ${file}`, e);
    return markInvalid();
  }

  const name = `${stem}.${crypto.createHash("md5").update(digest).update(webp).digest("hex").slice(0, 8)}.webp`;
  const thumbPath = path.join(thumbDir, name);
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.writeFileSync(thumbPath, webp);
  await setCacheFile(sourceCacheFile, {
    url: file,
    version: info.version,
    generated: Date.now(),
    thumbnail: name,
  });
  console.log(
    `[PDF Thumbnailer] Generated ${thumbPath} in ${(performance.now() - time).toFixed(0)}ms`,
  );

  if (priorThumbnail && priorThumbnail !== name)
    await removeRemoteThumbnail(priorThumbnail);
  return serve(name, true);
}

/** Delete a superseded remote thumbnail from the cache and `publicDir`. */
async function removeRemoteThumbnail(name: string) {
  const { fs, path } = await loadModules();
  for (const dir of [CACHE_DIRECTORY, PUBLIC_DIRECTORY])
    fs.rmSync(path.join(dir, REMOTE_THUMBNAIL_DIRECTORY, name), { force: true });
}
