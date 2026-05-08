// Identify which element is forcing horizontal overflow at iPad portrait.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5184";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".cohort-bar");

// Find every element wider than the viewport.
const overflowers = await page.evaluate((vw) => {
  const all = document.body.querySelectorAll("*");
  const out = [];
  for (const el of all) {
    const w = el.scrollWidth;
    if (w > vw + 10) {
      const cls = el.className || "";
      const tag = el.tagName.toLowerCase();
      const path = `${tag}.${typeof cls === "string" ? cls.split(" ").slice(0, 3).join(".") : ""}`;
      out.push({ path, scrollWidth: w, clientWidth: el.clientWidth });
    }
  }
  // Take just the top-level offenders (parents, not children)
  const topLevel = [];
  for (const o of out) {
    if (!topLevel.some((p) => o.path.startsWith(p.path))) topLevel.push(o);
  }
  return topLevel.slice(0, 15);
}, 768);

console.log("Overflowing elements (>778px):");
for (const o of overflowers) console.log(`  ${o.scrollWidth}px / client ${o.clientWidth}px ${o.path}`);

await browser.close();
