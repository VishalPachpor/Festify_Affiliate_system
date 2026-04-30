export declare function getBoldSignTemplateId(): string;
type CreateMouArgs = {
    signerName: string;
    signerEmail: string;
    applicationId: string;
    tenantId: string;
    templateId?: string;
};
export declare function createMouFromTemplate(args: CreateMouArgs): Promise<{
    documentId: string;
    status: string | null;
}>;
export declare function getEmbeddedSigningLink(args: {
    documentId: string;
    signerEmail: string;
    redirectUrl: string;
}): Promise<string>;
export declare function remindBoldSignDocument(documentId: string): Promise<void>;
export declare function voidBoldSignDocument(documentId: string, reason: string): Promise<void>;
export declare function verifyBoldSignWebhook(rawBody: Buffer, signatureHeader: string | undefined): boolean;
export {};
//# sourceMappingURL=boldsign.d.ts.map