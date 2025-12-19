import SkillPage from '@/components/skills/SkillPage';

type PageProps = {
  params: Promise<{ skillId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { skillId } = await params; 
  return <SkillPage skillId={skillId} />;
}
