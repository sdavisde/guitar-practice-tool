import type { NextRequest } from "next/server";
import { search, UgError } from "@/lib/ug";

export const runtime = "nodejs";

/** GET /api/ug/search?q=<text>&page=<n> → chord-sheet search results from Ultimate Guitar. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  if (!q) return Response.json({ error: "Missing search text." }, { status: 400 });
  const pageRaw = Number(params.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  try {
    return Response.json(await search(q, page));
  } catch (e) {
    if (e instanceof UgError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Ultimate Guitar import failed." }, { status: 502 });
  }
}
