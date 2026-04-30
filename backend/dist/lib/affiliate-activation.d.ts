import type { Prisma } from "@prisma/client";
type ActivationResult = {
    activated: true;
    tenantId: string;
    applicationId: string;
    affiliateId: string;
    email: string;
    firstName: string;
    referralCode: string;
} | {
    activated: false;
    reason: string;
};
export declare function activateAffiliateFromMou(args: {
    documentId: string;
    eventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
}): Promise<ActivationResult>;
export {};
//# sourceMappingURL=affiliate-activation.d.ts.map