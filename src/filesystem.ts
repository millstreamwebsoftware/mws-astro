import { z } from "astro/zod";
import { inferRemoteSize as _inferRemoteSize } from "astro:assets";

var fs: typeof import("node:fs/promises") | undefined,
  path: typeof import("node:path") | undefined;
const CACHE_DIRECTORY = "./node_modules/.mws-astro/";

async function ensureFS(): Promise<boolean> {
  // @ts-expect-error
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

    return Boolean(fs) && Boolean(path);
  }

  return false;
}

export async function resolvePath(file: string): Promise<string | undefined> {
  if (!(await ensureFS())) return;

  var filePath = file;
  if (
    await fs!.stat(filePath).then(
      () => true,
      () => false,
    )
  )
    return filePath;
  filePath = path!.join("public", filePath);
  if (
    await fs!.stat(filePath).then(
      () => true,
      () => false,
    )
  )
    return filePath;
  return;
}

export async function getFilesize(file: string) {
  if (!(await ensureFS())) return;
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
  const cacheFileName =
    url
      .split("/")
      .at(-1)
      ?.replace(/[?#].*/, "") + ".json";
  if (!cacheFileName) throw Error("[InferSize] Cache File naming failed.");

  const schema = z.object({
    url: z.string().url(),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    expires: z.coerce.number().min(0),
    etag: z.string().nullish(),
    modified: z.string().nullish(),
  });

  const result = await getCacheFile(cacheFileName, schema).catch(
    () => undefined,
  );
  if (result && Date.now() < result.expires) {
    console.log(
      `[InferSize] Using cached image dimensions (${result.width}, ${result.height}) for ${url}`,
    );
    return { width: result.width, height: result.height };
  }

  const remote = await fetch(url, {
    method: "HEAD",
    // Revalidation headers are not really required here as the server will not return the body regardless.
    headers: {
      ...(result?.etag && { "If-None-Match": result.etag }),
      ...(result?.modified && { "If-Modified-Since": result.modified }),
    },
  });

  if (!remote.ok && remote.status !== 304)
    throw Error(
      `[InferSize] Error response while contacting remote server: ${remote.status} - ${remote.statusText}`,
    );

  var width, height;

  [width, height] = [
    remote.headers.get("x-amz-meta-imagewidth"),
    remote.headers.get("x-amz-meta-imageheight"),
  ];
  if (!(width && height)) {
    console.log(
      `[InferSize] x-amz-meta-image* headers missing, falling back on Astro's InferSize method ${url}`,
    );
    let remote = await _inferRemoteSize(url);
    ({ width, height } = remote);
  }
  // throw Error(
  //   `[InferSize] Remote server did not return x-amz-meta-imagewidth or x-amz-meta-imageheight header for ${url}`,
  // );

  const maxAge =
    Number(
      remote.headers
        .get("Cache-Control")
        ?.match(/.*(?:s-)?max-age=([0-9]*).*/)?.[1],
    ) || 0;

  const cache = schema.parse({
    url,
    width,
    height,
    expires: Date.now() + maxAge,
    etag: remote.headers.get("Etag"),
    modified: remote.headers.get("Last-Modified"),
  });

  await setCacheFile(cacheFileName, cache);
  console.log(
    `[InferSize] Requested image dimensions (${cache.width}, ${cache.height}) from ${url}`,
  );
  return { width: cache.width, height: cache.height };
}
