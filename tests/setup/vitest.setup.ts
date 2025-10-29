import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

/**
 * Setup global para todos los tests
 * Este archivo se ejecuta antes de cada suite de tests
 */

// Setup global antes de todos los tests
beforeAll(() => {
  console.info('🧪 Iniciando suite de tests...')

  // Setup de variables de entorno para tests
  process.env.NODE_ENV = 'test'
  process.env.PORT = '3001'
  process.env.HOST = 'localhost'

  // Mock de variables de entorno de servicios externos
  // Esto previene llamadas accidentales a servicios reales
  process.env.OPENAI_API_KEY = 'test-openai-key'
  process.env.OPENAI_MODEL = 'gpt-3.5-turbo'
  process.env.OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'

  process.env.PINECONE_API_KEY = 'test-pinecone-key'
  process.env.PINECONE_INDEX_NAME = 'test-index'
  process.env.PINECONE_NAMESPACE = 'test-namespace'
  process.env.PINECONE_ENVIRONMENT = 'test-environment'

  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_KEY = 'test-supabase-key'

  process.env.MONGO_URL = 'mongodb://localhost:27017/test'
  process.env.MONGO_DB_NAME = 'test-db'
})

// Cleanup global después de todos los tests
afterAll(() => {
  console.info('✅ Suite de tests completada')
})

// Setup antes de cada test individual
beforeEach(() => {
  // Limpia todos los mocks antes de cada test
  vi.clearAllMocks()
})

// Cleanup después de cada test individual
afterEach(() => {
  // Restaura todos los mocks después de cada test
  vi.restoreAllMocks()
})

// Mock global de console para tests silenciosos (opcional)
// Descomenta si quieres silenciar console.log en tests
/*
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
*/
