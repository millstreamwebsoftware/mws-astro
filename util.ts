import colorString from "color-string";

export function convertColorString(color: string): string | undefined {
  const c = colorString.get.rgb(color);
  if (!c) return;
  return c.slice(0, 3).join(" ") + " / " + c[3];
}
