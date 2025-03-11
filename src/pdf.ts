import { resolvePath } from "./filesystem";

export async function getPDFThumbnail(file: string, pageNum = 0) {
  // @ts-expect-error
  if (ENV_BOOKSHOP_LIVE) return;

  const [fs, pdf, sharp] = await Promise.all([
    import("node:fs"),
    import("mupdf"),
    import("sharp"),
  ]);

  const filePath = await resolvePath(file);
  if (!filePath) return;

  let thumbPath = `${filePath}.webp`;

  if (fs.existsSync(thumbPath)) return thumbPath;
  const time = performance.now();

  const doc = pdf.PDFDocument.openDocument(
    fs.readFileSync(filePath),
    "application/pdf",
  );

  const page = doc.loadPage(pageNum);

  let pixmap = page.toPixmap(
    pdf.Matrix.scale(0.5, 0.5), // pdf.Matrix.identity,
    pdf.ColorSpace.DeviceRGB,
    false,
    true,
  );

  await sharp
    .default(pixmap.asPNG())
    .resize(720, 720, { fit: "inside" })
    .webp({ quality: 60 })
    .toFile(thumbPath);

  console.log(
    `[PDF Thumbnailer] Generated ${thumbPath} in ${performance.now() - time}ms`,
  );

  return thumbPath;
}
