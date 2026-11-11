import { createServer } from "./server.mjs";

const port = Number(process.env.PORT || 8080);
const server = createServer();
server.listen(port, "0.0.0.0", () => {
  console.log(`JoyHeart photo processor listening on port ${port}`);
});
