import { TeacherMaterialsContent } from "./TeacherMaterialsContent";

type TeacherMaterialsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function TeacherMaterialsPage({ searchParams }: TeacherMaterialsPageProps) {
  const params = await searchParams;

  return (
    <main className="teacher-material-page">
      <TeacherMaterialsContent tab={params.tab} />
    </main>
  );
}
