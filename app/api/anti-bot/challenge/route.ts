import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

/**
 * Server-issued anti-bot challenge.
 *
 * The server generates a math problem + signs it with a HMAC secret.
 * The client solves it, and the server verifies the proof token
 * before allowing the request through.
 *
 * This prevents bots from:
 * - Reading the answer from client-side code (it only exists server-side)
 * - Replaying old challenges (expires after 60s)
 * - Skipping verification entirely (API rejects requests without valid proof)
 */

// Use a server-only secret derived from environment or a stable key
function getSecret(): string {
  return process.env.ANTI_BOT_SECRET || process.env.GEMINI_API_KEY || "xalura-default-fallback-key-change-in-production";
}

interface Challenge {
  a: number;
  b: number;
  op: "+" | "-";
  answer: number;
  nonce: string;
  expiresAt: number;
}

function signChallenge(challenge: Challenge): string {
  const payload = `${challenge.answer}|${challenge.nonce}|${challenge.expiresAt}`;
  return createHash("sha256").update(payload + getSecret()).digest("hex").slice(0, 16);
}

export function GET() {
  const a = Math.floor(Math.random() * 20) + 5;
  const b = Math.floor(Math.random() * a) + 1; // b < a so subtraction is always positive
  const op = Math.random() > 0.5 ? "+" : "-";
  const answer = op === "+" ? a + b : a - b;
  const nonce = randomBytes(8).toString("hex");
  const expiresAt = Date.now() + 60_000; // 60 second expiry

  const challenge: Challenge = { a, b, op, answer, nonce, expiresAt };
  const signature = signChallenge(challenge);

  return NextResponse.json({
    ok: true,
    challenge: {
      a: challenge.a,
      b: challenge.b,
      op: challenge.op,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
    },
    signature,
  });
}

