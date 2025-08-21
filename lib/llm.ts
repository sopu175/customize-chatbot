import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from "@langchain/ollama";


async function testOllamaConnection(baseUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/api/tags`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

export function getLLM() {
    const provider = process.env.LLM_PROVIDER || 'ollama';

    if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not found in environment variables');
        }

        return new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'gpt-4',
            temperature: 0.7,
        });
    }

    // Default to Ollama
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'mistral';

    return new ChatOllama({
        baseUrl,
        model,
        temperature: 0.7,
    });
}

export async function validateLLMConnection() {
    const provider = process.env.LLM_PROVIDER || 'ollama';

    if (provider === 'ollama') {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const isConnected = await testOllamaConnection(baseUrl);

        if (!isConnected) {
            throw new Error(`Cannot connect to Ollama at ${baseUrl}. Please ensure Ollama is running with 'ollama serve' and you have a model installed (e.g., 'ollama pull mistral').`);
        }
    }

    return true;
}