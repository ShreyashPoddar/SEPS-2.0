import puppeteer from "puppeteer-core";
import path from "path";

const SCREENSHOT_DIR = path.resolve("./manual_assets/screenshots");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5176";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureModals() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();

  try {
    // 1. Student Login & Apply Modal
    console.log("--- Logging in as Student ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.type('input[placeholder*="RA21" i], input[type="text"]', "RA2311053010076");
    await page.click('button[type="submit"]');
    await sleep(1200);
    await page.type('input[type="password"]', "suha010076");
    await page.click('button[type="submit"]');
    await sleep(2500);

    console.log("--- Navigating to Student Dashboard ---");
    await page.goto(`${BASE_URL}/student-dashboard`, { waitUntil: "networkidle2" });
    await sleep(2000);

    const applyButton = await page.$('button ::-p-text("Apply as Team Leader")');
    if (applyButton) {
      console.log("Clicking Apply as Team Leader...");
      await applyButton.click();
      await sleep(1500);

      const dest1 = path.join(SCREENSHOT_DIR, "06_student_apply_modal_individual.png");
      await page.screenshot({ path: dest1 });
      console.log("📸 Saved: 06_student_apply_modal_individual.png");

      // Check for Team / Teammate inputs or tabs
      const teamTab = await page.$('button ::-p-text("Team"), button ::-p-text("Add Teammate"), input[placeholder*="RA21" i]');
      if (teamTab) {
        if (teamTab.click) await teamTab.click().catch(() => {});
        await sleep(1000);
      }
      const dest2 = path.join(SCREENSHOT_DIR, "07_student_apply_modal_team.png");
      await page.screenshot({ path: dest2 });
      console.log("📸 Saved: 07_student_apply_modal_team.png");
    } else {
      console.log("Could not find Apply as Team Leader button");
    }

    // 2. Teacher Login & Project Upload Form
    console.log("--- Logging out and Logging in as Teacher ---");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");

    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.type('input[placeholder*="RA21" i], input[type="text"]', "sangeetm@srmist.edu.in");
    await page.click('button[type="submit"]');
    await sleep(1200);
    await page.type('input[type="password"]', "12519355");
    await page.click('button[type="submit"]');
    await sleep(2500);

    await page.goto(`${BASE_URL}/teacher-dashboard`, { waitUntil: "networkidle2" });
    await sleep(2000);

    const uploadBanner = await page.$('button ::-p-text("Upload a New Capstone Project")');
    if (uploadBanner) {
      console.log("Expanding Upload a New Capstone Project banner...");
      await uploadBanner.click();
      await sleep(1500);

      const dest3 = path.join(SCREENSHOT_DIR, "13_teacher_create_project.png");
      await page.screenshot({ path: dest3 });
      console.log("📸 Saved: 13_teacher_create_project.png");
    }

  } catch (err) {
    console.error("Error capturing modals:", err);
  } finally {
    await browser.close();
  }
}

captureModals();
