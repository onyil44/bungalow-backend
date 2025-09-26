import mongoose from "mongoose";

export async function connectMongo(uri, opts = {}) {
  const {
    maxPoolSize = 10,
    minPoolSize = 0,
    serverSelectionTimeoutMS = 5000,
    socketTimeoutMS = 45000,
  } = opts;

  if (process.env.NODE_ENV === "production") {
    mongoose.set("autoIndex", false);
  }

  mongoose.connection.on("connected", () => {
    console.log("[mongo] connected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[mongo] error:", err?.message || err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });

  await mongoose.connect(uri, {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
    socketTimeoutMS,
  });
}

export async function disconnectMongo() {
  try {
    await mongoose.connection.close(false);
    console.log("[mongo] connection closed");
  } catch (e) {
    console.warn("[mongo] close error:", e?.message || e);
  }
}
