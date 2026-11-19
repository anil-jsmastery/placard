import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { startRun } from "@/lib/ai/run";

// The run stops itself at 90 s (lib/ai/run.ts); the function gets room to finish and flush after it.
export const maxDuration = 120;

const Body = z.object({
  siteId: z.uuid(),
  prompt: z.string(),
  businessName: z.string().max(80).optional(),
  tone: z.string().max(20).optional(),
  useCase: z.enum(["business", "portfolio", "event", "product", "other"]),
});

/** POST { siteId, prompt, businessName?, tone?, useCase } → a guard code as a JSON error, otherwise the build's UI message stream. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ code: "unauthorized" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ code: "invalid_request" }, { status: 400 });

  const result = await startRun({ kind: "generate", userId, ...body.data, signal: req.signal });
  if ("error" in result) return Response.json({ code: result.error.code }, { status: result.error.status });
  return result.response;
}
