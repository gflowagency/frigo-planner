"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const displayName = String(formData.get("displayName"));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // profiles row is created automatically by the handle_new_user() DB trigger.
  if (!data.session) {
    redirect("/login?message=Compte créé, vérifie tes e-mails pour confirmer ton adresse.");
  }

  redirect("/onboarding");
}
