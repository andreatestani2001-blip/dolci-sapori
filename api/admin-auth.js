export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, secret } = req.body;

  const ADMIN_ID       = process.env.ADMIN_ID;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_SECRET   = process.env.ADMIN_SECRET;

  if (!ADMIN_ID || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return res.status(500).json({ error: 'Configurazione server mancante' });
  }

  if (username !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Credenziali non corrette.' });
  }

  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Codice segreto non corretto.' });
  }

  return res.status(200).json({ ok: true });
}
