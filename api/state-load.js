// /api/state-load.js
// Proxy verso Supabase per leggere lo state dell'app.
// La chiave segreta resta lato server (env var), mai esposta al browser.

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

  try {
    const r = await fetch(`${url}/rest/v1/appstate?id=eq.main&select=data`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(r.status).send(text || "[]");
  } catch (e) {
    console.error("state-load error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
