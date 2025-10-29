import { vi } from 'vitest';
/**
 * Mock de OpenAI Service
 * Simula las respuestas de OpenAI sin hacer llamadas reales a la API
 */
export const mockOpenAIEmbedding = {
    object: 'list',
    data: [
        {
            object: 'embedding',
            embedding: Array(1536).fill(0.1), // Vector de 1536 dimensiones
            index: 0,
        },
    ],
    model: 'text-embedding-3-small',
    usage: {
        prompt_tokens: 8,
        total_tokens: 8,
    },
};
export const mockOpenAIChatCompletion = {
    id: 'chatcmpl-test123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [
        {
            index: 0,
            message: {
                role: 'assistant',
                content: 'Esta es una respuesta de prueba generada por el mock de OpenAI.',
            },
            finish_reason: 'stop',
        },
    ],
    usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70,
    },
};
/**
 * Factory para crear un mock del servicio OpenAI
 */
export const createMockOpenAIService = () => ({
    generateEmbedding: vi.fn().mockResolvedValue(mockOpenAIEmbedding.data[0]),
    generateChatCompletion: vi
        .fn()
        .mockResolvedValue(mockOpenAIChatCompletion.choices[0].message.content),
    streamChatCompletion: vi.fn(),
});
/**
 * Mock de errores comunes de OpenAI
 */
export const mockOpenAIErrors = {
    rateLimitError: new Error('Rate limit exceeded'),
    invalidApiKeyError: new Error('Invalid API key'),
    timeoutError: new Error('Request timeout'),
    modelNotFoundError: new Error('Model not found'),
};
