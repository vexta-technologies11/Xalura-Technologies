import { NextResponse } from "next/server";

/** Use `/api/health` to verify the deployment runs Next.js server routes (should return 200 JSON). */
export function GET() {
  return NextResponse.json({ ok: true, service: "xalura-tech" }, { status: 200 });
}
