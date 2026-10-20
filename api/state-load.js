// /api/state-load.js
// Lettura dello state da Supabase. La chiave segreta resta lato server.
//
// Due modalità:
//   GET /api/state-load                → formato legacy: [ { data } ]
//                                         (usato dal backup e dai bundle vecchi)
//   GET /api/state-load?v=2            → { unchanged:false, updated_at, data }
//   GET /api/state-load?since=<ts>     → se lo state non è cambiato dopo <ts>:
//                                         { unchanged:true, updated_at }
//                                         altrimenti come v=2.
//
// Perché: ogni client interroga il server ogni pochi secondi. Prima scaricava
// SEMPRE l'intera riga (~700 KB) anche se non era cambiato nulla — 60 letture
// per ogni scrittura. Ora la prima query legge solo updated_at (pochi byte) e
// la riga intera viene inviata solo quando è davvero cambiata.

function sameInstant(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = Date.parse(a), tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env var");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  res.setHeader("Cache-Control", "no-store");

  const q = req.query || {};
  const since = typeof q.since === "string" && q.since ? q.since : null;
  const v2 = since !== null || q.v === "2";

  try {
    if (v2) {
      // 1. Query minuscola: solo la versione corrente
      const r1 = await fetch(`${url}/rest/v1/appstate?id=eq.main&select=updated_at`, { headers });
      if (!r1.ok) {
        const t = await r1.text();
        return res.status(r1.status).send(t || "{}");
      }
      const rows1 = await r1.json();
      const current = Array.isArray(rows1) && rows1[0] ? rows1[0].updated_at : null;

      if (since && current && sameInstant(since, current)) {
        return res.status(200).json({ unchanged: true, updated_at: current });
      }

      // 2. È cambiato (o prima lettura): invia la riga intera
      const r2 = await fetch(`${url}/rest/v1/appstate?id=eq.main&select=data,updated_at`, { headers });
      if (!r2.ok) {
        const t = await r2.text();
        return res.status(r2.status).send(t || "{}");
      }
      const rows2 = await r2.json();
      const row = Array.isArray(rows2) && rows2[0] ? rows2[0] : null;
      return res.status(200).json({
        unchanged: false,
        updated_at: row ? row.updated_at : null,
        data: row ? row.data : null,
      });
    }

    // Formato legacy
    const r = await fetch(`${url}/rest/v1/appstate?id=eq.main&select=data`, { headers });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(r.status).send(text || "[]");
  } catch (e) {
    console.error("state-load error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
