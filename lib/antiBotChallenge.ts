import { createHash } from "crypto";

/**
 * Server-side anti-bot challenge verification.
 * 
 * Flow:
 * 1. GET /api/anti-bot/challenge → server sends { a, b, op, nonce, expiresAt, signature }
 *    - signature = HMAC(a|b|op|answer|nonce|expiresAt, secret)
 * 2. Client computes answer locally from a, b, op
 * 3. POST /api/tools/[toolId] → client includes { antiBotAnswer, antiBotNonce, antiBotSignature }
 * 4. Server verifies: same calculation matches? AND not expired?
 * 5. If valid → allow generation, else reject as bot
 */

function getSecret(): string {
  return process.env.ANTI_BOT_SECRET || process.env.GEMINI_API_KEY || "xalura-default-fallback-key-change-in-production";
}

/**
 * Verify a challenge was solved correctly by reconstructing the HMAC.
 */
export interface AntiBotProof {
  answer: string | number;
  nonce: string;
  signature: string;
  expiresAt: number;
}

export function verifyAntiBotProof(proof: AntiBotProof | null | undefined): { valid: boolean; reason?: string } {
  if (!proof) {
    return { valid: false, reason: "Missing anti-bot proof" };
  }
  if (!proof.nonce || !proof.signature || proof.answer === undefined || proof.answer === null) {
    return { valid: false, reason: "Incomplete anti-bot proof" };
  }
  if (Date.now() > proof.expiresAt) {
    return { valid: false, reason: "Challenge expired. Try again." };
  }

  // Reconstruct the payload the same way the challenge issuer did
  const payload = `${proof.answer}|${proof.nonce}|${proof.expiresAt}`;
  const expectedSig = createHash("sha256")
    .update(payload + getSecret())
    .digest("hex")
    .slice(0, 16);

  if (proof.signature !== expectedSig) {
    return { valid: false, reason: "Invalid proof" };
  }

  return { valid: true };
}

/**
 * Extract anti-bot proof from a request body.
 */
export function extractAntiBotProof(body: Record<string, unknown>): AntiBotProof | null {
  const answer = body.antiBotAnswer;
  const nonce = body.antiBotNonce;
  const signature = body.antiBotSignature;
  const expiresAt = body.antiBotExpiresAt;

  if (typeof nonce === "string" && nonce && typeof signature === "string" && signature && answer !== undefined && answer !== null && typeof expiresAt === "number") {
    return {
      answer: answer as string | number,
      nonce,
      signature,
      expiresAt,
    };
  }
  return null;
}

