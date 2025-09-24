import express from "express";
import { Router } from "express";

interface ServerOptions {
    port?: number;
    routes: Router;
}

export class Server {
    private app: express.Application;
    private port: number;
    private routes: Router;

    constructor(options: ServerOptions) {
        const { port = 3000, routes } = options;
        this.app = express();
        this.port = port;
        this.routes = routes;
    }

    async start() {

        //Middlewares
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use(this.routes);
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        })
        .on("error", (error) => {
            console.log(error);
        });
    }
}

export default Server;