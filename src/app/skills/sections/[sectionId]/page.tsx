
import SkillDetailPage from "@/components/skills/sections/SkillDetailPage";

type PageProps = {
  params: {
    skillId: string;
    sectionId: string;
  };
};

export default function Page({ params }: PageProps) {
  // Pass plain params into the client component
  return <SkillDetailPage initialSkillId={params.skillId} initialSectionId={params.sectionId} />;
}
