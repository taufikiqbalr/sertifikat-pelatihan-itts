"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyCredentials } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!verifyCredentials(email, password)) {
    redirect("/login?error=1");
  }

  await createAdminSession(email);
  redirect("/admin");
}
