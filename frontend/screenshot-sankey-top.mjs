import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5174/";
const out = process.argv[3] || "screenshot-sankey-top.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 2400 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".sankey-svg", { timeout: 10000 });

// Scroll the Sankey into view and capture it
const svg = await page.locator(".sankey-svg").first();
await svg.scrollIntoViewIfNeeded();
await page.screenshot({ path: out, clip: { x: 0, y: 600, width: 1680, height: 1700 } });

// Verify Sankey has nodes for the new types and the slotting terminal
const found = await page.evaluate(() => {
  const titles = Array.from(document.querySelectorAll(".sankey-node-rect title"))
    .map((t) => t.textContent || "");
  const labels = Array.from(document.querySelectorAll(".sankey-node-label"))
    .map((t) => (t.textContent || "").trim());
  return {
    hasSpoilage: labels.some((l) => l.startsWith("Spoilage ")),
    hasSlottingNode: labels.some((l) => l.startsWith("Slotting ")),
    hasSlottingTerminal: labels.some((l) =>
      l.startsWith("Not disputable")
    ),
    hasSpoilageRootCause: labels.some(
      (l) =>
        l.startsWith("Temperature abuse") ||
        l.startsWith("Expired") ||
        l.startsWith("Quality complaint") ||
        l.startsWith("Damage in transit")
    ),
    totalLabels: labels.length,
    sampleLabels: labels.slice(0, 50),
  };
});

console.log("Sankey verification:");
console.log("  Spoilage node present:           ", found.hasSpoilage);
console.log("  Slotting node present:           ", found.hasSlottingNode);
console.log("  'Not disputable' terminal present:", found.hasSlottingTerminal);
console.log("  Spoilage root-cause node present:", found.hasSpoilageRootCause);
console.log("  Total labels:", found.totalLabels);
console.log("  Errors:", errors);

await browser.close();
