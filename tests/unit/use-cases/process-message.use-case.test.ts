import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProcessMessageUseCaseImpl } from '@/infrastructure/use-cases/process-message.use-case.impl.js'
import { LLMRepository } from '@/domain/repositories/llm.repository.js'
import { ProcessMessageDto } from '@/domain/dtos/process-message.dto.js'
import { LLMResponse } from '@/domain/entities/llm-response.entity.js'
import { ChatMessage } from '@/domain/entities/chat-message.entity.js'
import { Source } from '@/domain/entities/source.entity.js'

describe('ProcessMessageUseCaseImpl', () => {
  let useCase: ProcessMessageUseCaseImpl
  let mockLLMRepository: LLMRepository

  beforeEach(() => {
    // Crear mock del repositorio LLM
    mockLLMRepository = {
      processMessage: vi.fn(),
    } as unknown as LLMRepository

    // Inicializar el use case con el mock
    useCase = new ProcessMessageUseCaseImpl(mockLLMRepository)
  })

  describe('execute', () => {
    it('should process message and return response DTO', async () => {
      // Arrange - Preparar datos de prueba
      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: '¿Cuáles son los requisitos de KYC?',
        area: ['Compliance', 'PLD'],
        category: ['Technical'],
        source: ['Internal_Manual'],
        tags: ['KYC'],
      }

      const mockSource = new Source(
        '5',
        'Artículo 5: Todo cliente debe someterse a un proceso de KYC...',
        'Manual_PLD.pdf',
        'doc-123',
        '0.95',
        'https://storage.supabase.co/documents/doc-123.pdf'
      )

      const mockLLMResponse = new LLMResponse(
        'Los requisitos de KYC incluyen verificación de identidad...',
        new Date(),
        [mockSource]
      )

      // Configurar el mock para retornar la respuesta esperada
      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act - Ejecutar el use case
      const result = await useCase.execute(inputDto)

      // Assert - Verificar resultados
      expect(result).toBeDefined()
      expect(result.response).toBe(mockLLMResponse.response)
      expect(result.timestamp).toBeDefined()
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0].source).toBe('Manual_PLD.pdf')
      expect(result.sources[0].page).toBe('5')

      // Verificar que el repositorio fue llamado correctamente
      expect(mockLLMRepository.processMessage).toHaveBeenCalledTimes(1)

      // Verificar que se creó un ChatMessage con los datos correctos
      const chatMessageArg = vi.mocked(mockLLMRepository.processMessage).mock.calls[0][0]
      expect(chatMessageArg).toBeInstanceOf(ChatMessage)
      expect(chatMessageArg.userId).toBe(inputDto.userId)
      expect(chatMessageArg.message).toBe(inputDto.message)
      expect(chatMessageArg.area).toEqual(inputDto.area)
      expect(chatMessageArg.category).toEqual(inputDto.category)
    })

    it('should handle message without metadata filters', async () => {
      // Arrange
      const inputDto: ProcessMessageDto = {
        userId: 'user-789',
        message: 'Pregunta simple sin filtros',
      }

      const mockLLMResponse = new LLMResponse(
        'Respuesta simple',
        new Date(),
        []
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act
      const result = await useCase.execute(inputDto)

      // Assert
      expect(result).toBeDefined()
      expect(result.response).toBe('Respuesta simple')
      expect(result.sources).toEqual([])

      // Verificar que el ChatMessage fue creado con metadata undefined
      const chatMessageArg = vi.mocked(mockLLMRepository.processMessage).mock.calls[0][0]
      expect(chatMessageArg.area).toBeUndefined()
      expect(chatMessageArg.category).toBeUndefined()
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: 'Test error handling',
      }

      const errorMessage = 'OpenAI API error'
      vi.mocked(mockLLMRepository.processMessage).mockRejectedValue(
        new Error(errorMessage)
      )

      // Act & Assert
      await expect(useCase.execute(inputDto)).rejects.toThrow(errorMessage)
      expect(mockLLMRepository.processMessage).toHaveBeenCalledTimes(1)
    })

    it('should handle empty answer from LLM', async () => {
      // Arrange
      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: '¿Información no disponible?',
      }

      const mockLLMResponse = new LLMResponse(
        'No se encontró información relevante.',
        new Date(),
        []
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act
      const result = await useCase.execute(inputDto)

      // Assert
      expect(result.response).toContain('No se encontró')
      expect(result.sources).toHaveLength(0)
    })

    it('should create ChatMessage with correct timestamp', async () => {
      // Arrange
      const beforeTimestamp = new Date()

      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: 'Test timestamp',
      }

      const mockLLMResponse = new LLMResponse(
        'Test answer',
        new Date(),
        []
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act
      await useCase.execute(inputDto)

      const afterTimestamp = new Date()

      // Assert
      const chatMessageArg = vi.mocked(mockLLMRepository.processMessage).mock.calls[0][0]
      const messageTimestamp = chatMessageArg.timestamp

      // Verificar que el timestamp está entre beforeTimestamp y afterTimestamp
      expect(messageTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime())
      expect(messageTimestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime())
    })

    it('should handle multiple sources in response', async () => {
      // Arrange
      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: 'Pregunta compleja con múltiples fuentes',
        area: ['Compliance', 'Legal'],
      }

      const mockSources = [
        new Source('1', 'Texto 1', 'Doc1.pdf', 'doc-1', '0.95', 'url1'),
        new Source('5', 'Texto 2', 'Doc2.pdf', 'doc-2', '0.90', 'url2'),
        new Source('10', 'Texto 3', 'Doc3.pdf', 'doc-3', '0.85', 'url3'),
      ]

      const mockLLMResponse = new LLMResponse(
        'Respuesta con múltiples fuentes...',
        new Date(),
        mockSources
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act
      const result = await useCase.execute(inputDto)

      // Assert
      expect(result.sources).toHaveLength(3)
      expect(result.sources[0].source).toBe('Doc1.pdf')
      expect(result.sources[1].source).toBe('Doc2.pdf')
      expect(result.sources[2].source).toBe('Doc3.pdf')
    })
  })

  describe('Integration with ChatMessage entity', () => {
    it('should validate that ChatMessage is created with all required fields', async () => {
      // Arrange
      const inputDto: ProcessMessageDto = {
        userId: 'user-456',
        message: 'Test message',
        area: ['TestArea'],
        category: ['TestCategory'],
        source: ['TestSource'],
        tags: ['Tag1', 'Tag2'],
      }

      const mockLLMResponse = new LLMResponse(
        'Test',
        new Date(),
        []
      )

      vi.mocked(mockLLMRepository.processMessage).mockResolvedValue(
        mockLLMResponse
      )

      // Act
      await useCase.execute(inputDto)

      // Assert
      const chatMessageArg = vi.mocked(mockLLMRepository.processMessage).mock.calls[0][0]

      expect(chatMessageArg.userId).toBe(inputDto.userId)
      expect(chatMessageArg.message).toBe(inputDto.message)
      expect(chatMessageArg.area).toEqual(inputDto.area)
      expect(chatMessageArg.category).toEqual(inputDto.category)
      expect(chatMessageArg.source).toEqual(inputDto.source)
      expect(chatMessageArg.tags).toEqual(inputDto.tags)
      expect(chatMessageArg.timestamp).toBeInstanceOf(Date)
    })
  })
})
