// SMTP and outbound mailer disabled.
// This is a stub file to prevent import errors if legacy modules touch mailer.

export const isMailConfigured = false;
export const DAILY_EMAIL_LIMIT = 0;

export const getDailyMailStats = () => ({
  count: 0,
  limit: 0,
  remaining: 0,
  date: new Date().toISOString().slice(0, 10),
});

export const canSendEmail = () => false;
export const recordEmailSent = () => {};

export const sendVerificationEmail = async () => ({ success: true, message: "Mailer disabled" });
export const sendResetEmail = async () => ({ success: true, message: "Mailer disabled" });
export const sendResetOtpEmail = async () => ({ success: true, message: "Mailer disabled" });
export const sendWelcomeEmail = async () => ({ success: true, message: "Mailer disabled" });
