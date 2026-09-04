"use client";

import type { ReactNode } from "react";

export function WorkspacePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="track-page-header">
      <div>
        <h1>{title}</h1>
        <p className="track-page-lede">{description}</p>
      </div>
      {actions}
    </div>
  );
}
