import type { Application } from "@prisma/client";

export class MouSignerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MouSignerError";
  }
}

export function deriveMouSigner(application: Application): {
  signerName: string;
  signerEmail: string;
} {
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
