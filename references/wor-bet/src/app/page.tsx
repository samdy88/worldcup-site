import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ensureInitialized } from '@/lib/init-app';
import HomeClient from '@/components/HomeClient';

export default async function HomePage() {
  ensureInitialized();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <HomeClient username={user.username} balance={user.balance} />;
}
