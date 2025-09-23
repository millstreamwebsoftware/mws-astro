import colorString from "color-string";
import he from "he";

export function convertColorString(
  color: string | undefined,
): string | undefined {
  if (!color) return;
  const c = colorString.get.rgb(color);
  if (!c) return;
  return c.slice(0, 3).join(" ") + (c[3] != 1 ? " / " + c[3] : "");
}

export function replaceCmsEmbeds(content: string) {
  if (!content) return content;

  const embedRe = /<div[^>]*data-cms-embed="([^>"]*)"[^>]*>[^>]*\/div>/gm;
  return content.replaceAll(embedRe, (_, g1) => {
    return he.decode(atob(g1));
  });
}

export function stripTrailingWhitespace(content: string) {
  return content?.replaceAll(/[^\S\r\n]$/gm, "") ?? content;
}

export function removeHTMLWhitespace(content: string) {
  return content?.replaceAll(/>\n*?</gm, "><") ?? content;
}

export function forceHTMLBlocks(content: string) {
  return content?.replaceAll(/^(<[^>]*?>)\n?/gm, "$1\n") ?? content;
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

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function log<T>(a: T): T {
  console.log(a);
  return a;
}
