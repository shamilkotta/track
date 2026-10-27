import { HttpError } from "@/lib/http";

export function sinceParam(url: URL) {
  const raw = url.searchParams.get("since");
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "since must be an ISO date");
  return date;
}

export function textField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, `${key} must be a string`);
  return value.trim();
}
