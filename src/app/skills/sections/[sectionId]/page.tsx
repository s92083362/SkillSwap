import SkillDetailPage from '@/components/skills/sections/SkillDetailPage';

type PageParams = {
  skillId: string;
  sectionId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function Page({ params }: PageProps) {
  const { skillId, sectionId } = await params;

  return (
    <SkillDetailPage
      initialSkillId={skillId}
      initialSectionId={sectionId}
    />
  );
}
