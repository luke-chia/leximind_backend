import { vi } from 'vitest';
/**
 * Utilidades comunes para tests
 */
/**
 * Espera un tiempo determinado (útil para testing de async)
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Genera un ID único para tests
 */
export const generateTestId = (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
/**
 * Crea un vector de embeddings de prueba
 */
export const createTestEmbedding = (dimension = 1536, value = 0.1) => Array(dimension).fill(value);
/**
 * Simula un delay de red para tests de servicios externos
 */
export const simulateNetworkDelay = async (ms = 100) => {
    await wait(ms);
};
/**
 * Helper para verificar que una función fue llamada con argumentos parciales
 */
export const expectCalledWithPartial = (mockFn, ...expectedArgs) => {
    const calls = mockFn.mock.calls;
    const match = calls.some((call) => expectedArgs.every((expected, index) => {
        if (typeof expected === 'object' && expected !== null) {
            return Object.entries(expected).every(([key, value]) => call[index]?.[key] === value);
        }
        return call[index] === expected;
    }));
    return match;
};
/**
 * Crea un mock de función asíncrona que puede fallar/succeeder
 */
export const createAsyncMock = (successValue, failValue, shouldFail = false) => {
    return vi.fn().mockImplementation(() => {
        if (shouldFail) {
            return Promise.reject(failValue || new Error('Mock error'));
        }
        return Promise.resolve(successValue);
    });
};
/**
 * Helper para testear errores asíncronos
 */
export const expectAsyncError = async (fn, expectedError) => {
    let error;
    try {
        await fn();
    }
    catch (e) {
        error = e;
    }
    if (!error) {
        throw new Error('Expected function to throw an error, but it did not');
    }
    if (typeof expectedError === 'string') {
        if (!error.message.includes(expectedError)) {
            throw new Error(`Expected error message to include "${expectedError}", but got "${error.message}"`);
        }
    }
    else {
        if (!expectedError.test(error.message)) {
            throw new Error(`Expected error message to match ${expectedError}, but got "${error.message}"`);
        }
    }
    return error;
};
/**
 * Limpia todas las variables de entorno mock
 */
export const cleanupMockEnv = () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.PINECONE_API_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_KEY;
};
/**
 * Helper para crear un request mock para Supertest
 */
export const createMockRequest = (overrides) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
});
/**
 * Helper para crear un response mock para testing de controllers
 */
export const createMockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    return res;
};
/**
 * Verifica que un objeto tiene todas las propiedades requeridas
 */
export const hasRequiredProperties = (obj, requiredProps) => {
    return requiredProps.every((prop) => prop in obj && obj[prop] !== undefined);
};
