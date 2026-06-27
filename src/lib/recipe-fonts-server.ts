import fs from "node:fs";
import path from "node:path";

let cachedRecipeFontsCss: string | null = null;

export function getRecipeFontsCss(origin?: string): string {
  if (!cachedRecipeFontsCss) {
    cachedRecipeFontsCss = fs.readFileSync(
      path.join(process.cwd(), "src/styles/recipe-fonts.css"),
      "utf8"
    );
  }
  if (origin) {
    return cachedRecipeFontsCss.replace(
      /url\("\/fonts\//g,
      `url("${origin.replace(/\/$/, "")}/fonts/`
    );
  }
  return cachedRecipeFontsCss;
}
