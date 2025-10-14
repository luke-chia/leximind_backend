import { ProcessMessageUseCase } from '../../domain/use-cases/process-message.use-case.js'
import { ProcessMessageDto } from '../../domain/dtos/process-message.dto.js'
import { ProcessMessageResponseDto } from '../../domain/dtos/process-message-response.dto.js'
import { LLMRepository } from '../../domain/repositories/llm.repository.js'
import { ChatMessage } from '../../domain/entities/chat-message.entity.js'
import { LLMResponseMapper } from '../mappers/llm-response.mapper.js'

export class ProcessMessageUseCaseImpl implements ProcessMessageUseCase {
  constructor(private readonly llmRepository: LLMRepository) {}

  async execute(
    processMessageDto: ProcessMessageDto
  ): Promise<ProcessMessageResponseDto> {
    // Crear la entidad del dominio
    const chatMessage = new ChatMessage(
      processMessageDto.userId,
      processMessageDto.message,
      new Date(), // timestamp
      processMessageDto.area,
      processMessageDto.category,
      processMessageDto.source,
      processMessageDto.tags
    )

    // Procesar el mensaje usando el repositorio LLM
    const llmResponse = await this.llmRepository.processMessage(chatMessage)

    // Mapear la respuesta a DTO de presentation
    // Nota: El resumeQuestion se agrega en el controller, aquí usamos un placeholder
    return LLMResponseMapper.toProcessMessageResponseDto(llmResponse, '')
  }
}
