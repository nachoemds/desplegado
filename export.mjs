// Uso:  node export.mjs [a4|a3] [dpi] [fotos]
//   node export.mjs a3            -> A3, 300 dpi, fotos según CONFIG
//   node export.mjs a4 300 local  -> usa ./fotos/
// Requiere: npm i  &&  npx playwright install chromium
import { chromium } from "playwright";
import { pathToFileURL } from "url";
import path from "path"; import fs from "fs";

const fmt = (process.argv[2] || "a4").toLowerCase();
const dpi = +(process.argv[3] || 300);
const fotos = process.argv[4];
const mm = fmt === "a3" ? { w: 297, h: 420 } : { w: 210, h: 297 };

let url = pathToFileURL(path.resolve("index.html")).href + `?fmt=${fmt}`;
if (fotos) url += `&fotos=${encodeURIComponent(fotos)}`;

const cssW = mm.w / 25.4 * 96;                 // ancho en px CSS
const scale = (mm.w / 25.4 * dpi) / cssW;      // => ancho final = pulgadas * dpi
fs.mkdirSync("salida", { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({
  viewport: { width: Math.ceil(cssW) + 40, height: 1400 }, deviceScaleFactor: scale
})).newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await window.RENDER;
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.complete || new Promise(r => (i.onload = i.onerror = r))));
});

await page.locator("#page").screenshot({ path: `salida/autoridades_${fmt}.jpg`, type: "jpeg", quality: 95 });
await page.pdf({ path: `salida/autoridades_${fmt}.pdf`, width: `${mm.w}mm`, height: `${mm.h}mm`,
  printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await browser.close();
console.log(`Listo: salida/autoridades_${fmt}.jpg y .pdf`);
