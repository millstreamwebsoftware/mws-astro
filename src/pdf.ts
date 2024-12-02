// import fs from "fs/promises";
// import path from "path";
// import sharp from "sharp";
import { resolvePath } from "./filesystem";

// https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs

import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Some PDFs need external cmaps.
const CMAP_URL = "../../../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL =
  "../../../node_modules/pdfjs-dist/standard_fonts/";

export async function getPDFThumbnail(file: string, pageNum: number = 0) {
  const filePath = await resolvePath(file);
  if (!filePath) return;

  let thumbPath = `${filePath}.png`;

  if (fs.existsSync(thumbPath)) return thumbPath;

  const data = new Uint8Array(fs.readFileSync(filePath));

  const loadingTask = getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    verbosity: 0,
  });

  try {
    const pdfDocument = await loadingTask.promise;
    // console.log("# PDF document loaded.");
    // Get the first page.
    const page = await pdfDocument.getPage(pageNum + 1);
    // Render the page on a Node canvas with 100% scale.
    const canvasFactory: any = pdfDocument.canvasFactory;
    const viewport = page.getViewport({ scale: 1.0 });
    const canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height,
    );
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
    };

    const renderTask = page.render(renderContext);
    await renderTask.promise;
    // Convert the canvas to an image buffer.
    const image = canvasAndContext.canvas.toBuffer("image/png");
    fs.writeFile(thumbPath, image, function (error) {
      if (error) {
        // console.error("Error: " + error);
      } else {
        // console.log(
        //   "Finished converting first page of PDF file to a PNG image.",
        // );
      }
    });
    // Release page resources.
    page.cleanup();
  } catch (reason) {
    // console.log(reason);
  }

  // console.log(thumbPath);

  return thumbPath;
}
