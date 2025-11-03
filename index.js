const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, delay, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const QRCode = require('qrcode');
const crypto = require('crypto');
const chalk = require('chalk');

const app = express();
const PORT = process.env.PORT || 5000;

const CURRENT_DIR = __dirname;
const PUBLIC_DIR = path.join(CURRENT_DIR, 'Public');

// ====== ✅ CORS & JSON MIDDLEWARE ======
app.use(express.json());
app.use(cors({
  origin: '*', // allow all origins; you can change to your frontend domain
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.static(PUBLIC_DIR));

const pairingSessions = new Map();

let sock = null;
let qrCode = null;
let isConnected = false;
let isShuttingDown = false;
let currentSessionString = '';

// ---------------- WhatsApp Initialization ----------------
async function initializeWhatsApp() {
  try {
    if (sock) {
      try { sock.ws.close(); sock = null; } catch {}
    }

    const { state, saveCreds } = await useMultiFileAuthState(path.join(CURRENT_DIR, 'auth_info'));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
      },
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: true,
      shouldIgnoreJid: jid => jid.endsWith('@broadcast'),
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        console.log(chalk.yellow('🔐 New QR Code generated'));
        qrCode = qr;
        const pairingCode = generatePairingCodeFromQR(qr);
        console.log(chalk.cyan('🔢 Pairing code:'), pairingCode);
      }

      if (connection === 'open') {
        console.log(chalk.green('✅ WhatsApp connected successfully!'));
        isConnected = true;
        qrCode = null;
        pairingSessions.clear();
        await generateAndSendSessionString();
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red('🔒 Device logged out. Clearing auth...'));
          fs.rmSync(path.join(CURRENT_DIR, 'auth_info'), { recursive: true, force: true });
          isConnected = false;
          currentSessionString = '';
        } else {
          console.log(chalk.red('❌ Connection closed'));
          isConnected = false;
          if (!isShuttingDown && statusCode !== DisconnectReason.loggedOut) {
            console.log(chalk.yellow('🔄 Reconnecting...'));
            setTimeout(() => initializeWhatsApp(), 5000);
          }
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
  } catch (err) {
    console.error(chalk.red('❌ Error initializing WhatsApp:'), err);
    if (!isShuttingDown) setTimeout(() => initializeWhatsApp(), 10000);
    throw err;
  }
}

// ---------------- Pairing & Session Utilities ----------------
function generatePairingCodeFromQR(qrData) {
  const hash = crypto.createHash('md5').update(qrData).digest('hex');
  const base36 = parseInt(hash.substring(0, 8), 16).toString(36).toUpperCase();
  let code = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 8; i++) code += i < base36.length ? base36[i] : chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getSessionCredentials() {
  try {
    const authDir = path.join(CURRENT_DIR, 'auth_info');
    if (!fs.existsSync(authDir)) return null;
    const credentials = {};
    fs.readdirSync(authDir).forEach(file => {
      if (file.endsWith('.json')) credentials[file] = JSON.parse(fs.readFileSync(path.join(authDir, file), 'utf8'));
    });
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  } catch { return null; }
}

async function generateSessionString() {
  const sessionId = crypto.randomBytes(32).toString('base64');
  const timestamp = Date.now();
  const randomHash = crypto.createHash('sha256').update(sessionId + timestamp.toString()).digest('hex').substring(0, 16);
  const sessionString = `WOLFSESSION_${timestamp}_${randomHash.toUpperCase()}`;
  const credentials = await getSessionCredentials();
  const deployment = Buffer.from(JSON.stringify({ sessionId, timestamp, hash: randomHash, generatedAt: new Date().toISOString(), credentials })).toString('base64');
  return { readable: sessionString, deployment, credentials };
}

async function generateAndSendSessionString() {
  if (!sock || !isConnected) return;
  const userJid = sock.user?.id;
  if (!userJid) return;
  const sessionData = await generateSessionString();
  currentSessionString = sessionData.readable;

  const message = `✅ *WhatsApp Session Connected!*\n\nSession: ${sessionData.readable}\nDeployment: ${sessionData.deployment}`;
  await sock.sendMessage(userJid, { text: message });
  saveSessionToFile(sessionData);
  console.log(chalk.green('✅ Session string sent to DM'));
}

function saveSessionToFile(sessionData) {
  try {
    fs.writeFileSync(path.join(CURRENT_DIR, 'session_backup.json'), JSON.stringify({ ...sessionData, savedAt: new Date().toISOString(), user: sock.user?.id || 'unknown' }, null, 2));
  } catch (err) { console.error('❌ Error saving session:', err); }
}

async function safeLogout() {
  if (!sock || !isConnected) return;
  try { await sock.logout(); console.log(chalk.green('✅ Logout successful')); } 
  catch (err) { console.log('⚠️ Logout error:', err.message); }
}

async function safeClose() { if (sock?.ws) sock.ws.close(); sock = null; isConnected = false; }

// ---------------- Express Routes ----------------

// ✅ QR Generator
app.get('/generate-qr', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!sock || (!isConnected && !qrCode)) await initializeWhatsApp();
  if (qrCode) {
    const qrDataURL = await QRCode.toDataURL(qrCode, { width: 280, height: 280, margin: 2, color: { dark: '#000', light: '#00ff00' } });
    return res.json({ qr: qrDataURL, status: 'pending' });
  } else if (isConnected) {
    return res.json({ qr: null, status: 'connected', sessionString: currentSessionString });
  } else return res.status(500).json({ error: 'QR not ready' });
});

// ✅ Pair Code Generator
app.post('/generate-paircode', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: 'Phone number required' });
  const cleanNumber = number.replace(/\D/g, '');
  if (!sock) await initializeWhatsApp();
  if (isConnected) return res.json({ code: null, status: 'connected', sessionString: currentSessionString });
  if (!qrCode) return res.status(500).json({ error: 'Auth not ready' });

  const pairingCode = generatePairingCodeFromQR(qrCode);
  pairingSessions.set(pairingCode, { number: cleanNumber, timestamp: Date.now(), qrData: qrCode, expiresAt: Date.now() + 600000, status: 'active' });
  const qrDataURL = await QRCode.toDataURL(qrCode, { width: 280, height: 280, margin: 2, color: { dark: '#000', light: '#00ff00' } });
  res.json({ code: pairingCode, qr: qrDataURL, status: 'pending', expiresIn: '10 minutes' });
});

app.get('/get-session', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ connected: isConnected, sessionString: currentSessionString });
});

app.get('/status', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ connected: isConnected, hasQR: !!qrCode, activePairingSessions: pairingSessions.size });
});

app.delete('/clear-session', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  await safeLogout(); await safeClose();
  fs.rmSync(path.join(CURRENT_DIR, 'auth_info'), { recursive: true, force: true });
  isConnected = false; qrCode = null; currentSessionString = ''; pairingSessions.clear();
  setTimeout(() => initializeWhatsApp(), 2000);
  res.json({ message: 'Session cleared' });
});

// ---------------- Cleanup Expired Pairing Sessions ----------------
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of pairingSessions.entries()) if (now > session.expiresAt) pairingSessions.delete(code);
}, 60000);

// ---------------- Start Server ----------------
async function startServer() {
  console.log(chalk.blue('🚀 Starting WhatsApp Session Generator...'));
  if (!fs.existsSync(PUBLIC_DIR)) console.log(chalk.red('❌ Public folder missing!'));
  await initializeWhatsApp();
  app.listen(PORT, () => console.log(chalk.green(`✅ Server running on http://localhost:${PORT}`)));
}

// ---------------- Graceful Shutdown ----------------
async function gracefulShutdown() { isShuttingDown = true; await safeLogout(); await safeClose(); process.exit(0); }
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);

startServer();
