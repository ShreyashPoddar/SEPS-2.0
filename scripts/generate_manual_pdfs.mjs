import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve("./manual_assets/screenshots").replace(/\\/g, "/");
const DOWNLOADS_DIR = path.join(process.env.USERPROFILE, "Downloads");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function getImgPath(filename) {
  return `file:///${SCREENSHOTS_DIR}/${filename}`;
}

const SHARED_CSS = `
  @page {
    size: A4 portrait;
    margin: 18mm 15mm 20mm 15mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1E293B;
    background: #FFFFFF;
  }

  .cover-page {
    page-break-after: always;
    height: 92vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 24mm 16mm;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 12px;
  }

  .cover-header {
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 12mm;
  }

  .cover-inst {
    font-size: 13pt;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #60A5FA;
  }

  .cover-dept {
    font-size: 11pt;
    font-weight: 500;
    color: #94A3B8;
    margin-top: 4px;
  }

  .cover-body {
    margin: 20mm 0;
  }

  .cover-tag {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    background: #1E3A8A;
    border: 1px solid #3B82F6;
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #93C5FD;
    margin-bottom: 16px;
  }

  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    line-height: 1.25;
    color: #FFFFFF;
    margin-bottom: 14px;
  }

  .cover-subtitle {
    font-size: 13pt;
    font-weight: 400;
    color: #E2E8F0;
    max-width: 600px;
    line-height: 1.5;
  }

  .cover-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 10mm;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #94A3B8;
  }

  h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #0F172A;
    border-bottom: 2.5px solid #2563EB;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }

  .page-break {
    page-break-before: always;
  }

  h2 {
    font-size: 13.5pt;
    font-weight: 700;
    color: #1E3A8A;
    margin-top: 18px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  p {
    margin-bottom: 12px;
    color: #334155;
    text-align: justify;
  }

  ul, ol {
    margin-left: 20px;
    margin-bottom: 14px;
    color: #334155;
  }

  li {
    margin-bottom: 6px;
  }

  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    margin: 14px 0;
    page-break-inside: avoid;
    font-size: 9.5pt;
  }

  .alert-important {
    background: #EFF6FF;
    border-left: 4px solid #2563EB;
    color: #1E3A8A;
  }

  .alert-warning {
    background: #FFFBEB;
    border-left: 4px solid #F59E0B;
    color: #92400E;
  }

  .figure-container {
    margin: 14px 0;
    text-align: center;
    page-break-inside: avoid;
  }

  .figure-img {
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    background: #F8FAFC;
  }

  .figure-caption {
    font-size: 8.5pt;
    font-weight: 600;
    color: #64748B;
    margin-top: 6px;
    font-style: italic;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    page-break-inside: avoid;
    font-size: 9pt;
  }

  th {
    background: #1E3A8A;
    color: #FFFFFF;
    font-weight: 700;
    padding: 8px 10px;
    text-align: left;
    border: 1px solid #1E3A8A;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #E2E8F0;
    vertical-align: top;
  }

  tr:nth-child(even) {
    background: #F8FAFC;
  }

  code {
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 8.5pt;
    background: #F1F5F9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0F172A;
    border: 1px solid #E2E8F0;
  }
`;

async function generatePDFs() {
  console.log("🚀 Launching Chrome for high-speed PDF generation...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files",
      "--enable-local-file-accesses",
    ],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  // -------------------------------------------------------------
  // 1. STUDENT MANUAL
  // -------------------------------------------------------------
  console.log("📄 Writing and compiling Student User Manual...");
  const studentHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>SEPS Student User Manual</title>
    <style>${SHARED_CSS}</style>
  </head>
  <body>
    <div class="cover-page">
      <div class="cover-header">
        <div class="cover-inst">SRM Institute of Science & Technology</div>
        <div class="cover-dept">Department of Electronics and Communication Engineering • Kattankulathur</div>
      </div>
      <div class="cover-body">
        <div class="cover-tag">Official Student Documentation</div>
        <h1 class="cover-title" style="border:none; color:white; margin:0;">Student Engineering Project System (SEPS)</h1>
        <div class="cover-subtitle">Complete Student Onboarding Guide, Capstone Application Manual & UI Feature Catalog</div>
      </div>
      <div class="cover-footer">
        <div>Academic Year 2026 – 2027</div>
        <div>Final Year Capstone Allocation Portal</div>
        <div>Version 2.4 • Confidential</div>
      </div>
    </div>

    <h1>1. System Introduction & Allocation Rules</h1>
    <p>
      The <strong>Student Engineering Project System (SEPS)</strong> is SRMIST's unified portal designed to govern, automate, and orchestrate final-year capstone engineering allocations across the Department of Electronics and Communication Engineering.
    </p>
    <p>
      The platform enforces strict merit transparency, department stream eligibility, vacancy tracking, and collaborative multi-member team formation.
    </p>
    <div class="alert alert-important">
      <strong>Core Institutional Policy:</strong>
      Each student is permitted a maximum of <strong>two simultaneous applications</strong> (Priority 1 and Priority 2). As soon as any faculty guide formally accepts your submission, your team is permanently allocated and all secondary applications are automatically revoked.
    </div>

    <div class="figure-container">
      <img src="${getImgPath("01_landing_page.png")}" class="figure-img" alt="SEPS Landing Page">
      <div class="figure-caption">Figure 1.1: SEPS Official Landing Page showcasing institutional branding and direct portal entry.</div>
    </div>

    <div class="page-break"></div>
    <h1>2. Two-Step Authentication & Account Setup</h1>
    <p>
      SEPS employs a fortified two-step authentication mechanism to eliminate unauthorized access and verify student credentials against institutional registers.
    </p>

    <h2>Step 1: Institutional Identifier Verification</h2>
    <p>
      Input your official SRM registration number (e.g. <code>RA2311053010076</code>) into the identifier field and submit. The system queries the database to confirm your identity.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("02_login_identifier.png")}" class="figure-img" alt="Login Step 1">
      <div class="figure-caption">Figure 2.1: Login Step 1 – Entering Student Registration Number.</div>
    </div>

    <h2>Step 2: Password Authentication</h2>
    <p>
      Once verified, the portal displays your full name, department, and role badge. Enter your confidential student password.
    </p>
    <div class="alert alert-important">
      <strong>Default Student Password Formula:</strong><br>
      <code>First 4 lowercase letters of First Name + Last 6 digits of Registration Number</code><br>
      <em>Example:</em> For student <strong>SUHAS M</strong> (Reg: <code>RA2311053010076</code>), the password is <code>suha010076</code>.
    </div>
    <div class="figure-container">
      <img src="${getImgPath("03_login_student_password.png")}" class="figure-img" alt="Login Step 2">
      <div class="figure-caption">Figure 2.2: Login Step 2 – Confirmed Student Banner and Password Input.</div>
    </div>

    <div class="page-break"></div>
    <h1>3. Student Profile Verification Gate</h1>
    <p>
      Upon first sign-in, students are guided through the <strong>Mandatory Profile Gate</strong>. You cannot browse or apply for capstone projects until every field is complete and certified.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("08_student_profile.png")}" class="figure-img" alt="Student Profile">
      <div class="figure-caption">Figure 3.1: Student Profile portal featuring academic data, portfolio links, and internship declarations.</div>
    </div>

    <h2>Key Required Fields:</h2>
    <ul>
      <li><strong>Cumulative GPA (CGPA):</strong> Validated numeric value between 0.01 and 10.00 (e.g. 9.35).</li>
      <li><strong>Department & Section:</strong> Pre-assigned by institutional administration (e.g. Section K, ECE Data Science).</li>
      <li><strong>Portfolio & Resume URLs:</strong> Direct links to your LinkedIn profile, GitHub repository, and Google Drive resume.</li>
      <li><strong>Cohort Track:</strong> Select either <code>Regular On-Campus</code> or <code>Corporate Internship</code> (requires company name and duration).</li>
    </ul>

    <div class="alert alert-warning">
      <strong>Cohort Mismatch Warning:</strong> Student teams must be homogeneous. Regular students cannot team up with Corporate Internship students due to differing review schedules.
    </div>

    <div class="page-break"></div>
    <h1>4. Capstone Project Exploration & Search</h1>
    <p>
      The <strong>Student Dashboard</strong> provides real-time access to all approved capstone listings proposed by departmental faculty members.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("04_student_dashboard.png")}" class="figure-img" alt="Student Dashboard">
      <div class="figure-caption">Figure 4.1: Student Dashboard featuring centralized deadline, domain filters, and project cards.</div>
    </div>

    <h2>Real-Time Keyword Search & Discipline Filters</h2>
    <p>
      Use the search bar to locate specific technologies (e.g., <em>Drone, LoRaWAN, TinyML</em>) or toggle domain chips (e.g., <em>AI/ML/DL, Embedded Systems, Antenna & RF</em>) to isolate listings.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("05_student_search_filter.png")}" class="figure-img" alt="Search and Filter">
      <div class="figure-caption">Figure 4.2: Filtered view of matching capstone projects.</div>
    </div>

    <div class="page-break"></div>
    <h1>5. Submitting Project Applications</h1>
    <p>
      Students submit proposals by acting as the <strong>Team Leader</strong>. Locate your chosen project card and click <strong>Apply as Team Leader</strong>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("06_student_apply_modal_individual.png")}" class="figure-img" alt="Apply Modal Overview">
      <div class="figure-caption">Figure 5.1: Project Application Modal showing guide details, capacity, and project abstract.</div>
    </div>

    <h2>Forming and Verifying Your Team</h2>
    <p>
      Enter each teammate's official registration number. The system performs instant checks to confirm that the student is not already allocated, shares your cohort track, and meets stream criteria.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("07_student_apply_modal_team.png")}" class="figure-img" alt="Adding Teammates">
      <div class="figure-caption">Figure 5.2: Adding team members with automated validation before submission.</div>
    </div>

    <div class="page-break"></div>
    <h1>6. Ticket Tracker & Notifications</h1>
    <h2>Change Requests & Dispute Resolution</h2>
    <p>
      Need to request a guide change or project title modification? Use the integrated <strong>Ticket Tracker</strong> to lodge formal requests routed to your Faculty Advisor and HOD.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("09_student_ticket_tracker.png")}" class="figure-img" alt="Ticket Tracker">
      <div class="figure-caption">Figure 6.1: Ticket Tracker Widget displaying change requests and approval stages.</div>
    </div>

    <h2>Notifications Center</h2>
    <p>
      Stay informed of guide decisions, team invites, and administrative announcements at <code>/notifications</code>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("10_student_notifications.png")}" class="figure-img" alt="Notifications">
      <div class="figure-caption">Figure 6.2: Timestamped notifications feed for application status alerts.</div>
    </div>

    <div class="page-break"></div>
    <h1>7. Complete Student Button & Feature Encyclopedia</h1>
    <table>
      <thead>
        <tr>
          <th>Screen / Area</th>
          <th>Button / Feature</th>
          <th>Type</th>
          <th>Action Triggered & Behavior</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>My Applications</td>
          <td>Button</td>
          <td>Opens drawer displaying submitted applications and priority tags.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Change Tickets</td>
          <td>Button</td>
          <td>Opens grievance and change request portal.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Notifications</td>
          <td>Button</td>
          <td>Navigates to <code>/notifications</code> with live unread counter.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Logout</td>
          <td>Button</td>
          <td>Terminates user session and returns to login gate.</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Search Input</td>
          <td>Text Input</td>
          <td>Instantly filters project titles, abstracts, and faculty names.</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Domain Chips</td>
          <td>Filter Pills</td>
          <td>Filters listings by technological domains (AI/ML, IoT, VLSI, etc.).</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Clear Filters</td>
          <td>Button</td>
          <td>Resets search terms and domain filters to display all projects.</td>
        </tr>
        <tr>
          <td><strong>Project Card</strong></td>
          <td>Apply as Team Leader</td>
          <td>Action Button</td>
          <td>Launches Application Modal for chosen capstone listing.</td>
        </tr>
        <tr>
          <td><strong>Apply Modal</strong></td>
          <td>Add Teammate</td>
          <td>Button</td>
          <td>Adds an extra registration number field for team expansion.</td>
        </tr>
        <tr>
          <td><strong>Apply Modal</strong></td>
          <td>Submit Application</td>
          <td>Button</td>
          <td>Dispatches team proposal to the faculty guide's review queue.</td>
        </tr>
        <tr>
          <td><strong>Student Profile</strong></td>
          <td>Save Changes</td>
          <td>Button</td>
          <td>Validates and commits updated CGPA, skills, and links to TiDB.</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>
    <h1>8. Frequently Asked Questions (FAQ)</h1>
    <h3>Q1: Why does a project card say "Application Limit Reached"?</h3>
    <p>
      Students are limited to two concurrent submissions (Priority 1 and Priority 2). Once both slots are occupied, you cannot apply to further projects unless a guide declines your submission.
    </p>
    <h3>Q2: Can students from different branches form a team?</h3>
    <p>
      Yes, provided the proposing faculty guide explicitly marked the project's allowed streams as <code>All Streams</code> or included both respective department codes.
    </p>
    <h3>Q3: What if I lose my password?</h3>
    <p>
      Contact your Section Faculty Advisor. They have administrative privileges to verify your identity and generate a temporary access PIN.
    </p>
  </body>
  </html>
  `;

  const studentHtmlPath = path.resolve("./manual_student.html");
  fs.writeFileSync(studentHtmlPath, studentHtml, "utf8");

  await page.goto(`file:///${studentHtmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1500));

  const studentPdfPath = path.join(DOWNLOADS_DIR, "SEPS_Student_User_Manual.pdf");
  const localStudentPdfPath = path.resolve("./SEPS_Student_User_Manual.pdf");

  await page.pdf({
    path: studentPdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-family: sans-serif; font-size: 8pt; color: #94A3B8; width: 100%; text-align: right; padding-right: 15mm;">SEPS Student User Manual • SRMIST ECE</div>`,
    footerTemplate: `<div style="font-family: sans-serif; font-size: 8pt; color: #94A3B8; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm;"><span>SRM Institute of Science & Technology</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`
  });
  fs.copyFileSync(studentPdfPath, localStudentPdfPath);
  console.log(`✅ Successfully generated Student PDF: ${studentPdfPath}`);

  // -------------------------------------------------------------
  // 2. TEACHER MANUAL
  // -------------------------------------------------------------
  console.log("📄 Writing and compiling Faculty User Manual...");
  const teacherHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>SEPS Faculty User Manual</title>
    <style>${SHARED_CSS}</style>
  </head>
  <body>
    <div class="cover-page">
      <div class="cover-header">
        <div class="cover-inst">SRM Institute of Science & Technology</div>
        <div class="cover-dept">Department of Electronics and Communication Engineering • Kattankulathur</div>
      </div>
      <div class="cover-body">
        <div class="cover-tag">Official Faculty Documentation</div>
        <h1 class="cover-title" style="border:none; color:white; margin:0;">Student Engineering Project System (SEPS)</h1>
        <div class="cover-subtitle">Comprehensive Faculty Guide, Capstone Proposal Workflow & Administration Manual</div>
      </div>
      <div class="cover-footer">
        <div>Academic Year 2026 – 2027</div>
        <div>Faculty Supervisory & Review Portal</div>
        <div>Version 2.4 • Confidential</div>
      </div>
    </div>

    <h1>1. Introduction to Faculty Capabilities</h1>
    <p>
      The <strong>Student Engineering Project System (SEPS)</strong> equips faculty members and capstone coordinators with an intelligent administrative dashboard to propose research topics, evaluate student applicant teams, enforce quota limits, and resolve academic change requests.
    </p>

    <div class="figure-container">
      <img src="${getImgPath("01_landing_page.png")}" class="figure-img" alt="SEPS Landing Page">
      <div class="figure-caption">Figure 1.1: SEPS Landing Page with faculty access.</div>
    </div>

    <div class="page-break"></div>
    <h1>2. Faculty Authentication & Account Access</h1>
    <p>
      Faculty members sign in using their official institutional email address (e.g., <code>sangeetm@srmist.edu.in</code>) and assigned 8-digit numeric PIN or confidential password.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("02_login_identifier.png")}" class="figure-img" alt="Login Step 1">
      <div class="figure-caption">Figure 2.1: Step 1 – Entering institutional email address.</div>
    </div>

    <div class="figure-container">
      <img src="${getImgPath("11_login_teacher_password.png")}" class="figure-img" alt="Faculty Login Step 2">
      <div class="figure-caption">Figure 2.2: Step 2 – Faculty identification screen with designation and PIN entry.</div>
    </div>

    <div class="page-break"></div>
    <h1>3. Teacher Dashboard Overview</h1>
    <p>
      The <strong>Teacher Dashboard</strong> serves as the central command console for all supervisory duties, summarizing project proposals, pending applications, and approved groups.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("12_teacher_dashboard.png")}" class="figure-img" alt="Teacher Dashboard">
      <div class="figure-caption">Figure 3.1: Teacher Dashboard displaying metric cards, deadline banner, and active projects.</div>
    </div>

    <h2>Key Dashboard Components:</h2>
    <ul>
      <li><strong>Central Capstone Deadline Banner:</strong> Displays the institutional cutoff date for student team submissions.</li>
      <li><strong>Coordinator Controls:</strong> Direct access to <em>Set Global Deadline</em> and <em>Statistics Report</em> for designated department convenors.</li>
      <li><strong>Project Quota Tracker:</strong> Real-time counter showing active versus allocated proposals.</li>
    </ul>

    <div class="page-break"></div>
    <h1>4. Proposing & Uploading Capstone Topics</h1>
    <p>
      Faculty can propose innovative projects aligned with departmental research interests or funded laboratories.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("13_teacher_create_project.png")}" class="figure-img" alt="Upload Project Form">
      <div class="figure-caption">Figure 4.1: Collapsible Project Upload Form with stream selection and technical domain tags.</div>
    </div>

    <h2>Project Proposal Fields:</h2>
    <ul>
      <li><strong>Project Title:</strong> Concise, formal academic title.</li>
      <li><strong>Technical Abstract:</strong> Detailed statement outlining problem context, required hardware/tools, and expected outcomes.</li>
      <li><strong>Allowed Streams:</strong> Multiselect filter for department streams (e.g. <em>ECE Core, Cyber Physical Systems, Data Science, All Streams</em>).</li>
      <li><strong>Domain Category:</strong> Approved IEEE disciplines (e.g. <em>AI/ML/DL, Embedded Systems & IoT, Wireless Networks</em>).</li>
      <li><strong>Sanctioned Team Size:</strong> Maximum number of students permitted (typically 1 to 4 members).</li>
    </ul>

    <div class="page-break"></div>
    <h1>5. Reviewing Applications & Team Allocation</h1>
    <p>
      When prospective student teams apply, click <strong>View Applications</strong> on your project card to access the candidate queue.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("14_teacher_applications_review.png")}" class="figure-img" alt="Applications Review">
      <div class="figure-caption">Figure 5.1: Applications Review portal displaying student CGPA, skills, and proposal pitch.</div>
    </div>

    <h2>Candidate Evaluation & Actions:</h2>
    <ul>
      <li><strong>Reviewing Academic Credentials:</strong> Inspect member CGPAs, LinkedIn profiles, and cloud resumes.</li>
      <li><strong>Cohort Track Check:</strong> Ensure applicant cohort fits your laboratory mode (Regular On-Campus vs Corporate Internship).</li>
      <li><strong>Accept Team:</strong> Officially locks the team to your project, updates status to <code>Allocated</code>, and notifies members.</li>
      <li><strong>Decline Application:</strong> Rejects proposal, freeing students to seek alternative guides.</li>
    </ul>

    <div class="page-break"></div>
    <h1>6. Managing Teams & Dispute Resolution</h1>
    <h2>Monitoring Allocated Teams (My Teams)</h2>
    <p>
      Access <code>/teacher/my-teams</code> to track milestones, documentation uploads, and contact details for all groups under your supervision.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("15_teacher_my_teams.png")}" class="figure-img" alt="My Teams">
      <div class="figure-caption">Figure 6.1: My Teams portal detailing members and milestone schedules.</div>
    </div>

    <h2>Grievance & Change Ticket Resolution</h2>
    <p>
      Review and resolve student-submitted guide transfers, team splits, and project modifications at <code>/teacher/tickets</code>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("16_teacher_tickets.png")}" class="figure-img" alt="Teacher Tickets">
      <div class="figure-caption">Figure 6.2: Teacher Tickets resolution console with review actions.</div>
    </div>

    <div class="page-break"></div>
    <h1>7. Coordinator Controls & Profile Settings</h1>
    <h2>Setting Central Deadlines</h2>
    <p>
      Designated coordinators can configure the departmental application cutoff at <code>/teacher/set-global-deadline</code>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("17_teacher_global_deadline.png")}" class="figure-img" alt="Set Global Deadline">
      <div class="figure-caption">Figure 7.1: Centralized calendar interface for configuring allocation deadlines.</div>
    </div>

    <h2>Departmental Statistics Report</h2>
    <p>
      Track overall allocation percentages and domain distribution charts at <code>/teacher/statistics-report</code>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("18_teacher_statistics_report.png")}" class="figure-img" alt="Statistics Report">
      <div class="figure-caption">Figure 7.2: Department-wide statistics and accreditation audit report.</div>
    </div>

    <h2>Faculty Profile & Cabin Info</h2>
    <p>
      Keep your research interests, lab cabin number, and contact info updated at <code>/teacher-profile</code>.
    </p>
    <div class="figure-container">
      <img src="${getImgPath("19_teacher_profile.png")}" class="figure-img" alt="Teacher Profile">
      <div class="figure-caption">Figure 7.3: Faculty Profile page with cabin and specialization records.</div>
    </div>

    <div class="page-break"></div>
    <h1>8. Complete Teacher Feature & Button Encyclopedia</h1>
    <table>
      <thead>
        <tr>
          <th>Screen / Area</th>
          <th>Button / Feature</th>
          <th>Type</th>
          <th>Action Triggered & Behavior</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>My Teams</td>
          <td>Button</td>
          <td>Navigates to <code>/teacher/my-teams</code> to manage active student groups.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Tickets</td>
          <td>Button</td>
          <td>Opens <code>/teacher/tickets</code> with pending review badge counter.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Profile</td>
          <td>Button</td>
          <td>Navigates to <code>/teacher-profile</code> to update cabin and research interests.</td>
        </tr>
        <tr>
          <td><strong>Global Navbar</strong></td>
          <td>Logout</td>
          <td>Button</td>
          <td>Ends faculty session and returns to login gate.</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Upload Capstone Project</td>
          <td>Banner Toggle</td>
          <td>Expands/collapses the new project creation form.</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Set Global Deadline</td>
          <td>Button (Coordinator)</td>
          <td>Opens institutional registration window calendar.</td>
        </tr>
        <tr>
          <td><strong>Dashboard</strong></td>
          <td>Statistics Report</td>
          <td>Button (Coordinator)</td>
          <td>Opens department analytics and audit metrics.</td>
        </tr>
        <tr>
          <td><strong>Project Card</strong></td>
          <td>View Applications</td>
          <td>Action Button</td>
          <td>Opens the candidate queue for that specific project.</td>
        </tr>
        <tr>
          <td><strong>Project Card</strong></td>
          <td>Edit Project</td>
          <td>Button</td>
          <td>Opens dialog to modify project title, description, or stream tags.</td>
        </tr>
        <tr>
          <td><strong>Project Card</strong></td>
          <td>Delete Project</td>
          <td>Button</td>
          <td>Prompts confirmation to permanently remove unallocated proposal.</td>
        </tr>
        <tr>
          <td><strong>Applications Review</strong></td>
          <td>Accept Team</td>
          <td>Button (Green)</td>
          <td>Finalizes allocation, locks project, and notifies students.</td>
        </tr>
        <tr>
          <td><strong>Applications Review</strong></td>
          <td>Decline Application</td>
          <td>Button (Red)</td>
          <td>Rejects proposal and frees students to apply for alternative projects.</td>
        </tr>
        <tr>
          <td><strong>Statistics Screen</strong></td>
          <td>Export to PDF</td>
          <td>Button</td>
          <td>Generates an accreditation-ready PDF audit summary.</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>
    <h1>9. Frequently Asked Questions & Guide Best Practices</h1>
    <h3>Q1: Can I guide more than two capstone teams?</h3>
    <p>
      The department sets a supervisory ceiling of two student groups per faculty member to ensure adequate mentorship quality. Exceptions for industrial collaborations must be approved by the HOD.
    </p>
    <h3>Q2: Can I edit project requirements after publishing?</h3>
    <p>
      Yes, as long as the project is not yet locked to an accepted team. Once allocated, scope changes must be processed through the formal change ticket system.
    </p>
    <h3>Q3: What happens if a team member withdraws mid-semester?</h3>
    <p>
      The team leader should raise a Team Reconstitution ticket through the Ticket Tracker for endorsement by the Faculty Advisor and HOD.
    </p>
  </body>
  </html>
  `;

  const teacherHtmlPath = path.resolve("./manual_teacher.html");
  fs.writeFileSync(teacherHtmlPath, teacherHtml, "utf8");

  await page.goto(`file:///${teacherHtmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1500));

  const teacherPdfPath = path.join(DOWNLOADS_DIR, "SEPS_Teacher_User_Manual.pdf");
  const localTeacherPdfPath = path.resolve("./SEPS_Teacher_User_Manual.pdf");

  await page.pdf({
    path: teacherPdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-family: sans-serif; font-size: 8pt; color: #94A3B8; width: 100%; text-align: right; padding-right: 15mm;">SEPS Faculty User Manual • SRMIST ECE</div>`,
    footerTemplate: `<div style="font-family: sans-serif; font-size: 8pt; color: #94A3B8; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm;"><span>SRM Institute of Science & Technology</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`
  });
  fs.copyFileSync(teacherPdfPath, localTeacherPdfPath);
  console.log(`✅ Successfully generated Teacher PDF: ${teacherPdfPath}`);

  await browser.close();
  console.log("🎉 Both PDF manuals generated successfully via local HTML files!");
}

generatePDFs().catch(console.error);
