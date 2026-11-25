import { auth } from "@clerk/nextjs/server";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { startRun } from "@/lib/ai/run";

export const maxDuration = 120;

const Body = z.object({
  siteId: z.uuid(),
  prompt: z.string(),
  name: z.string().trim().max(60).nullish(),
  tone: z.enum(["Minimal", "Bold", "Playful", "Elegant"]).nullish(),
  useCase: z.enum(["designer", "developer", "photographer", "artist", "writer", "other"]),
});

// POST { siteId, prompt, name?, tone?, useCase }: a guard's code as a JSON error, otherwise the build's stream.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ code: "unauthorized" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ code: "invalid_request" }, { status: 400 });
  const { siteId, prompt, name, tone, useCase } = body.data;

  const run = await startRun({ kind: "generate", userId, siteId, prompt, brief: { name, tone, useCase }, signal: req.signal });
  if ("error" in run) return Response.json({ code: run.error.code }, { status: run.error.status });
  return createUIMessageStreamResponse({ stream: run.stream });
}
