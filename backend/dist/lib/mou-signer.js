"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MouSignerError = void 0;
exports.deriveMouSigner = deriveMouSigner;
class MouSignerError extends Error {
    constructor(message) {
        super(message);
        this.name = "MouSignerError";
    }
}
exports.MouSignerError = MouSignerError;
function deriveMouSigner(application) {
    if (application.applyingAs === "company") {
        const signerName = application.signatoryName?.trim();
        const signerEmail = application.signatoryEmail?.trim().toLowerCase();
        if (!signerName || !signerEmail) {
            throw new MouSignerError("Company application is missing MOU signatory details");
        }
        return { signerName, signerEmail };
    }
    const signerName = (application.individualFullName ?? application.firstName).trim();
    const signerEmail = application.email.trim().toLowerCase();
    if (!signerName || !signerEmail) {
        throw new MouSignerError("Individual application is missing MOU signer details");
    }
    return { signerName, signerEmail };
}
//# sourceMappingURL=mou-signer.js.map