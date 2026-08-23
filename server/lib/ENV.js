import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL,
  ACCESS_SECRET: process.env.ACCESS_SECRET,
  REFRESH_SECRET: process.env.REFRESH_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || process.env.JUDGE0_URL,
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY,
  JUDGE0_AUTH_HEADER: process.env.JUDGE0_AUTH_HEADER || "X-Auth-Token",
  JUDGE0_AUTH_TYPE: process.env.JUDGE0_AUTH_TYPE || "token",
};
