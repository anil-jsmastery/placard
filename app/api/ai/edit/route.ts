import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { startRun } from "@/lib/ai/run";

const Body = z.object({
  siteId: z.uuid(),
  prompt: z.string(),
  selectedId: z.string().max(100).nullish(),
});

/** POST { siteId, prompt, selectedId? } → a guard code as a JSON error, otherwise the edit's UI message stream. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ code: "unauthorized" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ code: "invalid_request" }, { status: 400 });

  const { siteId, prompt, selectedId } = body.data;
  const result = await startRun({ kind: "edit", userId, siteId, prompt, selection: selectedId ?? null, signal: req.signal });
  if ("error" in result) return Response.json({ code: result.error.code }, { status: result.error.status });
  return result.response;
}
