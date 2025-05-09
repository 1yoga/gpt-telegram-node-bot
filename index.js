import { Telegraf, Markup } from 'telegraf';
import { chatWithGPT } from './openai.js';
import { defaultSettings, availableModels } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSettings = {};

bot.command('start', (ctx) => {
  ctx.reply('Привет! Напиши сообщение или используй /setup для настройки модели, температуры и system prompt.');
});

bot.command('setup', (ctx) => {
  const uid = ctx.from.id;
  userSettings[uid] = userSettings[uid] || { ...defaultSettings };

  const settings = userSettings[uid];
  return ctx.reply(
    `⚙️ Настройки:
Модель: ${settings.model}
Температура: ${settings.temperature}
max_tokens: ${settings.max_tokens}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('📌 Модель', 'setup_model'),
        Markup.button.callback('🔥 Температура', 'setup_temperature'),
      ],
      [Markup.button.callback('📝 System prompt', 'setup_system')],
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
  return ctx.editMessageText('Выберите температуру:', Markup.inlineKeyboard([
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
  await ctx.answerCbQuery(`✅ Температура: ${temp}`);
  return ctx.editMessageText(`Температура установлена: ${temp}`);
});

bot.action('setup_system', async (ctx) => {
  const uid = ctx.from.id;
  await ctx.answerCbQuery();
  ctx.reply('Введите system prompt (например: "Ты опытный бизнес-консультант"):');
  bot.once('text', (msgCtx) => {
    userSettings[uid].system = msgCtx.message.text;
    msgCtx.reply('✅ System prompt установлен!');
  });
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
console.log('🤖 Бот с UI-настройкой запущен');
