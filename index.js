// index.js — Multi-session WhatsApp Pair Generator (Supabase + Auto QR Reset)

// --- ES MODULE IMPORTS ---

// Load .env variables at the start
import 'dotenv/config'; 
// Import local helper to load other env files (assuming it uses ESM too)
import "./helpers/loadEnv.js"; 
import { encryptBuffer } from './helpers/crypto.js'; // Must include .js extension

// Built-in Node Modules
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Third-Party Modules
import express from 'express';
import cors from 'cors';
import chalk from 'chalk'; // Correct ESM import for chalk
import pino from 'pino';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import {
    default as makeWASocket,
    useMultiFileAuthState,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason
} from '@whiskeysockets/baileys';

// --- ESM PATH RESOLUTION ---
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const CURRENT_DIR = path.dirname(__filename);
// ----------------------------

const PUBLIC_DIR = path.join(CURRENT_DIR, 'Public');
const ENV_PATH = path.join(CURRENT_DIR, '.env');
const AUTH_SESSIONS_DIR = path.join(CURRENT_DIR, 'auth_sessions');
if (!fs.existsSync(AUTH_SESSIONS_DIR)) fs.mkdirSync(AUTH_SESSIONS_DIR, { recursive: true });

// 🔐 Auto-generate SESSION_ENCRYPTION_KEY if missing
if (!process.env.SESSION_ENCRYPTION_KEY) {
    const newKey = crypto.randomBytes(24).toString('base64');
    fs.appendFileSync(ENV_PATH, `SESSION_ENCRYPTION_KEY=${newKey}\n`);
    process.env.SESSION_ENCRYPTION_KEY = newKey;
    console.log(chalk.green('🔑 Generated SESSION_ENCRYPTION_KEY and saved to .env'));
}

// 🗄️ Initialize Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Missing Supabase credentials in .env'));
    process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 🚀 Express setup
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.static(PUBLIC_DIR));

// 🧩 Helper functions
const delay = ms => new Promise(res => setTimeout(res, ms));

async function readAuthFolderAsObject(folder) {
    const result = {};
    if (!fs.existsSync(folder)) return result;
    for (const f of fs.readdirSync(folder)) {
        try {
            const filePath = path.join(folder, f);
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                result[f] = JSON.parse(content);
            } catch {
                result[f] = content;
            }
        } catch (e) {
            console.warn(`Could not read/parse file: ${f}`, e.message);
        }
    }
    return result;
}

async function saveSessionToSupabase(owner, credentialsObj) {
    try {
        const encrypted = encryptBuffer(Buffer.from(JSON.stringify(credentialsObj), 'utf-8'));
        const session_id = crypto.randomUUID();
        // Assuming your 'sessions' table has columns: session_id, owner, session_data, created_at
        const { error } = await supabase.from('sessions').insert({
            session_id,
            owner,
            session_data: encrypted, // Encrypted session data (Buffer/Binary)
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        console.log(chalk.green(`💾 Session stored in Supabase for ${owner}`));
    } catch (err) {
        console.error(chalk.red('❌ Failed saving session:'), err);
    }
}

// ⚙️ Create a new ephemeral QR socket
async function createPairingSocket(pairingCode) {
    const authFolder = path.join(AUTH_SESSIONS_DIR, pairingCode);
    fs.mkdirSync(authFolder, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        // 🎯 FIX: Explicitly set a known browser config to ensure QR is preferred
        browser: Browsers.macOS('Chrome'), 
        
        // 🚨 IMPORTANT: Ensure legacy/pairing code options are NOT used or enabled
        // If your Baileys version is newer, ensure any pairingCode logic is excluded.
        // We rely on the absence of requestPairingCode() to force QR mode.
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update; // 🎯 Ensure 'qr' is extracted

        if (qr) {
            // 🎯 FIX 1: Store QR string along with the unique pairing code identifier
            global.latestQR = { qr: qr, pairingCode: pairingCode };
            console.log(chalk.yellow(`[${pairingCode}] QR ready to scan`));
            
            // Do NOT try to request a pairing code here. The 'qr' event alone enables QR mode.
        }

        if (connection === 'open') {
            const user = sock.user?.id;
            console.log(chalk.green(`[${pairingCode}] WhatsApp connected → ${user}`));

            const credsObj = await readAuthFolderAsObject(authFolder);
            await saveSessionToSupabase(user, credsObj);

            // Send DM to the user with confirmation
            try {
                await sock.sendMessage(user, { text: `✅ *Session linked successfully!*\n\nIt is now stored securely in Supabase.` });
            } catch (e) { console.error('Failed to send confirmation message:', e.message); }
            
            // 🎯 FIX 2: Immediate cleanup for multi-session support
            // Clear the global QR for this session immediately
            if (global.latestQR && global.latestQR.pairingCode === pairingCode) {
                global.latestQR = null; 
            }

            // Cleanup: delete files and disconnect socket immediately (no setTimeout)
            try { 
                fs.rmSync(authFolder, { recursive: true, force: true }); 
                sock.logout(); 
                sock.ws?.close?.();
                console.log(chalk.gray(`[${pairingCode}] Session closed and cleaned up.`));
            } catch (e) { 
                console.error('Failed to clean up:', e.message); 
            }
        }

        if (connection === 'close') {
             const statusCode = lastDisconnect?.error?.output?.statusCode;
             const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
             console.log(
                 chalk.gray(`[${pairingCode}] Connection closed. Reason: ${DisconnectReason[statusCode] || statusCode}. Reconnect: ${shouldReconnect}`)
             );
             if (!shouldReconnect) {
                 // Clear global QR if logged out or permanently closed
                 if (global.latestQR?.pairingCode === pairingCode) {
                    global.latestQR = null;
                 }
             }
             // Forcing disconnect upon close event
             sock.ws?.close?.();
        }
    });

    return sock;
}

// 🧾 ROUTES
app.post('/generate-paircode', async (req, res) => {
    try {
        const pairingCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        console.log(chalk.blue(`🖼️ Generating QR Session (${pairingCode})`));
        await createPairingSocket(pairingCode);

        // Wait for QR
        let qrData = null;
        const start = Date.now();
        
        // Wait up to 15 seconds for the QR code to be generated by Baileys
        while (!qrData && Date.now() - start < 15000) { 
            // 🎯 FIX 3: Check global object for the QR associated with this unique session ID
            if (global.latestQR && global.latestQR.pairingCode === pairingCode) {
                qrData = global.latestQR.qr;
            }
            await delay(300);
        }

        // Clear the global QR variable immediately if timeout hit
        if (global.latestQR && global.latestQR.pairingCode === pairingCode) {
            global.latestQR = null;
        }

        if (!qrData) return res.status(500).json({ error: 'QR not ready within timeout. Try again.' });
        
        const qrDataURL = await QRCode.toDataURL(qrData);
        
        // Response contains the base64 Data URL for the frontend
        res.json({ code: pairingCode, qr: qrDataURL, status: 'ready' });
    } catch (err) {
        console.error('❌ /generate-paircode error:', err);
        res.status(500).json({ error: 'Failed to create pairing', details: err.message });
    }
});

// ✅ Health check
app.get('/status', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 🧹 Cleanup
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// 🚀 Start
app.listen(PORT, () => console.log(chalk.green(`🦴 Silent Wolf Pair running at http://localhost:${PORT}`)));