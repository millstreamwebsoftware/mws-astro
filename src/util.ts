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
  filter: string | undefined,
  parent: boolean = false,
): TreeNode | undefined {
  if (!filter) return tree;

  const targetFragments = filter?.split("/").filter((frg) => frg !== "");
  let cursor = tree;
  if (!cursor.children) return;

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
