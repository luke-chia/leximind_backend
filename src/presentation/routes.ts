import { Router } from 'express'
import { AuthRoutes } from './auth/routes.js'
import { ChatsRoutes } from './chats/routes.js'
import { DocumentsRoutes } from './documents/routes.js'

export class AppRoutes {
  static get routes(): Router {
    // Definir todas las rutas de la aplicación
    const router = Router()
    router.use('/api/auth', AuthRoutes.routes)
    router.use('/api/v1/chats', ChatsRoutes.routes)
    router.use('/api/v1/documents', DocumentsRoutes.routes)

    return router
  }
}
