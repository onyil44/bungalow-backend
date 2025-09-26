import app from "./authApp.js";
import { connectMongo, disconnectMongo } from "./utils/db.js";
import logger from "./utils/logger.js";

const PORT = Number(process.env.AUTH_PORT);

function buildUriFromParts() {
  const host = process.env.MONGO_DB_HOST || "localhost";
  const port = process.env.MONGO_DB_PORT || "27017";
  const name = process.env.MONGO_APP_DB;
  const user = process.env.MONGO_APP_USERNAME;
  const pass = process.env.MONGO_APP_PASSWORD;

  if (user && pass)
    return `mongodb://${user}:${encodeURIComponent(
      pass
    )}@${host}:${port}/${name}`;

  return `mongodb://${host}:${port}/${name}`;
}

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.DATABASE || buildUriFromParts();

try {
  await connectMongo(MONGODB_URI);
} catch (err) {
  console.log("[api] initial mongo connect failed", err);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT}`);
  logger.info(`api running in ${process.env.NODE_ENV} o ${PORT}`);
});

function shutdown(code = 0) {
  console.log("[api] shutting down...");
  server.close(async () => {
    await disconnectMongo();
    process.exit(code);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("unhandledRejection", (err) => {
  console.log(err);
  shutdown(1);
});
process.on("uncaughtException", (err) => {
  console.log(err);
  shutdown(1);
});
