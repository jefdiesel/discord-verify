import { NextResponse } from "next/server";
import { isAdminPassword, sign } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password: string };
  if (!isAdminPassword(password)) {
    return new NextResponse("nope", { status: 401 });
  }
  const session = sign({ admin: true, iat: Date.now() });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
