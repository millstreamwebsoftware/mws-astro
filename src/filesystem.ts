import type { PDFiumRenderOptions } from "@hyzyla/pdfium/dist/types.js";
var fs: any, path: any, sharp: any, pdfium: any;

async function ensureFS(): Promise<boolean> {
  // // @ts-expect-error
  // console.log(ENV_BOOKSHOP_LIVE, typeof ENV_BOOKSHOP_LIVE);

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

  // return await fs
  //   .stat(file)
  //   .catch(() => {
  //     filePath = path.join("public", filePath);
  //     return fs.stat(filePath);
  //   })
  //   .then(
  //     () => {
  //       return filePath;
  //     },
  //     () => undefined,
  //   );
}

// export async function getPDFThumbnail(file: string, pageNum: number = 0) {
//   const filePath = await resolvePath(file);
//   if (!filePath) return;

//   // @ts-expect-error
//   if (!ENV_BOOKSHOP_LIVE) {
//     if (!sharp)
//       sharp = (
//         await import("sharp").catch(() => console.error("sharp import failed"))
//       )?.default;
//     if (!pdfium)
//       pdfium = await import("@hyzyla/pdfium").then(
//         ({ PDFiumLibrary: pdf }) => pdf.init(),
//         () => console.error("@hyzyla/pdfium import failed"),
//       );
//   } else {
//     return `${file}.png`;
//   }

//   if (!(path && sharp && pdfium)) {
//     console.warn("Failed to generate PDF Thumbnail, library failed to load.");
//     return;
//   }

//   let thumbPath = `${filePath}.png`;

//   async function render(options: PDFiumRenderOptions) {
//     return await sharp(options.data, {
//       raw: {
//         width: options.width,
//         height: options.height,
//         channels: 4,
//       },
//     })
//       .png()
//       .toBuffer();
//   }

//   if (
//     await fs.access(thumbPath).then(
//       () => true,
//       () => false,
//     )
//   )
//     return thumbPath;

//   let result = await fs
//     .readFile(filePath)
//     .then((buffer: any) => pdfium.loadDocument(buffer))
//     .then((document: any) => document.getPage(0).render({ scale: 1, render }))
//     .then(async (thumbnail: any) => {
//       console.log(`Generated thumbnail: ${thumbPath}`);
//       return await fs.writeFile(thumbPath, thumbnail.data, { flag: "w" }).then(
//         () => thumbPath,
//         () => {},
//       );
//     });

//   return result;
// }

export async function getFilesize(file: string) {
  if (!(await ensureFS())) return;
  const filePath = await resolvePath(file);

  if (!filePath) return;

  return await fs.stat(filePath).then(
    (stats: any) => stats.size,
    () => undefined,
  );
}
