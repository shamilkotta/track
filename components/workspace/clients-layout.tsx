"use client";

import type { ReactNode } from "react";
import { ClientsFrame } from "@/components/clients/clients-workspace";

export default function ClientsLayout({ children }: { children: ReactNode }) {
  return <ClientsFrame>{children}</ClientsFrame>;
}
