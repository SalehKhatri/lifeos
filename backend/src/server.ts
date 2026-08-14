import { env } from "./shared/config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`LifeOS backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});
