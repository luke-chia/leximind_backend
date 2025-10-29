import { compareSync, hashSync } from 'bcryptjs'

export class BcryptAdapter {
  static hash(password: string): string {
    console.info('password encriptado')
    return hashSync(password)
  }

  static compare(password: string, hash: string): boolean {
    console.info(password, hash)
    return compareSync(password, hash)
  }
}
