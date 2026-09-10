"use client";

import { LearningPathDetailView } from "@/components/learning/path-detail-view";

export default function LearningPathDetailPage({ pathId }: { pathId: string }) {
  return <LearningPathDetailView pathId={pathId} />;
}
