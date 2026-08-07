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

  if (!data.session) {
    redirect("/login?message=Compte créé, vérifie tes e-mails pour confirmer ton adresse.");
  }

  await supabase.from("profiles").insert({
    id: data.user!.id,
    display_name: displayName,
  });

  redirect("/onboarding");
}
