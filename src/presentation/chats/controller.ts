import { Request, Response } from 'express'
import { CustomError } from '../../domain/errors/custom.error.js'

export class ChatsController {
  //Constructor:Inyectar de dependencias
  constructor() {}

  private handleError(error: unknown, res: Response): Response {
    console.log(error)

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message })
    } else {
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // TODO: winston logger
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
}
