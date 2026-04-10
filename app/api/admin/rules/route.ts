import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "@/lib/auth";
import { listRules, saveRules } from "@/lib/kv";
import type { Rule } from "@/lib/types";

export const runtime = "nodejs";

async function requireAdmin(): Promise<boolean> {
  const c = await cookies();
  const session = c.get("admin")?.value;
  if (!session) return false;
  return !!verify<{ admin: true }>(session);
}

export async function GET() {
  if (!(await requireAdmin())) return new NextResponse("unauthorized", { status: 401 });
  return NextResponse.json({ rules: await listRules() });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return new NextResponse("unauthorized", { status: 401 });
  const { rules } = (await req.json()) as { rules: Rule[] };
  // Light validation: every rule needs id, kind, roleId, name.
  for (const r of rules) {
    if (!r.id || !r.kind || !r.roleId || !r.name) {
      return NextResponse.json({ ok: false, error: "rule missing required field" }, { status: 400 });
    }
  }
  await saveRules(rules);
  return NextResponse.json({ ok: true });
}
