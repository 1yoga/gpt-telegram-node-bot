import { Telegraf, Markup } from 'telegraf';
import { chatWithGPT } from './openai.js';
import { defaultSettings, availableModels } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSettings = {};

bot.command('start', (ctx) => {
  ctx.reply('Привет! Напиши сообщение или используй /setup для настройки модели, temperature и system prompt.');
});

bot.command('setup', (ctx) => {
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };

  const settings = userSettings[uid];
  return ctx.reply(
    `⚙️ Настройки:
Модель: ${settings.model}
Temperature: ${settings.temperature}
max_tokens: ${settings.max_tokens}
System Prompt: ${settings.system || 'не задан'}`,

    Markup.inlineKeyboard([
      [
        Markup.button.callback('📌 Модель', 'setup_model'),
        Markup.button.callback('🔥 Temperature', 'setup_temperature'),
      ],
      [
        Markup.button.callback('🔢 Max Tokens', 'setup_tokens'),
        Markup.button.callback('📝 System prompt', 'setup_system'),
      ],
      [
        Markup.button.callback('🔄 Сбросить настройки', 'reset_settings'),
      ]
    ])
  );
});

bot.action('setup_model', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.editMessageText('Выберите модель:', Markup.inlineKeyboard(
    availableModels.map(model => Markup.button.callback(model, `select_model_${model}`)),
    { columns: 2 }
  ));
});
bot.command('cancel', (ctx) => {
  const uid = ctx.from.id;
  if (userSettings[uid]) {
    userSettings[uid].awaitingPrompt = false;
    ctx.reply('⛔ Ввод system prompt отменён.');
  }
});

bot.action(/select_model_(.+)/, async (ctx) => {
  const model = ctx.match[1];
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };
  userSettings[uid].model = model;
  await ctx.answerCbQuery(`✅ Установлено: ${model}`);
  return ctx.editMessageText(`Модель установлена: ${model}`);
});

bot.action('setup_temperature', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.editMessageText('Выберите temperature:', Markup.inlineKeyboard([
    ['0.2', '0.5', '0.7', '1.0'].map(temp =>
      Markup.button.callback(temp, `select_temp_${temp}`)
    ),
  ]));
});

bot.action(/select_temp_(.+)/, async (ctx) => {
  const temp = parseFloat(ctx.match[1]);
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };
  userSettings[uid].temperature = temp;
  await ctx.answerCbQuery(`✅ Temperature: ${temp}`);
  return ctx.editMessageText(`Temperature установлена: ${temp}`);
});

bot.action('setup_tokens', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.editMessageText('Выберите max_tokens:', Markup.inlineKeyboard([
    ['512', '1024', '2048', '4096', '8192'].map(val =>
      Markup.button.callback(val, `select_tokens_${val}`)
    )
  ]));
});

bot.action(/select_tokens_(\d+)/, async (ctx) => {
  const tokens = parseInt(ctx.match[1]);
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };
  userSettings[uid].max_tokens = tokens;
  await ctx.answerCbQuery(`✅ max_tokens: ${tokens}`);
  return ctx.editMessageText(`Max tokens установлены: ${tokens}`);
});

bot.action('setup_system', async (ctx) => {
  const uid = ctx.from.id;
  await ctx.answerCbQuery();
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };
  userSettings[uid].awaitingPrompt = true;
  ctx.reply('Введите system prompt (например: "Ты опытный бизнес-консультант"):');
});

bot.action('reset_settings', async (ctx) => {
  const uid = ctx.from.id;
  userSettings[uid] = { ...defaultSettings };
  await ctx.answerCbQuery('Настройки сброшены');
  return ctx.editMessageText('🔄 Все настройки сброшены к значениям по умолчанию.');
});

bot.on('text', async (ctx) => {
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };

  if (userSettings[uid].awaitingPrompt) {
    userSettings[uid].system = ctx.message.text;
    userSettings[uid].awaitingPrompt = false;
    return ctx.reply('✅ System prompt установлен!');
  }

  const settings = userSettings[uid];
  try {
    ctx.sendChatAction('typing');
    const reply = await chatWithGPT(ctx.message.text, settings);
    const chunks = reply.match(/[\s\S]{1,4000}/g) || [];
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    ctx.reply('🚫 Ошибка при обращении к GPT. Попробуй позже.');
  }
});

bot.launch();
console.log('🤖 Бот с расширенным UI-настройщиком запущен');
