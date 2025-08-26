import AuthGuard from '@/components/AuthGuard';
import TopBar from '@/components/TopBar';
import CoachSubsClient from './Client';

export default function Page() {
  return (
    <AuthGuard>
      <TopBar />
      <CoachSubsClient />
    </AuthGuard>
  );
}
