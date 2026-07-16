import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SLOT_KEY = (slot: number) => `bvc:bg:${slot}`;
const MAX_SLOTS = 4;
/** Stay under Vercel ~4.5MB body limit with headroom. */
const MAX_DATA_URL_CHARS = 3_500_000;

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

function parseSlot(req: VercelRequest): number | null {
  const raw = req.query.slot;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const slot = Number(value);
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_SLOTS) return null;
  return slot;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const slot = parseSlot(req);
    if (slot == null) {
      res.status(400).json({ error: "Query slot must be 0–3" });
      return;
    }

    const redis = resolveRedis();
    const key = SLOT_KEY(slot);

    if (req.method === "GET") {
      const dataUrl = await redis.get<string>(key);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        slot,
        dataUrl: typeof dataUrl === "string" && dataUrl.trim() ? dataUrl : null,
      });
      return;
    }

    if (req.method === "PUT") {
      if (!isWriteAuthorized(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const body = req.body as { dataUrl?: unknown } | null;
      const dataUrl =
        body && typeof body.dataUrl === "string" ? body.dataUrl.trim() : "";
      if (!dataUrl.startsWith("data:image/")) {
        res.status(400).json({ error: "Expected dataUrl image" });
        return;
      }
      if (dataUrl.length > MAX_DATA_URL_CHARS) {
        res.status(413).json({
          error:
            "Background image is too large. Use a smaller image (under ~2.5MB).",
        });
        return;
      }
      await redis.set(key, dataUrl);
      res.status(200).json({ ok: true, slot });
      return;
    }

    if (req.method === "DELETE") {
      if (!isWriteAuthorized(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      await redis.del(key);
      res.status(200).json({ ok: true, slot });
      return;
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("api/background error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ error: message });
  }
}
