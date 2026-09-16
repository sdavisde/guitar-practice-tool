import type { NextRequest } from "next/server";
import { getTab, isUgUrl, UgError } from "@/lib/ug";

export const runtime = "nodejs";

/** GET /api/ug/tab?url=<tab_url> → one Ultimate Guitar chord sheet plus its metadata. */
export async function GET(request: NextRequest) {
  const url = (request.nextUrl.searchParams.get("url") ?? "").trim();
  if (!isUgUrl(url)) return Response.json({ error: "Expected an https://tabs.ultimate-guitar.com tab URL." }, { status: 400 });
  try {
    return Response.json(await getTab(url));
  } catch (e) {
    if (e instanceof UgError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Ultimate Guitar import failed." }, { status: 502 });
  }
}
