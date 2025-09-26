import { format, transports, createLogger } from "winston";
import path from "path";
import { error } from "console";
import { __dirname } from "./path.js";

const logger = createLogger({
  level: "info", //defalut level
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    //Seperate file for errors
    new transports.File({
      filename: path.join(__dirname, "logs", "error.log"),
      level: "error",
    }),

    //Seperate file for combined logs
    new transports.File({
      filename: path.join(__dirname, "logs", "combined.log"),
    }),
  ],
});

//Type colorfull logs on console only in development env
if (process.env.NODE_ENV === "development") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

export default logger;
