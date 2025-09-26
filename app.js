"use strict";

import express from "express";
import fs from "fs";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import path from "path";
import qs from "qs";

import globalErrorHandler from "./controllers/errorController.js";

import settingsRoutes from "./routes/settingsRoutes.js";
import cabinsRoutes from "./routes/cabinsRoutes.js";
import guestsRoutes from "./routes/guestsRoutes.js";
import bookingsRoutes from "./routes/bookingsRoures.js";
import usersRoutes from "./routes/usersRoutes.js";
import { customMongoSanitize } from "./utils/customMongoSenitizer.js";
import { __dirname } from "./utils/path.js";

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

app.use(morgan("combined", { stream: accessLogStream }));

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  process.env.CORS_ORIGIN,
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

app.use(cookieParser());

app.use(express.urlencoded({ extended: true, limit: "10000000kb" }));

app.use(express.json({ limit: "10000000kb" }));

const limiter = rateLimit({
  max: 100,
  window: 60 * 60 * 1000,
  message: "Too many request from this IP, please try again in an hour.",
});

app.use("/api", limiter);

// Helmet temel ayarları
app.use(helmet());

// Gelişmiş Helmet ayarları
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"], // sadece kendi domainin
        scriptSrc: ["'self'"], // inline script yok
        objectSrc: ["'none'"], // flash, java applet engelle
        frameAncestors: ["'none'"], // iframe ile embed edilmeyi engelle
      },
    },
    crossOriginEmbedderPolicy: true, // Cross-Origin isolation
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false }, // DNS prefetch kapalı
    frameguard: { action: "deny" }, // clickjacking engelle
    hidePoweredBy: true, // X-Powered-By header'ını kaldır
    hsts: {
      maxAge: 63072000, // 2 yıl
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: false, // Helmet zaten CSP ile XSS’i engelliyor
  })
);

app.use((req, res, next) => {
  req.parsedQuery = qs.parse(req._parsedUrl?.query);
  next();
});

app.use(customMongoSanitize);

app.use(
  hpp({
    whitelist: ["sort", "filter"],
  })
);

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.get("/health", (req, res) => {
  const state = global.mongoose?.connection?.readyState ?? 0;
  res.status(200).json({ ok: true, dbState: state, uptime: process.uptime() });
});

app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/cabins", cabinsRoutes);
app.use("/api/v1/guests", guestsRoutes);
app.use("/api/v1/bookings", bookingsRoutes);
app.use("/api/v1/users", usersRoutes);

app.use(globalErrorHandler);

export default app;
