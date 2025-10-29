import { Request, Response } from 'express'
import { CustomError } from '../../domain/errors/custom.error.js'
import { ProcessMessageUseCase } from '../../domain/use-cases/process-message.use-case.js'
import { ProcessMessageDto } from '../../domain/dtos/process-message.dto.js'
import { RAGAdapter } from '../../infrastructure/adapters/rag.adapter.js'
import { OpenAIService } from '../../infrastructure/services/openai.service.js'
import { PineconeService } from '../../infrastructure/services/pinecone.service.js'
import { LLMService } from '../../infrastructure/services/llm.service.js'

export class ChatsController {
  //Constructor:Inyectar de dependencias
  constructor(private readonly processMessageUseCase: ProcessMessageUseCase) {}

  private handleError(error: unknown, res: Response): Response {
    console.log(error)

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message })
    } else {
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // TODO: winston logger
  }

  processMessage = async (req: Request, res: Response) => {
    try {
      // Validar y crear el DTO
      const [error, processMessageDto] = ProcessMessageDto.create(req.body)
      if (error) {
        return res.status(400).json({ error })
      }

      // Log del mensaje recibido
      console.log(
        `💬 Mensaje recibido de usuario ${processMessageDto!.userId}: ${
          processMessageDto!.message
        }`
      )

      // ✅ NUEVO: Generar resumen de la pregunta en paralelo
      const llmService = new LLMService()
      const resumeQuestionPromise = llmService.generateQuestionSummary(
        processMessageDto!.message
      )

      // Procesar el mensaje usando el caso de uso
      const responsePromise = this.processMessageUseCase.execute(
        processMessageDto!
      )

      // Esperar ambas operaciones en paralelo
      const [response, resumeQuestion] = await Promise.all([
        responsePromise,
        resumeQuestionPromise,
      ])

      // Log de fuentes encontradas
      if (response.sources && response.sources.length > 0) {
        console.log(`📚 Fuentes encontradas (${response.sources.length}):`)
        response.sources.forEach((source, index) => {
          const hasSignedUrl = source.signedUrl && source.signedUrl.length > 0
          const urlInfo = hasSignedUrl
            ? `URL: ${source.signedUrl!.substring(0, 50)}...`
            : 'URL: No disponible'
          console.log(
            `   ${index + 1}. ${source.source} | Pág. ${source.page} | Score: ${source.score} | ${urlInfo}`
          )
        })
      } else {
        console.log('📚 No se encontraron fuentes para esta consulta')
      }

      // ✅ NUEVO: Agregar resumeQuestion a la respuesta
      const enhancedResponse = {
        ...response,
        resumeQuestion,
      }

      console.log(`🔤 Resumen de pregunta agregado: "${resumeQuestion}"`)

      return res.status(200).json(enhancedResponse)
    } catch (error) {
      return this.handleError(error, res)
    }
  }

  answerChat = (req: Request, res: Response) => {
    try {
      const { message } = req.body

      if (!message) {
        return res.status(400).json({
          error: "El campo 'message' es requerido",
        })
      }

      // Log del mensaje recibido
      console.log(`💬 Mensaje recibido de usuario: ${message}`)

      // Respuesta dummy
      return res.status(200).json({
        reply: `Echo: ${message}`,
      })
    } catch (error) {
      console.error('❌ Error en /api/v1/chats:', error)
      return res.status(500).json({
        error: 'Ocurrió un error inesperado',
      })
    }
  }

  healthCheck = async (req: Request, res: Response) => {
    try {
      console.log('🔍 Verificando salud del sistema RAG...')

      const openAIService = new OpenAIService()
      const pineconeService = new PineconeService()
      const ragAdapter = new RAGAdapter(openAIService, pineconeService)

      const healthStatus = await ragAdapter.healthCheck()

      const status = healthStatus.overall ? 200 : 503

      return res.status(status).json({
        status: healthStatus.overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          openai: {
            status: healthStatus.openai ? 'up' : 'down',
            description: 'OpenAI API for embeddings and chat completion',
          },
          pinecone: {
            status: healthStatus.pinecone ? 'up' : 'down',
            description: 'Pinecone vector database for similarity search',
          },
        },
        overall: healthStatus.overall,
      })
    } catch (error) {
      console.error('❌ Error en health check:', error)
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  diagnosticsPinecone = async (req: Request, res: Response) => {
    try {
      console.log('🔍 Iniciando diagnóstico completo de Pinecone...')

      const pineconeService = new PineconeService()

      // Ejecutar diagnóstico completo
      await pineconeService.runDiagnostics()

      return res.status(200).json({
        status: 'completed',
        message:
          'Diagnóstico completo ejecutado. Revisa los logs del servidor para detalles.',
        timestamp: new Date().toISOString(),
        instruction:
          'Verifica la consola del servidor para obtener información detallada del diagnóstico.',
      })
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error)
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Diagnostics failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
