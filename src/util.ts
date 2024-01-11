import colorString from "color-string";
import he from "he";

export function convertColorString(
  color: string | undefined
): string | undefined {
  if (!color) return;
  const c = colorString.get.rgb(color);
  if (!c) return;
  return c.slice(0, 3).join(" ") + (c[3] != 1 ? " / " + c[3] : "");
}

export async function replaceCmsEmbeds(content: string) {
  if (!content) return content;

  const embedRe = /<div[^>]*data-cms-embed="([^>"]*)"[^>]*>[^>]*\/div>/gm;

  return content.replaceAll(embedRe, (match, g1) => {
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
