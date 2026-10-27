import { isRecord } from "@/lib/domain";
import type { ClientBoard, ClientDropReason } from "@/lib/clients/domain";
import { redirect } from "nlite/navigation";

export class ClientsApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (res.status === 401) redirect("/sign-in");
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = isRecord(body) && typeof body.error === "string" ? body.error : res.statusText;
    throw new ClientsApiError(res.status, message || "Request failed");
  }
  return body as T;
}

const post = <T>(url: string, body: unknown, keepalive = false) =>
  call<T>(url, { method: "POST", body: JSON.stringify(body), keepalive });

export const fetchClientBoard = () => call<ClientBoard>("/api/clients");

export const approveDraftRequest = (
  draftId: string,
  version: number,
  bodySha256: string,
  keepalive = false,
) =>
  post(
    `/api/clients/drafts/${draftId}`,
    { action: "approve", version, body_sha256: bodySha256 },
    keepalive,
  );

export const reviseDraftRequest = (draftId: string, note: string) =>
  post(`/api/clients/drafts/${draftId}`, { action: "revise", note });

export const editDraftRequest = (draftId: string, subject: string, body: string) =>
  post(`/api/clients/drafts/${draftId}`, { action: "edit", subject, body });

export const leadActionRequest = (
  leadId: string,
  action: "revive" | "in_talks" | "won",
  keepalive = false,
) => post(`/api/clients/leads/${leadId}`, { action }, keepalive);

export const dropLeadRequest = (
  leadId: string,
  reason: ClientDropReason,
  note: string,
  keepalive = false,
) => post(`/api/clients/leads/${leadId}`, { action: "drop", reason, note }, keepalive);

export const holdLeadRequest = (leadId: string, note: string) =>
  post(`/api/clients/leads/${leadId}`, { action: "hold", note });

export const noteRequest = (leadId: string, body: string) =>
  post(`/api/clients/leads/${leadId}`, { action: "note", body });

export const dealRequest = (leadId: string, deal: Record<string, unknown>) =>
  post(`/api/clients/leads/${leadId}`, { action: "deal", deal });

export const tasksRequest = (
  leadId: string,
  tasks: Array<{ text: string; done: boolean; blocked: boolean }>,
) => post(`/api/clients/leads/${leadId}`, { action: "tasks", tasks });

export const retryEventRequest = (eventId: string) => post(`/api/clients/events/${eventId}`, {});
