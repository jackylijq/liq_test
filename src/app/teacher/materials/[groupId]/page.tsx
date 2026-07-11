import { TeacherMaterialDetailContent } from "../TeacherMaterialDetailContent";

type TeacherMaterialDetailPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ unitId?: string; categoryId?: string; importBatchId?: string; error?: string }>;
};

export default async function TeacherMaterialDetailPage({ params, searchParams }: TeacherMaterialDetailPageProps) {
  const routeParams = await params;
  const query = await searchParams;

  return (
    <main className="teacher-material-detail-page">
      <TeacherMaterialDetailContent
        categoryId={query.categoryId}
        error={query.error}
        groupId={routeParams.groupId}
        importBatchId={query.importBatchId}
        unitId={query.unitId}
      />
    </main>
  );
}
