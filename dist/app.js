import Server from './presentation/server.js';
import { envs } from './config/index.js';
import { AppRoutes } from './presentation/routes.js';
import figlet from 'figlet';
import chalk from 'chalk';
(() => {
    main();
})();
async function main() {
    console.log(chalk.cyan(figlet.textSync('Leximind', { horizontalLayout: 'full' })));
    /*
      await MongoDatabase.connect({
          mongoUrl: envs.MONGO_URL,
          dbName: envs.MONGO_DB_NAME
      });
      */
    const server = new Server({
        port: envs.PORT,
        routes: AppRoutes.routes,
    });
    await server.start();
}
