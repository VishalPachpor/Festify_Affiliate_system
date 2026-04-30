import type { Application } from "@prisma/client";
export declare class MouSignerError extends Error {
    constructor(message: string);
}
export declare function deriveMouSigner(application: Application): {
    signerName: string;
    signerEmail: string;
};
//# sourceMappingURL=mou-signer.d.ts.map