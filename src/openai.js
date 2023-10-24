import OpenAI from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenTest {
    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system',
    };

    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }

    async chat(messages) {
        try {
            const response = await this.openai.chat.completions.create({
                messages: messages,
                model: 'gpt-3.5-turbo',
            });

            return response.choices[0];
        } catch (error) {
            console.error(`Error while GPT chat. ${error.message}`);
        }
    }

    async transcription(filepath) {
        try {
            const response = await this.openai.audio.transcriptions.create({
                file: createReadStream(filepath),
                model: 'whisper-1',
            });

            return response.text;
        } catch (error) {
            console.error(`Error while transcription. ${error.message}`);
        }
    }
}

export const openai = new OpenTest(config.get('OPENAI_KEY2'));
