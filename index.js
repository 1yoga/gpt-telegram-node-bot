import { Telegraf } from 'telegraf';
import { chatWithGPT } from './openai.js';
import { defaultSettings, availableModels } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSettings = {};

bot.command('start', (ctx) => {
  ctx.reply(`Привет! Я бот с подключением к GPT. 
Напиши свой вопрос или используй /settings чтобы задать параметры (model, temperature, max_tokens, system).
Показать текущие настройки: /settings_show`);
});

bot.command('settings', (ctx) => {
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };

  const args = ctx.message.text.split(' ');
  const key = args[1];
  const value = args.slice(2).join(' ');

  if (!key || !value) {
    return ctx.reply(`Используй:
  /settings model <имя_модели>
  /settings temperature <0-2>
  /settings max_tokens <число>
  /settings system <описание роли>`);
  }

  if (key === 'model') {
    if (!availableModels.includes(value)) {
      return ctx.reply(`Недопустимая модель. Доступные: ${availableModels.join(', ')}`);
    }
    userSettings[uid].model = value;
  } else if (key === 'temperature') {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 2) {
      return ctx.reply('Температура должна быть числом от 0 до 2');
    }
    userSettings[uid].temperature = num;
  } else if (key === 'max_tokens') {
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 8192) {
      return ctx.reply('max_tokens должно быть числом от 1 до 8192');
    }
    userSettings[uid].max_tokens = num;
  } else if (key === 'system') {
    userSettings[uid].system = value;
  } else {
    return ctx.reply('Неизвестная настройка. Доступные: model, temperature, max_tokens, system');
  }

  ctx.reply(`✅ Настройка "${key}" обновлена`);
});

bot.command('settings_show', (ctx) => {
  const uid = ctx.from.id;
  const s = userSettings[uid] || defaultSettings;
  ctx.reply(`📌 Текущие настройки:
- model: ${s.model}
- temperature: ${s.temperature}
- max_tokens: ${s.max_tokens}
- system: ${s.system || '(не задано)'}`);
});

bot.on('text', async (ctx) => {
  const uid = ctx.from.id;
  const settings = userSettings[uid] || defaultSettings;
  try {
    ctx.sendChatAction('typing');
    const reply = await chatWithGPT(ctx.message.text, settings);
    ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(err.response?.data || err.message);
    ctx.reply('🚫 Ошибка при обращении к GPT. Попробуй позже.');
  }
});

bot.launch();
console.log('🤖 Бот запущен');
