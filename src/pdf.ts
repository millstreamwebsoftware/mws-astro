import { resolvePath } from "./filesystem";

export async function getPDFThumbnail(file: string, pageNum = 0, res = 512) {
  // @ts-expect-error
  if (!ENV_BOOKSHOP_LIVE) {
    const [fs, pdf, sharp, crypto] = await Promise.all([
      import("node:fs"),
      import("mupdf"),
      import("sharp"),
      import("crypto"),
    ]);

    const filePath = await resolvePath(file);
    if (!filePath) return;

    const hash = crypto.createHash("md5");

    hash.update(`${file}${pageNum}${res}`, "utf-8");
    let thumbPath = `${filePath}.${hash.digest("hex").slice(0, 6)}.webp`;

    if (fs.existsSync(thumbPath)) return thumbPath;
    const time = performance.now();

    const doc = pdf.PDFDocument.openDocument(
      fs.readFileSync(filePath),
      "application/pdf",
    );

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

    await sharp.default(pixmap.asPNG()).webp({ quality: 60 }).toFile(thumbPath);

    console.log(
      `[PDF Thumbnailer] Generated ${thumbPath} in ${(performance.now() - time).toFixed(0)}ms`,
    );

    return thumbPath;
  }
}
