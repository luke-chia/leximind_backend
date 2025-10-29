import { Validators } from '../../config/validators.js'

export class RegisterUserDto {
  private constructor(
    public name: string,
    public email: string,
    public password: string
  ) {}

  static create(object: {
    [key: string]: unknown
  }): [string?, RegisterUserDto?] {
    const { name, email, password } = object

    if (typeof name !== 'string' || !name)
      return ['Name is required', undefined]
    if (!email) return ['Email is required', undefined]
    if (typeof password !== 'string' || !password)
      return ['Password is required', undefined]

    if (typeof email !== 'string' || !Validators.emailRegex.test(email))
      return ['Email is not valid', undefined]

    return [undefined, new RegisterUserDto(name, email, password)]
  }
}
