import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// --- Brevo SMTP Configuration ---
const SMTP_HOST = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || "587", 10);
const SMTP_USER = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
const SMTP_KEY = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL;
const SENDER_NAME = process.env.SENDER_NAME || "SEPS Admin";
const PROJECT_NAME = process.env.PROJECT_NAME || "Project Connect SRM";

export const isMailConfigured = Boolean((SMTP_USER && SMTP_KEY && SENDER_EMAIL) || (BREVO_API_KEY && SENDER_EMAIL));

// --- Brevo Daily Quota Rate Limiter (Default 285 to keep safe 15 buffer under 300) ---
export const DAILY_EMAIL_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || "285", 10);
let dailyEmailCount = 0;
let currentDay = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

/**
 * Returns current daily email quota stats.
 */
export const getDailyMailStats = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) {
    currentDay = today;
    dailyEmailCount = 0;
  }
  return {
    count: dailyEmailCount,
    limit: DAILY_EMAIL_LIMIT,
    remaining: Math.max(0, DAILY_EMAIL_LIMIT - dailyEmailCount),
    date: currentDay,
  };
};

/**
 * Checks whether an email can be sent within today's quota.
 */
export const canSendEmail = () => {
  const stats = getDailyMailStats();
  return stats.count < stats.limit;
};

/**
 * Increments the daily sent email counter.
 */
export const recordEmailSent = () => {
  dailyEmailCount++;
  const stats = getDailyMailStats();
  console.log(`📊 [Brevo Quota] Sent: ${stats.count}/${stats.limit} emails today (${stats.remaining} remaining)`);
};

/**
 * Sends email via Brevo REST API over HTTPS (Port 443).
 * Essential for Render Free Tier which blocks outbound SMTP ports 25, 465, 587, 2525.
 */
const sendViaBrevoApi = async ({ to, name, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s max

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to, name: name || to }],
        subject,
        htmlContent,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      recordEmailSent();
      console.log(`✅ [Brevo API] Email sent successfully to ${to}`);
      return { success: true };
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error(`❌ [Brevo API] HTTP Error ${res.status}:`, errData);
      return { success: false, reason: "API_ERROR", error: errData };
    }
  } catch (err) {
    console.error("❌ [Brevo API] Request failed:", err.message);
    return { success: false, reason: "API_REQUEST_FAILED", error: err.message };
  }
};

if (!isMailConfigured) {
  const missing = [];
  if (!SMTP_USER && !BREVO_API_KEY) missing.push("BREVO_SMTP_USER or BREVO_API_KEY");
  if (!SMTP_KEY && !BREVO_API_KEY) missing.push("BREVO_SMTP_KEY or BREVO_API_KEY");
  if (!SENDER_EMAIL) missing.push("SENDER_EMAIL");
  console.warn(
    `✉️  Brevo Email disabled — missing in .env: ${missing.join(", ")}. Everything else runs normally; set these to enable live email delivery.`
  );
}

let transporter = null;
if (Boolean(SMTP_USER && SMTP_KEY && SENDER_EMAIL)) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_KEY,
    },
    // Strict connection timeouts to prevent server hanging when cloud hosts block SMTP
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 5000,
  });
}

/**
 * Sends a verification email to a new user.
 * @param {string} to - The recipient's email address.
 * @param {string} name - The recipient's full name.
 * @param {string} token - The unique verification token.
 */
export const sendVerificationEmail = async (to, name, token) => {
  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5176"}/verify?token=${token}`;

  if (!isMailConfigured) {
    console.warn(`✉️  Skipped email to ${to} — Brevo is not configured in .env.`);
    console.log(`🔑 [Console Fallback Verification Link]: ${verifyUrl} for ${to}`);
    return { success: false, reason: "NOT_CONFIGURED", fallbackUrl: verifyUrl };
  }

  if (!canSendEmail()) {
    console.warn(
      `⚠️ [Brevo Limit] Daily quota of ${DAILY_EMAIL_LIMIT} emails reached. Suppressing outgoing email to protect account.`
    );
    console.log(`🔑 [Console Fallback Verification Link]: ${verifyUrl} for ${to}`);
    return { success: false, reason: "DAILY_LIMIT_REACHED", fallbackUrl: verifyUrl };
  }

  const subject = `Verify Your Account | ${PROJECT_NAME}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-bottom: 8px;">Hello ${name}, 👋</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Thank you for joining <strong>${PROJECT_NAME}</strong>. Please verify your official email address to activate your account:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        This link will expire in 24 hours. If you did not register for an account, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        ${PROJECT_NAME} • Department of Electronics & Communication Engineering
      </p>
    </div>
  `;

  // 1. Try Brevo HTTPS REST API (Port 443 - works seamlessly on Render Free Tier)
  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to, name, subject, htmlContent });
    if (apiResult?.success) return apiResult;
  }

  // 2. Fallback to SMTP
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      });
      recordEmailSent();
      console.log(`✅ [Brevo] Verification email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Error sending verification email via Brevo SMTP:", error.message);
    }
  }

  console.log(`🔑 [Console Fallback Verification Link]: ${verifyUrl} for ${to}`);
  return { success: false, reason: "SMTP_ERROR", fallbackUrl: verifyUrl };
};

/**
 * Sends a welcome email after successful verification.
 * @param {string} to - The recipient's email address.
 * @param {string} name - The recipient's full name.
 */
export const sendWelcomeEmail = async (to, name) => {
  if (!isMailConfigured) {
    console.warn(`✉️  Skipped email to ${to} — Brevo is not configured in .env.`);
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  if (!canSendEmail()) {
    console.warn(
      `⚠️ [Brevo Limit] Daily quota of ${DAILY_EMAIL_LIMIT} emails reached. Welcome email to ${to} suppressed.`
    );
    return { success: false, reason: "DAILY_LIMIT_REACHED" };
  }

  const loginUrl = `${process.env.CLIENT_URL || "http://localhost:5176"}/login`;
  const subject = `Welcome to ${PROJECT_NAME}!`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-bottom: 8px;">Welcome, ${name}! 🎉</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Your account has been successfully verified. You can now access your portal dashboard:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${loginUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        ${PROJECT_NAME} • Department of Electronics & Communication Engineering
      </p>
    </div>
  `;

  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to, name, subject, htmlContent });
    if (apiResult?.success) return apiResult;
  }

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      });
      recordEmailSent();
      console.log(`✅ [Brevo] Welcome email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Error sending welcome email via Brevo SMTP:", error.message);
    }
  }

  return { success: false, reason: "SMTP_ERROR" };
};

/**
 * Sends a password reset / account setup email with a 6-digit OTP.
 * @param {string} to - The recipient's email address.
 * @param {string} name - The recipient's full name.
 * @param {string} otp - The 6-digit one-time password.
 */
export const sendResetEmail = async (to, name, otp) => {
  if (!isMailConfigured) {
    console.warn(`✉️  Skipped email to ${to} — Brevo is not configured in .env.`);
    console.log(`🔑 [Console Fallback OTP]: ${otp} for ${to}`);
    return { success: false, reason: "NOT_CONFIGURED", otp };
  }

  if (!canSendEmail()) {
    console.warn(
      `⚠️ [Brevo Limit] Daily quota of ${DAILY_EMAIL_LIMIT} emails reached. Suppressing outgoing email to protect account.`
    );
    console.log(`🔑 [Console Fallback OTP]: ${otp} for ${to}`);
    return { success: false, reason: "DAILY_LIMIT_REACHED", otp };
  }

  const subject = `Your OTP for Password Reset | ${PROJECT_NAME}`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px;">${PROJECT_NAME}</h1>
        <p style="font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500;">Department of Electronics & Communication Engineering</p>
      </div>
      
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Hello ${name},</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to verify your identity / reset your password for your <strong>${PROJECT_NAME}</strong> account.
      </p>

      <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px;">Your One-Time Password (OTP)</span>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">
          ${otp}
        </div>
        <span style="display: block; font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 10px;">Valid for 10 minutes</span>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
        Enter this 6-digit OTP on the verification screen to set your new password. If you did not make this request, you can safely ignore this email; your account remains secure.
      </p>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        ${PROJECT_NAME} • Automated Security Notification
      </p>
    </div>
  `;

  // 1. Try Brevo HTTPS REST API (Port 443 - works on Render Free Tier)
  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to, name, subject, htmlContent });
    if (apiResult?.success) return { success: true, otp };
  }

  // 2. Fallback to SMTP
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      });
      recordEmailSent();
      console.log(`✅ [Brevo] OTP email sent successfully to ${to}`);
      return { success: true, otp };
    } catch (error) {
      console.error("❌ Error sending OTP email via Brevo SMTP:", error.message);
    }
  }

  console.log(`🔑 [Console Fallback OTP]: ${otp} for ${to}`);
  return { success: false, reason: "SMTP_ERROR", otp };
};

export const sendResetOtpEmail = sendResetEmail;
