const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const ORIGIN = 'https://panther-dubai.onrender.com';

app.get('/auth', (req, res) => {
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
      },
      { headers: { Accept: 'application/json' } }
    );
    const token = response.data.access_token;
    res.send(`
      <script>
        const receiveMessage = (message) => {
          window.opener.postMessage(
            'authorization:github:success:{"token":"${token}","provider":"github"}',
            message.origin
          );
          window.removeEventListener("message", receiveMessage, false);
        };
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      </script>
    `);
  } catch (err) {
    res.send('Error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth server running on port ${PORT}`));
