"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailDeliveryError = void 0;
exports.sendVerificationCodeEmail = sendVerificationCodeEmail;
exports.sendAffiliateWelcomeEmail = sendAffiliateWelcomeEmail;
exports.sendAffiliateInviteEmail = sendAffiliateInviteEmail;
class EmailDeliveryError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmailDeliveryError";
    }
}
exports.EmailDeliveryError = EmailDeliveryError;
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
const NODE_ENV = process.env.NODE_ENV ?? "development";
const APP_NAME = process.env.APP_NAME ?? "Festify";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME ?? APP_NAME;
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}
function getFromAddress() {
    if (!EMAIL_FROM) {
        throw new EmailDeliveryError("EMAIL_FROM is not configured");
    }
    return `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`;
}
async function sendViaResend(input) {
    if (!RESEND_API_KEY) {
        throw new EmailDeliveryError("RESEND_API_KEY is not configured");
    }
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: getFromAddress(),
            to: [input.to],
            subject: input.subject,
            html: input.html,
            text: input.text,
        }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new EmailDeliveryError(`Resend API request failed (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`);
    }
}
async function sendDevConsoleEmail(input) {
    console.log([
        "[mail:dev]",
        `to=${input.to}`,
        `subject=${input.subject}`,
        `text=${input.text}`,
    ].join(" "));
}
async function sendEmail(input) {
    if (EMAIL_PROVIDER === "resend") {
        await sendViaResend(input);
        return;
    }
    if (NODE_ENV !== "production") {
        await sendDevConsoleEmail(input);
        return;
    }
    throw new EmailDeliveryError("No production email provider configured. Set EMAIL_PROVIDER=resend and RESEND_API_KEY.");
}
async function sendVerificationCodeEmail(args) {
    const safeName = escapeHtml(args.fullName);
    const safeCode = escapeHtml(args.code);
    await sendEmail({
        to: args.to,
        subject: `Verify your ${APP_NAME} account`,
        text: `Hi ${args.fullName}, your ${APP_NAME} verification code is ${args.code}. It expires in ${args.expiresInMinutes} minutes.`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
        <h1 style="margin:0 0 16px;font-size:24px;">Verify your ${escapeHtml(APP_NAME)} account</h1>
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Use the verification code below to finish signing in:</p>
        <div style="margin:24px 0;padding:16px 20px;border-radius:12px;background:#0f172a;color:#ffffff;font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;">
          ${safeCode}
        </div>
        <p style="margin:0 0 8px;">This code expires in ${args.expiresInMinutes} minutes.</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">If you didn’t request this, you can safely ignore this email.</p>
      </div>
    `,
    });
}
async function sendAffiliateWelcomeEmail(args) {
    const safeName = escapeHtml(args.firstName);
    const safeCode = escapeHtml(args.referralCode);
    await sendEmail({
        to: args.to,
        subject: `Welcome to ${APP_NAME} affiliates`,
        text: `Hi ${args.firstName}, your affiliate application has been approved. Your referral code is ${args.referralCode}.`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
        <h1 style="margin:0 0 16px;font-size:24px;">Welcome to ${escapeHtml(APP_NAME)} affiliates</h1>
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Your affiliate application has been approved.</p>
        <p style="margin:0 0 16px;">Your referral code is <strong>${safeCode}</strong>.</p>
      </div>
    `,
    });
}
async function sendAffiliateInviteEmail(args) {
    const safeCampaign = escapeHtml(args.campaignName);
    const safeOrganizer = escapeHtml(args.organizerName);
    const safeApplyUrl = escapeHtml(args.applyUrl);
    await sendEmail({
        to: args.to,
        subject: `You are invited to join ${APP_NAME} affiliates`,
        text: `You have been invited by ${args.organizerName} to join the affiliate program for ${args.campaignName}. Apply here: ${args.applyUrl}`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
        <h1 style="margin:0 0 16px;font-size:24px;">You are invited to join ${escapeHtml(APP_NAME)} affiliates</h1>
        <p style="margin:0 0 16px;">${safeOrganizer} invited you to apply for the affiliate program for <strong>${safeCampaign}</strong>.</p>
        <p style="margin:0 0 24px;">Use the link below to submit your application and start promoting the event.</p>
        <p style="margin:0 0 24px;">
          <a href="${safeApplyUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#3456B8;color:#ffffff;text-decoration:none;font-weight:600;">
            Apply as an affiliate
          </a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:14px;">If the button doesn't work, copy and paste this URL into your browser: ${safeApplyUrl}</p>
      </div>
    `,
    });
}
//# sourceMappingURL=email.js.map