import { headers } from "nlite/headers";
import { auth } from "@/lib/auth";
import { isRecord } from "@/lib/domain";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }
  const message = error instanceof Error ? error.message : "Request failed";
  return json({ error: message }, 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function stringField(record: Record<string, unknown>, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

export function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) return null;
  return typeof value === "string" ? value : null;
}

export function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${key} is required`);
  }
  return value.trim();
}

export async function requireApiUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Sign in to continue");
  return session.user;
}

export async function getPageSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, "Expected an object");
  return value;
}

export function now() {
  return new Date();
}

export function newId() {
  return crypto.randomUUID();
}
