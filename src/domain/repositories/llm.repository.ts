import { ChatMessage } from '../entities/chat-message.entity.js'
import { LLMResponse } from '../entities/llm-response.entity.js'

export abstract class LLMRepository {
  abstract processMessage(chatMessage: ChatMessage): Promise<LLMResponse>
}
