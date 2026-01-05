import ForumSunset from '@/components/forum/ForumSunset';

interface PageProps {
  params: { topicId: string };
}

export default function ForumTopicPage(_props: PageProps) {
  return <ForumSunset />;
}
