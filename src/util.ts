import colorString from "color-string";
import he from "he";
import type { TreeNode } from "@mws-astro/middleware";
import type { PDFiumRenderOptions } from "@hyzyla/pdfium/dist/types.js";

var fs: any;
var path: any;
var sharp: any;
var pdfium: any;

export function convertColorString(
  color: string | undefined,
): string | undefined {
  if (!color) return;
  const c = colorString.get.rgb(color);
  if (!c) return;
  return c.slice(0, 3).join(" ") + (c[3] != 1 ? " / " + c[3] : "");
}

export async function replaceCmsEmbeds(content: string) {
  if (!content) return content;

  const embedRe = /<div[^>]*data-cms-embed="([^>"]*)"[^>]*>[^>]*\/div>/gm;

  return content.replaceAll(embedRe, (_, g1) => {
    return he.decode(atob(g1));
  });
}

export async function stripTrailingWhitespace(content: string) {
  if (!content) return content;

  const whitespaceRe = /[^\S\r\n]$/gm;

  return content.replaceAll(whitespaceRe, "");
}

export function bookshopName(p: string) {
  const parts = p
    .replace(/^.*components\//, "")
    .split(".")[0]
    .split("/");

  if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
  }

  return parts.join("/");
}

export function trimFilePath(p: string) {
  return p.replace(/.*(\/src\/.*)/, "$1");
}

export function getTreeNode(
  tree: TreeNode,
  filter: string | undefined,
  parent: boolean = false,
): TreeNode | undefined {
  if (!filter) return tree;

  const targetFragments = filter?.split("/").filter((frg) => frg !== "");
  let cursor = tree;
  if (!cursor?.children) return;

  for (let i = 0; i < targetFragments.length; i++) {
    if (
      cursor?.children == undefined ||
      !(targetFragments[i] in cursor.children)
    ) {
      console.warn(`Could not resolve path ${filter}`);
      return;
    }

    cursor = cursor.children[targetFragments[i]];
  }

  // Reorder tree to place children inside their sibling index (/file/index -> /file/)
  if (cursor.children?.index) {
    cursor = Object.assign(Object.assign({}, cursor), cursor.children.index);
    delete cursor.children?.index;
  }

  if (parent)
    cursor = {
      children: { index: cursor },
    };

  return cursor;
}

async function ensureFS(): Promise<boolean> {
  // @ts-expect-error
  if (ENV_BOOKSHOP_LIVE) return false;

  if (!fs)
    fs = await import("node:fs/promises").catch(() =>
      console.error("node:fs/promises import failed"),
    );

  return !!fs;
}

export async function resolvePath(file: string): Promise<string | undefined> {
  if (!(await ensureFS())) return;

  let filePath = file;
  return await fs
    .stat(file)
    .catch(() => {
      filePath = path.join("public", filePath);
      return fs.stat(filePath);
    })
    .then(
      () => {
        return filePath;
      },
      () => undefined,
    );
}

export async function getPDFThumbnail(file: string, pageNum: number = 0) {
  const filePath = await resolvePath(file);
  if (!filePath) return;

  // @ts-expect-error
  if (!ENV_BOOKSHOP_LIVE) {
    if (!path)
      path = await import("node:path").catch(() =>
        console.error("node:path import failed"),
      );
    if (!sharp)
      sharp = (
        await import("sharp").catch(() => console.error("sharp import failed"))
      )?.default;
    if (!pdfium)
      pdfium = await import("@hyzyla/pdfium").then(
        ({ PDFiumLibrary: pdf }) => pdf.init(),
        () => console.error("@hyzyla/pdfium import failed"),
      );
  } else {
    return `${file}.png`;
  }

  if (!(path && sharp && pdfium)) {
    console.warn("Failed to generate PDF Thumbnail, library failed to load.");
    return;
  }

  let thumbPath = `${filePath}.png`;

  async function render(options: PDFiumRenderOptions) {
    return await sharp(options.data, {
      raw: {
        width: options.width,
        height: options.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();
  }

  if (
    await fs.access(thumbPath).then(
      () => true,
      () => false,
    )
  )
    return thumbPath;

  return await fs
    .readFile(filePath)
    .then((buffer: any) => pdfium.loadDocument(buffer))
    .then((document: any) => document.getPage(0).render({ scale: 1, render }))
    .then(async (thumbnail: any) => {
      await fs
        .writeFile(thumbPath, thumbnail.data, { flag: "w" })
        .catch(() => {});
      console.log(`Generated thumbnail: ${thumbPath}`);
      return thumbPath;
    });
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

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
