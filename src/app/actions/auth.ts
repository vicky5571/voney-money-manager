"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/auth";

export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export async function getUserProfile(): Promise<UserProfileData> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  // Get user profile from public.users table or user_metadata
  const { data: dbUser } = await supabase
    .from("users")
    .select("display_name, created_at")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email || "",
    displayName:
      dbUser?.display_name || user.user_metadata?.display_name || "User",
    createdAt: dbUser?.created_at || user.created_at,
  };
}

export async function updateUserProfile(
  displayName: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const trimmed = displayName.trim();
  if (!trimmed) {
    return { success: false, error: "Display name cannot be empty" };
  }

  // 1. Update Auth metadata
  await supabase.auth.updateUser({
    data: { display_name: trimmed },
  });

  // 2. Update public.users table
  const { error: dbError } = await supabase
    .from("users")
    .update({ display_name: trimmed })
    .eq("id", user.id);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<{ success: boolean; error?: string }> {
  const validation = changePasswordSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Invalid input data",
    };
  }

  const { currentPassword, newPassword } = validation.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify current password with isolated client
  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: "Current password is incorrect" };
  }

  // Update password with user session
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
