const { Telegraf } = require('telegraf');
const { chatWithGPT } = require('./openai');
const { defaultSettings, availableModels } = require('./config');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSettings = {};

bot.command('start', (ctx) => {
  ctx.reply('Привет! Напиши свой вопрос. Настройки по умолчанию: модель GPT = gpt-3.5-turbo');
});

bot.command('settings', (ctx) => {
  const [_, key, value] = ctx.message.text.split(' ');
  if (!key || !value) return ctx.reply(`Используй: /settings [model|temperature|max_tokens] [value]`);
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };

  if (key === 'model' && !availableModels.includes(value)) {
    return ctx.reply(`Доступные модели: ${availableModels.join(', ')}`);
  }

  if (key === 'temperature') {
    const temp = parseFloat(value);
    if (isNaN(temp) || temp < 0 || temp > 2) return ctx.reply('Температура должна быть числом от 0 до 2');
    userSettings[uid][key] = temp;
  } else if (key === 'max_tokens') {
    const max = parseInt(value);
    if (isNaN(max) || max < 1 || max > 4096) return ctx.reply('max_tokens должно быть от 1 до 4096');
    userSettings[uid][key] = max;
  } else if (key === 'model') {
    userSettings[uid][key] = value;
  }

  ctx.reply(`Настройка "${key}" изменена на "${value}"`);
});

bot.on('text', async (ctx) => {
  const uid = ctx.from.id;
  const settings = userSettings[uid] || defaultSettings;
  try {
    ctx.sendChatAction('typing');
    const reply = await chatWithGPT(ctx.message.text, settings);
    ctx.reply(reply);
  } catch (err) {
    console.error(err.response?.data || err);
    ctx.reply('Произошла ошибка при обращении к GPT');
  }
});

bot.launch();
console.log('Бот запущен!');
