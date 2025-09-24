import mongoose from "mongoose";
import { CustomError } from "../../domain/errors/custom.error.js";

interface Options {
    mongoUrl: string;
    dbName: string;
}

export class MongoDatabase {

    public static async connect(options: Options) {
        const { mongoUrl, dbName } = options;

        try {
            await mongoose.connect(mongoUrl, {
                dbName: dbName
            });

            console.log("Connected to MongoDB");

            return true;
        } catch (error) {
            console.log(error);
            throw CustomError.internalServerError("Error connecting to MongoDB");
        }
    }
}