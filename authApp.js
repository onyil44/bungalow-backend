"use strict";

import express from "express";
import morgan from "morgan";
import cors from "cors";
import fs from "fs";
import qs from "qs";

import globalErrorHandler from "./controllers/errorController.js";

import authRoutes from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { customMongoSanitize } from "./utils/customMongoSenitizer.js";
import { __dirname } from "./utils/path.js";
import path from "path";

const app = express();

//If there is no logs folder, create one.
if (!fs.existsSync(path.join(__dirname, "logs"))) {
  fs.mkdirSync(path.join(__dirname, "logs"));
}

app.set("trust proxy", 1);

//Write HTTP logs in file
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"),
  { flags: "a" }
);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev", { accessLogStream })); // renkli console log
} else {
  app.use(morgan("combined", { accessLogStream })); // prod log formatı
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://bungalow.onyilprojects.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: false,
  })
);

app.use((req, res, next) => {
  req.parsedQuery = qs.parse(req._parsedUrl?.query);
  next();
});

// --- Rate Limiter (API genel) ---
const authLimiter = rateLimit({
  max: 10,
  windowMs: 10 * 60 * 1000,
  message: "Too many requests from this IP, try again in 10 minutes.",
});

app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/signup", authLimiter);

app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(cookieParser());

app.use(customMongoSanitize);

// --- HPP ---
app.use(hpp({ whitelist: ["sort", "filter"] }));

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.get("/health", (req, res) => {
  const state = global.mongoose?.connection?.readyState ?? 0;
  res.status(200).json({ ok: true, dbState: state, uptime: process.uptime() });
});

app.use("/api/v1/auth", authRoutes);

app.use(globalErrorHandler);

export default app;
