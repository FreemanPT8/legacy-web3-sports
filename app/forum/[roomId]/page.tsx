import ForumSunset from '@/components/forum/ForumSunset';

interface PageProps {
  params: { roomId: string };
}

export default function ForumRoomPage(_props: PageProps) {
  return <ForumSunset />;
}
