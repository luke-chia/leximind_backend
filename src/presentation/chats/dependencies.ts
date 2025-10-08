// Dependency Injection Container para Chats
import { LLMService } from '../../infrastructure/services/llm.service.js'
import { ProcessMessageUseCaseImpl } from '../../infrastructure/use-cases/process-message.use-case.impl.js'
import { ChatsController } from './controller.js'

export class ChatsDependencies {
  static getController(): ChatsController {
    // Crear las dependencias
    const llmService = new LLMService()
    const processMessageUseCase = new ProcessMessageUseCaseImpl(llmService)

    // Crear el controller con las dependencias inyectadas
    return new ChatsController(processMessageUseCase)
  }
}
