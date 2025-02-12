import colorString from "color-string";
import he from "he";
import type { TreeNode } from "@mws-astro/middleware";

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
  path: string | undefined,
  relpath: string = "",
  // parent: boolean = false,
): TreeNode | undefined {
  if (!path) return tree;

  const abspath = path.startsWith("/") ? path : relpath + "/" + path;

  const targetFragments = abspath?.split("/").filter((frg) => frg !== "");
  let cursor = tree;
  if (!cursor?.children) return;

  for (let i = 0; i < targetFragments.length; i++) {
    let fragment = targetFragments[i];

    if (/^\.\.?$/.test(fragment)) {
      if (fragment.length < 2) {
        continue;
      }

      if (!cursor.parent) {
        // console.warn(
        //   `Could not resolve path ${abspath} - Attempted to access undefined parent`,
        // );
        // console.log(tree);
        // return;
        cursor = tree;
        continue;
      }

      cursor = cursor.parent;
    } else {
      if (cursor?.children == undefined || !(fragment in cursor.children)) {
        console.warn(`Could not resolve path ${abspath}`);
        return;
      }

      cursor = cursor.children[fragment];
    }
  }

  // Reorder tree to place children inside their sibling index (/file/index -> /file/)
  if (cursor.children?.index) {
    cursor = Object.assign(Object.assign({}, cursor), cursor.children.index);
    delete cursor.children?.index;
  }

  return cursor;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
