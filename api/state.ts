import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const STATE_KEY = "bvc:shared-state";

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
  hindiSourceId: string;
  englishSqliteVersionId: string;
  backgrounds: unknown;
};

function resolveRedis(): Redis {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis is not linked to this Vercel project. Add Upstash Redis from the Vercel Marketplace and redeploy.",
    );
  }
  return new Redis({ url, token });
}

function isWriteAuthorized(req: VercelRequest): boolean {
  const secret = process.env.BVC_WRITE_SECRET;
  if (!secret) return true;
  return req.headers["x-bvc-secret"] === secret;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const redis = resolveRedis();

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
  } catch (error) {
    console.error("api/state error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ error: message });
  }
}
