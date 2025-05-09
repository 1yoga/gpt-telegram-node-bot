import axios from 'axios';
import { defaultSettings } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Отправляет сообщение в OpenAI API с учётом пользовательских настроек
 * @param {string} message - Вопрос от пользователя
 * @param {object} settings - Настройки пользователя: model, temperature, max_tokens, system
 * @returns {Promise<string>} - Ответ GPT
 */
export async function chatWithGPT(message, settings = {}) {
  const messages = [];

  if (settings.system) {
    messages.push({ role: 'system', content: settings.system });
  }

  messages.push({ role: 'user', content: message });

  const payload = {
    model: settings.model || defaultSettings.model,
    temperature: settings.temperature ?? defaultSettings.temperature,
    max_tokens: settings.max_tokens ?? defaultSettings.max_tokens,
    messages,
  };

  const headers = {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };

  if (process.env.OPENAI_ORG_ID) {
    headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
  }

  const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
    headers,
  });

  return res.data.choices[0].message.content;
}
