"use client";

import { use } from "react";
import LearningPathDetailPage from "@/components/workspace/learning-path-detail-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LearningPathDetailPage pathId={id} />;
}
