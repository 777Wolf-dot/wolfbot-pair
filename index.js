// index.js — Silent Wolf Multi-session WhatsApp Pair Generator
import 'dotenv/config';
import "./helpers/loadEnv.js";
import { encryptBuffer, decryptBuffer } from './helpers/crypto.js';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Directories ---
const PUBLIC_DIR = path.join(__dirname, 'Public');
const AUTH_DIR = path.join(__dirname, 'auth_sessions');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// --- Global Maps for pairing ---
global.sessionQRCodes = new Map();
global.activeSockets = new Map();

// --- Generate SESSION_ENCRYPTION_KEY if missing ---
if (!process.env.SESSION_ENCRYPTION_KEY) {
    const key = crypto.randomBytes(24).toString('base64');
    fs.appendFileSync(path.join(__dirname, '.env'), `SESSION_ENCRYPTION_KEY=${key}\n`);
    process.env.SESSION_ENCRYPTION_KEY = key;
    console.log(chalk.green('🔑 Generated SESSION_ENCRYPTION_KEY'));
}

// --- Supabase init ---
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Supabase credentials missing in .env'));
    process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- Express ---
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.static(PUBLIC_DIR));

// --- Helper ---
const delay = ms => new Promise(res => setTimeout(res, ms));

async function readFolderJSON(folder) {
    const result = {};
    if (!fs.existsSync(folder)) return result;
    for (const f of fs.readdirSync(folder)) {
        try {
            const content = fs.readFileSync(path.join(folder, f), 'utf8');
            result[f] = JSON.parse(content);
        } catch (e) {
            console.warn(`Could not read/parse ${f}: ${e.message}`);
        }
    }
    return result;
}

async function saveSessionSupabase(sessionId, credsObj) {
    try {
        const encrypted = encryptBuffer(Buffer.from(JSON.stringify(credsObj), 'utf-8'));
        await supabase.from('sessions').delete().eq('owner', sessionId);
        const { error } = await supabase.from('sessions').insert({
            session_id: crypto.randomUUID(),
            owner: sessionId,
            session_data: encrypted.toString('base64'),
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        console.log(chalk.green(`💾 Session saved for ${sessionId}`));
    } catch (e) {
        console.error(chalk.red('❌ Supabase save failed:'), e.message);
    }
}

// --- Create pairing socket ---
async function createPairSocket(sessionId) {
    const authFolder = path.join(AUTH_DIR, sessionId);
    fs.mkdirSync(authFolder, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        browser: Browsers.macOS('Chrome')
    });

    global.activeSockets.set(sessionId, sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async update => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            global.sessionQRCodes.set(sessionId, qr);
            console.log(chalk.yellow(`[${sessionId}] QR ready`));
        }

        if (connection === 'open') {
            console.log(chalk.green(`[${sessionId}] WhatsApp connected`));
            const credsObj = await readFolderJSON(authFolder);
            await saveSessionSupabase(sessionId, credsObj);

            // Send notification
            try {
                await sock.sendMessage(sock.user.id, { text: `✅ Session ${sessionId} linked and stored!` });
            } catch (e) { console.error('Failed to send message:', e.message); }

            global.sessionQRCodes.delete(sessionId);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (!shouldReconnect) {
                global.sessionQRCodes.delete(sessionId);
                global.activeSockets.delete(sessionId);
            }
        }
    });

    return sock;
}

// --- Routes ---
app.get('/status', async (req, res) => {
    const sessionId = req.query.session?.trim();
    if (!sessionId) return res.status(400).json({ error: 'Missing session query parameter' });

    const { data, error } = await supabase.from('sessions').select('owner').eq('owner', sessionId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    if (data) return res.json({ connected: true, session: sessionId });
    return res.json({ connected: false, session: sessionId });
});

app.get('/generate-qr', async (req, res) => {
    const sessionId = req.query.session?.trim();
    if (!sessionId) return res.status(400).json({ error: 'Missing session query parameter' });

    try {
        const { data } = await supabase.from('sessions').select('owner').eq('owner', sessionId).maybeSingle();
        if (data) return res.json({ status: 'connected', session: sessionId });

        const sock = await createPairSocket(sessionId);

        // Wait for QR
        let qr = null;
        const timeout = Date.now() + 60000;
        while (!qr && Date.now() < timeout) {
            qr = global.sessionQRCodes.get(sessionId);
            await delay(500);
        }

        if (!qr) return res.status(500).json({ error: 'QR not ready in time' });

        const qrDataURL = await QRCode.toDataURL(qr);
        res.json({ qr: qrDataURL, session: sessionId });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- Start server ---
app.listen(PORT, () => console.log(chalk.green(`🦴 Silent Wolf Pair running at http://localhost:${PORT}`)));
