import "dotenv/config";
import { createApp } from "./expressApp";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();
app.listen(PORT, () => {
  console.log(`ajaia-docs-server listening on :${PORT}`);
});
