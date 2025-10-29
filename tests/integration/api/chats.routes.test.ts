import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import express, { Application, Router } from 'express'
import { ChatsController } from '@/presentation/chats/controller.js'
import { ProcessMessageUseCase } from '@/domain/use-cases/process-message.use-case.js'
import { LLMResponse } from '@/domain/entities/llm-response.entity.js'
import { Source } from '@/domain/entities/source.entity.js'

describe('Chats API Integration Tests', () => {
  let app: Application
  let mockProcessMessageUseCase: ProcessMessageUseCase

  beforeAll(() => {
    // Crear mock del use case
    mockProcessMessageUseCase = {
      execute: vi.fn(),
    } as unknown as ProcessMessageUseCase

    // Crear la aplicación Express para tests
    app = express()
    app.use(express.json())

    // Crear el controller con el mock
    const controller = new ChatsController(mockProcessMessageUseCase)

    // Crear y configurar las rutas manualmente para el test
    const router = Router()
    router.post('/process-message', controller.processMessage)

    // Montar las rutas
    app.use('/api/v1/chats', router)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/chats/process-message', () => {
    it('should return 200 with valid request', async () => {
      // Arrange
      const requestBody = {
        userId: 'user-456',
        message: '¿Cuáles son los requisitos de KYC?',
        area: ['Compliance'],
        category: ['Technical'],
      }

      const mockSource = new Source(
        '5',
        'Artículo 5: KYC requirements...',
        'Manual_PLD.pdf',
        'doc-123',
        '0.95',
        'https://storage.supabase.co/doc-123.pdf'
      )

      const mockLLMResponse = new LLMResponse(
        'Los requisitos de KYC incluyen...',
        new Date(),
        [mockSource]
      )

      // Mock del use case
      vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue({
        response: mockLLMResponse.response,
        timestamp: mockLLMResponse.timestamp.toISOString(),
        sources: [
          {
            page: mockSource.page,
            matchingText: mockSource.matchingText,
            source: mockSource.source,
            documentId: mockSource.documentId,
            score: mockSource.score,
            signedUrl: mockSource.signedUrl,
          },
        ],
        resumeQuestion: '',
      })

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(requestBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('response')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('sources')
      expect(response.body).toHaveProperty('resumeQuestion')
      expect(response.body.sources).toBeInstanceOf(Array)
      expect(response.body.sources).toHaveLength(1)
      expect(response.body.sources[0].source).toBe('Manual_PLD.pdf')
    })

    it('should return 400 with missing userId', async () => {
      // Arrange
      const invalidBody = {
        message: '¿Pregunta sin userId?',
      }

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(invalidBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('userId')
    })

    it('should return 400 with missing message', async () => {
      // Arrange
      const invalidBody = {
        userId: 'user-456',
      }

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(invalidBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('mensaje')
    })

    it('should return 400 with empty message', async () => {
      // Arrange
      const invalidBody = {
        userId: 'user-456',
        message: '',
      }

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(invalidBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should handle empty sources array', async () => {
      // Arrange
      const requestBody = {
        userId: 'user-456',
        message: 'Pregunta sin resultados',
      }

      const mockLLMResponse = new LLMResponse(
        'No se encontró información relevante.',
        new Date(),
        []
      )

      vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue({
        response: mockLLMResponse.response,
        timestamp: mockLLMResponse.timestamp.toISOString(),
        sources: [],
        resumeQuestion: '',
      })

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(requestBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.sources).toEqual([])
      expect(response.body.response).toContain('No se encontró')
    })

    it('should handle metadata filters (area, category, tags)', async () => {
      // Arrange
      const requestBody = {
        userId: 'user-456',
        message: 'Consulta con filtros',
        area: ['Compliance', 'PLD'],
        category: ['Technical'],
        source: ['Internal_Manual'],
        tags: ['KYC', 'AML'],
      }

      const mockLLMResponse = new LLMResponse(
        'Respuesta filtrada',
        new Date(),
        []
      )

      vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue({
        response: mockLLMResponse.response,
        timestamp: mockLLMResponse.timestamp.toISOString(),
        sources: [],
        resumeQuestion: '',
      })

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(requestBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(200)

      // Verificar que el use case fue llamado con los filtros correctos
      const callArgs = vi.mocked(mockProcessMessageUseCase.execute).mock
        .calls[0][0]
      expect(callArgs.area).toEqual(requestBody.area)
      expect(callArgs.category).toEqual(requestBody.category)
      expect(callArgs.source).toEqual(requestBody.source)
      expect(callArgs.tags).toEqual(requestBody.tags)
    })

    it('should return 500 on internal server error', async () => {
      // Arrange
      const requestBody = {
        userId: 'user-456',
        message: 'Test error handling',
      }

      // Mock error en el use case
      vi.mocked(mockProcessMessageUseCase.execute).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(requestBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Error interno')
    })

    it('should accept request with only required fields', async () => {
      // Arrange
      const minimalBody = {
        userId: 'user-789',
        message: 'Simple question',
      }

      const mockLLMResponse = new LLMResponse(
        'Simple answer',
        new Date(),
        []
      )

      vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue({
        response: mockLLMResponse.response,
        timestamp: mockLLMResponse.timestamp.toISOString(),
        sources: [],
        resumeQuestion: '',
      })

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(minimalBody)
        .expect('Content-Type', /json/)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.response).toBe('Simple answer')
    })
  })

  describe('API Response Format', () => {
    it('should return properly structured response with all required fields', async () => {
      // Arrange
      const requestBody = {
        userId: 'user-456',
        message: 'Test complete response',
      }

      const mockSource = new Source(
        '10',
        'Test matching text',
        'TestDoc.pdf',
        'doc-999',
        '0.88',
        'https://test.url'
      )

      const mockLLMResponse = new LLMResponse(
        'Complete test response',
        new Date('2024-01-15T10:00:00Z'),
        [mockSource]
      )

      vi.mocked(mockProcessMessageUseCase.execute).mockResolvedValue({
        response: mockLLMResponse.response,
        timestamp: mockLLMResponse.timestamp.toISOString(),
        sources: [
          {
            page: mockSource.page,
            matchingText: mockSource.matchingText,
            source: mockSource.source,
            documentId: mockSource.documentId,
            score: mockSource.score,
            signedUrl: mockSource.signedUrl,
          },
        ],
        resumeQuestion: 'Test resume',
      })

      // Act
      const response = await request(app)
        .post('/api/v1/chats/process-message')
        .send(requestBody)

      // Assert
      expect(response.body).toMatchObject({
        response: expect.any(String),
        timestamp: expect.any(String),
        sources: expect.any(Array),
        resumeQuestion: expect.any(String),
      })

      // Verificar estructura de sources
      expect(response.body.sources[0]).toMatchObject({
        page: expect.any(String),
        matchingText: expect.any(String),
        source: expect.any(String),
        documentId: expect.any(String),
        score: expect.any(String),
        signedUrl: expect.any(String),
      })
    })
  })
})
