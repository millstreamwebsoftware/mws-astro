var fs: any, path: any;

async function ensureFS(): Promise<boolean> {
  // @ts-expect-error
  if (!ENV_BOOKSHOP_LIVE) {
    if (!fs)
      fs = await import("node:fs/promises").catch(() =>
        console.error("node:fs/promises import failed"),
      );

    if (!path)
      path = await import("node:path").catch(() =>
        console.error("node:path import failed"),
      );

    return Boolean(fs) && Boolean(path);
  }

  return false;
}

export async function resolvePath(file: string): Promise<string | undefined> {
  if (!(await ensureFS())) return;

  var filePath = file;
  if (
    await fs.stat(filePath).then(
      () => true,
      () => false,
    )
  )
    return filePath;
  filePath = path.join("public", filePath);
  if (
    await fs.stat(filePath).then(
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

  return await fs.stat(filePath).then(
    (stats: any) => stats.size,
    () => undefined,
  );
}
