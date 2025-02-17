// import fs from "fs/promises";
// import path from "path";
// import sharp from "sharp";
// import fs from "fs";
import { resolvePath } from "./filesystem";
var fs: any, pdfjs: any, path: any;

// https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs
// import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function ensureFS(): Promise<boolean> {
  // @ts-expect-error
  if (!ENV_BOOKSHOP_LIVE) {
    if (!fs)
      fs = await import("node:fs").catch(() =>
        console.error("node:fs import failed"),
      );

    if (!pdfjs)
      pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() =>
        console.error("pdfjs-dist/legacy import failed"),
      );

    if (!path)
      path = await import("path").catch(() =>
        console.error("path import failed"),
      );

    return Boolean(fs) && Boolean(pdfjs) && Boolean(path);
  }

  return false;
}

export async function getPDFThumbnail(file: string, pageNum: number = 0) {
  if (!(await ensureFS())) return;

  // Some PDFs need external cmaps.
  const CMAP_URL = path.join(
    import.meta.dirname,
    "../../../../node_modules/pdfjs-dist/cmaps/",
  );
  const CMAP_PACKED = true;

  // Where the standard fonts are located.
  const STANDARD_FONT_DATA_URL = path.join(
    import.meta.dirname,
    "../../../../node_modules/pdfjs-dist/standard_fonts/",
  );

  const filePath = await resolvePath(file);
  if (!filePath) return;

  let thumbPath = `${filePath}.png`;

  if (fs.existsSync(thumbPath)) return thumbPath;

  const data = new Uint8Array(fs.readFileSync(filePath));

  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    disableFontFace: false,
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
    fs.writeFile(thumbPath, image, function (error: any) {
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
