import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from './config.js';

// Supabase signs access tokens with the project's own key pair (ES256) and
// publishes the public half at this well-known endpoint — verifying against
// it locally is faster and more reliable than round-tripping through
// supabase-js's own getUser(jwt), which (at least in this version) throws
// "Auth session missing" when called from a client with no local session,
// even though a token is explicitly passed in.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  if (!config.supabaseUrl) return null;
  jwks = createRemoteJWKSet(new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const keySet = getJwks();
  if (!keySet) {
    console.error('[auth] SUPABASE_URL not set — rejecting all requests');
    return false;
  }

  try {
    await jwtVerify(token, keySet, {
      issuer: `${config.supabaseUrl}/auth/v1`,
    });
    return true;
  } catch (err) {
    console.error('[auth] token rejected:', (err as Error).message);
    return false;
  }
}

/** Express middleware for REST routes — expects `Authorization: Bearer <token>`. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (await verifyToken(token)) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
}

/** For the WebSocket upgrade, which can't send custom headers from a browser — the token travels as a query param instead. */
export function extractWsToken(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const query = url.split('?')[1];
  if (!query) return undefined;
  return new URLSearchParams(query).get('token') ?? undefined;
}
