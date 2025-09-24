import { RegisterUserDto } from "../dtos/register-user.dto.js";
import { UserEntity } from "../entities/user.entity.js";

export abstract class AuthDatasource {

    //ToDO
    //abstract login(email: string, password: string): Promise<UserEntity>;

    abstract registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity>;
}