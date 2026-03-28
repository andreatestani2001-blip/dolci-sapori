export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, message } = req.body;

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key os_v2_app_a54tu2r3vzgspjyaw4dqo76nic2qp7ywkzsu2552behbxn7wql7unia2bcgpgn45nxsin2rokogdqyjcer5hih4ulib6rxuptqhcz7q',
      },
      body: JSON.stringify({
        app_id: '07793a6a-3bae-4d27-a700-b707077fcd40',
        included_segments: ['All'],
        headings: { it: title, en: title },
        contents: { it: message, en: message },
        url: 'https://dolci-sapori.vercel.app',
      }),
    });

    const data = await response.json();
    console.log('OneSignal response:', JSON.stringify(data));
    return res.status(200).json(data);
  } catch (e) {
    console.error('Push error:', e);
    return res.status(500).json({ error: e.message });
  }
}
