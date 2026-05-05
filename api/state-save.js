// /api/state-save.js
// Proxy verso Supabase per scrivere lo state dell'app (upsert).
// La chiave segreta resta lato server (env var), mai esposta al browser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env var");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Validazione minima: il body deve essere un oggetto con un campo `data`.
  const body = req.body;
  if (!body || typeof body !== "object" || !body.data || typeof body.data !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // Forziamo id e updated_at lato server: il client non può scegliere
  // un id diverso da "main" né manipolare il timestamp.
  const payload = {
    id: "main",
    data: body.data,
    updated_at: new Date().toISOString(),
  };

  try {
    const r = await fetch(`${url}/rest/v1/appstate`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(r.status).send(text || "{}");
  } catch (e) {
    console.error("state-save error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
