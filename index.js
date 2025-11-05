// index.js — Multi-session WhatsApp Pair Generator (Supabase + Auto QR Reset)

// --- ES MODULE IMPORTS ---

// Load .env variables at the start
import 'dotenv/config'; 
// Import local helper to load other env files (assuming it uses ESM too)
import "./helpers/loadEnv.js"; 
// Import decryptBuffer (needed for full session management, even if not used here)
import { encryptBuffer, decryptBuffer } from './helpers/crypto.js'; 

// Built-in Node Modules
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Third-Party Modules
import express from 'express';
import cors from 'cors';
import chalk from 'chalk'; 
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

// 🎯 FIX 1: Initialize Maps for multi-session handling
/** @type {Map<string, string>} Maps temporary pairingCode to QR data */
global.sessionQRCodes = new Map();
/** @type {Map<string, ReturnType<typeof makeWASocket>>} Maps temporary pairingCode to socket instance */
global.activePairingSockets = new Map();
// ----------------------------------------------------------------------

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
// 🎯 CORS fix: Keep the '*' origin to allow access from local development (localhost) or render.com
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.static(PUBLIC_DIR));

// 🧩 Helper functions
const delay = ms => new Promise(res => setTimeout(res, ms));

async function readAuthFolderAsObject(folder) {
    // ... (unchanged)
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

// 🎯 FIX 2: saveSessionToSupabase now takes 'sessionId' for UPSERT/IDENTIFICATION
async function saveSessionToSupabase(sessionId, credentialsObj) {
    try {
        const encrypted = encryptBuffer(Buffer.from(JSON.stringify(credentialsObj), 'utf-8'));
        
        // Delete any old session with the same user-defined ID
        const { error: deleteError } = await supabase.from('sessions')
            .delete()
            .eq('owner', sessionId);
        if (deleteError) console.warn(chalk.yellow(`Warning: Could not delete old session for ${sessionId}: ${deleteError.message}`));

        // Insert new session using the user-defined Session ID
        const { error } = await supabase.from('sessions').insert({
            session_id: crypto.randomUUID(), 
            owner: sessionId, // Use the user-defined Session ID here
            session_data: encrypted.toString('base64'), // Store as base64 string
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        console.log(chalk.green(`💾 Session stored in Supabase for ${sessionId}`));
    } catch (err) {
        console.error(chalk.red('❌ Failed saving session:'), err);
    }
}
// ---------------------------------------------------------------------------------

// ⚙️ Create a new ephemeral QR socket
// 🎯 FIX 3: Accepts both temporary code and user-defined sessionId
async function createPairingSocket(pairingCode, sessionId) {
    const authFolder = path.join(AUTH_SESSIONS_DIR, pairingCode); // Use temporary code for folder
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
        browser: Browsers.macOS('Chrome'), 
    });
    
    global.activePairingSockets.set(pairingCode, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update; 

        if (qr) {
            global.sessionQRCodes.set(pairingCode, qr);
            console.log(chalk.yellow(`[${pairingCode}] QR ready to scan`));
        }

        if (connection === 'open') {
            const userWaId = sock.user?.id;
            console.log(chalk.green(`[${pairingCode}] WhatsApp connected → ${userWaId} (Session: ${sessionId})`));

            const credsObj = await readAuthFolderAsObject(authFolder);
            // 🎯 FIX 4: Save session using the user-defined sessionId
            await saveSessionToSupabase(sessionId, credsObj); 

            // Send DM to the user with confirmation
            try {
                await sock.sendMessage(userWaId, { text: `✅ *Session linked successfully!*\n\nThis session is named: **${sessionId}** and is stored securely in Supabase.` });
            } catch (e) { console.error('Failed to send confirmation message:', e.message); }
            
            // Cleanup: remove from Maps, delete files and disconnect socket
            global.sessionQRCodes.delete(pairingCode);
            global.activePairingSockets.delete(pairingCode);
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
                 global.sessionQRCodes.delete(pairingCode);
             }
             global.activePairingSockets.delete(pairingCode);
             sock.ws?.close?.();
        }
    });

    return sock;
}

// 🧾 ROUTES

// 🎯 FIX 5: Implement true multi-session /status check
app.get('/status', async (req, res) => {
    const sessionId = req.query.session?.trim();
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing session query parameter.' });
    }

    try {
        const { data, error } = await supabase.from('sessions')
            .select('owner')
            .eq('owner', sessionId)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            return res.json({ 
                status: 'ok', 
                connected: true, 
                session: sessionId,
                details: `Session **${sessionId}** is stored and ready to use.`
            });
        }
        
        return res.json({ 
            status: 'not_found', 
            connected: false,
            session: sessionId,
            details: 'No session found. Click "Generate QR Code" to create a new session.'
        });

    } catch (err) {
        console.error('❌ /status error:', err);
        res.status(500).json({ error: 'Failed to check session status', details: err.message });
    }
});

// 🎯 FIX 6: Changed from app.post to app.get to match frontend fetch
app.get('/generate-qr', async (req, res) => { 
    const sessionId = req.query.session?.trim();

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing session query parameter.' });
    }
    
    try {
        // 1. Check if session already exists
        const { data } = await supabase.from('sessions')
            .select('owner')
            .eq('owner', sessionId)
            .maybeSingle();
        
        if (data) {
             // If a session exists, prevent generating a QR and return connected status
             return res.json({ status: 'connected', session: sessionId });
        }
        
        // 2. Generate a temporary pairing code
        const pairingCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        console.log(chalk.blue(`🖼️ Generating QR Session (${sessionId} / Temp Code: ${pairingCode})`));
        // Pass both the temporary code and the user-defined ID
        await createPairingSocket(pairingCode, sessionId); 

        // 3. Wait for QR
        let qrData = null;
        const start = Date.now();
        
        while (!qrData && Date.now() - start < 15000) { 
            qrData = global.sessionQRCodes.get(pairingCode);
            await delay(300);
        }

        global.sessionQRCodes.delete(pairingCode);

        if (!qrData) {
             const sock = global.activePairingSockets.get(pairingCode);
             if (sock) {
                 sock.ws?.close?.();
                 global.activePairingSockets.delete(pairingCode);
             }
             return res.status(500).json({ error: 'QR not ready within timeout. Try again.' });
        }
        
        const qrDataURL = await QRCode.toDataURL(qrData);
        
        res.json({ qr: qrDataURL, status: 'ready', sessionId: sessionId });
    } catch (err) {
        console.error('❌ /generate-qr error:', err);
        res.status(500).json({ error: 'Failed to create pairing', details: err.message });
    }
});
// ---------------------------------------------------------------------------------

// 🧹 Cleanup
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// 🚀 Start
app.listen(PORT, () => console.log(chalk.green(`🦴 Silent Wolf Pair running at http://localhost:${PORT}`)));