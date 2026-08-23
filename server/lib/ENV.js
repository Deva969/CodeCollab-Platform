import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL,
  ACCESS_SECRET: process.env.ACCESS_SECRET,
  REFRESH_SECRET: process.env.REFRESH_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  ONECOMPILER_API_URL: process.env.ONECOMPILER_API_URL,
  ONECOMPILER_API_KEY: process.env.ONECOMPILER_API_KEY,
  ONECOMPILER_AUTH_HEADER: process.env.ONECOMPILER_AUTH_HEADER || "Authorization",
  ONECOMPILER_AUTH_TYPE: process.env.ONECOMPILER_AUTH_TYPE || "bearer",
  ONECOMPILER_EXTRA_HEADERS: process.env.ONECOMPILER_EXTRA_HEADERS,

  JUDGE0_API_URL: process.env.JUDGE0_API_URL || process.env.JUDGE0_URL,
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY,
  JUDGE0_AUTH_HEADER: process.env.JUDGE0_AUTH_HEADER || "X-Auth-Token",
  JUDGE0_AUTH_TYPE: process.env.JUDGE0_AUTH_TYPE || "token",
  JUDGE0_HOST: process.env.JUDGE0_HOST || process.env.JUDGE0_RAPIDAPI_HOST,
  JUDGE0_HOST_HEADER: process.env.JUDGE0_HOST_HEADER || "x-rapidapi-host",
  JUDGE0_EXTRA_HEADERS: process.env.JUDGE0_EXTRA_HEADERS,
};
