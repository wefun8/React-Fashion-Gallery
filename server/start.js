import { getConfig } from "./config.js";
import { createApp } from "./index.js";

const config = getConfig();
const app = createApp({ config });

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Gallery server listening on ${config.port}`);
});
