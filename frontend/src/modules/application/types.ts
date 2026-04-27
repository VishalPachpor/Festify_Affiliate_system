import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "not_applied",
  "pending",
  "approved_pending_mou",
  "approved",
  "rejected",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationStatusResponseSchema = z.object({
  status: applicationStatusSchema,
  applicationId: z.string().nullable().optional(),
  mouStatus: z.enum([
    "created",
    "sent",
    "viewed",
    "signed",
    "declined",
    "expired",
    "voided",
    "failed",
  ]).nullable().optional(),
  mouSignerEmail: z.string().nullable().optional(),
  mouSignerName: z.string().nullable().optional(),
});

export type ApplicationStatusResponse = z.infer<typeof applicationStatusResponseSchema>;

export const applicationApplicantTypeSchema = z.enum(["individual", "company"]);

export const communicationChannelSchema = z.enum([
  "emails_newsletters",
  "telegram",
  "whatsapp",
  "x",
  "reddit",
  "linkedin",
  "instagram",
  "discord",
]);

export const COMMUNICATION_CHANNEL_OPTIONS: Array<{
  value: z.infer<typeof communicationChannelSchema>;
  label: string;
}> = [
  { value: "emails_newsletters", label: "Emails/Newsletters" },
  { value: "telegram", label: "Telegram Channel/Group" },
  { value: "whatsapp", label: "WhatsApp Group" },
  { value: "x", label: "X (Twitter)" },
  { value: "reddit", label: "Reddit" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "discord", label: "Discord" },
];

const optionalTrimmed = z.string().trim().optional();
const optionalEmail = z.string().email().optional();

export const applicationSubmissionSchema = z
  .object({
    applyingAs: applicationApplicantTypeSchema,
    fullName: optionalTrimmed,
    email: optionalEmail,
    telegramUsername: optionalTrimmed,
    companyName: optionalTrimmed,
    contactPersonName: optionalTrimmed,
    contactPersonEmail: optionalEmail,
    signatoryName: optionalTrimmed,
    signatoryEmail: optionalEmail,
    contactPersonTelegramUsername: optionalTrimmed,
    communicationChannels: z.array(communicationChannelSchema).min(1),
    emailDatabaseSize: optionalTrimmed,
    telegramGroupLink: optionalTrimmed,
    xProfileLink: optionalTrimmed,
    redditProfileLink: optionalTrimmed,
    linkedInLink: optionalTrimmed,
    instagramAccountLink: optionalTrimmed,
    discordServerLink: optionalTrimmed,
    experience: optionalTrimmed,
    requestedCode: z.string().trim().min(1),
  })
  .superRefine((data, ctx) => {
    const requireField = (
      value: string | undefined,
      path: keyof typeof data,
      message = "Required",
    ) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message,
        });
      }
    };

    if (data.applyingAs === "individual") {
      requireField(data.fullName, "fullName");
      requireField(data.email, "email");
      requireField(data.telegramUsername, "telegramUsername");
    } else {
      requireField(data.companyName, "companyName");
      requireField(data.contactPersonName, "contactPersonName");
      requireField(data.contactPersonEmail, "contactPersonEmail");
      requireField(data.signatoryName, "signatoryName");
      requireField(data.signatoryEmail, "signatoryEmail");
      requireField(
        data.contactPersonTelegramUsername,
        "contactPersonTelegramUsername",
      );
    }

    if (data.communicationChannels.includes("emails_newsletters")) {
      requireField(data.emailDatabaseSize, "emailDatabaseSize");
    }
    if (data.communicationChannels.includes("telegram")) {
      requireField(data.telegramGroupLink, "telegramGroupLink");
    }
    if (data.communicationChannels.includes("x")) {
      requireField(data.xProfileLink, "xProfileLink");
    }
    if (data.communicationChannels.includes("reddit")) {
      requireField(data.redditProfileLink, "redditProfileLink");
    }
    if (data.communicationChannels.includes("linkedin")) {
      requireField(data.linkedInLink, "linkedInLink");
    }
    if (data.communicationChannels.includes("instagram")) {
      requireField(data.instagramAccountLink, "instagramAccountLink");
    }
    if (data.communicationChannels.includes("discord")) {
      requireField(data.discordServerLink, "discordServerLink");
    }
  });

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;
