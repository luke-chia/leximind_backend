import { Router } from "express";
import { AuthRoutes } from "./auth/routes.js";

export class AppRoutes {

    static get routes(): Router {

        // Definir todas las rutas de la aplicación
        const router = Router();
        router.use("/api/auth", AuthRoutes.routes);

        return router;
    }

}