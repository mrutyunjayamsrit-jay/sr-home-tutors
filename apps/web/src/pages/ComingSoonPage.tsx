import { Card, EmptyState } from "@/components/ui";

export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page-inner">
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <Card>
        <EmptyState
          title="This module is under construction"
          description={description ?? "This part of the workflow is planned but not built yet."}
        />
      </Card>
    </div>
  );
}
