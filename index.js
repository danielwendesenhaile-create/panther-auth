const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.get('/', (req, res) => {
  res.send('Panther Dubai Auth Server is running.');
});

app.get('/auth', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'repo,user',
    state: Math.random().toString(36).substring(7)
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
  console.log('Callback query:', req.query);
  const code = req.query.code;
  const provider = req.query.provider || 'github';

  if (!code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <body>
      <script>
        window.opener && window.opener.postMessage(
          'authorization:${provider}:error:No code provided',
          '*'
        );
        window.close();
      </script>
      <p>Error: No code provided</p>
      </body>
      </html>
    `);
  }

  try {
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Token response:', tokenRes.data);
    const token = tokenRes.data.access_token;

    if (!token) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <body>
        <script>
          window.opener && window.opener.postMessage(
            'authorization:github:error:${JSON.stringify(tokenRes.data)}',
            '*'
          );
          window.close();
        </script>
        <p>Error getting token</p>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
      <script>
        (function() {
          const token = "${token}";
          const message = "authorization:github:success:" + JSON.stringify({
            token: token,
            provider: "github"
          });
          function receiveMessage(e) {
            console.log("receiveMessage", e);
            window.opener.postMessage(message, e.origin);
            window.removeEventListener("message", receiveMessage, false);
          }
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        })();
      </script>
      <p>Authorization complete. Closing window...</p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(500).send('Auth error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
