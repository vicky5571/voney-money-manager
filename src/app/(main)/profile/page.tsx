import { getUserProfile } from '@/app/actions/auth';
import { ProfileClient } from '@/components/profile-client';

export default async function ProfilePage() {
  const profile = await getUserProfile();

  return <ProfileClient initialProfile={profile} />;
}
