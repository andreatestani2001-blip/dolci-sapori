const { GoogleAuth } = require('google-auth-library');

const SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "dolci-sapori",
  private_key_id: "323654c76362bd768f1ed199976e9f984346de60",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDC8q9Mz04VREjJ\nTjMw58PNk81GlL/VLJu8df7CaoYpVco9gnfT/MnreVfHZYVs8hDnLeEKrEP5Lsso\njKxUbWFJRziKBPbkylibC7TPfYyOli1QItpsR3bz9W1U+34MM3Q8uM3OhN1Nahvg\n0cu7bttwuYvqDMNIZnFS4EbjmdxRS136FTfKqPsjRVnORNOh/zPskNSmfMpoUCRP\n8hjRPwdww6zE/xtXy4/DnQcJvLqfI5O/tIwX/RhdVG/ZIhLMuru7/qRQ9fmQZJzp\nUFRNepZHsB++wcYNuAst5fbyNvjHEiSvKZqRhh79qo2yNhwIQxzPIRkti1xJlVmB\ntsuRuohTAgMBAAECggEALbCzZU0w/8sBRC0P0mZ/fa8mbWRvkYbi+UiubOKKjyWM\nQN5TN1wH9yh5akJhAye4znXySI4XYE+XTemqeh8orgQDPFXth7HlEnGr7vV9++02\nsZF5n+cf+g2Lkl9fK3zjwVeO5Ng/BeXYotiI52UUCVdzc2eKXW2lIcdu1ek5udOH\nUbww4TZJDOTXfpxBqlty5iZuUjlXtZC55LJiT9xHUd6/+V4GN7vWg4jwjbfKcfb3\nyFvGoK8/gZgF5rkggbx1wSUGCm9nZWilFy/Tqn+DyzmGVST9BI4Cyp2+DR80zRrN\nbL8tg0WCRD2rpK1NyUmY7vK3ONsT6X5hzqW59orAAQKBgQDsMUp77X1JO8te0NPz\ngxcJoPzlTLTbNfI481/QXKi5CoRwbOwLU0PqH8pY1rMHPYAVjbpFlj+O7OmAuFak\nPFJv3FAjEF7hu8jGzEpXzBt0gtQp8ftH8e8I11NNvotaues3HXP3f1jdDjpLohKO\nMtUG4btn8g4sU1t9mfFTGK69KQKBgQDTS+70+VFj/AuB3aUjNeNpM7BkznQJFOSY\nVoAIawK4TAM0ebUz6/ZXyKHP9H+yr3tUm0Bs9z4RKI8TamktlUIJx8TI/qH+80ZT\n+5usEQ1LMKMiWvyXBCJ8mCn7r/uV2KAV+ghmOu0qTl91wds/DqPqUXhBkqaTFevN\n0k/+ZtWNGwKBgQCsMnN/TnHdBn8KrW0ZSCVvm7NE6Vuhxf7Gjoj4O9W2snhEDuU4\njIgjFPJNOppjWO8cx6taOGQ2K3tBoSNpsaDYdOLn7XN/V4zVgvNgdyo9E3Ti78yn\nczc2VuYg9B5dEtbt48c8VdfPsiPGKG8mxOCSl9gtvEehAVTeiXFrh789oQKBgQCt\nWjcKNSJZbYfjW/0IDkYtIYMusVLxwHproUwZm/H3UiWu/8tydbz9+FUJUAcUinQc\nzeLlg1MgsK3xt/PiufocHBGO9ZnimaSxclQdrz/A2H5+yTdCjtncbtrC63b1UWzF\nmwUZGm9JrlMTQaCm81P4Ai8vXSncsrdrfYizp5q80QKBgBPrOTY953lVjCGhHiTp\n/d/XMpfG7jobxNXsmylwOvXcXGza2gYzlUdL1OZ2/fzFhUDONMMrpe6hpQH6frsb\nVm2k9yAUz3QG5tSLmJHHXTseyZzicJ39lKyz+OaKJWy5n+5SRKCjgaDrUxKD/Wy7\nPO6NVitpTmBI1xhsOM/MBCZ/\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@dolci-sapori.iam.gserviceaccount.com",
  client_id: "107353133233549763114",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

async function getAccessToken() {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, message, tokens } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title e message richiesti' });

  try {
    const accessToken = await getAccessToken();
    const results = [];

    if (tokens && tokens.length > 0) {
      // Invia a token specifici
      for (const token of tokens) {
        const resp = await fetch(
          'https://fcm.googleapis.com/v1/projects/dolci-sapori/messages:send',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body: message },
                webpush: {
                  notification: { title, body: message, icon: '/logo192.png' },
                  fcm_options: { link: 'https://dolci-sapori.vercel.app' }
                }
              }
            }),
          }
        );
        results.push(await resp.json());
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (e) {
    console.error('Push error:', e);
    return res.status(500).json({ error: e.message });
  }
}
