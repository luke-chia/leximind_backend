import { RegisterUserDto } from "../../domain/dtos/register-user.dto.js";
import { UserEntity } from "../../domain/entities/user.entity.js";
import { AuthRepository } from "../../domain/repositories/auth.repository.js";
import { AuthDatasource } from "../../domain/datasources/auth.datasource.js";

export class AuthRepositoryImpl implements AuthRepository {
    constructor(
        private readonly authDatasource: AuthDatasource
    ){}

    registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity> {
        return this.authDatasource.registerUser(registerUserDto);
    }
}