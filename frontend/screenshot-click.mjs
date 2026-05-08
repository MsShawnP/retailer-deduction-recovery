// Screenshot the Sankey with a node clicked, to verify highlight + filter behavior.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector(".sankey-svg");

// Default state (no selection)
await page.screenshot({ path: "sankey-default.png", fullPage: true });

// Click the first layer-0 node (a deduction type)
const firstNode = await page.locator(".sankey-node-rect").first();
await firstNode.click();
await page.waitForSelector(".selection-chip");
await page.screenshot({ path: "sankey-clicked.png", fullPage: true });

// Read the chip text to confirm filter applied
const chipText = await page.locator(".selection-chip").innerText();
console.log("Selection chip:", chipText);
console.log("Errors:", errors);

await browser.close();
