# Testing Setup - Vitest + Supertest

**Proyecto**: LexiMind Backend
**Fecha**: 2025-01-27
**Framework**: Vitest 4.0.4 + Supertest 7.1.4
**Estado**: ✅ Completado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Decisiones Técnicas](#decisiones-técnicas)
3. [Paso 1: Instalación de Dependencias](#paso-1-instalación-de-dependencias)
4. [Paso 2: Configuración de Vitest](#paso-2-configuración-de-vitest)
5. [Paso 3: Helpers y Mocks Base](#paso-3-helpers-y-mocks-base)
6. [Paso 4: Test Unitario Ejemplo](#paso-4-test-unitario-ejemplo)
7. [Paso 5: Test de Integración Ejemplo](#paso-5-test-de-integración-ejemplo)
8. [Troubleshooting](#troubleshooting)
9. [Comandos Útiles](#comandos-útiles)
10. [Próximos Pasos](#próximos-pasos)

---

## Resumen Ejecutivo

Se configuró un stack completo de testing para el proyecto LexiMind Backend usando:

- **Vitest 4.0.4**: Framework de testing moderno, rápido y compatible con ES Modules
- **Supertest 7.1.4**: Testing HTTP para APIs Express
- **@vitest/coverage-v8**: Reportes de cobertura de código

### Resultados Finales

✅ **7/7 tests unitarios** pasando
✅ **9/9 tests de integración** pasando
✅ Configuración completa de mocks para OpenAI, Pinecone y Supabase
✅ Helpers y fixtures reutilizables
✅ Estructura de carpetas organizada por tipo de test

---

## Decisiones Técnicas

### ¿Por qué Vitest y no Jest?

| Criterio | Vitest | Jest |
|----------|--------|------|
| **ES Modules nativos** | ✅ Sí | ❌ Requiere configuración |
| **TypeScript** | ✅ Zero-config | ⚠️ Requiere ts-jest |
| **Velocidad** | ✅ 10-20x más rápido | ⚠️ Más lento |
| **Vite integration** | ✅ Nativa | ❌ No |
| **API compatible con Jest** | ✅ Sí | ✅ Sí |

**Decisión**: Vitest es la mejor opción para este proyecto por:
1. Soporte nativo de `"type": "module"` (tu package.json)
2. TypeScript de primera clase
3. Velocidad superior en proyectos TypeScript
4. API compatible con Jest (misma sintaxis)

### Estrategia de Testing

**Pirámide de Testing adoptada**:
- 70% Unit Tests (lógica de dominio, use cases, mappers)
- 25% Integration Tests (endpoints API, flujos completos)
- 5% E2E Tests (flujos críticos RAG, opcional)

---

## Paso 1: Instalación de Dependencias

### Comando Ejecutado

```bash
npm install --save-dev vitest @vitest/coverage-v8 supertest @types/supertest
```

### Output

```
added 77 packages, changed 2 packages, and audited 544 packages in 14s

163 packages are looking for funding
  run `npm fund` for details
```

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "@types/supertest": "^6.0.3",
    "@vitest/coverage-v8": "^4.0.4",
    "supertest": "^7.1.4",
    "vitest": "^4.0.4"
  }
}
```

### Scripts de Testing Agregados

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

**Uso**:
- `npm test`: Modo watch (re-ejecuta al guardar)
- `npm run test:run`: Ejecuta una vez y termina
- `npm run test:coverage`: Genera reporte de cobertura
- `npm run test:ui`: UI interactiva de Vitest

---

## Paso 2: Configuración de Vitest

### Archivo Creado: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Globals - Permite usar describe, it, expect sin importar
    globals: true,

    // Environment - Node.js para testing de APIs
    environment: 'node',

    // Setup files - Ejecutados antes de cada suite de tests
    setupFiles: ['./tests/setup/vitest.setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
        'src/data/mongodb/**',
      ],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },

    // Include patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],

    // Test timeout (ms)
    testTimeout: 10000,

    // Threads - usa workers para paralelizar tests
    threads: true,
    maxThreads: 4,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@domain': resolve(__dirname, './src/domain'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@presentation': resolve(__dirname, './src/presentation'),
      '@config': resolve(__dirname, './src/config'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
})
```

### Actualización de `tsconfig.json`

Agregamos alias de paths y tipos de Vitest:

```json
{
  "compilerOptions": {
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@domain/*": ["./src/domain/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"],
      "@config/*": ["./src/config/*"],
      "@tests/*": ["./tests/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

**Beneficios de los alias**:
- Imports más limpios: `import { X } from '@domain/entities'`
- No más rutas relativas complejas: `../../domain/entities`
- Refactoring más sencillo

---

## Paso 3: Helpers y Mocks Base

### Estructura de Carpetas Creada

```
tests/
├── setup/
│   └── vitest.setup.ts          # Setup global de tests
├── helpers/
│   ├── mocks/
│   │   ├── openai.mock.ts       # Mocks de OpenAI Service
│   │   ├── pinecone.mock.ts     # Mocks de Pinecone Service
│   │   └── supabase.mock.ts     # Mocks de Supabase Client
│   ├── fixtures/
│   │   ├── documents.fixture.ts # Datos de prueba para documentos
│   │   └── responses.fixture.ts # Datos de prueba para respuestas RAG
│   └── test-utils.ts            # Utilidades comunes
├── unit/
│   ├── domain/
│   ├── infrastructure/
│   └── use-cases/
└── integration/
    ├── api/
    └── repositories/
```

### Setup Global (`tests/setup/vitest.setup.ts`)

```typescript
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

beforeAll(() => {
  console.info('🧪 Iniciando suite de tests...')

  // Mock de variables de entorno
  process.env.NODE_ENV = 'test'
  process.env.OPENAI_API_KEY = 'test-openai-key'
  process.env.PINECONE_API_KEY = 'test-pinecone-key'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_KEY = 'test-supabase-key'
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

### Mocks Creados

#### 1. OpenAI Mock (`tests/helpers/mocks/openai.mock.ts`)

```typescript
export const mockOpenAIEmbedding = {
  object: 'list',
  data: [{
    embedding: Array(1536).fill(0.1), // Vector 1536 dimensiones
    index: 0,
  }],
  model: 'text-embedding-3-small',
}

export const createMockOpenAIService = () => ({
  generateEmbedding: vi.fn().mockResolvedValue(mockOpenAIEmbedding.data[0]),
  generateChatCompletion: vi.fn().mockResolvedValue('Mock response'),
})
```

#### 2. Pinecone Mock (`tests/helpers/mocks/pinecone.mock.ts`)

```typescript
export const mockPineconeVector = {
  id: 'doc-123-chunk-1',
  score: 0.95,
  values: Array(1536).fill(0.1),
  metadata: {
    documentId: 'doc-123',
    source: 'Manual_PLD.pdf',
    page: '42',
    text: 'Texto del chunk...',
    area: ['Compliance'],
    category: ['Technical'],
    tags: ['KYC'],
  },
}

export const createMockPineconeService = () => ({
  searchSimilarDocuments: vi.fn().mockResolvedValue([mockPineconeVector]),
  upsertVectors: vi.fn().mockResolvedValue({ upsertedCount: 10 }),
})
```

#### 3. Supabase Mock (`tests/helpers/mocks/supabase.mock.ts`)

```typescript
export const createMockSupabaseClient = () => ({
  from: (table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockDocument, error: null }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'doc.pdf' }, error: null }),
    }),
  },
})
```

### Fixtures y Test Utils

**Fixtures** (`tests/helpers/fixtures/documents.fixture.ts`):
```typescript
export const documentFixtures = {
  basicDocument: {
    documentId: 'doc-123',
    userId: 'user-456',
    originalName: 'Manual_PLD.pdf',
  },
  // ... más fixtures
}
```

**Test Utils** (`tests/helpers/test-utils.ts`):
```typescript
export const createTestEmbedding = (dimension = 1536) => Array(dimension).fill(0.1)
export const generateTestId = (prefix = 'test') => `${prefix}-${Date.now()}`
```

---

## Paso 4: Test Unitario Ejemplo

### Archivo: `tests/unit/use-cases/process-message.use-case.test.ts`

Test del caso de uso `ProcessMessageUseCaseImpl`.

### Estructura del Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProcessMessageUseCaseImpl } from '@/infrastructure/use-cases/process-message.use-case.impl.js'
import { LLMRepository } from '@/domain/repositories/llm.repository.js'
import { LLMResponse } from '@/domain/entities/llm-response.entity.js'
import { Source } from '@/domain/entities/source.entity.js'

describe('ProcessMessageUseCaseImpl', () => {
  let useCase: ProcessMessageUseCaseImpl
  let mockLLMRepository: LLMRepository

  beforeEach(() => {
    mockLLMRepository = { execute: vi.fn() } as unknown as LLMRepository
    useCase = new ProcessMessageUseCaseImpl(mockLLMRepository)
  })

  describe('execute', () => {
    it('should process message and return response DTO', async () => {
      // Arrange
      const inputDto = {
        userId: 'user-456',
        message: '¿Cuáles son los requisitos de KYC?',
      }

      const mockSource = new Source(
        '5', 'Texto...', 'Manual.pdf', 'doc-123', '0.95', 'https://url'
      )
      const mockLLMResponse = new LLMResponse(
        'Respuesta...', new Date(), [mockSource]
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(mockLLMResponse)

      // Act
      const result = await useCase.execute(inputDto)

      // Assert
      expect(result.response).toBe(mockLLMResponse.response)
      expect(result.sources).toHaveLength(1)
      expect(mockLLMRepository.processMessage).toHaveBeenCalledTimes(1)
    })
  })
})
```

### Tests Implementados (7 total)

1. ✅ `should process message and return response DTO`
2. ✅ `should handle message without metadata filters`
3. ✅ `should propagate repository errors`
4. ✅ `should handle empty answer from LLM`
5. ✅ `should create ChatMessage with correct timestamp`
6. ✅ `should handle multiple sources in response`
7. ✅ `should validate ChatMessage is created with all required fields`

### Ejecutar Tests Unitarios

```bash
npm run test:run tests/unit
```

### Output Exitoso

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  131ms
```

### Lecciones Aprendidas

**Problema 1**: `Cannot read properties of undefined (reading 'toISOString')`
- **Causa**: Mock de LLMResponse no incluía timestamp
- **Solución**: Usar entidades reales: `new LLMResponse(...)`

**Problema 2**: `expected undefined to be 'Los requisitos...'`
- **Causa**: ProcessMessageResponseDto usa `response`, no `answer`
- **Solución**: Verificar la estructura de DTOs antes de escribir assertions

**Problema 3**: `expected undefined to be 'Test message'`
- **Causa**: ChatMessage entity tiene `message`, no `content`
- **Solución**: Revisar las propiedades de entidades del dominio

---

## Paso 5: Test de Integración Ejemplo

### Archivo: `tests/integration/api/chats.routes.test.ts`

Test de integración para el endpoint `/api/v1/chats/process-message`.

### Estructura del Test

```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import express, { Application, Router } from 'express'
import { ChatsController } from '@/presentation/chats/controller.js'

describe('Chats API Integration Tests', () => {
  let app: Application
  let mockProcessMessageUseCase: ProcessMessageUseCase

  beforeAll(() => {
    mockProcessMessageUseCase = { execute: vi.fn() } as unknown as ProcessMessageUseCase

    app = express()
    app.use(express.json())

    const controller = new ChatsController(mockProcessMessageUseCase)
    const router = Router()
    router.post('/process-message', controller.processMessage)
    app.use('/api/v1/chats', router)
  })

  it('should return 200 with valid request', async () => {
    const requestBody = {
      userId: 'user-456',
      message: '¿Cuáles son los requisitos de KYC?',
    }

    vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue(mockResponse)

    const response = await request(app)
      .post('/api/v1/chats/process-message')
      .send(requestBody)
      .expect('Content-Type', /json/)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('response')
    expect(response.body).toHaveProperty('sources')
  })
})
```

### Tests Implementados (9 total)

1. ✅ `should return 200 with valid request`
2. ✅ `should return 400 with missing userId`
3. ✅ `should return 400 with missing message`
4. ✅ `should return 400 with empty message`
5. ✅ `should handle empty sources array`
6. ✅ `should handle metadata filters (area, category, tags)`
7. ✅ `should return 500 on internal server error`
8. ✅ `should accept request with only required fields`
9. ✅ `should return properly structured response with all required fields`

### Ejecutar Tests de Integración

```bash
npm run test:run tests/integration
```

### Output Exitoso

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  6.67s
```

### Lecciones Aprendidas

**Problema**: `argument callback is required`
- **Causa**: ChatsRoutes.routes es un getter, no acepta controller como parámetro
- **Solución**: Crear router manualmente en el test:

```typescript
const router = Router()
router.post('/process-message', controller.processMessage)
app.use('/api/v1/chats', router)
```

**Problema**: Test fallaba por mensaje en español
- **Causa**: Assertion esperaba `'message'` pero el error es `'El mensaje es requerido'`
- **Solución**: Ajustar assertion: `.toContain('mensaje')`

---

## Troubleshooting

### Error: "Cannot find module"

**Síntoma**:
```
Cannot find module '@/domain/entities/...'
```

**Causa**: Alias de paths no configurados en tsconfig.json

**Solución**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error: "describe is not defined"

**Síntoma**:
```
ReferenceError: describe is not defined
```

**Causa**: `globals: true` no está habilitado en vitest.config.ts

**Solución**:
```typescript
export default defineConfig({
  test: {
    globals: true,
  },
})
```

### Tests Lentos (>10s)

**Causa**: Tests de integración sin mocks llaman servicios reales (OpenAI, Pinecone)

**Solución**: Mockear siempre servicios externos:
```typescript
vi.mocked(mockService.method).mockResolvedValue(mockResponse)
```

### Coverage Report No Genera

**Síntoma**:
```
npm run test:coverage
# No output
```

**Causa**: `@vitest/coverage-v8` no instalado

**Solución**:
```bash
npm install --save-dev @vitest/coverage-v8
```

---

## Comandos Útiles

### Ejecutar Todos los Tests

```bash
npm test                    # Modo watch
npm run test:run            # Una ejecución
```

### Ejecutar Tests Específicos

```bash
npm run test:run tests/unit                          # Solo unitarios
npm run test:run tests/integration                   # Solo integración
npm run test:run tests/unit/use-cases               # Carpeta específica
npm run test:run process-message.use-case.test.ts   # Archivo específico
```

### Coverage

```bash
npm run test:coverage       # Genera reporte completo
open coverage/index.html    # Abrir reporte HTML
```

### UI Interactiva

```bash
npm run test:ui             # Abre UI de Vitest en el navegador
```

### Debug

```bash
# Modo verbose
vitest run --reporter=verbose

# Con logs de console
vitest run --silent=false
```

---

## Próximos Pasos

### Tests Faltantes por Implementar

#### Unit Tests Prioritarios

1. **Domain Entities**
   - `tests/unit/domain/entities/document.entity.test.ts`
   - `tests/unit/domain/entities/source.entity.test.ts`

2. **Infrastructure Adapters**
   - `tests/unit/infrastructure/adapters/rag.adapter.test.ts`
   - `tests/unit/infrastructure/adapters/upload.adapter.test.ts`

3. **Infrastructure Services**
   - `tests/unit/infrastructure/services/openai.service.test.ts`
   - `tests/unit/infrastructure/services/pinecone.service.test.ts`
   - `tests/unit/infrastructure/services/supabase.service.test.ts`

4. **Mappers**
   - `tests/unit/infrastructure/mappers/document.mapper.test.ts`
   - `tests/unit/infrastructure/mappers/llm-response.mapper.test.ts`

#### Integration Tests Prioritarios

1. **Endpoints Restantes**
   - `tests/integration/api/documents.routes.test.ts` (POST /upload)
   - `tests/integration/api/auth.routes.test.ts`

2. **Repositories**
   - `tests/integration/repositories/external-documents.repository.test.ts`

#### E2E Tests (Opcional)

1. **Flujo RAG Completo**
   - Usuario hace pregunta → OpenAI genera embedding → Pinecone busca docs → OpenAI genera respuesta

### Mejoras Recomendadas

1. **Pre-commit Hook**: Ejecutar tests antes de cada commit
   ```bash
   npm install --save-dev husky lint-staged
   npx husky init
   ```

2. **CI/CD Integration**: Ejecutar tests en GitHub Actions
   ```yaml
   # .github/workflows/test.yml
   - name: Run tests
     run: npm run test:run
   ```

3. **Test Coverage Badges**: Mostrar coverage en README.md

4. **Mock Service Workers (MSW)**: Para interceptar requests HTTP reales

---

## Recursos Adicionales

### Documentación Oficial

- [Vitest Docs](https://vitest.dev/)
- [Supertest Docs](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

### Patrones de Testing

- **AAA Pattern**: Arrange-Act-Assert
- **Given-When-Then**: Para tests de comportamiento
- **Test Pyramid**: 70% unit, 25% integration, 5% E2E

### Convenciones

- Archivos de test: `*.test.ts` o `*.spec.ts`
- Mocks: `*.mock.ts` en `tests/helpers/mocks/`
- Fixtures: `*.fixture.ts` en `tests/helpers/fixtures/`
- Describe blocks: Use case, method, scenario
- Test names: "should [expected behavior] when [condition]"

---

## Checklist de Configuración

- [x] Vitest instalado y configurado
- [x] Supertest instalado
- [x] vitest.config.ts creado
- [x] tsconfig.json actualizado con paths
- [x] Scripts npm agregados
- [x] Estructura de carpetas creada
- [x] Setup global configurado
- [x] Mocks base creados (OpenAI, Pinecone, Supabase)
- [x] Fixtures creadas
- [x] Test unitario ejemplo implementado (7 tests)
- [x] Test de integración ejemplo implementado (9 tests)
- [x] Todos los tests pasan ✅

---

## Soporte

Para dudas o problemas:
1. Revisar sección [Troubleshooting](#troubleshooting)
2. Consultar [documentación oficial de Vitest](https://vitest.dev/)
3. Buscar en Issues de GitHub del proyecto

---

**Última actualización**: 2025-01-27
**Autor**: Claude Code
**Versión**: 1.0
