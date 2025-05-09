const axios = require('axios');
const { defaultSettings } = require('./config');
require('dotenv').config();

async function chatWithGPT(message, settings = {}) {
  const payload = {
    model: settings.model || defaultSettings.model,
    temperature: settings.temperature ?? defaultSettings.temperature,
    max_tokens: settings.max_tokens ?? defaultSettings.max_tokens,
    messages: [{ role: 'user', content: message }],
  };

  const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });

  return res.data.choices[0].message.content;
}

module.exports = { chatWithGPT };
