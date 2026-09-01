import { getUserProfile } from "@/app/actions/auth";
import { getCategories } from "@/app/actions/categories";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage() {
  const [profile, categories] = await Promise.all([
    getUserProfile(),
    getCategories(),
  ]);

  return <ProfileClient initialProfile={profile} categories={categories} />;
}
