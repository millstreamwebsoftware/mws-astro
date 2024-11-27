import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { resolvePath } from "./filesystem";

// https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs

export async function getPDFThumbnail(file: string, pageNum: number = 0) {
  const filePath = await resolvePath(file);
  if (!filePath) return;

  // @ts-ignore
  // if (!ENV_BOOKSHOP_LIVE) {
  //   if (!sharp)
  //     sharp = (
  //       await import("sharp").catch(() => console.error("sharp import failed"))
  //     )?.default;
  //   if (!pdfium)
  //     pdfium = await import("@hyzyla/pdfium").then(
  //       ({ PDFiumLibrary: pdf }) => pdf.init(),
  //       () => console.error("@hyzyla/pdfium import failed"),
  //     );
  // } else {
  //   return `${file}.png`;
  // }

  // if (!(path && sharp && pdfium)) {
  //   console.warn("Failed to generate PDF Thumbnail, library failed to load.");
  //   return;
  // }

  let thumbPath = `${filePath}.png`;

  // async function render(options: PDFiumRenderOptions) {
  //   return await sharp(options.data, {
  //     raw: {
  //       width: options.width,
  //       height: options.height,
  //       channels: 4,
  //     },
  //   })
  //     .png()
  //     .toBuffer();
  // }

  if (
    await fs.access(thumbPath).then(
      () => true,
      () => false,
    )
  )
    return thumbPath;

  let result = await fs
    .readFile(filePath)
    .then((buffer: any) => pdfium.loadDocument(buffer))
    .then((document: any) => document.getPage(0).render({ scale: 1, render }))
    .then(async (thumbnail: any) => {
      console.log(`Generated thumbnail: ${thumbPath}`);
      return await fs.writeFile(thumbPath, thumbnail.data, { flag: "w" }).then(
        () => thumbPath,
        () => {},
      );
    });

  return result;
}
