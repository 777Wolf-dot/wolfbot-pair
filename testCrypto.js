import { encryptBuffer, decryptBuffer } from "./helpers/crypto.js";
import dotenv from "dotenv";
dotenv.config();

const original = Buffer.from(JSON.stringify({ test: "Session working!" }));

const encrypted = encryptBuffer(original);
console.log("🔒 Encrypted:", encrypted);

const decrypted = decryptBuffer(encrypted);
console.log("🔓 Decrypted:", decrypted.toString());
