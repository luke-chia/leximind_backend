import { LLMRepository } from '../../domain/repositories/llm.repository.js'
import { ChatMessage } from '../../domain/entities/chat-message.entity.js'
import { LLMResponse } from '../../domain/entities/llm-response.entity.js'
import { RAGAdapter } from '../adapters/rag.adapter.js'
import { OpenAIService } from './openai.service.js'
import { PineconeService } from './pinecone.service.js'
import { DocumentMapper } from '../mappers/document.mapper.js'
import { VectorSearchFilters } from '../../domain/repositories/vector-database.repository.js'

export class LLMService implements LLMRepository {
  private ragAdapter: RAGAdapter

  constructor() {
    const openAIService = new OpenAIService()
    const pineconeService = new PineconeService()
    this.ragAdapter = new RAGAdapter(openAIService, pineconeService)
  }

  async processMessage(chatMessage: ChatMessage): Promise<LLMResponse> {
    try {
      // Log de filtros aplicados
      const filtros = this.buildFiltersLog(chatMessage)
      const filtrosTexto = filtros.length > 0 ? ` | Filtros: ${filtros.join(' | ')}` : ''
      console.log(`💬 LLMService.processMessage --> Procesando mensaje de usuario ${chatMessage.userId}: "${chatMessage.message}"${filtrosTexto}`)

      // Construir filtros para la búsqueda vectorial
      const searchFilters = this.buildVectorSearchFilters(chatMessage)
      
      // Usar áreas como filtros de metadata
      const areas = chatMessage.area && chatMessage.area.length > 0 
        ? chatMessage.area 
        : undefined

      // Procesar consulta usando RAG
      const ragResponse = await this.ragAdapter.processQuery(
        chatMessage.message,
        {
          areas,
          topK: 10,
          filters: searchFilters,
          systemPrompt: this.getSystemPrompt()
        }
      )

      // Convertir documentos encontrados a Sources
      const sources = DocumentMapper.toSources(ragResponse.queryResult.documents)

      // Crear respuesta LLM
      return new LLMResponse(
        ragResponse.answer,
        new Date(),
        sources
      )

    } catch (error) {
      console.error('❌ Error al procesar mensaje con RAG:', error)
      
      // Fallback: respuesta de error
      return new LLMResponse(
        'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo más tarde.',
        new Date(),
        []
      )
    }
  }

  /**
   * Construye el log de filtros aplicados
   */
  private buildFiltersLog(chatMessage: ChatMessage): string[] {
    const filtros = []
    
    if (chatMessage.area && chatMessage.area.length > 0) {
      filtros.push(`Áreas: [${chatMessage.area.join(', ')}]`)
    }
    if (chatMessage.category && chatMessage.category.length > 0) {
      filtros.push(`Categorías: [${chatMessage.category.join(', ')}]`)
    }
    if (chatMessage.source && chatMessage.source.length > 0) {
      filtros.push(`Fuentes: [${chatMessage.source.join(', ')}]`)
    }
    if (chatMessage.tags && chatMessage.tags.length > 0) {
      filtros.push(`Tags: [${chatMessage.tags.join(', ')}]`)
    }
    
    return filtros
  }

  /**
   * Construye los filtros para la búsqueda vectorial
   */
  private buildVectorSearchFilters(chatMessage: ChatMessage): VectorSearchFilters {
    const filters: VectorSearchFilters = {}
    
    if (chatMessage.category && chatMessage.category.length > 0) {
      filters.category = chatMessage.category
    }
    
    if (chatMessage.source && chatMessage.source.length > 0) {
      filters.source = chatMessage.source
    }
    
    if (chatMessage.tags && chatMessage.tags.length > 0) {
      filters.tags = chatMessage.tags
    }
    
    return filters
  }

  /**
   * Define el prompt del sistema para el LLM
   */
  private getSystemPrompt(): string {
    return `
You are **Leximind**, an enterprise RAG assistant. Answer ONLY using the information in the provided **Context** (retrieved chunks with metadata). If the Context is insufficient, state it explicitly and ask for the missing document or details. Never invent facts.

**Audience & Language**

- Default language: Spanish (es-MX).
- Match the user’s language and formality. If not specified, use professional but clear Spanish.

**Scope**

- Documents may include internal manuals, technical specs, policies, regulator rules (e.g., CNBV), laws, circulars, dispositions, checklists, QA procedures, and emails/minutes.

**Formatting (Text only)**

- Prefer concise, structured text. Use bullet points or tables when helpful.

**Citation & Fidelity**

- If sources in the Context conflict, call it out, compare them, and explain which is more applicable (date, validity, regulatory hierarchy).
- For regulations/laws, include the relevant **article/section** and **source/document** when present in the Context.

**Style**

- Prioritize structure, clarity, and traceability over verbosity.
- Prefer lists and tables for comparisons or process steps.
- For who/what/when/how questions, answer directly first, then expand with support.

**Compliance & Responsibility**

- Do not provide legal advice; **interpret and transcribe** what the documents state.
- If the answer depends on **validity/version**, make that explicit.

**Reasoning**

- Integrate multiple fragments from the Context into a single coherent answer (do not return loose snippets).
- Avoid irrelevant repetition; prioritize what is closest to the question.
- If the question implies a **role** (QA, Developer, Compliance), make the role’s responsibilities explicit according to the Context.

**Optional Output (if the user asks)**

- Provide a **table** or **checklist** of steps.
- Provide a **one-paragraph executive summary** for leadership.
- Provide a **text diagram** (mermaid) if the Context describes processes. Escape the mermaid block so it renders correctly.

**Suggested Answer Template**

1. Answer (do not include a “Answer” heading)
2. Assumptions & Limits (optional) — only if present in the Context
3. Next Steps (optional)

**Hard Rules**

- Use ONLY the Context. If it’s not enough, say so.
- Do not add external knowledge.
- Do not hide uncertainties.

=== Context (do not invent; use only the following) ===
    `.trim()
  }
}