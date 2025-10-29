import { Request, Response } from 'express'
import { RegisterUserDto } from '../../domain/dtos/register-user.dto.js'
import { AuthRepository } from '../../domain/repositories/auth.repository.js'
import { CustomError } from '../../domain/errors/custom.error.js'

export class AuthController {
  //Inyeccion de dependencias
  constructor(private readonly authRepository: AuthRepository) {}

  private handleError(error: unknown, res: Response): Response {
    console.log(error)

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message })
    } else {
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    // winston logger
  }

  registerUser = (req: Request, res: Response) => {
    const [error, registerUserDto] = RegisterUserDto.create(req.body)

    if (error) return res.status(400).json({ error })

    // Ensure registerUserDto is defined before passing to registerUser
    if (!registerUserDto) {
      return res.status(400).json({ error: 'Invalid user data' })
    }

    this.authRepository
      .registerUser(registerUserDto)
      .then((user) => {
        res.json({
          ok: true,
          message: 'User registered successfully',
          user: user,
        })
      })
      .catch((error) => {
        this.handleError(error, res)
      })
  }

  /*
    loginUser = (req: Request, res: Response) => {
        res.json({ ok: true, message: "loginUser Controller" });
    }
    */
}
