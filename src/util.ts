import colorString from "color-string";
// import { transform, html } from "ultrahtml";
// import swap from "ultrahtml/transformers/swap";
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
  // const output = await transform(content, [
  //   swap({
  //     div: (props: any, children: any) => {
  //       if ("data-cms-embed" in props) {
  //         const decoded = he.decode(atob(props["data-cms-embed"]));
  //         console.log(decoded);
  //         return decoded;
  //       }
  //       return html``;
  //     },
  //   }),
  // ]);
  if (!content) return content;

  const embedRe = /<div[^>]*data-cms-embed="([^>"]*)"[^>]*>[^>]*\/div>/gm;

  return content.replaceAll(embedRe, (match, g1) => {
    return he.decode(atob(g1));
  });
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
