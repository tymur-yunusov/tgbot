import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';
import { converter } from './converter.js';
import { openai } from './openai.js';
import { removeFile } from './utils.js';
import { textConverter } from './text.js';

const INITIAL_SESSION = {
    messages: [],
};

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'), { handlerTimeout: Infinity });
bot.use(session());

bot.command('new', async (context) => {
    context.session = INITIAL_SESSION;
    await context.reply('Жду вашего голосового или текстового сообщения');
});

bot.command('start', async (context) => {
    context.session = INITIAL_SESSION;
    await context.reply('Жду вашего голосового или текстового сообщения');
});

// Bot listener for voice message
bot.on(message('voice'), async (context) => {
    context.session ??= INITIAL_SESSION;

    try {
        await context.reply(code('Сообщение принял. Жду ответ от Chat GPT.'));
        const link = await context.telegram.getFileLink(context.message.voice.file_id);
        const userId = String(context.message.from.id);
        const oggPath = await converter.create(link.href, userId);
        const mp3Path = await converter.toMp3(oggPath, userId);

        removeFile(oggPath);

        const text = await openai.transcription(mp3Path);

        removeFile(mp3Path);
        await context.reply(code(`Запрос: ${text}`));

        context.session.messages.push({ role: openai.roles.USER, content: text });
        const response = await openai.chat(context.session.messages);

        context.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.message.content,
        });

        const audio = await textConverter.textToSpeech(response.message.content);
        await context.reply(response.message.content);
        await context.sendAudio(
            { source: audio },
            {
                title: 'Ответ киборга',
                performer: 'ChatGPT',
            }
        );
    } catch (error) {
        console.log(`Error while voice message ${error.message}`);
    }
});

// Bot listener for text message
bot.on(message('text'), async (context) => {
    context.session ??= INITIAL_SESSION;

    try {
        await context.reply(code('Сообщение принял. Жду ответ от Chat GPT.'));

        context.session.messages.push({ role: openai.roles.USER, content: context.message.text });
        const response = await openai.chat(context.session.messages);

        context.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.message.content,
        });

        const audio = await textConverter.textToSpeech(response.message.content);

        await context.reply(response.message.content);
        await context.sendAudio(
            { source: audio },
            {
                title: 'Ответ киборга',
                performer: 'ChatGPT',
            }
        );
    } catch (error) {
        console.log(`Error while text message ${error.message}`);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
