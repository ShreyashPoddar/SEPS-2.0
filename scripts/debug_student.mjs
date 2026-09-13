import puppeteer from "puppeteer-core";
import path from "path";

const SCREENSHOT_DIR = path.resolve("./manual_assets/screenshots");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 }
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  console.log("Navigating to /login...");
  await page.goto("http://localhost:5176/login", { waitUntil: "networkidle2" });
  await page.type('input', 'RA2311053010076');
  await page.click('button[type="submit"]');

  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.type('input[type="password"]', 'suha010076');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  await sleep(2000);

  console.log("Navigating to student dashboard...");
  await page.goto("http://localhost:5176/student-dashboard", { waitUntil: "networkidle2" });
  await sleep(2500);

  // Take fresh student dashboard screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_student_dashboard.png") });
  console.log("📸 Saved: 04_student_dashboard.png");

  // Search filter screenshot
  const searchInput = await page.$('input[placeholder*="Search" i]');
  if (searchInput) {
    await searchInput.type("Drone");
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_student_search_filter.png") });
    console.log("📸 Saved: 05_student_search_filter.png");
    // Clear search input
    await page.evaluate(() => {
      const inp = document.querySelector('input[placeholder*="Search" i]');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1000);
  }

  // Find Apply button
  const applyBtn = await page.$('button ::-p-text("Apply as Team Leader")');
  if (applyBtn) {
    console.log("Clicking Apply as Team Leader...");
    await applyBtn.click();
    await sleep(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_student_apply_modal_individual.png") });
    console.log("📸 Saved: 06_student_apply_modal_individual.png");

    // Add a teammate or type in registration number
    const regInput = await page.$('input[placeholder*="RA21" i], input[placeholder*="Register" i], input[type="text"]');
    if (regInput) {
      await regInput.type("RA2311004010001");
      await sleep(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_student_apply_modal_team.png") });
    console.log("📸 Saved: 07_student_apply_modal_team.png");
  } else {
    console.log("Apply button not found");
  }

  await browser.close();
  console.log("Done student modals capture!");
})();
