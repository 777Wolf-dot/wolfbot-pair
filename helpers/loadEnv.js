import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const envPath = path.resolve(".env");

// Generate and save SESSION_ENCRYPTION_KEY if missing
if (!process.env.SESSION_ENCRYPTION_KEY) {
  const newKey = crypto.randomBytes(32).toString("hex");
  const envContent = fs.readFileSync(envPath, "utf-8");

  // Add the new key to the end of .env file
  fs.writeFileSync(envPath, `${envContent.trim()}\nSESSION_ENCRYPTION_KEY=${newKey}\n`);

  console.log(`✅ Generated new SESSION_ENCRYPTION_KEY and saved it to .env`);
  process.env.SESSION_ENCRYPTION_KEY = newKey;
}
