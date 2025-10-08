import { OpenAIService } from '../services/openai.service.js'
import { PineconeService } from '../services/pinecone.service.js'
import { QueryResult } from '../../domain/entities/query-result.entity.js'
import { VectorSearchFilters } from '../../domain/repositories/vector-database.repository.js'

export interface RAGQueryOptions {
  areas?: string[]
  topK?: number
  filters?: VectorSearchFilters
  systemPrompt?: string
}

export interface RAGResponse {
  question: string
  answer: string
  queryResult: QueryResult
  contextoUsado: string
  totalDocumentosEncontrados: number
}

export class RAGAdapter {
  constructor(
    private readonly openAIService: OpenAIService,
    private readonly pineconeService: PineconeService
  ) {}

  /**
   * Procesa una pregunta usando RAG (Retrieval-Augmented Generation)
   * Combina búsqueda vectorial con generación de respuestas
   */
  async processQuery(
    question: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGResponse> {
    const {
      areas,
      topK = 10,
      filters,
      systemPrompt
    } = options

    const executionId = `[${new Date().toLocaleTimeString()}.${Date.now() % 1000}]`
    
    try {
      console.log(`RagAdapter.processQuery --> ${executionId} 🤔 Procesando pregunta RAG: "${question}"`)
      console.log(`RagAdapter.processQuery --> ${executionId} 🔍 Buscando ${topK} documentos relevantes...`)

      // 1. Generar embedding para la pregunta
      const queryEmbedding = await this.openAIService.generateEmbedding(question)

      // 2. Buscar documentos similares en Pinecone
      const searchResult = await this.pineconeService.searchSimilarDocuments(
        queryEmbedding,
        areas,
        topK,
        filters
      )

      if (!searchResult.documents || searchResult.documents.length === 0) {
        console.log(`RagAdapter.processQuery --> ${executionId} ❌ No se encontraron documentos relevantes`)
        return {
          question,
          answer: 'No se encontraron documentos relevantes para responder tu pregunta. Por favor, intenta reformular tu consulta o verifica que existan documentos relacionados con el tema.',
          queryResult: searchResult,
          contextoUsado: '',
          totalDocumentosEncontrados: 0
        }
      }

      console.log(`RagAdapter.processQuery --> ${executionId} ✨ Encontrados ${searchResult.documents.length} documentos relevantes`)
      console.log(`RagAdapter.processQuery --> ${executionId} 📋 Fuentes encontradas:`)
      
      searchResult.documents.slice(0, 10).forEach((doc, i) => {
        const pageInfo = doc.page !== 'N/A' ? ` | Pág. ${doc.page}` : ''
        console.log(`RagAdapter.processQuery --> ${executionId}   ${i + 1}. ${doc.source}${pageInfo} (similitud: ${doc.score.toFixed(3)})`)
        console.log(`RagAdapter.processQuery --> ${executionId}      📝 ${doc.text.substring(0, 150)}...`)
      })

      // 3. Construir contexto con información de páginas
      const context = searchResult.documents
        .map((doc, i) => ` Documento/Source ${doc.source} (Página/Page ${doc.page}): ${doc.text}`)
        .join('\n\n')

      // 4. Generar respuesta usando el LLM con el contexto
      console.log(`RagAdapter.processQuery --> ${executionId} 🧠 Generando respuesta con IA...`)
      console.log(`RagAdapter.processQuery --> ${executionId} Contexto Usado: ${context}`)
      const answer = await this.openAIService.generateChatCompletion(
        question,
        `${context}`,
        systemPrompt
      )

      console.log(`${executionId} ✅ Respuesta generada exitosamente`)

      return {
        question,
        answer,
        queryResult: searchResult,
        contextoUsado: context,
        totalDocumentosEncontrados: searchResult.documents.length
      }

    } catch (error) {
      console.error(`${executionId} ❌ Error en procesamiento RAG:`, error)
      throw new Error(`Error en procesamiento RAG: ${error}`)
    }
  }

  /**
   * Verifica que todos los servicios estén funcionando
   */
  async healthCheck(): Promise<{
    openai: boolean
    pinecone: boolean
    overall: boolean
  }> {
    try {
      console.log('🔍 Verificando salud de servicios RAG...')
      
      const [openaiStatus, pineconeStatus] = await Promise.all([
        this.openAIService.ping(),
        this.pineconeService.ping()
      ])

      const overall = openaiStatus && pineconeStatus

      console.log(`✅ Estado de servicios - OpenAI: ${openaiStatus ? '✅' : '❌'}, Pinecone: ${pineconeStatus ? '✅' : '❌'}`)

      return {
        openai: openaiStatus,
        pinecone: pineconeStatus,
        overall
      }
    } catch (error) {
      console.error('❌ Error en health check:', error)
      return {
        openai: false,
        pinecone: false,
        overall: false
      }
    }
  }
}
