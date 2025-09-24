import express from "express";
export class Server {
    app;
    port;
    constructor(port) {
        this.app = express();
        this.port = port;
    }
    async start() {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        })
            .on("error", (error) => {
            console.log(error);
        });
    }
}
export default Server;
