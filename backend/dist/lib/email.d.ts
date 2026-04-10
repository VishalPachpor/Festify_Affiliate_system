export declare class EmailDeliveryError extends Error {
    constructor(message: string);
}
export declare function sendVerificationCodeEmail(args: {
    to: string;
    fullName: string;
    code: string;
    expiresInMinutes: number;
}): Promise<void>;
export declare function sendAffiliateWelcomeEmail(args: {
    to: string;
    firstName: string;
    referralCode: string;
}): Promise<void>;
export declare function sendAffiliateInviteEmail(args: {
    to: string;
    campaignName: string;
    organizerName: string;
    applyUrl: string;
}): Promise<void>;
//# sourceMappingURL=email.d.ts.map