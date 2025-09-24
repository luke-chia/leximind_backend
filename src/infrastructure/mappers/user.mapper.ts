import { UserEntity } from "../../domain/entities/user.entity.js";
import { CustomError } from "../../domain/errors/custom.error.js";

export class UserMapper {
    static toEntity(object:{[key: string]: any}): UserEntity {

        const {_id, id, name, email, password, roles, img} = object;

        if(!id && !id) {
            throw CustomError.badRequest("El id es requerido");
        }

        if(!name) {
            throw CustomError.badRequest("El nombre es requerido");
        }

        if(!email) {
            throw CustomError.badRequest("El email es requerido");
        }

        if(!password) {
            throw CustomError.badRequest("La contraseña es requerida");
        }

        if(!roles) {
            throw CustomError.badRequest("Los roles son requeridos");
        }

        return new UserEntity(
            (_id || id).toString(),
            name,
            email,
            password,
            roles,
            img
        );
    }
    
}