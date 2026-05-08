// Verify the retailer scorecard: cards rendered, sort buttons,
// click-to-filter writes selection state and the filter chip shows
// the retailer name, scorecard preserves comparative view when a
// retailer filter is active (i.e. ignores the retailer filter
// itself but respects other filters).
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 5400 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".scorecard-card");

const cardCount = await page.locator(".scorecard-card").count();
console.log("Scorecard cards:", cardCount);

const cardNames = await page.locator(".scorecard-card-name").allInnerTexts();
const cardLosses = await page.locator(".scorecard-loss-value").allInnerTexts();
console.log("\nDefault sort (net loss desc):");
for (let i = 0; i < cardNames.length; i++) {
  console.log(`  ${cardNames[i].trim()} — net loss ${cardLosses[i].trim()}`);
}

await page.screenshot({ path: "scorecard-default.png", fullPage: true });

// Sort by Volume
await page.locator(".scorecard-sort-btn").nth(1).click();
await page.waitForTimeout(150);
const volumeSorted = await page.locator(".scorecard-card-name").allInnerTexts();
console.log("\nAfter sort=Volume:", volumeSorted.map(s => s.trim()));

// Sort by Recovery
await page.locator(".scorecard-sort-btn").nth(2).click();
await page.waitForTimeout(150);
const recSorted = await page.locator(".scorecard-card-name").allInnerTexts();
console.log("After sort=Recovery rate:", recSorted.map(s => s.trim()));

// Back to net loss
await page.locator(".scorecard-sort-btn").first().click();
await page.waitForTimeout(150);

// Click "Filter →" on first card → check chip + that scorecard still shows all retailers
const firstName = (await page.locator(".scorecard-card-name").first().innerText()).trim();
console.log(`\nClicking Filter on ${firstName}...`);
await page.locator(".scorecard-filter-btn").first().click();
await page.waitForTimeout(200);

const chipLabel = await page.locator(".selection-value").innerText().catch(() => "(no chip)");
const chipCount = await page.locator(".selection-count").innerText().catch(() => "(no count)");
console.log("Filter chip:", chipLabel.trim(), "·", chipCount.trim());

const cardCountAfterFilter = await page.locator(".scorecard-card").count();
console.log("Scorecard cards after retailer filter (should still show all):", cardCountAfterFilter);

const activeCard = await page.locator(".scorecard-card.active .scorecard-card-name").innerText().catch(() => "(none)");
console.log("Active card:", activeCard.trim());

// Confirm explorer or trace section reflects the filter
const sankeySelected = await page.locator(".selection-value").innerText().catch(() => "(none)");
console.log("Selection chip on app:", sankeySelected.trim());

// Click Filter again (× Clear) → selection cleared
await page.locator(".scorecard-card.active .scorecard-filter-btn").click();
await page.waitForTimeout(200);
const chipAfterClear = await page.locator(".selection-chip").count();
console.log("Chip count after clear (expect 0):", chipAfterClear);

// Combined test: filter by short_ship dropdown, then check scorecard rescopes
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssCardLosses = await page.locator(".scorecard-loss-value").allInnerTexts();
const ssCardNames = await page.locator(".scorecard-card-name").allInnerTexts();
console.log("\nAfter short_ship filter (scorecard should rescope):");
for (let i = 0; i < ssCardNames.length; i++) {
  console.log(`  ${ssCardNames[i].trim()} — net loss ${ssCardLosses[i].trim()}`);
}
await page.screenshot({ path: "scorecard-short-ship.png", fullPage: true });

console.log("\nErrors:", errors);
await browser.close();
