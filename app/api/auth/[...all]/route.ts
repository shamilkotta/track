import { auth } from "@/lib/auth";

function handle(request: Request) {
  return auth.handler(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
