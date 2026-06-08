import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const STATE_KEY = "bvc:shared-state";

const redis = Redis.fromEnv();

export type SharedAppState = {
  updatedAt: number;
  pages: unknown;
  cardLayout: unknown;
  resolumeLayout: unknown;
  typography: unknown;
  resolumeTypography: unknown;
  schemaEn: unknown;
  schemaHi: unknown;
  verseBlockOrder: unknown;
  useBibleComEn: boolean;
  useBibleComHi: boolean;
  englishSqliteVersionId: string;
};

function isWriteAuthorized(req: VercelRequest): boolean {
  const secret = process.env.BVC_WRITE_SECRET;
  if (!secret) return true;
  return req.headers["x-bvc-secret"] === secret;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === "GET") {
    const data = await redis.get<SharedAppState>(STATE_KEY);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data ?? null);
    return;
  }

  if (req.method === "PUT") {
    if (!isWriteAuthorized(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as SharedAppState | null;
    if (!body || typeof body !== "object" || !Array.isArray(body.pages)) {
      res.status(400).json({ error: "Invalid state payload" });
      return;
    }

    const payload: SharedAppState = {
      ...body,
      updatedAt: Date.now(),
    };
    await redis.set(STATE_KEY, payload);
    res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed" });
}
