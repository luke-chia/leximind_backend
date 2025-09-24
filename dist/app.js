import Server from "./presentation/server.js";
(() => {
    main();
})();
async function main() {
    console.log("Hello World Main");
    const server = new Server(3000);
    await server.start();
}
