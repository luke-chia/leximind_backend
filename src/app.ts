import Server from "./presentation/server.js";
import { envs } from "./config/";
import { AppRoutes } from "./presentation/routes.js";
import { MongoDatabase } from "./data/mongodb/mongo-database.js";

( () => {
    main();
})();

async function main() {
    console.log("Hello World Main");

    await MongoDatabase.connect({
        mongoUrl: envs.MONGO_URL,
        dbName: envs.MONGO_DB_NAME
    });

    const server = new Server({
         port: envs.PORT,
         routes: AppRoutes.routes
    });
    await server.start();
}

