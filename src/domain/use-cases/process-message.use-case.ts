import { ProcessMessageDto } from '../dtos/process-message.dto.js'
import { ProcessMessageResponseDto } from '../dtos/process-message-response.dto.js'

export abstract class ProcessMessageUseCase {
  abstract execute(
    processMessageDto: ProcessMessageDto
  ): Promise<ProcessMessageResponseDto>
}
