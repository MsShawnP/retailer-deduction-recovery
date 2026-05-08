// Verify Sankey label colors per layer.
// Layer 0 (lightest teal) → ink; layers 3-4 (darkest teal) → white.
import { chromium } from "playwright";
const PORT = process.env.PORT || "5184";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".sankey-node-label");

// Group labels by their underlying layer. Look at the corresponding rect.
const samples = await page.evaluate(() => {
  const out = [];
  const labels = document.querySelectorAll(".sankey-node-label");
  labels.forEach((label) => {
    // Find the rect that's the label's sibling
    const g = label.closest("g");
    const rect = g?.querySelector("rect");
    if (!rect) return;
    const fill = label.getAttribute("fill");
    const x = parseFloat(rect.getAttribute("x") || "0");
    out.push({ fill, x: Math.round(x) });
  });
  return out;
});

// Group by x (layers are at distinct x positions)
const byX = new Map();
for (const s of samples) {
  if (!byX.has(s.x)) byX.set(s.x, []);
  byX.get(s.x).push(s.fill);
}

console.log("Sankey label fills by layer (sorted by x = layer position):");
const sortedX = [...byX.keys()].sort((a, b) => a - b);
for (const x of sortedX) {
  const fills = byX.get(x);
  const unique = [...new Set(fills)];
  console.log(`  x=${x}: n=${fills.length} fills=${unique.join(", ")}`);
}

await browser.close();
