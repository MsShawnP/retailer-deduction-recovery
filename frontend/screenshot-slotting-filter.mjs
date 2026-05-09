import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5174/";
const out = process.argv[3] || "screenshot-slotting-filter.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("#type-filter", { timeout: 10000 });

// Filter to Slotting
await page.selectOption("#type-filter", "Slotting");
await page.waitForTimeout(500);

// Check what each operational-only section says
const text = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll("section"));
  return sections
    .map((s) => {
      const h2 = s.querySelector("h2");
      const empty =
        s.querySelector(".sim-empty,.cost-empty,.builder-empty,.pressure-empty,.audit-empty,.origin-empty");
      return {
        title: h2 ? h2.textContent : "",
        emptyText: empty ? (empty.textContent || "").trim().slice(0, 200) : null,
      };
    })
    .filter((x) => x.title);
});

console.log("Sections under slotting-only filter:");
for (const s of text) {
  if (s.emptyText) {
    console.log(`  ${s.title}: ${s.emptyText}`);
  } else {
    console.log(`  ${s.title}: (renders normally)`);
  }
}
console.log("Errors:", errors);

await page.screenshot({ path: out, fullPage: true });
await browser.close();
