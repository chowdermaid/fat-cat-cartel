import { createPublicKey, verify } from "crypto";

const ED25519_SPKI_PREFIX = "302a300506032b6570032100";

export function verifyDiscordRequest(params: {
  publicKey: string;
  signature: string | string[] | undefined;
  timestamp: string | string[] | undefined;
  rawBody: Buffer;
}): boolean {
  const signature = singleHeader(params.signature);
  const timestamp = singleHeader(params.timestamp);

  if (!signature || !timestamp || !params.publicKey) {
    return false;
  }

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(`${ED25519_SPKI_PREFIX}${params.publicKey}`, "hex"),
      format: "der",
      type: "spki",
    });
    const message = Buffer.concat([Buffer.from(timestamp), params.rawBody]);

    return verify(null, message, publicKey, Buffer.from(signature, "hex"));
  } catch (error) {
    console.error("Discord signature verification failed", error);
    return false;
  }
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
