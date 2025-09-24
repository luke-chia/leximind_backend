import { RegisterUserDto } from "../dtos/register-user.dto.js";
import { UserEntity } from "../entities/user.entity.js";

export abstract class AuthRepository {

    abstract registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity>;
    
}