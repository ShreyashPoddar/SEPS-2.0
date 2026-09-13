import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve("./manual_assets/screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5176";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCapture() {
  console.log("🚀 Launching Chrome for screenshot capture...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();

  // Helper to take screenshot
  const shoot = async (filename, waitTime = 1500) => {
    await sleep(waitTime);
    const dest = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`📸 Saved: ${filename}`);
  };

  try {
    // -------------------------------------------------------------
    // 1. Landing Page
    // -------------------------------------------------------------
    console.log("--- Capturing Landing Page ---");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
    await shoot("01_landing_page.png", 2000);

    // -------------------------------------------------------------
    // 2. Login Page - Step 1: Identifier
    // -------------------------------------------------------------
    console.log("--- Capturing Login Step 1 ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await shoot("02_login_identifier.png", 1500);

    // Enter Student Identifier
    console.log("--- Capturing Login Step 2: Student ---");
    await page.type('input[placeholder*="RA21" i], input[type="text"]', "RA2311053010076");
    await page.click('button[type="submit"]');
    await sleep(1500);
    await shoot("03_login_student_password.png", 1000);

    // Enter Password and Log in
    console.log("--- Logging in as Student (SUHAS M) ---");
    await page.type('input[type="password"]', "suha010076");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
    await sleep(2500);

    // If redirected to profile or dashboard
    const currentUrl = page.url();
    console.log("Current URL after student login:", currentUrl);

    // -------------------------------------------------------------
    // 3. Student Dashboard
    // -------------------------------------------------------------
    console.log("--- Capturing Student Dashboard ---");
    await page.goto(`${BASE_URL}/student-dashboard`, { waitUntil: "networkidle2" });
    await shoot("04_student_dashboard.png", 2500);

    // Filter by Domain
    console.log("--- Capturing Student Dashboard with Filter ---");
    const domainButton = await page.$('button ::-p-text("AI/ML/DL")');
    if (domainButton) {
      await domainButton.click();
      await sleep(1000);
    } else {
      // Try clicking any filter badge or searching
      const searchInput = await page.$('input[placeholder*="Search" i]');
      if (searchInput) {
        await searchInput.type("Drone");
        await sleep(1000);
      }
    }
    await shoot("05_student_search_filter.png", 1000);

    // -------------------------------------------------------------
    // 4. Apply Modal (Individual & Team)
    // -------------------------------------------------------------
    console.log("--- Capturing Apply Modal ---");
    // Reload dashboard to reset search
    await page.goto(`${BASE_URL}/student-dashboard`, { waitUntil: "networkidle2" });
    await sleep(2000);
    
    // Find Apply button on first project card
    const applyBtn = await page.$('button ::-p-text("Apply Now"), button ::-p-text("Apply")');
    if (applyBtn) {
      await applyBtn.click();
      await sleep(1500);
      await shoot("06_student_apply_modal_individual.png", 1000);

      // Look for Team tab
      const teamTab = await page.$('button ::-p-text("Team"), button ::-p-text("Team Application")');
      if (teamTab) {
        await teamTab.click();
        await sleep(1000);
        await shoot("07_student_apply_modal_team.png", 1000);
      }

      // Close modal
      const closeBtn = await page.$('button[aria-label="Close"], button ::-p-text("Cancel"), button svg.lucide-x');
      if (closeBtn) await closeBtn.click();
      await sleep(500);
    }

    // -------------------------------------------------------------
    // 5. Student Profile
    // -------------------------------------------------------------
    console.log("--- Capturing Student Profile ---");
    await page.goto(`${BASE_URL}/student-profile`, { waitUntil: "networkidle2" });
    await shoot("08_student_profile.png", 2500);

    // -------------------------------------------------------------
    // 6. Ticket Tracker / Widget
    // -------------------------------------------------------------
    console.log("--- Capturing Ticket Tracker Widget ---");
    await page.goto(`${BASE_URL}/student-dashboard`, { waitUntil: "networkidle2" });
    await sleep(2000);
    // Find floating ticket widget or button
    const ticketWidgetBtn = await page.$('button ::-p-text("Tickets"), button[title*="Ticket" i], div[class*="ticket" i] button');
    if (ticketWidgetBtn) {
      await ticketWidgetBtn.click();
      await sleep(1000);
    }
    await shoot("09_student_ticket_tracker.png", 1000);

    // -------------------------------------------------------------
    // 7. Student Notifications
    // -------------------------------------------------------------
    console.log("--- Capturing Student Notifications ---");
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: "networkidle2" });
    await shoot("10_student_notifications.png", 2000);

    // -------------------------------------------------------------
    // 8. Teacher Login & Dashboard
    // -------------------------------------------------------------
    console.log("--- Logging out Student and Logging in Teacher ---");
    // Clear cookies & storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");

    // Login as Teacher (Dr. M. Sangeetha)
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.type('input[placeholder*="RA21" i], input[type="text"]', "sangeetm@srmist.edu.in");
    await page.click('button[type="submit"]');
    await sleep(1500);
    await shoot("11_login_teacher_password.png", 1000);

    await page.type('input[type="password"]', "12519355");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
    await sleep(2500);

    console.log("--- Capturing Teacher Dashboard ---");
    await page.goto(`${BASE_URL}/teacher-dashboard`, { waitUntil: "networkidle2" });
    await shoot("12_teacher_dashboard.png", 2500);

    // -------------------------------------------------------------
    // 9. Teacher Create Project Modal
    // -------------------------------------------------------------
    console.log("--- Capturing Teacher Create Project Modal ---");
    const createProjectBtn = await page.$('button ::-p-text("Create New Project"), button ::-p-text("New Project"), button ::-p-text("Propose Project"), button ::-p-text("Add Project")');
    if (createProjectBtn) {
      await createProjectBtn.click();
      await sleep(1500);
      await shoot("13_teacher_create_project.png", 1000);

      // Close modal
      const closeBtn = await page.$('button[aria-label="Close"], button ::-p-text("Cancel"), button svg.lucide-x');
      if (closeBtn) await closeBtn.click();
      await sleep(500);
    }

    // -------------------------------------------------------------
    // 10. Teacher Applications Review
    // -------------------------------------------------------------
    console.log("--- Capturing Teacher Applications Review ---");
    // Click on View Applications on a project card or navigate directly
    const viewAppsBtn = await page.$('button ::-p-text("Applications"), a[href*="applications"], button ::-p-text("View")');
    if (viewAppsBtn) {
      await viewAppsBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
      await sleep(2000);
      await shoot("14_teacher_applications_review.png", 2000);
    } else {
      // Navigate to first project's application URL if available
      await page.goto(`${BASE_URL}/teacher/applications/all`, { waitUntil: "networkidle2" }).catch(() => {});
      await shoot("14_teacher_applications_review.png", 2000);
    }

    // -------------------------------------------------------------
    // 11. Teacher My Teams
    // -------------------------------------------------------------
    console.log("--- Capturing Teacher My Teams ---");
    await page.goto(`${BASE_URL}/teacher/my-teams`, { waitUntil: "networkidle2" });
    await shoot("15_teacher_my_teams.png", 2000);

    // -------------------------------------------------------------
    // 12. Teacher Tickets
    // -------------------------------------------------------------
    console.log("--- Capturing Teacher Tickets ---");
    await page.goto(`${BASE_URL}/teacher/tickets`, { waitUntil: "networkidle2" });
    await shoot("16_teacher_tickets.png", 2000);

    // -------------------------------------------------------------
    // 13. Teacher Set Global Deadline
    // -------------------------------------------------------------
    console.log("--- Capturing Set Global Deadline ---");
    await page.goto(`${BASE_URL}/teacher/set-global-deadline`, { waitUntil: "networkidle2" });
    await shoot("17_teacher_global_deadline.png", 2000);

    // -------------------------------------------------------------
    // 14. Teacher Statistics Report
    // -------------------------------------------------------------
    console.log("--- Capturing Statistics Report ---");
    await page.goto(`${BASE_URL}/teacher/statistics-report`, { waitUntil: "networkidle2" });
    await shoot("18_teacher_statistics_report.png", 2500);

    // -------------------------------------------------------------
    // 15. Teacher Profile
    // -------------------------------------------------------------
    console.log("--- Capturing Teacher Profile ---");
    await page.goto(`${BASE_URL}/teacher-profile`, { waitUntil: "networkidle2" });
    await shoot("19_teacher_profile.png", 2000);

    console.log("🎉 All screenshots captured successfully!");
  } catch (err) {
    console.error("Error during screenshot capture:", err);
  } finally {
    await browser.close();
  }
}

runCapture();
