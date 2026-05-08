// Verify the recovery simulation: empty state shows current = projected,
// each toggle moves the projected numbers, "Enable all" produces the
// projected-with-all-fixes state, and reset returns to baseline.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".sim-toggle");

// Read all toggle solo impacts.
const toggleCount = await page.locator(".sim-toggle").count();
console.log("Toggle count:", toggleCount);

const toggleTitles = await page.locator(".sim-toggle-title").allInnerTexts();
const toggleAffected = await page.locator(".sim-toggle-impact-num").allInnerTexts();
const toggleSavings = await page
  .locator(".sim-toggle-impact-savings")
  .allInnerTexts();
for (let i = 0; i < toggleTitles.length; i++) {
  console.log(
    `  ${toggleTitles[i].trim()} — ${toggleAffected[i].trim()} affected, ${toggleSavings[i].replace(/\s+/g, " ").trim()}`
  );
}

// Read default current/projected (all toggles off → should match)
async function readCompare() {
  const rows = await page.locator(".sim-compare-row").all();
  const out = [];
  for (const r of rows) {
    const text = (await r.innerText()).replace(/\s+/g, " ").trim();
    out.push(text);
  }
  return out;
}

console.log("\nDefault (all off):");
for (const r of await readCompare()) console.log("  " + r);

await page.screenshot({ path: "sim-default.png", fullPage: true });

// Enable just compliant_labels
await page.locator(".sim-toggle input").first().check();
await page.waitForTimeout(150);
console.log("\nWith compliant labels only:");
for (const r of await readCompare()) console.log("  " + r);

// Enable all toggles via "Enable all"
await page.locator(".sim-actions button").first().click();
await page.waitForTimeout(150);
console.log("\nWith all toggles on:");
for (const r of await readCompare()) console.log("  " + r);
await page.screenshot({ path: "sim-all-on.png", fullPage: true });

// Reset
await page.locator(".sim-actions button").nth(1).click();
await page.waitForTimeout(150);
console.log("\nAfter reset:");
for (const r of await readCompare()) console.log("  " + r);

// Filter cohort to short_ship; simulation should re-scope.
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(150);
const ctx = await page.locator(".sim-context").innerText();
console.log("\nShort-ship cohort context:", ctx.replace(/\s+/g, " ").trim());

await page.locator(".sim-actions button").first().click();
await page.waitForTimeout(150);
console.log("\nShort-ship + all toggles:");
for (const r of await readCompare()) console.log("  " + r);
await page.screenshot({ path: "sim-short-ship.png", fullPage: true });

console.log("\nErrors:", errors);
await browser.close();
