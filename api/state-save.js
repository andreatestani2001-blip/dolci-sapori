// /api/state-save.js
// Salvataggio dello state su Supabase.
//
// Due modalità:
//   { data: {...} }   → sostituzione COMPLETA (usata solo dal "Ripristina backup")
//   { patch: {...} }  → MERGE: applica solo le modifiche sullo stato attuale nel DB.
//
// Perché il merge: prima ogni client sovrascriveva l'intero blocco JSON con la
// propria copia locale. Se due persone ordinavano a pochi secondi di distanza,
// la seconda cancellava l'ordine della prima senza accorgersene.
// Con il patch il server legge lo stato corrente, fonde SOLO le chiavi
// modificate e scrive con un lock ottimistico su updated_at: se qualcun altro
// ha scritto nel frattempo, rilegge e riprova.
//
// Formato patch (profondità 2):
//   { orders: { "2026-10-08:marco": {...} } }   → aggiunge/aggiorna quell'ordine
//   { orders: { "2026-10-08:marco": null } }    → cancella quell'ordine
//   { users: [...] }                            → chiave non-oggetto: sostituita

const MAX_RETRIES = 8;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Merge a profondità 2: top-level → chiavi figlie. `null` cancella la chiave.
function applyPatch(base, patch) {
  const out = { ...(base || {}) };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (val === null) { delete out[key]; continue; }
    if (isPlainObject(val) && isPlainObject(out[key])) {
      const child = { ...out[key] };
      for (const k2 of Object.keys(val)) {
        if (val[k2] === null) delete child[k2];
        else child[k2] = val[k2];
      }
      out[key] = child;
    } else if (isPlainObject(val) && out[key] === undefined) {
      // nuova chiave top-level: rimuovi eventuali null interni
      const child = {};
      for (const k2 of Object.keys(val)) if (val[k2] !== null) child[k2] = val[k2];
      out[key] = child;
    } else {
      out[key] = val;
    }
  }
  return out;
}

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

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // ─── Modalità 1: sostituzione completa (ripristino backup) ───────────────
  if (body.data && typeof body.data === "object") {
    try {
      const r = await fetch(`${url}/rest/v1/appstate`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ id: "main", data: body.data, updated_at: new Date().toISOString() }),
      });
      const text = await r.text();
      if (!r.ok) return res.status(r.status).send(text || "{}");
      let saved = null;
      try { saved = JSON.parse(text); } catch {}
      return res.status(200).json({ ok: true, data: Array.isArray(saved) ? saved[0]?.data : body.data });
    } catch (e) {
      console.error("state-save (full) error:", e);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  // ─── Modalità 2: patch con merge + lock ottimistico ──────────────────────
  const patch = body.patch;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return res.status(400).json({ error: "Invalid payload: expected {patch} or {data}" });
  }

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // 1. Leggi lo stato corrente + la sua versione (updated_at)
      const r = await fetch(`${url}/rest/v1/appstate?id=eq.main&select=data,updated_at`, { headers });
      if (!r.ok) {
        const t = await r.text();
        return res.status(r.status).send(t || "{}");
      }
      const rows = await r.json();
      const current = Array.isArray(rows) ? rows[0] : null;
      const newTs = new Date().toISOString();

      // Riga inesistente → crea
      if (!current) {
        const merged = applyPatch({}, patch);
        const ins = await fetch(`${url}/rest/v1/appstate`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ id: "main", data: merged, updated_at: newTs }),
        });
        if (ins.ok) return res.status(200).json({ ok: true, data: merged });
        continue; // qualcun altro l'ha creata nel frattempo → riprova
      }

      // 2. Fondi la patch sullo stato corrente
      const merged = applyPatch(current.data || {}, patch);

      // 3. Scrivi SOLO se updated_at è ancora quello letto (lock ottimistico)
      const versionFilter = current.updated_at == null
        ? "updated_at=is.null"
        : `updated_at=eq.${encodeURIComponent(current.updated_at)}`;
      const upd = await fetch(`${url}/rest/v1/appstate?id=eq.main&${versionFilter}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ data: merged, updated_at: newTs }),
      });
      if (!upd.ok) {
        const t = await upd.text();
        console.error("state-save PATCH failed:", upd.status, t);
        return res.status(upd.status).send(t || "{}");
      }
      const out = await upd.json();
      if (Array.isArray(out) && out.length === 1) {
        // Scritto con successo
        return res.status(200).json({ ok: true, data: out[0].data, attempt });
      }
      // 0 righe aggiornate → qualcun altro ha scritto tra lettura e scrittura.
      // Piccola attesa casuale e riprova dalla lettura.
      await new Promise(r => setTimeout(r, 40 + Math.random() * 120));
    }
    console.error("state-save: too many conflicts");
    return res.status(409).json({ error: "Troppi conflitti, riprova" });
  } catch (e) {
    console.error("state-save error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
