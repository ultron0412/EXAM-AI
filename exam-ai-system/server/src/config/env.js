import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../");
const projectRoot = path.resolve(serverRoot, "../");

const toInt = (value, fallback) => {
  const num = Number.parseInt(value ?? "", 10);
  return Number.isNaN(num) ? fallback : num;
};

const required = (name, value) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const uploadDirRaw = process.env.UPLOAD_DIR ?? "../data/raw";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 5000),
  mongoUri: required("MONGO_URI", process.env.MONGO_URI),
  jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  lmStudioUrl:
    process.env.LM_STUDIO_URL ?? "http://localhost:1234/v1/chat/completions",
  maxUploadSizeMb: toInt(process.env.MAX_UPLOAD_SIZE_MB, 15),
  uploadDir: path.resolve(projectRoot, uploadDirRaw),
};

