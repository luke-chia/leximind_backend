import { Router } from 'express'
import { ChatsDependencies } from './dependencies.js'

export class ChatsRoutes {
  static get routes(): Router {
    const router = Router()
    const controller = ChatsDependencies.getController()

    // Ruta para procesar mensajes con LLM
    router.post('/process-message', controller.processMessage)

    // Ruta de health check para verificar servicios RAG
    router.get('/health', controller.healthCheck)

    // Ruta de diagnóstico completo de Pinecone
    router.get('/diagnostics', controller.diagnosticsPinecone)

    // Ruta legacy (mantener compatibilidad)
    router.post('/', controller.answerChat)

    return router
  }
}
