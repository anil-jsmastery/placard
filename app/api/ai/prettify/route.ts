import { auth } from "@clerk/nextjs/server";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { startRun } from "@/lib/ai/run";

export const maxDuration = 120;

const Body = z.object({ siteId: z.uuid() });

// POST { siteId }: restyle the page with the style-only tools. A page with no sections gets 400 empty_page.
// When the run ends, lib/ai/run.ts compares pageWords (lib/site/words.ts) before and after: if one word changed,
// the run fails with words_changed, the draft isn't touched and the request isn't counted.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ code: "unauthorized" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ code: "invalid_request" }, { status: 400 });

  const run = await startRun({ kind: "prettify", userId, siteId: body.data.siteId, signal: req.signal });
  if ("error" in run) return Response.json({ code: run.error.code }, { status: run.error.status });
  return createUIMessageStreamResponse({ stream: run.stream });
}
