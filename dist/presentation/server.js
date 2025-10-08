import express from 'express';
import cors from 'cors';
const allowedOrigins = [
    'http://localhost:8080', // dev vite
    'http://localhost:3000', // dev express directo
    'https://leximind.vercel.app', // prod en Vercel
];
export class Server {
    app;
    port;
    routes;
    constructor(options) {
        const { port = 3000, routes } = options;
        this.app = express();
        this.port = port;
        this.routes = routes;
    }
    async start() {
        //Middlewares
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        // ← AGREGAR CORS AQUÍ (después de los middlewares básicos)
        this.app.use(cors({
            origin: (origin, callback) => {
                // Si no viene "origin" (ej. Postman/curl), permitir
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error('CORS: Origin no permitido -> ' + origin));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));
        this.app.use(this.routes);
        this.app
            .listen(this.port, async () => {
            const host = process.env.HOST || 'localhost';
            console.log('🚀 Leximind API corriendo en: ', `http://${host}:${this.port}`);
            // Run startup tasks (e.g., Supabase cache)
            try {
                const startupModule = await import('./startup/startup-tasks.js');
                await startupModule.runOnStartup();
            }
            catch (error) {
                console.error('Failed to run startup tasks:', error);
            }
        })
            .on('error', (error) => {
            console.log(error);
        });
    }
}
export default Server;
