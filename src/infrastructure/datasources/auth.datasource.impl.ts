import { UserModel } from '../../data/mongodb/index.js'
import { AuthDatasource } from '../../domain/datasources/auth.datasource.js'
import { RegisterUserDto } from '../../domain/dtos/register-user.dto.js'
import { UserEntity } from '../../domain/entities/user.entity.js'
import { CustomError } from '../../domain/errors/custom.error.js'
import { UserMapper } from '../mappers/user.mapper.js'

type HashPassword = (password: string) => string
type ComparePassword = (password: string, hash: string) => boolean

export class AuthDatasourceImpl implements AuthDatasource {
  constructor(
    private readonly hashPassword: HashPassword,
    private readonly comparePassword: ComparePassword
  ) {}

  async registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity> {
    try {
      const { name, email, password } = registerUserDto

      // 1.- Verificar si el correo ya existe
      const emailExists = await UserModel.findOne({ email })

      if (emailExists) {
        throw CustomError.badRequest('El Correo ya esta registrado')
      }

      // Encriptar la contraseña
      const passwordHash = this.hashPassword(password)

      // 2.- Crear el usuario
      const user = new UserModel({
        name: name,
        email: email,
        password: passwordHash,
      })

      // 3.- Guardar el usuario
      await user.save()

      return UserMapper.toEntity(user)
    } catch (error) {
      console.log(error)
      if (error instanceof CustomError) {
        throw error
      }

      throw CustomError.internalServerError('Error registering user')
    }
  }
}
