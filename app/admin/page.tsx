// Admin page for managing rules. Server component fetches the current rules
// (after auth gate) and renders the client form.

import { cookies } from "next/headers";
import { listRules } from "@/lib/kv";
import { verify } from "@/lib/auth";
import AdminClient from "./client";
import LoginForm from "./login";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin")?.value;
  const valid = session ? verify<{ admin: true; iat: number }>(session) : null;

  if (!valid) {
    return <LoginForm />;
  }

  const rules = await listRules();
  return <AdminClient initialRules={rules} />;
}
