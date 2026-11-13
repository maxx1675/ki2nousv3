import { createHmac } from "node:crypto";
import { env } from "./env";

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

const STUN: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
let cache: { at: number; servers: IceServer[] } | null = null;
const CACHE_MS = 30 * 60 * 1000;

/** true si un serveur TURN est configuré (sinon seulement STUN : la 4G peut échouer). */
export const turnConfigured = () =>
  !!((env.meteredDomain && env.meteredApiKey) || (env.turnUrls && ((env.turnUsername && env.turnCredential) || env.turnSecret)));

export async function getIceServers(fetchImpl: typeof fetch = fetch): Promise<IceServer[]> {
  // Option 1 : Metered
  if (env.meteredDomain && env.meteredApiKey) {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.servers;
    try {
      const url = `https://${env.meteredDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(env.meteredApiKey)}`;
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const arr = (await r.json()) as IceServer[];
        if (Array.isArray(arr) && arr.length) {
          cache = { at: Date.now(), servers: [...STUN, ...arr] };
          return cache.servers;
        }
      }
    } catch {
      /* on retombe sur le cache ou STUN seul */
    }
    return cache ? cache.servers : STUN;
  }
  // Options 2 et 3 : coturn
  if (env.turnUrls) {
    const urls = env.turnUrls.split(",").map((s) => s.trim()).filter(Boolean);
    if (env.turnSecret) {
      const username = `${Math.floor(Date.now() / 1000) + 6 * 3600}:soiree`;
      const credential = createHmac("sha1", env.turnSecret).update(username).digest("base64");
      return [...STUN, { urls, username, credential }];
    }
    if (env.turnUsername && env.turnCredential) {
      return [...STUN, { urls, username: env.turnUsername, credential: env.turnCredential }];
    }
  }
  return STUN;
}
