import { Router } from 'express'
import { AuthController } from './controller.js'
import { AuthRepositoryImpl } from '../../infrastructure/repositories/auth.repository.impl.js'
import { AuthDatasourceImpl } from '../../infrastructure/datasources/auth.datasource.impl.js'
import { BcryptAdapter } from '../../config/bcrypt.js'

export class AuthRoutes {
  static get routes(): Router {
    const router = Router()
    const authDatasource = new AuthDatasourceImpl(
      BcryptAdapter.hash,
      BcryptAdapter.compare
    )
    const authRepository = new AuthRepositoryImpl(authDatasource)

    const controller = new AuthController(authRepository)

    router.post('/register', controller.registerUser)
    //router.post("/login", controller.loginUser);

    return router
  }
}
