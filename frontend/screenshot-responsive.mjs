// Responsive viewport check: verify the layout doesn't break at iPad
// portrait (768×1024) and a laptop width (1366×768). Look for horizontal
// scrollbars (a sign of overflow) and run a quick interaction sanity
// check at each width.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const VIEWPORTS = [
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "macbook", width: 1366, height: 800 },
  { name: "wide", width: 1680, height: 1050 },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
  });

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });

  console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".cohort-bar");

  // Check for horizontal overflow
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = vp.width;
  console.log(`Document width ${docWidth}px vs viewport ${viewportWidth}px ${docWidth > viewportWidth ? "(OVERFLOW)" : "(OK)"}`);

  // Check that core elements render
  const cohortVisible = await page.locator(".cohort-bar").isVisible();
  const sankeyVisible = await page.locator("svg").first().isVisible();
  const explorerVisible = await page.locator(".explorer-card").first().isVisible();
  console.log(`Core visible — cohort:${cohortVisible} sankey:${sankeyVisible} explorer:${explorerVisible}`);

  // Cohort bar count + dollars at this width
  const cohort = await page.locator(".cohort-bar").innerText();
  console.log("Cohort:", cohort.replace(/\s+/g, " ").trim());

  // Apply a filter to verify reactivity
  await page.locator("#type-filter").selectOption("Short ship");
  await page.waitForTimeout(150);
  const filteredCohort = await page.locator(".cohort-bar").innerText();
  console.log("After filter:", filteredCohort.replace(/\s+/g, " ").trim());

  await page.locator(".cohort-bar-clear").click();
  await page.waitForTimeout(100);

  // Scroll to bottom to check views render at this width
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);

  await page.screenshot({ path: `responsive-${vp.name}.png`, fullPage: true });

  console.log("Errors:", errors.length === 0 ? "none" : errors);

  await page.close();
}

await browser.close();
