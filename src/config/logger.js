const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");
const DailyRotateFile = require("winston-daily-rotate-file");

// 📁 Asegura que exista la carpeta "logs"
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 📄 Formato común de logs
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ level, message, timestamp }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
);

// 🎯 Logger base
const logger = createLogger({
  level: "info",
  format: logFormat,
  transports: [
    // 🔁 Rotación diaria para errores
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      zippedArchive: true,
      maxSize: "1m",
      maxFiles: "14d",
    }),
    // 🔁 Rotación diaria para todos los logs
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "2m",
      maxFiles: "30d",
    }),
  ],
});

// 💻 Solo consola si NO estás en producción
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    })
  );
}

module.exports = logger;
