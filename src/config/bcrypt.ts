import { compareSync, hashSync } from "bcryptjs";

export class BcryptAdapter {

    static hash(password: string): string {
        console.log("password encriptado");
        return hashSync(password);
    }

    static compare(password: string, hash: string): boolean {
        console.log(password, hash);
        return compareSync(password, hash);
    }

}