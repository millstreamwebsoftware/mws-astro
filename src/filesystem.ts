import { z } from "astro/zod";
import { inferRemoteSize as _inferRemoteSize } from "astro:assets";

var fs: typeof import("node:fs/promises") | undefined,
  path: typeof import("node:path") | undefined,
  createHash: (typeof import("node:crypto"))["createHash"] | undefined,
  publicDir: string | undefined;
export const CACHE_DIRECTORY = "./node_modules/.mws-astro/";

async function ensureFS(): Promise<boolean> {
  if (!ENV_BOOKSHOP_LIVE) {
    if (!fs)
      fs =
        (await import("node:fs/promises").catch(() =>
          console.error("node:fs/promises import failed"),
        )) ?? undefined;

    if (!path)
      path =
        (await import("node:path").catch(() =>
          console.error("node:path import failed"),
        )) ?? undefined;

    if (!createHash) ({ createHash } = await import("node:crypto"));

    return Boolean(fs) && Boolean(path) && Boolean(createHash);
  }

  return false;
}

/** The site's `publicDir`, relative to the working directory (usually `public`). */
export async function getPublicDir(): Promise<string> {
  if (publicDir !== undefined) return publicDir;
  if (!(await ensureFS())) return "public";

  const [config, { fileURLToPath }] = await Promise.all([
    import("astro:config/server").catch(() => undefined),
    import("node:url"),
  ]);

  publicDir = config?.publicDir
    ? path!.relative(process.cwd(), fileURLToPath(config.publicDir))
    : "public";
  return publicDir;
}

/** True for absolute (`https://…`) and protocol-relative (`//…`) URLs. */
export function isRemotePath(file: string) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(file);
}

/** Make a protocol-relative URL fetchable by assuming https. */
export function toFetchableUrl(url: string) {
  return url.startsWith("//") ? `https:${url}` : url;
}

export async function resolvePath(file: string): Promise<string | undefined> {
  if (!(await ensureFS())) return;
  if (isRemotePath(file)) return;

  var filePath = file;
  if (
    await fs!.stat(filePath).then(
      () => true,
      () => false,
    )
  )
    return filePath;
  filePath = path!.join(await getPublicDir(), filePath);
  if (
    await fs!.stat(filePath).then(
      () => true,
      () => false,
    )
  )
    return filePath;
  return;
}

const REMOTE_TIMEOUT = 15 * 1000;
const REMOTE_DOWNLOAD_TIMEOUT = 2 * 60 * 1000;
const REMOTE_ERROR_TTL = 60 * 60 * 1000; // 1 hour
/** Used when the server sends neither Cache-Control nor validators. */
export const REMOTE_DEFAULT_TTL = 24 * 60 * 60 * 1000; // 1 day
/** How long a check is reused in-process (a build, or a dev server session). */
const REMOTE_MEMO_TTL = 5 * 60 * 1000;

const remoteFileSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("success"),
    url: z.string(),
    size: z.coerce.number().positive().nullish(),
    expires: z.coerce.number().min(0),
    etag: z.string().nullish(),
    modified: z.string().nullish(),
  }),
  z.object({
    type: z.literal("error"),
    url: z.string(),
    status: z.coerce.number().int().min(0),
    expires: z.coerce.number().min(0),
  }),
]);
type RemoteFileCache = z.infer<typeof remoteFileSchema>;

export interface RemoteFileInfo {
  size?: number;
  /** Changes whenever the remote file does (ETag, Last-Modified or size). */
  version?: string;
}

const remoteInfoMemo = new Map<
  string,
  { at: number; info: Promise<RemoteFileInfo | undefined> }
>();
const remoteDownloads = new Map<
  string,
  Promise<{ data: Buffer; contentType: string | null } | undefined>
>();

function remoteCacheFileName(url: string) {
  return `file.${createHash!("sha256").update(url).digest("base64url").slice(0, 16)}.json`;
}

function toRemoteFileInfo(
  entry: Extract<RemoteFileCache, { type: "success" }>,
): RemoteFileInfo {
  return {
    size: entry.size ?? undefined,
    version:
      entry.etag ?? entry.modified ?? (entry.size ? `size:${entry.size}` : undefined),
  };
}

/**
 * Fetch a remote file with a timeout. Asks for an uncompressed response: CDNs
 * drop Content-Length (or report the compressed size) when they negotiate
 * gzip/brotli with Node's fetch.
 */
function requestRemote(
  url: string,
  init: RequestInit = {},
  timeout = REMOTE_TIMEOUT,
) {
  return fetch(toFetchableUrl(url), {
    ...init,
    headers: { "Accept-Encoding": "identity", ...init.headers },
    signal: AbortSignal.timeout(timeout),
  }).catch((e: Error) => {
    console.warn(`[RemoteFile] Request to ${url} failed: ${e.message}`);
    return undefined;
  });
}

async function writeRemoteCache(url: string, headers: Headers, size?: number) {
  const etag = headers.get("Etag");
  const modified = headers.get("Last-Modified");
  const maxAge =
    Number(headers.get("Cache-Control")?.match(/(?:s-)?max-age=([0-9]+)/)?.[1]) *
    1000;
  // With validators a stale entry costs one conditional request; without them
  // it costs a full re-check, so keep it for longer.
  const ttl = maxAge || (etag || modified ? 0 : REMOTE_DEFAULT_TTL);

  const entry = remoteFileSchema.parse({
    type: "success",
    url,
    size,
    expires: Date.now() + ttl,
    etag,
    modified,
  }) as Extract<RemoteFileCache, { type: "success" }>;
  await setCacheFile(remoteCacheFileName(url), entry);
  return entry;
}

/** Read the size from a `Range: bytes=0-0` request, for servers that reject HEAD. */
async function requestRemoteRange(url: string) {
  const res = await requestRemote(url, { headers: { Range: "bytes=0-0" } });
  // Never read the body: a server that ignores Range sends the whole file.
  await res?.body?.cancel().catch(() => {});
  if (!res?.ok) return res;

  const size =
    res.status === 206
      ? Number(res.headers.get("Content-Range")?.split("/")[1])
      : Number(res.headers.get("Content-Length"));
  return { res, size: size > 0 ? size : undefined };
}

async function fetchRemoteFileInfo(
  url: string,
): Promise<RemoteFileInfo | undefined> {
  const cacheFileName = remoteCacheFileName(url);
  const prior = await getCacheFile(cacheFileName, remoteFileSchema).catch(
    () => undefined,
  );

  if (prior && Date.now() < prior.expires) {
    if (prior.type === "error") {
      console.warn(
        `[RemoteFile] Cached error response for ${url}: ${prior.status}`,
      );
      return;
    }
    return toRemoteFileInfo(prior);
  }

  const known = prior?.type === "success" ? prior : undefined;
  const head = await requestRemote(url, {
    method: "HEAD",
    headers: {
      ...(known?.etag && { "If-None-Match": known.etag }),
      ...(known?.modified && { "If-Modified-Since": known.modified }),
    },
  });

  if (head?.status === 304 && known)
    return toRemoteFileInfo(
      await writeRemoteCache(url, head.headers, known.size ?? undefined),
    );

  const headSize = Number(head?.headers.get("Content-Length"));
  if (head?.ok && headSize > 0)
    return toRemoteFileInfo(await writeRemoteCache(url, head.headers, headSize));

  // HEAD is often refused (S3 presigned URLs, some DAMs) or sent without a
  // Content-Length; a one-byte ranged GET usually still reports the size.
  const range = await requestRemoteRange(url);
  if (range && "size" in range)
    return toRemoteFileInfo(
      await writeRemoteCache(url, range.res.headers, range.size),
    );
  if (head?.ok)
    return toRemoteFileInfo(await writeRemoteCache(url, head.headers));

  const failed = range ?? head;
  console.warn(
    `[RemoteFile] Could not read remote file ${url}${failed ? `: ${failed.status} - ${failed.statusText}` : ""}`,
  );
  await setCacheFile(
    cacheFileName,
    remoteFileSchema.parse({
      type: "error",
      url,
      status: failed?.status ?? 0,
      expires: Date.now() + REMOTE_ERROR_TTL,
    }),
  );
}

/**
 * Size and version of a remote file, without downloading it. Cached on disk
 * (revalidated with ETag/Last-Modified) and shared between pages in-process.
 */
export async function getRemoteFileInfo(url: string) {
  if (!(await ensureFS())) return;

  const memo = remoteInfoMemo.get(url);
  if (memo && Date.now() - memo.at < REMOTE_MEMO_TTL) return memo.info;

  const info = fetchRemoteFileInfo(url);
  remoteInfoMemo.set(url, { at: Date.now(), info });
  return info;
}

/** Download a remote file. Concurrent requests for the same URL share one download. */
export async function downloadRemoteFile(url: string) {
  if (!(await ensureFS())) return;

  let download = remoteDownloads.get(url);
  if (!download) {
    download = (async () => {
      const res = await requestRemote(url, {}, REMOTE_DOWNLOAD_TIMEOUT);
      if (!res?.ok) {
        if (res)
          console.warn(
            `[RemoteFile] Could not download ${url}: ${res.status} - ${res.statusText}`,
          );
        return;
      }

      const data = await res
        .arrayBuffer()
        .then((b) => Buffer.from(b))
        .catch((e: Error) => {
          console.warn(`[RemoteFile] Download of ${url} failed: ${e.message}`);
          return undefined;
        });
      if (!data) return;

      return { data, contentType: res.headers.get("Content-Type") };
    })().finally(() => remoteDownloads.delete(url));
    remoteDownloads.set(url, download);
  }
  return download;
}

export async function getFilesize(file: string) {
  if (!(await ensureFS())) return;
  if (isRemotePath(file)) return (await getRemoteFileInfo(file))?.size;
  const filePath = await resolvePath(file);

  if (!filePath) return;

  return await fs!.stat(filePath).then(
    (stats: any) => stats.size,
    () => undefined,
  );
}

export async function getCacheFile<T extends z.ZodTypeAny>(
  file: string,
  schema: T,
) {
  if (!(await ensureFS())) return;

  return fs!
    .readFile(path!.join(CACHE_DIRECTORY, file), "utf-8")
    .then((b) => JSON.parse(b))
    .then((j) => schema.parse(j) as z.infer<T>);
}

export async function setCacheFile(file: string, obj: any) {
  if (!(await ensureFS())) return;
  await fs!
    .mkdir(CACHE_DIRECTORY)
    .catch(() => {})
    .finally(() =>
      fs!.writeFile(path!.join(CACHE_DIRECTORY, file), JSON.stringify(obj)),
    );
}

export async function inferRemoteSize(url: string) {
  if (!(await ensureFS())) throw Error("[InferSize] Node imports failed.");

  const hash = createHash!("sha256");
  hash.update(url);
  const urlHash = hash.digest("base64url");

  const cacheFileName =
    url
      .split("/")
      .at(-1)
      ?.replace(/[?#].*/, "") +
    "." +
    urlHash.slice(0, 8) +
    ".json";
  if (!cacheFileName) throw Error("[InferSize] Cache File naming failed.");

  const successSchema = z.object({
    type: z.literal("success"),
    url: z.string().url(),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    expires: z.coerce.number().min(0),
    etag: z.string().nullish(),
    modified: z.string().nullish(),
  });

  const errorSchema = z.object({
    type: z.literal("error"),
    url: z.string().url(),
    status: z.coerce.number().int().positive(),
    expires: z.coerce.number().min(0),
  });

  const schema = z.discriminatedUnion("type", [successSchema, errorSchema]);

  const result = await getCacheFile(cacheFileName, schema).catch(() => {
    return undefined;
  });
  if (result && Date.now() < result.expires) {
    if (result.type === "error")
      throw Error(
        `[InferSize] Cached error response for image ${url}: ${result.status}`,
      );
    return { width: result.width, height: result.height };
  }

  const cacheMissReason = result ? "EXPIRE" : "NOFILE";

  const prior = result?.type === "success" ? result : undefined;

  const remote = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(REMOTE_TIMEOUT),
    headers: {
      ...(prior?.etag && { "If-None-Match": prior.etag }),
      ...(prior?.modified && { "If-Modified-Since": prior.modified }),
    },
  });

  if (!remote.ok && remote.status !== 304) {
    const ERROR_TTL = 60 * 60 * 1000; // 1 hour
    await setCacheFile(
      cacheFileName,
      errorSchema.parse({
        type: "error",
        url,
        status: remote.status,
        expires: Date.now() + ERROR_TTL,
      }),
    );
    throw Error(
      `[InferSize] Error response while contacting remote server for image ${url}: ${remote.status} - ${remote.statusText}`,
    );
  }

  var width, height;
  [width, height] = [
    remote.headers.get("x-amz-meta-imagewidth"),
    remote.headers.get("x-amz-meta-imageheight"),
  ];

  if (!(width && height)) {
    if (remote.status === 304 && prior) {
      // Revalidate cache
      [width, height] = [prior.width, prior.height];
    } else {
      ({ width, height } = await _inferRemoteSize(url));
    }
  }

  const maxAge =
    Number(
      remote.headers
        .get("Cache-Control")
        ?.match(/.*(?:s-)?max-age=([0-9]*).*/)?.[1],
    ) * 1000 || 0;

  const cache = successSchema.parse({
    type: "success",
    url,
    width,
    height,
    expires: Date.now() + maxAge,
    etag: remote.headers.get("Etag"),
    modified: remote.headers.get("Last-Modified"),
  });

  await setCacheFile(cacheFileName, cache);
  console.log(
    `[InferSize][${cacheMissReason}] Requested image dimensions (${cache.width}, ${cache.height}) from ${url}. The cache will last until ${new Date(cache.expires).toString()}`,
  );
  return { width: cache.width, height: cache.height };
}

const VIMEO_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — aspect ratios don't change

export async function inferVimeoAspect(
  src: string,
): Promise<number | undefined> {
  if (!(await ensureFS())) return undefined;

  const videoId = src.match(/(\d+)\/?(?:[?#].*)?$/)?.[1];
  if (!videoId) {
    console.warn(`[VimeoAspect] Could not extract video ID from ${src}`);
    return undefined;
  }
  const cacheFileName = `vimeo.${videoId}.json`;

  const schema = z.object({
    url: z.string().url(),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    expires: z.coerce.number().min(0),
  });

  const cached = await getCacheFile(cacheFileName, schema).catch(
    () => undefined,
  );
  if (cached && Date.now() < cached.expires) {
    return cached.width / cached.height;
  }

  const cacheMissReason = cached ? "EXPIRE" : "NOFILE";

  const res = await fetch(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(src)}`,
  ).catch(() => undefined);

  if (!res?.ok) {
    console.warn(`[VimeoAspect] oEmbed request failed for ${src}`);
    return cached ? cached.width / cached.height : undefined;
  }

  const data = await res.json();
  if (!data.width || !data.height) {
    console.warn(`[VimeoAspect] oEmbed response missing dimensions for ${src}`);
    return cached ? cached.width / cached.height : undefined;
  }

  const cache = schema.parse({
    url: src,
    width: data.width,
    height: data.height,
    expires: Date.now() + VIMEO_CACHE_TTL,
  });

  await setCacheFile(cacheFileName, cache);
  console.log(
    `[VimeoAspect][${cacheMissReason}] Fetched oEmbed for ${src}: ${cache.width}x${cache.height}`,
  );
  return cache.width / cache.height;
}
