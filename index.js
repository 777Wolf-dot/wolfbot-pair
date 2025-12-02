// // // ====== WOLF BOT SERVER - index.js ======
// // // Web server for WhatsApp pairing with QR and Pair Code

// // import express from 'express';
// // import cors from 'cors';
// // import { fileURLToPath } from 'url';
// // import { dirname, join } from 'path';
// // import fs from 'fs';
// // import dotenv from 'dotenv';
// // import chalk from 'chalk';
// // import crypto from 'crypto';

// // // Correct Baileys imports
// // import makeWASocket, {
// //     useMultiFileAuthState,
// //     DisconnectReason,
// //     fetchLatestBaileysVersion,
// //     makeCacheableSignalKeyStore,
// //     Browsers
// // } from '@whiskeysockets/baileys';

// // import pino from 'pino';
// // import QRCode from 'qrcode';

// // // ====== CONFIGURATION ======
// // dotenv.config();

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = dirname(__filename);

// // const PORT = process.env.PORT || 5000;
// // const PREFIX = process.env.PREFIX || '.';
// // const BOT_NAME = process.env.BOT_NAME || 'Silent Wolf';
// // const VERSION = '1.0.0';
// // const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// // const app = express();

// // // Middleware
// // app.use(cors());
// // app.use(express.json());
// // app.use(express.static(join(__dirname, 'public')));

// // // Global variables
// // const sessions = new Map();
// // const pairCodeRequests = new Map();
// // const qrCodes = new Map(); // Store QR codes separately

// // console.log(chalk.cyan(`
// // ╔════════════════════════════════════════════════╗
// // ║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SERVER — ${chalk.green('STARTING')}  
// // ║   ⚙️ Version : ${VERSION}
// // ║   🌐 Port    : ${PORT}
// // ║   💬 Prefix  : "${PREFIX}"
// // ╚════════════════════════════════════════════════╝
// // `));

// // // ====== UTILITY FUNCTIONS ======
// // function generateSessionId() {
// //     // Much longer session ID with multiple random components
// //     const timestamp = Date.now().toString(36);
// //     const random1 = crypto.randomBytes(20).toString('hex');
// //     const random2 = crypto.randomBytes(16).toString('hex');
// //     const random3 = crypto.randomBytes(12).toString('hex');
// //     const random4 = crypto.randomBytes(8).toString('hex');
// //     return `wolf_${timestamp}_${random1}_${random2}_${random3}_${random4}`;
// // }

// // function generateQRDataURL(qrString) {
// //     return new Promise((resolve, reject) => {
// //         QRCode.toDataURL(qrString, (err, url) => {
// //             if (err) reject(err);
// //             else resolve(url);
// //         });
// //     });
// // }

// // // ====== SESSION MANAGEMENT ======
// // class SessionManager {
// //     constructor(sessionId = null) {
// //         this.sessionId = sessionId || generateSessionId();
// //         this.sock = null;
// //         this.state = null;
// //         this.saveCreds = null;
// //         this.qrCode = null;
// //         this.qrDataURL = null;
// //         this.connectionStatus = 'disconnected';
// //         this.ownerInfo = null;
// //         this.lastActivity = Date.now();
// //         this.connectionMethod = null;
// //         this.retryCount = 0;
// //         this.maxRetries = 3;
// //         this.qrTimeout = null;
// //         this.hasSentSessionId = false;
// //         this.hasSentConnectionMessage = false;
// //     }

// //     async initialize() {
// //         try {
// //             const authFolder = `./sessions/${this.sessionId}`;
// //             console.log(chalk.blue(`[${this.sessionId}] Initializing session...`));
            
// //             // Ensure session directory exists
// //             if (!fs.existsSync(authFolder)) {
// //                 fs.mkdirSync(authFolder, { recursive: true });
// //             }
            
// //             const { state, saveCreds } = await useMultiFileAuthState(authFolder);
            
// //             this.state = state;
// //             this.saveCreds = saveCreds;

// //             const { version } = await fetchLatestBaileysVersion();
// //             console.log(chalk.blue(`[${this.sessionId}] Baileys version: ${version}`));

// //             this.sock = makeWASocket({
// //                 version,
// //                 logger: pino({ level: 'warn' }),
// //                 browser: Browsers.ubuntu('Chrome'),
// //                 printQRInTerminal: true, // Enable terminal QR for debugging
// //                 auth: {
// //                     creds: state.creds,
// //                     keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
// //                 },
// //                 markOnlineOnConnect: true,
// //                 generateHighQualityLinkPreview: true,
// //                 connectTimeoutMs: 60000,
// //                 keepAliveIntervalMs: 10000,
// //                 defaultQueryTimeoutMs: 0,
// //                 emitOwnEvents: true,
// //                 mobile: false
// //             });

// //             this.setupEventHandlers();
// //             this.connectionStatus = 'initializing';
            
// //             console.log(chalk.green(`✅ Session ${this.sessionId} initialized`));
// //             return true;
// //         } catch (error) {
// //             console.error(chalk.red(`❌ Failed to initialize session ${this.sessionId}:`), error.message);
// //             this.connectionStatus = 'error';
// //             return false;
// //         }
// //     }

// //     setupEventHandlers() {
// //         if (!this.sock) return;

// //         // Connection updates
// //         this.sock.ev.on('connection.update', async (update) => {
// //             const { connection, qr, lastDisconnect } = update;
// //             this.lastActivity = Date.now();

// //             console.log(chalk.gray(`[${this.sessionId}] Connection: ${connection}`));

// //             if (qr) {
// //                 this.qrCode = qr;
// //                 this.connectionStatus = 'qr';
                
// //                 try {
// //                     // Generate QR code data URL
// //                     this.qrDataURL = await generateQRDataURL(qr);
// //                     qrCodes.set(this.sessionId, {
// //                         qr: qr,
// //                         qrDataURL: this.qrDataURL,
// //                         timestamp: Date.now()
// //                     });
// //                     console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
// //                     // Clear previous timeout
// //                     if (this.qrTimeout) {
// //                         clearTimeout(this.qrTimeout);
// //                     }
                    
// //                     // Set timeout to clear QR code after 5 minutes
// //                     this.qrTimeout = setTimeout(() => {
// //                         if (this.connectionStatus === 'qr') {
// //                             console.log(chalk.yellow(`[${this.sessionId}] QR Code expired`));
// //                             this.qrCode = null;
// //                             this.qrDataURL = null;
// //                             qrCodes.delete(this.sessionId);
// //                         }
// //                     }, 5 * 60 * 1000);
                    
// //                 } catch (error) {
// //                     console.error(chalk.red(`[${this.sessionId}] QR generation error:`), error);
// //                 }
                
// //                 if (!this.connectionMethod) {
// //                     this.connectionMethod = 'qr';
// //                 }
// //             }

// //             if (connection === 'open') {
// //                 this.connectionStatus = 'connected';
// //                 this.retryCount = 0;
// //                 this.qrCode = null;
// //                 this.qrDataURL = null;
// //                 qrCodes.delete(this.sessionId);
                
// //                 if (this.qrTimeout) {
// //                     clearTimeout(this.qrTimeout);
// //                     this.qrTimeout = null;
// //                 }
                
// //                 this.ownerInfo = {
// //                     jid: this.sock.user.id,
// //                     number: this.sock.user.id.split('@')[0]
// //                 };
// //                 console.log(chalk.green(`[${this.sessionId}] ✅ Connected successfully!`));
                
// //                 // Send two separate messages to DM
// //                 this.sendSessionIdMessage();
// //                 setTimeout(() => this.sendConnectionConfirmation(), 1500);
// //             }

// //             if (connection === 'close') {
// //                 const statusCode = lastDisconnect?.error?.output?.statusCode;
// //                 console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
// //                 // Clear QR data
// //                 this.qrCode = null;
// //                 this.qrDataURL = null;
// //                 qrCodes.delete(this.sessionId);
                
// //                 if (this.qrTimeout) {
// //                     clearTimeout(this.qrTimeout);
// //                     this.qrTimeout = null;
// //                 }
                
// //                 // Reset message flags
// //                 this.hasSentSessionId = false;
// //                 this.hasSentConnectionMessage = false;
                
// //                 if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
// //                     console.log(chalk.yellow(`[${this.sessionId}] 🔓 Logged out`));
// //                     this.cleanup();
// //                 } else if (this.retryCount < this.maxRetries) {
// //                     this.retryCount++;
// //                     console.log(chalk.yellow(`[${this.sessionId}] 🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`));
// //                     setTimeout(() => this.initialize(), 5000);
// //                 } else {
// //                     this.connectionStatus = 'disconnected';
// //                     console.log(chalk.red(`[${this.sessionId}] ❌ Max retries reached`));
// //                 }
// //             }
// //         });

// //         // Credentials updates
// //         this.sock.ev.on('creds.update', () => {
// //             if (this.saveCreds) {
// //                 this.saveCreds();
// //                 console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
// //             }
// //         });

// //         // Message handling
// //         this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
// //             if (type !== 'notify') return;
// //             const msg = messages[0];
// //             if (!msg.message) return;

// //             this.lastActivity = Date.now();
// //             await this.handleIncomingMessage(msg);
// //         });
// //     }

// //     async sendSessionIdMessage() {
// //         if (!this.ownerInfo || !this.sock || this.hasSentSessionId) return;
        
// //         try {
// //             await this.sock.sendMessage(this.ownerInfo.jid, {
// //                 text: `\n🆔 *Session ID:*\`${this.sessionId}`
// //             });
            
// //             this.hasSentSessionId = true;
// //             console.log(chalk.green(`[${this.sessionId}] Session ID message sent to +${this.ownerInfo.number}`));
// //         } catch (error) {
// //             console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
// //         }
// //     }

// //     async sendConnectionConfirmation() {
// //         if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
// //         try {
// //             const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
// //             await this.sock.sendMessage(this.ownerInfo.jid, {
// //                 text: `┏━🐺 SESSION VALIDATED 🐺━━┓
// // ┃
// // ┃   ✅ *SESSION VALIDATED*
// // ┃
// // ┃   🐺 *Owner:* Silent Wolf
// // ┃   📞 *Your Number:* +${this.ownerInfo.number}
// // ┃   🔗 *Method:* ${connectionMethod}
// // ┃   🌐 *Server:* ${SERVER_URL}
// // ┃   🟢 *Status:* Successfully Connected
// // ┃
// // ┃   🎯 Your session is now active and ready for use!
// // ┃
// // ┗━━━━━━━━━━━━━━━┛
// // `
// //             });
            
// //             this.hasSentConnectionMessage = true;
// //             console.log(chalk.green(`[${this.sessionId}] Connection confirmation sent to +${this.ownerInfo.number}`));
// //         } catch (error) {
// //             console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
// //         }
// //     }

// //     async handleIncomingMessage(msg) {
// //         const chatId = msg.key.remoteJid;
// //         const textMsg = msg.message.conversation || 
// //                        msg.message.extendedTextMessage?.text || 
// //                        msg.message.imageMessage?.caption || 
// //                        '';

// //         if (!textMsg || !textMsg.startsWith(PREFIX)) return;

// //         const command = textMsg.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
// //         console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${command}`));

// //         try {
// //             switch (command) {
// //                 case 'ping':
// //                     await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
// //                     break;
                    
// //                 case 'session':
// //                     await this.sock.sendMessage(chatId, { 
// //                         text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`\ ${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n\\n💡 *Deployment:* Check README.md for hosting instructions` 
// //                     }, { quoted: msg });
// //                     break;
                    
// //                 case 'menu':
// //                     await this.sock.sendMessage(chatId, { 
// //                         text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info` 
// //                     }, { quoted: msg });
// //                     break;
                    
// //                 case 'info':
// //                     await this.sock.sendMessage(chatId, { 
// //                         text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n🔥 Status: Online` 
// //                     }, { quoted: msg });
// //                     break;
// //             }
// //         } catch (error) {
// //             console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
// //         }
// //     }

// //     async requestPairCode(phoneNumber) {
// //         if (!this.sock) {
// //             throw new Error('Socket not initialized');
// //         }

// //         try {
// //             console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
// //             this.connectionMethod = 'pair';
            
// //             // Wait for connection to be ready
// //             await new Promise(resolve => setTimeout(resolve, 3000));
            
// //             const code = await this.sock.requestPairingCode(phoneNumber);
// //             const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
            
// //             pairCodeRequests.set(formattedCode.replace(/-/g, ''), {
// //                 phoneNumber,
// //                 sessionId: this.sessionId,
// //                 timestamp: Date.now(),
// //                 expiresAt: Date.now() + (10 * 60 * 1000)
// //             });

// //             console.log(chalk.green(`[${this.sessionId}] Pair code generated: ${formattedCode}`));
// //             return formattedCode;
// //         } catch (error) {
// //             console.error(chalk.red(`[${this.sessionId}] Pair code error:`), error.message);
            
// //             if (this.retryCount < this.maxRetries) {
// //                 this.retryCount++;
// //                 console.log(chalk.yellow(`[${this.sessionId}] Retrying pair code (${this.retryCount}/${this.maxRetries})...`));
// //                 await new Promise(resolve => setTimeout(resolve, 2000));
// //                 return this.requestPairCode(phoneNumber);
// //             }
            
// //             throw error;
// //         }
// //     }

// //     cleanup() {
// //         if (this.sock) {
// //             this.sock.ws.close();
// //         }
// //         this.connectionStatus = 'disconnected';
// //         this.qrCode = null;
// //         this.qrDataURL = null;
// //         qrCodes.delete(this.sessionId);
        
// //         if (this.qrTimeout) {
// //             clearTimeout(this.qrTimeout);
// //             this.qrTimeout = null;
// //         }
        
// //         this.ownerInfo = null;
// //         this.connectionMethod = null;
// //         this.retryCount = 0;
// //         this.hasSentSessionId = false;
// //         this.hasSentConnectionMessage = false;
// //     }

// //     getStatus() {
// //         return {
// //             status: this.connectionStatus,
// //             qr: this.qrCode,
// //             qrDataURL: this.qrDataURL,
// //             owner: this.ownerInfo,
// //             sessionId: this.sessionId,
// //             connectionMethod: this.connectionMethod,
// //             lastActivity: this.lastActivity
// //         };
// //     }
// // }

// // // ====== SESSION CONTROLLER ======
// // async function getOrCreateSession(sessionId = null) {
// //     const actualSessionId = sessionId || generateSessionId();
    
// //     if (sessions.has(actualSessionId)) {
// //         const session = sessions.get(actualSessionId);
// //         if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
// //             session.cleanup();
// //             sessions.delete(actualSessionId);
// //             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${actualSessionId}`));
// //         } else {
// //             return session;
// //         }
// //     }

// //     console.log(chalk.blue(`🔄 Creating new session: ${actualSessionId}`));
// //     const session = new SessionManager(actualSessionId);
// //     const initialized = await session.initialize();
    
// //     if (initialized) {
// //         sessions.set(actualSessionId, session);
// //         return session;
// //     } else {
// //         throw new Error('Failed to initialize session');
// //     }
// // }

// // // ====== API ROUTES ======

// // // Serve main page (uses your existing index.html)
// // app.get('/', (req, res) => {
// //     res.sendFile(join(__dirname, 'Public', 'index.html'));
// // });

// // // Serve pair code page (uses your existing paircode.html)
// // app.get('/paircode', (req, res) => {
// //     res.sendFile(join(__dirname, 'Public', 'paircode.html'));
// // });

// // // Serve QR code page (uses your existing qrcode.html)
// // app.get('/qrcode', (req, res) => {
// //     res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
// // });


// // app.get('/kip', (req, res) => {
// //     res.sendFile(join(__dirname, 'Public', 'kip.html'));
// // });

// // app.get('/dep', (req, res) => {
// //     res.sendFile(join(__dirname, 'Public', 'dep.html'));
// // });





// // // Server status
// // app.get('/status', (req, res) => {
// //     res.json({
// //         status: 'running',
// //         server: BOT_NAME,
// //         version: VERSION,
// //         port: PORT,
// //         serverUrl: SERVER_URL,
// //         activeSessions: sessions.size,
// //         uptime: process.uptime()
// //     });
// // });

// // // Generate QR Code
// // app.post('/generate-qr', async (req, res) => {
// //     try {
// //         const { sessionId = null } = req.body;
        
// //         console.log(chalk.blue(`🔗 QR generation request`));
// //         const session = await getOrCreateSession(sessionId);
// //         const status = session.getStatus();
        
// //         // Check if we have a stored QR code
// //         let qrData = null;
// //         if (status.status === 'qr' && status.qr) {
// //             if (!status.qrDataURL) {
// //                 // Generate QR data URL if not already generated
// //                 status.qrDataURL = await generateQRDataURL(status.qr);
// //             }
// //             qrData = {
// //                 qr: status.qr,
// //                 qrDataURL: status.qrDataURL
// //             };
// //         }
        
// //         res.json({
// //             success: true,
// //             sessionId: session.sessionId,
// //             status: status.status,
// //             qr: qrData?.qr,
// //             qrDataURL: qrData?.qrDataURL
// //         });
// //     } catch (error) {
// //         console.error(chalk.red('QR generation error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // Get QR Code Image
// // app.get('/qr-image/:sessionId', async (req, res) => {
// //     try {
// //         const { sessionId } = req.params;
        
// //         if (!sessionId || !sessions.has(sessionId)) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Session not found'
// //             });
// //         }
        
// //         const session = sessions.get(sessionId);
// //         const status = session.getStatus();
        
// //         if (status.status !== 'qr' || !status.qr) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'No QR code available for this session'
// //             });
// //         }
        
// //         if (!status.qrDataURL) {
// //             status.qrDataURL = await generateQRDataURL(status.qr);
// //         }
        
// //         // Return QR code as image
// //         const qrData = status.qrDataURL.split(',')[1];
// //         const img = Buffer.from(qrData, 'base64');
        
// //         res.writeHead(200, {
// //             'Content-Type': 'image/png',
// //             'Content-Length': img.length
// //         });
// //         res.end(img);
        
// //     } catch (error) {
// //         console.error(chalk.red('QR image error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // Generate Pair Code
// // app.post('/generate-paircode', async (req, res) => {
// //     try {
// //         const { number, sessionId = null } = req.body;
        
// //         if (!number || !number.match(/^\d{10,15}$/)) {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Invalid phone number format. Use format: 254788710904'
// //             });
// //         }

// //         console.log(chalk.blue(`🔗 Pair code request for number: ${number}`));
// //         const session = await getOrCreateSession(sessionId);
// //         const status = session.getStatus();

// //         if (status.status === 'connected') {
// //             return res.json({
// //                 success: true,
// //                 status: 'connected',
// //                 sessionId: session.sessionId,
// //                 message: 'WhatsApp is already connected'
// //             });
// //         }

// //         const code = await session.requestPairCode(number);
        
// //         res.json({
// //             success: true,
// //             code,
// //             sessionId: session.sessionId,
// //             expiresIn: '10 minutes'
// //         });
// //     } catch (error) {
// //         console.error(chalk.red('Pair code generation error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // Get session status
// // app.get('/status/:sessionId?', async (req, res) => {
// //     try {
// //         const sessionId = req.params.sessionId;
        
// //         if (sessionId && sessions.has(sessionId)) {
// //             const session = sessions.get(sessionId);
// //             const status = session.getStatus();
            
// //             res.json({
// //                 success: true,
// //                 ...status
// //             });
// //         } else {
// //             res.json({
// //                 success: true,
// //                 status: 'disconnected',
// //                 sessionId: sessionId || 'not_found'
// //             });
// //         }
// //     } catch (error) {
// //         console.error(chalk.red('Status check error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // Get all active sessions
// // app.get('/sessions', (req, res) => {
// //     const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
// //         sessionId,
// //         ...session.getStatus()
// //     }));
    
// //     res.json({
// //         success: true,
// //         sessions: activeSessions,
// //         total: activeSessions.length
// //     });
// // });

// // // Download session template
// // app.get('/download/:sessionId', (req, res) => {
// //     try {
// //         const sessionId = req.params.sessionId;
// //         const sessionPath = `./sessions/${sessionId}`;
        
// //         if (!fs.existsSync(sessionPath)) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Session not found'
// //             });
// //         }
        
// //         res.json({
// //             success: true,
// //             sessionId,
// //             message: `Session folder: sessions/${sessionId}`,
// //             instructions: 'Copy the entire folder to your hosting environment'
// //         });
// //     } catch (error) {
// //         console.error(chalk.red('Download error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // Cleanup functions
// // function cleanupExpiredPairCodes() {
// //     const now = Date.now();
// //     for (const [code, data] of pairCodeRequests.entries()) {
// //         if (now > data.expiresAt) {
// //             pairCodeRequests.delete(code);
// //             console.log(chalk.gray(`🧹 Cleaned expired pair code: ${code}`));
// //         }
// //     }
// // }

// // function cleanupInactiveSessions() {
// //     const now = Date.now();
// //     for (const [sessionId, session] of sessions.entries()) {
// //         if (now - session.lastActivity > 60 * 60 * 1000) {
// //             session.cleanup();
// //             sessions.delete(sessionId);
// //             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${sessionId}`));
// //         }
// //     }
// // }

// // function cleanupExpiredQRCodes() {
// //     const now = Date.now();
// //     for (const [sessionId, qrData] of qrCodes.entries()) {
// //         if (now - qrData.timestamp > 5 * 60 * 1000) {
// //             qrCodes.delete(sessionId);
// //             console.log(chalk.gray(`🧹 Cleaned expired QR code for session: ${sessionId}`));
// //         }
// //     }
// // }

// // // ====== SERVER STARTUP ======
// // async function startServer() {
// //     // Install qrcode if not already installed
// //     console.log(chalk.blue('📦 Checking for QR code package...'));
// //     try {
// //         await import('qrcode');
// //         console.log(chalk.green('✅ QRCode package available'));
// //     } catch (error) {
// //         console.log(chalk.yellow('⚠️  QRCode package not found. Install it with:'));
// //         console.log(chalk.white('   npm install qrcode'));
// //     }

// //     // Create sessions directory if it doesn't exist
// //     if (!fs.existsSync('./sessions')) {
// //         fs.mkdirSync('./sessions', { recursive: true });
// //         console.log(chalk.green('✅ Created sessions directory'));
// //     }

// //     // Start cleanup intervals
// //     setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
// //     setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
// //     setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);

// //     app.listen(PORT, () => {
// //         console.log(chalk.greenBright(`
// // ╔════════════════════════════════════════════════╗
// // ║              🚀 SERVER RUNNING                 ║
// // ╠════════════════════════════════════════════════╣
// // ║ 🌐 URL: ${SERVER_URL}                   
// // ║ 📁 Static files: ./Public                      
// // ║ 💾 Sessions: ./sessions                        
// // ║ 🆔 Auto Session ID Generation                  
// // ║ 📧 Dual DM Messages                
// // ║ ⚡ API Ready for connections!                  
// // ╚════════════════════════════════════════════════╝
// // `));

// //         console.log(chalk.blue('\n📋 Available Routes:'));
// //         console.log(chalk.white('  GET  /              - Main page'));
// //         console.log(chalk.white('  GET  /paircode      - Pair code page'));
// //         console.log(chalk.white('  GET  /qrcode        - QR code page'));
// //         console.log(chalk.white('  GET  /status        - Server status'));
// //         console.log(chalk.white('  POST /generate-qr    - Generate QR code'));
// //         console.log(chalk.white('  GET  /qr-image/:id  - Get QR code image'));
// //         console.log(chalk.white('  POST /generate-paircode - Generate pair code'));
// //         console.log(chalk.white('  GET  /status/:id    - Check session status'));
// //         console.log(chalk.white('  GET  /sessions      - List all sessions'));
// //         console.log(chalk.white('  GET  /download/:id  - Get session info\n'));
// //     });
// // }

// // // Error handling
// // process.on('uncaughtException', (error) => {
// //     console.error(chalk.red('💥 Uncaught Exception:'), error);
// // });

// // process.on('unhandledRejection', (error) => {
// //     console.error(chalk.red('💥 Unhandled Rejection:'), error);
// // });

// // process.on('SIGINT', () => {
// //     console.log(chalk.yellow('\n\n👋 Shutting down server...'));
// //     for (const [sessionId, session] of sessions.entries()) {
// //         session.cleanup();
// //         console.log(chalk.gray(`🧹 Cleaned up session: ${sessionId}`));
// //     }
// //     process.exit(0);
// // });

// // // Start the server
// // startServer().catch(error => {
// //     console.error(chalk.red('💥 Failed to start server:'), error);
// //     process.exit(1);
// // });























































// // ====== WOLF BOT SERVER - index.js ======
// // Web server for WhatsApp pairing with QR and Pair Code
// // Updated to generate REAL Base64 WhatsApp sessions

// import express from 'express';
// import cors from 'cors';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
// import fs from 'fs';
// import dotenv from 'dotenv';
// import chalk from 'chalk';
// import crypto from 'crypto';

// // Correct Baileys imports
// import makeWASocket, {
//     useMultiFileAuthState,
//     DisconnectReason,
//     fetchLatestBaileysVersion,
//     makeCacheableSignalKeyStore,
//     Browsers
// } from '@whiskeysockets/baileys';

// import pino from 'pino';
// import QRCode from 'qrcode';

// // ====== CONFIGURATION ======
// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const PORT = process.env.PORT || 5000;
// const PREFIX = process.env.PREFIX || '.';
// const BOT_NAME = process.env.BOT_NAME || 'Silent Wolf';
// const VERSION = '1.0.0';
// const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(join(__dirname, 'public')));

// // Global variables
// const sessions = new Map();
// const pairCodeRequests = new Map();
// const qrCodes = new Map(); // Store QR codes separately

// console.log(chalk.cyan(`
// ╔════════════════════════════════════════════════╗
// ║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SERVER — ${chalk.green('STARTING')}  
// ║   ⚙️ Version : ${VERSION}
// ║   🌐 Port    : ${PORT}
// ║   💬 Prefix  : "${PREFIX}"
// ╚════════════════════════════════════════════════╝
// `));

// // ====== UTILITY FUNCTIONS ======
// function generateSessionId() {
//     // Much longer session ID with multiple random components
//     const timestamp = Date.now().toString(36);
//     const random1 = crypto.randomBytes(20).toString('hex');
//     const random2 = crypto.randomBytes(16).toString('hex');
//     const random3 = crypto.randomBytes(12).toString('hex');
//     const random4 = crypto.randomBytes(8).toString('hex');
//     return `wolf_${timestamp}_${random1}_${random2}_${random3}_${random4}`;
// }

// function generateQRDataURL(qrString) {
//     return new Promise((resolve, reject) => {
//         QRCode.toDataURL(qrString, (err, url) => {
//             if (err) reject(err);
//             else resolve(url);
//         });
//     });
// }

// // ====== SESSION MANAGEMENT ======
// class SessionManager {
//     constructor(sessionId = null) {
//         this.sessionId = sessionId || generateSessionId();
//         this.sock = null;
//         this.state = null;
//         this.saveCreds = null;
//         this.qrCode = null;
//         this.qrDataURL = null;
//         this.connectionStatus = 'disconnected';
//         this.ownerInfo = null;
//         this.lastActivity = Date.now();
//         this.connectionMethod = null;
//         this.retryCount = 0;
//         this.maxRetries = 3;
//         this.qrTimeout = null;
//         this.hasSentSessionId = false;
//         this.hasSentConnectionMessage = false;
//         this.base64Session = null; // Store Base64 session
//         this.sessionGenerated = false;
//     }

//     async initialize() {
//         try {
//             const authFolder = `./sessions/${this.sessionId}`;
//             console.log(chalk.blue(`[${this.sessionId}] Initializing session...`));
            
//             // Ensure session directory exists
//             if (!fs.existsSync(authFolder)) {
//                 fs.mkdirSync(authFolder, { recursive: true });
//             }
            
//             const { state, saveCreds } = await useMultiFileAuthState(authFolder);
            
//             this.state = state;
//             this.saveCreds = saveCreds;

//             const { version } = await fetchLatestBaileysVersion();
//             console.log(chalk.blue(`[${this.sessionId}] Baileys version: ${version}`));

//             this.sock = makeWASocket({
//                 version,
//                 logger: pino({ level: 'warn' }),
//                 browser: Browsers.ubuntu('Chrome'),
//                 printQRInTerminal: true, // Enable terminal QR for debugging
//                 auth: {
//                     creds: state.creds,
//                     keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
//                 },
//                 markOnlineOnConnect: true,
//                 generateHighQualityLinkPreview: true,
//                 connectTimeoutMs: 60000,
//                 keepAliveIntervalMs: 10000,
//                 defaultQueryTimeoutMs: 0,
//                 emitOwnEvents: true,
//                 mobile: false
//             });

//             this.setupEventHandlers();
//             this.connectionStatus = 'initializing';
            
//             console.log(chalk.green(`✅ Session ${this.sessionId} initialized`));
//             return true;
//         } catch (error) {
//             console.error(chalk.red(`❌ Failed to initialize session ${this.sessionId}:`), error.message);
//             this.connectionStatus = 'error';
//             return false;
//         }
//     }

//     // ====== REAL BASE64 SESSION GENERATION ======
//     generateRealBase64Session() {
//         try {
//             if (!this.state || !this.state.creds) {
//                 console.log(chalk.yellow(`[${this.sessionId}] No credentials available for Base64 conversion`));
//                 return null;
//             }
            
//             console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 WhatsApp session...`));
            
//             // Create COMPLETE session object with ALL WhatsApp credentials
//             const sessionData = {
//                 creds: {
//                     // Core authentication data
//                     noiseKey: this.state.creds.noiseKey,
//                     pairingEphemeralKeyPair: this.state.creds.pairingEphemeralKeyPair,
//                     signedIdentityKey: this.state.creds.signedIdentityKey,
//                     signedPreKey: this.state.creds.signedPreKey,
//                     registrationId: this.state.creds.registrationId,
//                     advSecretKey: this.state.creds.advSecretKey,
                    
//                     // Message history
//                     processedHistoryMessages: this.state.creds.processedHistoryMessages || [],
                    
//                     // Key management
//                     nextPreKeyId: this.state.creds.nextPreKeyId || 1,
//                     firstUnuploadedPreKeyId: this.state.creds.firstUnuploadedPreKeyId || 1,
                    
//                     // Account sync
//                     accountSyncCounter: this.state.creds.accountSyncCounter || 1,
                    
//                     // Account settings
//                     accountSettings: this.state.creds.accountSettings || { unarchiveChats: false },
                    
//                     // User info
//                     me: this.state.creds.me,
                    
//                     // Account data
//                     account: this.state.creds.account,
                    
//                     // Signal identities
//                     signalIdentities: this.state.creds.signalIdentities || [],
                    
//                     // Platform info
//                     platform: this.state.creds.platform || 'android'
//                 },
//                 keys: this.state.keys || {}
//             };
            
//             // Convert to JSON string
//             const jsonString = JSON.stringify(sessionData);
            
//             // Debug: Show session data size
//             const jsonSize = Buffer.byteLength(jsonString, 'utf8');
//             console.log(chalk.cyan(`[${this.sessionId}] Session JSON size: ${jsonSize} bytes`));
            
//             // Convert to Base64 - THIS IS THE REAL SESSION
//             const base64Session = Buffer.from(jsonString).toString('base64');
            
//             // Store it
//             this.base64Session = base64Session;
//             this.sessionGenerated = true;
            
//             console.log(chalk.green(`[${this.sessionId}] ✅ REAL Base64 session generated`));
//             console.log(chalk.cyan(`[${this.sessionId}] Base64 length: ${base64Session.length} characters`));
//             console.log(chalk.gray(`[${this.sessionId}] First 100 chars: ${base64Session.substring(0, 100)}...`));
            
//             return base64Session;
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] ❌ REAL Base64 generation error:`), error);
//             console.error(chalk.red(`[${this.sessionId}] Error details:`), error.stack);
//             return null;
//         }
//     }

//     // ====== SEND BASE64 IN CHUNKS ======
//     async sendBase64InChunks(base64String, jid) {
//         try {
//             // Split the LONG Base64 string into WhatsApp-friendly chunks
//             const chunkSize = 1500; // WhatsApp message limit
//             const totalChunks = Math.ceil(base64String.length / chunkSize);
            
//             console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ${totalChunks} chunks...`));
            
//             // Send header message
//             await this.sock.sendMessage(jid, {
//                 text: `📄 *REAL BASE64 SESSION ID*\n\n🔐 This is your REAL WhatsApp session encoded in Base64.\n📏 Total length: ${base64String.length} characters\n🧩 Sending in ${totalChunks} parts...\n\n⚠️ *COPY EVERYTHING BELOW* (all parts)`
//             });
            
//             // Send each chunk
//             for (let i = 0; i < totalChunks; i++) {
//                 const start = i * chunkSize;
//                 const end = start + chunkSize;
//                 const chunk = base64String.substring(start, end);
//                 const partNumber = i + 1;
                
//                 await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
                
//                 await this.sock.sendMessage(jid, {
//                     text: `📦 *Part ${partNumber}/${totalChunks}*\n\`\`\`${chunk}\`\`\``
//                 });
                
//                 console.log(chalk.gray(`[${this.sessionId}] Sent part ${partNumber}/${totalChunks}`));
//             }
            
//             // Send footer with instructions
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             await this.sock.sendMessage(jid, {
//                 text: `✅ *BASE64 COMPLETE*\n\n📋 *How to use:*\n1. Copy ALL parts above (join them together)\n2. Create a .env file in your bot folder\n3. Add this line:\n\`\`\`BASE64_SESSION=${base64String.substring(0, 50)}...\`\`\`\n4. Save and restart your bot\n\n🌐 *Alternative:*\nVisit ${SERVER_URL}/base64-session/${this.sessionId}\n\n⚠️ *Keep this session safe!* It's your WhatsApp login.`
//             });
            
//             console.log(chalk.green(`[${this.sessionId}] ✅ All Base64 chunks sent successfully`));
            
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 chunks:`), error);
//         }
//     }

//     setupEventHandlers() {
//         if (!this.sock) return;

//         // Connection updates
//         this.sock.ev.on('connection.update', async (update) => {
//             const { connection, qr, lastDisconnect } = update;
//             this.lastActivity = Date.now();

//             console.log(chalk.gray(`[${this.sessionId}] Connection: ${connection}`));

//             if (qr) {
//                 this.qrCode = qr;
//                 this.connectionStatus = 'qr';
                
//                 try {
//                     // Generate QR code data URL
//                     this.qrDataURL = await generateQRDataURL(qr);
//                     qrCodes.set(this.sessionId, {
//                         qr: qr,
//                         qrDataURL: this.qrDataURL,
//                         timestamp: Date.now()
//                     });
//                     console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
//                     // Clear previous timeout
//                     if (this.qrTimeout) {
//                         clearTimeout(this.qrTimeout);
//                     }
                    
//                     // Set timeout to clear QR code after 5 minutes
//                     this.qrTimeout = setTimeout(() => {
//                         if (this.connectionStatus === 'qr') {
//                             console.log(chalk.yellow(`[${this.sessionId}] QR Code expired`));
//                             this.qrCode = null;
//                             this.qrDataURL = null;
//                             qrCodes.delete(this.sessionId);
//                         }
//                     }, 5 * 60 * 1000);
                    
//                 } catch (error) {
//                     console.error(chalk.red(`[${this.sessionId}] QR generation error:`), error);
//                 }
                
//                 if (!this.connectionMethod) {
//                     this.connectionMethod = 'qr';
//                 }
//             }

//             if (connection === 'open') {
//                 this.connectionStatus = 'connected';
//                 this.retryCount = 0;
//                 this.qrCode = null;
//                 this.qrDataURL = null;
//                 qrCodes.delete(this.sessionId);
                
//                 if (this.qrTimeout) {
//                     clearTimeout(this.qrTimeout);
//                     this.qrTimeout = null;
//                 }
                
//                 this.ownerInfo = {
//                     jid: this.sock.user.id,
//                     number: this.sock.user.id.split('@')[0]
//                 };
//                 console.log(chalk.green(`[${this.sessionId}] ✅ WhatsApp connected successfully!`));
                
//                 // Generate REAL Base64 session
//                 console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 session...`));
//                 const base64Session = this.generateRealBase64Session();
                
//                 if (base64Session) {
//                     // Send Base64 session in chunks
//                     setTimeout(() => {
//                         this.sendBase64InChunks(base64Session, this.ownerInfo.jid);
//                     }, 2000);
                    
//                     // Send confirmation message after Base64
//                     setTimeout(() => {
//                         this.sendConnectionConfirmation();
//                     }, 5000);
//                 } else {
//                     console.log(chalk.red(`[${this.sessionId}] ❌ Failed to generate Base64 session`));
//                     // Fallback to session ID
//                     this.sendSessionIdMessage();
//                     setTimeout(() => this.sendConnectionConfirmation(), 1500);
//                 }
//             }

//             if (connection === 'close') {
//                 const statusCode = lastDisconnect?.error?.output?.statusCode;
//                 console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
//                 // Clear QR data
//                 this.qrCode = null;
//                 this.qrDataURL = null;
//                 qrCodes.delete(this.sessionId);
                
//                 if (this.qrTimeout) {
//                     clearTimeout(this.qrTimeout);
//                     this.qrTimeout = null;
//                 }
                
//                 // Reset message flags
//                 this.hasSentSessionId = false;
//                 this.hasSentConnectionMessage = false;
//                 this.sessionGenerated = false;
//                 this.base64Session = null;
                
//                 if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
//                     console.log(chalk.yellow(`[${this.sessionId}] 🔓 Logged out`));
//                     this.cleanup();
//                 } else if (this.retryCount < this.maxRetries) {
//                     this.retryCount++;
//                     console.log(chalk.yellow(`[${this.sessionId}] 🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`));
//                     setTimeout(() => this.initialize(), 5000);
//                 } else {
//                     this.connectionStatus = 'disconnected';
//                     console.log(chalk.red(`[${this.sessionId}] ❌ Max retries reached`));
//                 }
//             }
//         });

//         // Credentials updates
//         this.sock.ev.on('creds.update', () => {
//             if (this.saveCreds) {
//                 this.saveCreds();
//                 console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
//             }
//         });

//         // Message handling
//         this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
//             if (type !== 'notify') return;
//             const msg = messages[0];
//             if (!msg.message) return;

//             this.lastActivity = Date.now();
//             await this.handleIncomingMessage(msg);
//         });
//     }

//     async sendSessionIdMessage() {
//         if (!this.ownerInfo || !this.sock || this.hasSentSessionId) return;
        
//         try {
//             await this.sock.sendMessage(this.ownerInfo.jid, {
//                 text: `\n🆔 *Session ID:* \`${this.sessionId}\`\n\n🌐 Get Base64 session at:\n${SERVER_URL}/base64-session/${this.sessionId}`
//             });
            
//             this.hasSentSessionId = true;
//             console.log(chalk.green(`[${this.sessionId}] Session ID sent to +${this.ownerInfo.number}`));
//         } catch (error) {
//             console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
//         }
//     }

//     async sendConnectionConfirmation() {
//         if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
//         try {
//             const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
//             await this.sock.sendMessage(this.ownerInfo.jid, {
//                 text: `┏━🐺 BASE64 SESSION CONFIRMED 🐺━━┓
// ┃
// ┃   ✅ *BASE64 SESSION CONFIRMED*
// ┃
// ┃   📄 *Session Type:* REAL Base64 WhatsApp Session
// ┃   🔐 *Encryption:* Full WhatsApp credentials
// ┃   📏 *Length:* ${this.base64Session?.length || 0} characters
// ┃   🐺 *Owner:* Silent Wolf
// ┃   📞 *Your Number:* +${this.ownerInfo.number}
// ┃   🔗 *Method:* ${connectionMethod}
// ┃   🌐 *Server:* ${SERVER_URL}
// ┃   🟢 *Status:* Base64 ready for bot deployment
// ┃
// ┃   💡 *Next Steps:*
// ┃   1. Copy the complete Base64 from above
// ┃   2. Add to your bot's .env file
// ┃   3. Restart your bot
// ┃   4. Bot will connect automatically
// ┃
// ┃   🎯 Your WhatsApp session is now Base64 encoded!
// ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
// `
//             });
            
//             this.hasSentConnectionMessage = true;
//             console.log(chalk.green(`[${this.sessionId}] ✅ Base64 confirmation sent to +${this.ownerInfo.number}`));
//         } catch (error) {
//             console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
//         }
//     }

//     async handleIncomingMessage(msg) {
//         const chatId = msg.key.remoteJid;
//         const textMsg = msg.message.conversation || 
//                        msg.message.extendedTextMessage?.text || 
//                        msg.message.imageMessage?.caption || 
//                        '';

//         if (!textMsg || !textMsg.startsWith(PREFIX)) return;

//         const command = textMsg.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
//         console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${command}`));

//         try {
//             switch (command) {
//                 case 'ping':
//                     await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
//                     break;
                    
//                 case 'session':
//                     if (this.base64Session) {
//                         const shortBase64 = this.base64Session.substring(0, 100) + '...';
//                         await this.sock.sendMessage(chatId, { 
//                             text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64 Type: REAL WhatsApp Session\\n🔐 Length: ${this.base64Session.length} characters\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n🔗 Base64 URL: ${SERVER_URL}/base64-session/${this.sessionId}` 
//                         }, { quoted: msg });
//                     } else {
//                         await this.sock.sendMessage(chatId, { 
//                             text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64: Generating...\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}` 
//                         }, { quoted: msg });
//                     }
//                     break;
                    
//                 case 'base64':
//                     if (this.base64Session) {
//                         await this.sock.sendMessage(chatId, { 
//                             text: `📄 *REAL Base64 WhatsApp Session*\\n\\n✅ Session ready! ${this.base64Session.length} characters\\n\\n🌐 Download from:\\n${SERVER_URL}/base64-session/${this.sessionId}\\n\\n💡 Already sent to your DM in multiple parts.` 
//                         }, { quoted: msg });
//                     } else {
//                         await this.sock.sendMessage(chatId, { 
//                             text: '⏳ *Base64 Session*\\n\\nGenerating REAL WhatsApp session...\\nPlease wait a moment and try again.' 
//                         }, { quoted: msg });
//                     }
//                     break;
                    
//                 case 'menu':
//                     await this.sock.sendMessage(chatId, { 
//                         text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Get Base64 info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Base64 session info` 
//                     }, { quoted: msg });
//                     break;
                    
//                 case 'info':
//                     await this.sock.sendMessage(chatId, { 
//                         text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n📄 Base64: ${this.base64Session ? '✅ REAL Session (' + this.base64Session.length + ' chars)' : '⏳ Generating...'}\\n🔥 Status: ${this.connectionStatus}` 
//                     }, { quoted: msg });
//                     break;
//             }
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
//         }
//     }

//     async requestPairCode(phoneNumber) {
//         if (!this.sock) {
//             throw new Error('Socket not initialized');
//         }

//         try {
//             console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
//             this.connectionMethod = 'pair';
            
//             // Wait for connection to be ready
//             await new Promise(resolve => setTimeout(resolve, 3000));
            
//             const code = await this.sock.requestPairingCode(phoneNumber);
//             const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
            
//             pairCodeRequests.set(formattedCode.replace(/-/g, ''), {
//                 phoneNumber,
//                 sessionId: this.sessionId,
//                 timestamp: Date.now(),
//                 expiresAt: Date.now() + (10 * 60 * 1000)
//             });

//             console.log(chalk.green(`[${this.sessionId}] Pair code generated: ${formattedCode}`));
//             return formattedCode;
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] Pair code error:`), error.message);
            
//             if (this.retryCount < this.maxRetries) {
//                 this.retryCount++;
//                 console.log(chalk.yellow(`[${this.sessionId}] Retrying pair code (${this.retryCount}/${this.maxRetries})...`));
//                 await new Promise(resolve => setTimeout(resolve, 2000));
//                 return this.requestPairCode(phoneNumber);
//             }
            
//             throw error;
//         }
//     }

//     cleanup() {
//         if (this.sock) {
//             this.sock.ws.close();
//         }
//         this.connectionStatus = 'disconnected';
//         this.qrCode = null;
//         this.qrDataURL = null;
//         this.base64Session = null;
//         this.sessionGenerated = false;
//         qrCodes.delete(this.sessionId);
        
//         if (this.qrTimeout) {
//             clearTimeout(this.qrTimeout);
//             this.qrTimeout = null;
//         }
        
//         this.ownerInfo = null;
//         this.connectionMethod = null;
//         this.retryCount = 0;
//         this.hasSentSessionId = false;
//         this.hasSentConnectionMessage = false;
//     }

//     getStatus() {
//         return {
//             status: this.connectionStatus,
//             qr: this.qrCode,
//             qrDataURL: this.qrDataURL,
//             owner: this.ownerInfo,
//             sessionId: this.sessionId,
//             connectionMethod: this.connectionMethod,
//             lastActivity: this.lastActivity,
//             hasBase64Session: !!this.base64Session,
//             base64Length: this.base64Session?.length || 0,
//             sessionGenerated: this.sessionGenerated
//         };
//     }
// }

// // ====== SESSION CONTROLLER ======
// async function getOrCreateSession(sessionId = null) {
//     const actualSessionId = sessionId || generateSessionId();
    
//     if (sessions.has(actualSessionId)) {
//         const session = sessions.get(actualSessionId);
//         if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
//             session.cleanup();
//             sessions.delete(actualSessionId);
//             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${actualSessionId}`));
//         } else {
//             return session;
//         }
//     }

//     console.log(chalk.blue(`🔄 Creating new session: ${actualSessionId}`));
//     const session = new SessionManager(actualSessionId);
//     const initialized = await session.initialize();
    
//     if (initialized) {
//         sessions.set(actualSessionId, session);
//         return session;
//     } else {
//         throw new Error('Failed to initialize session');
//     }
// }

// // ====== API ROUTES ======

// // Serve main page (uses your existing index.html)
// app.get('/', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'index.html'));
// });

// // Serve pair code page (uses your existing paircode.html)
// app.get('/paircode', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'paircode.html'));
// });

// // Serve QR code page (uses your existing qrcode.html)
// app.get('/qrcode', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
// });

// app.get('/kip', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'kip.html'));
// });

// app.get('/dep', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'dep.html'));
// });

// // Server status
// app.get('/status', (req, res) => {
//     res.json({
//         status: 'running',
//         server: BOT_NAME,
//         version: VERSION,
//         port: PORT,
//         serverUrl: SERVER_URL,
//         activeSessions: sessions.size,
//         uptime: process.uptime()
//     });
// });

// // Generate QR Code
// app.post('/generate-qr', async (req, res) => {
//     try {
//         const { sessionId = null } = req.body;
        
//         console.log(chalk.blue(`🔗 QR generation request`));
//         const session = await getOrCreateSession(sessionId);
//         const status = session.getStatus();
        
//         // Check if we have a stored QR code
//         let qrData = null;
//         if (status.status === 'qr' && status.qr) {
//             if (!status.qrDataURL) {
//                 // Generate QR data URL if not already generated
//                 status.qrDataURL = await generateQRDataURL(status.qr);
//             }
//             qrData = {
//                 qr: status.qr,
//                 qrDataURL: status.qrDataURL
//             };
//         }
        
//         res.json({
//             success: true,
//             sessionId: session.sessionId,
//             status: status.status,
//             qr: qrData?.qr,
//             qrDataURL: qrData?.qrDataURL,
//             hasBase64Session: status.hasBase64Session,
//             base64Length: status.base64Length
//         });
//     } catch (error) {
//         console.error(chalk.red('QR generation error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // ====== GET REAL BASE64 SESSION ======
// app.get('/base64-session/:sessionId', async (req, res) => {
//     try {
//         const { sessionId } = req.params;
        
//         if (!sessionId || !sessions.has(sessionId)) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found'
//             });
//         }
        
//         const session = sessions.get(sessionId);
        
//         if (session.connectionStatus !== 'connected') {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Session not connected yet. Please wait for WhatsApp connection.',
//                 status: session.connectionStatus
//             });
//         }
        
//         // Generate or get Base64 session
//         let base64Session = session.base64Session;
//         if (!base64Session) {
//             base64Session = session.generateRealBase64Session();
//         }
        
//         if (!base64Session) {
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to generate REAL Base64 WhatsApp session'
//             });
//         }
        
//         // Log the REAL Base64 session details
//         console.log(chalk.green(`[${sessionId}] 📦 Serving REAL Base64 session:`));
//         console.log(chalk.cyan(`[${sessionId}] Length: ${base64Session.length} characters`));
//         console.log(chalk.gray(`[${sessionId}] Sample: ${base64Session.substring(0, 100)}...`));
        
//         res.json({
//             success: true,
//             sessionId,
//             base64Session,
//             ownerNumber: session.ownerInfo?.number,
//             createdAt: new Date().toISOString(),
//             sessionType: 'REAL_WHATSAPP_BASE64',
//             length: base64Session.length,
//             characters: base64Session.length,
//             estimatedBytes: Math.ceil(base64Session.length * 3 / 4),
//             instructions: 'Copy this ENTIRE Base64 string to your bot .env file',
//             directEnvFormat: `BASE64_SESSION=${base64Session}`,
//             warning: 'This is a REAL WhatsApp session. Keep it secure!',
//             message: '✅ REAL Base64 WhatsApp session generated successfully. This contains FULL WhatsApp credentials.'
//         });
        
//     } catch (error) {
//         console.error(chalk.red('Base64 session error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Get QR Code Image
// app.get('/qr-image/:sessionId', async (req, res) => {
//     try {
//         const { sessionId } = req.params;
        
//         if (!sessionId || !sessions.has(sessionId)) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found'
//             });
//         }
        
//         const session = sessions.get(sessionId);
//         const status = session.getStatus();
        
//         if (status.status !== 'qr' || !status.qr) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'No QR code available for this session'
//             });
//         }
        
//         if (!status.qrDataURL) {
//             status.qrDataURL = await generateQRDataURL(status.qr);
//         }
        
//         // Return QR code as image
//         const qrData = status.qrDataURL.split(',')[1];
//         const img = Buffer.from(qrData, 'base64');
        
//         res.writeHead(200, {
//             'Content-Type': 'image/png',
//             'Content-Length': img.length
//         });
//         res.end(img);
        
//     } catch (error) {
//         console.error(chalk.red('QR image error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Generate Pair Code
// app.post('/generate-paircode', async (req, res) => {
//     try {
//         const { number, sessionId = null } = req.body;
        
//         if (!number || !number.match(/^\d{10,15}$/)) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid phone number format. Use format: 254788710904'
//             });
//         }

//         console.log(chalk.blue(`🔗 Pair code request for number: ${number}`));
//         const session = await getOrCreateSession(sessionId);
//         const status = session.getStatus();

//         if (status.status === 'connected') {
//             return res.json({
//                 success: true,
//                 status: 'connected',
//                 sessionId: session.sessionId,
//                 message: 'WhatsApp is already connected'
//             });
//         }

//         const code = await session.requestPairCode(number);
        
//         res.json({
//             success: true,
//             code,
//             sessionId: session.sessionId,
//             expiresIn: '10 minutes'
//         });
//     } catch (error) {
//         console.error(chalk.red('Pair code generation error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Get session status
// app.get('/status/:sessionId?', async (req, res) => {
//     try {
//         const sessionId = req.params.sessionId;
        
//         if (sessionId && sessions.has(sessionId)) {
//             const session = sessions.get(sessionId);
//             const status = session.getStatus();
            
//             res.json({
//                 success: true,
//                 ...status
//             });
//         } else {
//             res.json({
//                 success: true,
//                 status: 'disconnected',
//                 sessionId: sessionId || 'not_found'
//             });
//         }
//     } catch (error) {
//         console.error(chalk.red('Status check error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Get all active sessions
// app.get('/sessions', (req, res) => {
//     const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
//         sessionId,
//         ...session.getStatus()
//     }));
    
//     res.json({
//         success: true,
//         sessions: activeSessions,
//         total: activeSessions.length
//     });
// });

// // Download session template
// app.get('/download/:sessionId', (req, res) => {
//     try {
//         const sessionId = req.params.sessionId;
//         const sessionPath = `./sessions/${sessionId}`;
        
//         if (!fs.existsSync(sessionPath)) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found'
//             });
//         }
        
//         res.json({
//             success: true,
//             sessionId,
//             message: `Session folder: sessions/${sessionId}`,
//             instructions: 'Copy the entire folder to your hosting environment'
//         });
//     } catch (error) {
//         console.error(chalk.red('Download error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Cleanup functions
// function cleanupExpiredPairCodes() {
//     const now = Date.now();
//     for (const [code, data] of pairCodeRequests.entries()) {
//         if (now > data.expiresAt) {
//             pairCodeRequests.delete(code);
//             console.log(chalk.gray(`🧹 Cleaned expired pair code: ${code}`));
//         }
//     }
// }

// function cleanupInactiveSessions() {
//     const now = Date.now();
//     for (const [sessionId, session] of sessions.entries()) {
//         if (now - session.lastActivity > 60 * 60 * 1000) {
//             session.cleanup();
//             sessions.delete(sessionId);
//             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${sessionId}`));
//         }
//     }
// }

// function cleanupExpiredQRCodes() {
//     const now = Date.now();
//     for (const [sessionId, qrData] of qrCodes.entries()) {
//         if (now - qrData.timestamp > 5 * 60 * 1000) {
//             qrCodes.delete(sessionId);
//             console.log(chalk.gray(`🧹 Cleaned expired QR code for session: ${sessionId}`));
//         }
//     }
// }

// // ====== SERVER STARTUP ======
// async function startServer() {
//     // Install qrcode if not already installed
//     console.log(chalk.blue('📦 Checking for QR code package...'));
//     try {
//         await import('qrcode');
//         console.log(chalk.green('✅ QRCode package available'));
//     } catch (error) {
//         console.log(chalk.yellow('⚠️  QRCode package not found. Install it with:'));
//         console.log(chalk.white('   npm install qrcode'));
//     }

//     // Create sessions directory if it doesn't exist
//     if (!fs.existsSync('./sessions')) {
//         fs.mkdirSync('./sessions', { recursive: true });
//         console.log(chalk.green('✅ Created sessions directory'));
//     }

//     // Start cleanup intervals
//     setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
//     setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
//     setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);

//     app.listen(PORT, () => {
//         console.log(chalk.greenBright(`
// ╔════════════════════════════════════════════════╗
// ║              🚀 SERVER RUNNING                 ║
// ╠════════════════════════════════════════════════╣
// ║ 🌐 URL: ${SERVER_URL}                   
// ║ 📁 Static files: ./Public                      
// ║ 💾 Sessions: ./sessions                        
// ║ 🆔 Auto Session ID Generation                  
// ║ 🔐 REAL Base64 WhatsApp Sessions               
// ║ 📏 Long session strings (1000+ chars)          
// ║ 📧 Multi-part DM delivery                      
// ║ ⚡ API Ready for connections!                  
// ╚════════════════════════════════════════════════╝
// `));

//         console.log(chalk.blue('\n📋 Available Routes:'));
//         console.log(chalk.white('  GET  /                     - Main page'));
//         console.log(chalk.white('  GET  /paircode             - Pair code page'));
//         console.log(chalk.white('  GET  /qrcode               - QR code page'));
//         console.log(chalk.white('  GET  /status               - Server status'));
//         console.log(chalk.white('  POST /generate-qr          - Generate QR code'));
//         console.log(chalk.white('  GET  /qr-image/:id         - Get QR code image'));
//         console.log(chalk.white('  POST /generate-paircode    - Generate pair code'));
//         console.log(chalk.white('  GET  /status/:id           - Check session status'));
//         console.log(chalk.white('  GET  /sessions             - List all sessions'));
//         console.log(chalk.white('  GET  /download/:id         - Get session info'));
//         console.log(chalk.white('  GET  /base64-session/:id   - Get REAL Base64 WhatsApp session\n'));
//     });
// }

// // Error handling
// process.on('uncaughtException', (error) => {
//     console.error(chalk.red('💥 Uncaught Exception:'), error);
// });

// process.on('unhandledRejection', (error) => {
//     console.error(chalk.red('💥 Unhandled Rejection:'), error);
// });

// process.on('SIGINT', () => {
//     console.log(chalk.yellow('\n\n👋 Shutting down server...'));
//     for (const [sessionId, session] of sessions.entries()) {
//         session.cleanup();
//         console.log(chalk.gray(`🧹 Cleaned up session: ${sessionId}`));
//     }
//     process.exit(0);
// });

// // Start the server
// startServer().catch(error => {
//     console.error(chalk.red('💥 Failed to start server:'), error);
//     process.exit(1);
// });



 


































































// ====== WOLF BOT SERVER - index.js ======
// Web server for WhatsApp pairing with QR and Pair Code
// Updated to generate REAL Base64 WhatsApp sessions in ONE PART

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
import crypto from 'crypto';

// Correct Baileys imports
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';

import pino from 'pino';
import QRCode from 'qrcode';

// ====== CONFIGURATION ======
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5000;
const PREFIX = process.env.PREFIX || '.';
const BOT_NAME = process.env.BOT_NAME || 'Silent Wolf';
const VERSION = '1.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Global variables
const sessions = new Map();
const pairCodeRequests = new Map();
const qrCodes = new Map(); // Store QR codes separately

console.log(chalk.cyan(`
╔════════════════════════════════════════════════╗
║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SERVER — ${chalk.green('STARTING')}  
║   ⚙️ Version : ${VERSION}
║   🌐 Port    : ${PORT}
║   💬 Prefix  : "${PREFIX}"
╚════════════════════════════════════════════════╝
`));

// ====== UTILITY FUNCTIONS ======
function generateSessionId() {
    // Much longer session ID with multiple random components
    const timestamp = Date.now().toString(36);
    const random1 = crypto.randomBytes(20).toString('hex');
    const random2 = crypto.randomBytes(16).toString('hex');
    const random3 = crypto.randomBytes(12).toString('hex');
    const random4 = crypto.randomBytes(8).toString('hex');
    return `wolf_${timestamp}_${random1}_${random2}_${random3}_${random4}`;
}

function generateQRDataURL(qrString) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(qrString, (err, url) => {
            if (err) reject(err);
            else resolve(url);
        });
    });
}

// ====== SESSION MANAGEMENT ======
class SessionManager {
    constructor(sessionId = null) {
        this.sessionId = sessionId || generateSessionId();
        this.sock = null;
        this.state = null;
        this.saveCreds = null;
        this.qrCode = null;
        this.qrDataURL = null;
        this.connectionStatus = 'disconnected';
        this.ownerInfo = null;
        this.lastActivity = Date.now();
        this.connectionMethod = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.qrTimeout = null;
        this.hasSentSessionId = false;
        this.hasSentConnectionMessage = false;
        this.base64Session = null; // Store Base64 session
        this.sessionGenerated = false;
    }

    async initialize() {
        try {
            const authFolder = `./sessions/${this.sessionId}`;
            console.log(chalk.blue(`[${this.sessionId}] Initializing session...`));
            
            // Ensure session directory exists
            if (!fs.existsSync(authFolder)) {
                fs.mkdirSync(authFolder, { recursive: true });
            }
            
            const { state, saveCreds } = await useMultiFileAuthState(authFolder);
            
            this.state = state;
            this.saveCreds = saveCreds;

            const { version } = await fetchLatestBaileysVersion();
            console.log(chalk.blue(`[${this.sessionId}] Baileys version: ${version}`));

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'warn' }),
                browser: Browsers.ubuntu('Chrome'),
                printQRInTerminal: true, // Enable terminal QR for debugging
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
                defaultQueryTimeoutMs: 0,
                emitOwnEvents: true,
                mobile: false
            });

            this.setupEventHandlers();
            this.connectionStatus = 'initializing';
            
            console.log(chalk.green(`✅ Session ${this.sessionId} initialized`));
            return true;
        } catch (error) {
            console.error(chalk.red(`❌ Failed to initialize session ${this.sessionId}:`), error.message);
            this.connectionStatus = 'error';
            return false;
        }
    }

    // ====== REAL BASE64 SESSION GENERATION ======
    generateRealBase64Session() {
        try {
            if (!this.state || !this.state.creds) {
                console.log(chalk.yellow(`[${this.sessionId}] No credentials available for Base64 conversion`));
                return null;
            }
            
            console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 WhatsApp session...`));
            
            // Create COMPLETE session object with ALL WhatsApp credentials
            const sessionData = {
                creds: {
                    // Core authentication data
                    noiseKey: this.state.creds.noiseKey,
                    pairingEphemeralKeyPair: this.state.creds.pairingEphemeralKeyPair,
                    signedIdentityKey: this.state.creds.signedIdentityKey,
                    signedPreKey: this.state.creds.signedPreKey,
                    registrationId: this.state.creds.registrationId,
                    advSecretKey: this.state.creds.advSecretKey,
                    
                    // Message history
                    processedHistoryMessages: this.state.creds.processedHistoryMessages || [],
                    
                    // Key management
                    nextPreKeyId: this.state.creds.nextPreKeyId || 1,
                    firstUnuploadedPreKeyId: this.state.creds.firstUnuploadedPreKeyId || 1,
                    
                    // Account sync
                    accountSyncCounter: this.state.creds.accountSyncCounter || 1,
                    
                    // Account settings
                    accountSettings: this.state.creds.accountSettings || { unarchiveChats: false },
                    
                    // User info
                    me: this.state.creds.me,
                    
                    // Account data
                    account: this.state.creds.account,
                    
                    // Signal identities
                    signalIdentities: this.state.creds.signalIdentities || [],
                    
                    // Platform info
                    platform: this.state.creds.platform || 'android'
                },
                keys: this.state.keys || {}
            };
            
            // Convert to JSON string
            const jsonString = JSON.stringify(sessionData);
            
            // Debug: Show session data size
            const jsonSize = Buffer.byteLength(jsonString, 'utf8');
            console.log(chalk.cyan(`[${this.sessionId}] Session JSON size: ${jsonSize} bytes`));
            
            // Convert to Base64 - THIS IS THE REAL SESSION
            const base64Session = Buffer.from(jsonString).toString('base64');
            
            // Store it
            this.base64Session = base64Session;
            this.sessionGenerated = true;
            
            console.log(chalk.green(`[${this.sessionId}] ✅ REAL Base64 session generated`));
            console.log(chalk.cyan(`[${this.sessionId}] Base64 length: ${base64Session.length} characters`));
            console.log(chalk.gray(`[${this.sessionId}] First 100 chars: ${base64Session.substring(0, 100)}...`));
            
            return base64Session;
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ REAL Base64 generation error:`), error);
            console.error(chalk.red(`[${this.sessionId}] Error details:`), error.stack);
            return null;
        }
    }

    // ====== SEND BASE64 IN ONE PART ======
    async sendBase64InOnePart(base64String, jid) {
        try {
            console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ONE part...`));
            
            // Send the complete Base64 in ONE message
            // WhatsApp allows up to 65,536 characters per message
            const messageText = `📄 *REAL BASE64 WHATSAPP SESSION ID*

🔐 This is your COMPLETE WhatsApp session encoded in Base64.
📏 Total length: ${base64String.length} characters
📁 Copy this ENTIRE string to your bot's .env file

⚠️ *IMPORTANT: COPY EVERYTHING BELOW*

\`\`\`
${base64String}
\`\`\`

💡 *How to use:*
1. Copy the ENTIRE Base64 string above
2. Create a .env file in your bot folder
3. Add this single line:
BASE64_SESSION=${base64String.substring(0, 50)}...
4. Save and restart your bot

🌐 *Alternative method:*
Visit ${SERVER_URL}/base64-session/${this.sessionId}

✅ *Your WhatsApp session is now ready for bot deployment!*
`;

            // Check if message is too long for WhatsApp
            if (messageText.length > 65536) {
                console.log(chalk.yellow(`[${this.sessionId}] Message too long (${messageText.length} chars), falling back to chunks`));
                return this.sendBase64InChunks(base64String, jid);
            }
            
            // Send the complete message in ONE part
            await this.sock.sendMessage(jid, { text: messageText });
            
            console.log(chalk.green(`[${this.sessionId}] ✅ Complete Base64 session sent in ONE part`));
            console.log(chalk.gray(`[${this.sessionId}] Message length: ${messageText.length} characters`));
            
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 in one part:`), error);
            
            // Fallback to chunks if single message fails
            if (error.message.includes('too long') || error.message.includes('length')) {
                console.log(chalk.yellow(`[${this.sessionId}] Falling back to chunked delivery`));
                return this.sendBase64InChunks(base64String, jid);
            }
        }
    }

    // ====== BACKUP: SEND BASE64 IN CHUNKS ======
    async sendBase64InChunks(base64String, jid) {
        try {
            // Split the LONG Base64 string into WhatsApp-friendly chunks
            const chunkSize = 1500; // WhatsApp message limit
            const totalChunks = Math.ceil(base64String.length / chunkSize);
            
            console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ${totalChunks} chunks...`));
            
            // Send header message
            await this.sock.sendMessage(jid, {
                text: `📄 *REAL BASE64 SESSION ID*\n\n🔐 This is your REAL WhatsApp session encoded in Base64.\n📏 Total length: ${base64String.length} characters\n🧩 Sending in ${totalChunks} parts...\n\n⚠️ *COPY EVERYTHING BELOW* (all parts)`
            });
            
            // Send each chunk
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = start + chunkSize;
                const chunk = base64String.substring(start, end);
                const partNumber = i + 1;
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
                
                await this.sock.sendMessage(jid, {
                    text: `📦 *Part ${partNumber}/${totalChunks}*\n\`\`\`${chunk}\`\`\``
                });
                
                console.log(chalk.gray(`[${this.sessionId}] Sent part ${partNumber}/${totalChunks}`));
            }
            
            // Send footer with instructions
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.sock.sendMessage(jid, {
                text: `✅ *BASE64 COMPLETE*\n\n📋 *How to use:*\n1. Copy ALL parts above (join them together)\n2. Create a .env file in your bot folder\n3. Add this line:\n\`\`\`BASE64_SESSION=${base64String.substring(0, 50)}...\`\`\`\n4. Save and restart your bot\n\n🌐 *Alternative:*\nVisit ${SERVER_URL}/base64-session/${this.sessionId}\n\n⚠️ *Keep this session safe!* It's your WhatsApp login.`
            });
            
            console.log(chalk.green(`[${this.sessionId}] ✅ All Base64 chunks sent successfully`));
            
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 chunks:`), error);
        }
    }

    setupEventHandlers() {
        if (!this.sock) return;

        // Connection updates
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            this.lastActivity = Date.now();

            console.log(chalk.gray(`[${this.sessionId}] Connection: ${connection}`));

            if (qr) {
                this.qrCode = qr;
                this.connectionStatus = 'qr';
                
                try {
                    // Generate QR code data URL
                    this.qrDataURL = await generateQRDataURL(qr);
                    qrCodes.set(this.sessionId, {
                        qr: qr,
                        qrDataURL: this.qrDataURL,
                        timestamp: Date.now()
                    });
                    console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
                    // Clear previous timeout
                    if (this.qrTimeout) {
                        clearTimeout(this.qrTimeout);
                    }
                    
                    // Set timeout to clear QR code after 5 minutes
                    this.qrTimeout = setTimeout(() => {
                        if (this.connectionStatus === 'qr') {
                            console.log(chalk.yellow(`[${this.sessionId}] QR Code expired`));
                            this.qrCode = null;
                            this.qrDataURL = null;
                            qrCodes.delete(this.sessionId);
                        }
                    }, 5 * 60 * 1000);
                    
                } catch (error) {
                    console.error(chalk.red(`[${this.sessionId}] QR generation error:`), error);
                }
                
                if (!this.connectionMethod) {
                    this.connectionMethod = 'qr';
                }
            }

            if (connection === 'open') {
                this.connectionStatus = 'connected';
                this.retryCount = 0;
                this.qrCode = null;
                this.qrDataURL = null;
                qrCodes.delete(this.sessionId);
                
                if (this.qrTimeout) {
                    clearTimeout(this.qrTimeout);
                    this.qrTimeout = null;
                }
                
                this.ownerInfo = {
                    jid: this.sock.user.id,
                    number: this.sock.user.id.split('@')[0]
                };
                console.log(chalk.green(`[${this.sessionId}] ✅ WhatsApp connected successfully!`));
                
                // Generate REAL Base64 session
                console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 session...`));
                const base64Session = this.generateRealBase64Session();
                
                if (base64Session) {
                    // Send Base64 session in ONE PART
                    setTimeout(() => {
                        this.sendBase64InOnePart(base64Session, this.ownerInfo.jid);
                    }, 2000);
                    
                    // Send confirmation message after Base64
                    setTimeout(() => {
                        this.sendConnectionConfirmation();
                    }, 5000);
                } else {
                    console.log(chalk.red(`[${this.sessionId}] ❌ Failed to generate Base64 session`));
                    // Fallback to session ID
                    this.sendSessionIdMessage();
                    setTimeout(() => this.sendConnectionConfirmation(), 1500);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
                // Clear QR data
                this.qrCode = null;
                this.qrDataURL = null;
                qrCodes.delete(this.sessionId);
                
                if (this.qrTimeout) {
                    clearTimeout(this.qrTimeout);
                    this.qrTimeout = null;
                }
                
                // Reset message flags
                this.hasSentSessionId = false;
                this.hasSentConnectionMessage = false;
                this.sessionGenerated = false;
                this.base64Session = null;
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log(chalk.yellow(`[${this.sessionId}] 🔓 Logged out`));
                    this.cleanup();
                } else if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(chalk.yellow(`[${this.sessionId}] 🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`));
                    setTimeout(() => this.initialize(), 5000);
                } else {
                    this.connectionStatus = 'disconnected';
                    console.log(chalk.red(`[${this.sessionId}] ❌ Max retries reached`));
                }
            }
        });

        // Credentials updates
        this.sock.ev.on('creds.update', () => {
            if (this.saveCreds) {
                this.saveCreds();
                console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
            }
        });

        // Message handling
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message) return;

            this.lastActivity = Date.now();
            await this.handleIncomingMessage(msg);
        });
    }

    async sendSessionIdMessage() {
        if (!this.ownerInfo || !this.sock || this.hasSentSessionId) return;
        
        try {
            await this.sock.sendMessage(this.ownerInfo.jid, {
                text: `\n🆔 *Session ID:* \`${this.sessionId}\`\n\n🌐 Get Base64 session at:\n${SERVER_URL}/base64-session/${this.sessionId}`
            });
            
            this.hasSentSessionId = true;
            console.log(chalk.green(`[${this.sessionId}] Session ID sent to +${this.ownerInfo.number}`));
        } catch (error) {
            console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
        }
    }

    async sendConnectionConfirmation() {
        if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
        try {
            const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
            await this.sock.sendMessage(this.ownerInfo.jid, {
                text: `┏━🐺 BASE64 SESSION CONFIRMED 🐺━━┓
┃
┃   ✅ *BASE64 SESSION CONFIRMED*
┃
┃   📄 *Session Type:* REAL Base64 WhatsApp Session
┃   🔐 *Encryption:* Full WhatsApp credentials
┃   📏 *Length:* ${this.base64Session?.length || 0} characters
┃   🐺 *Owner:* Silent Wolf
┃   📞 *Your Number:* +${this.ownerInfo.number}
┃   🔗 *Method:* ${connectionMethod}
┃   🌐 *Server:* ${SERVER_URL}
┃   🟢 *Status:* Base64 ready for bot deployment
┃
┃   💡 *Next Steps:*
┃   1. Copy the complete Base64 from above
┃   2. Add to your bot's .env file
┃   3. Restart your bot
┃   4. Bot will connect automatically
┃
┃   🎯 Your WhatsApp session is now Base64 encoded!
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`
            });
            
            this.hasSentConnectionMessage = true;
            console.log(chalk.green(`[${this.sessionId}] ✅ Base64 confirmation sent to +${this.ownerInfo.number}`));
        } catch (error) {
            console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
        }
    }

    async handleIncomingMessage(msg) {
        const chatId = msg.key.remoteJid;
        const textMsg = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       '';

        if (!textMsg || !textMsg.startsWith(PREFIX)) return;

        const command = textMsg.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
        console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${command}`));

        try {
            switch (command) {
                case 'ping':
                    await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
                    break;
                    
                case 'session':
                    if (this.base64Session) {
                        const shortBase64 = this.base64Session.substring(0, 100) + '...';
                        await this.sock.sendMessage(chatId, { 
                            text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64 Type: REAL WhatsApp Session\\n🔐 Length: ${this.base64Session.length} characters\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n🔗 Base64 URL: ${SERVER_URL}/base64-session/${this.sessionId}` 
                        }, { quoted: msg });
                    } else {
                        await this.sock.sendMessage(chatId, { 
                            text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64: Generating...\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}` 
                        }, { quoted: msg });
                    }
                    break;
                    
                case 'base64':
                    if (this.base64Session) {
                        await this.sock.sendMessage(chatId, { 
                            text: `📄 *REAL Base64 WhatsApp Session*\\n\\n✅ Session ready! ${this.base64Session.length} characters\\n\\n🌐 Download from:\\n${SERVER_URL}/base64-session/${this.sessionId}\\n\\n💡 Already sent to your DM in ONE complete part.` 
                        }, { quoted: msg });
                    } else {
                        await this.sock.sendMessage(chatId, { 
                            text: '⏳ *Base64 Session*\\n\\nGenerating REAL WhatsApp session...\\nPlease wait a moment and try again.' 
                        }, { quoted: msg });
                    }
                    break;
                    
                case 'menu':
                    await this.sock.sendMessage(chatId, { 
                        text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Get Base64 info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Base64 session info` 
                    }, { quoted: msg });
                    break;
                    
                case 'info':
                    await this.sock.sendMessage(chatId, { 
                        text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n📄 Base64: ${this.base64Session ? '✅ REAL Session (' + this.base64Session.length + ' chars)' : '⏳ Generating...'}\\n🔥 Status: ${this.connectionStatus}` 
                    }, { quoted: msg });
                    break;
            }
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
        }
    }

    async requestPairCode(phoneNumber) {
        if (!this.sock) {
            throw new Error('Socket not initialized');
        }

        try {
            console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
            this.connectionMethod = 'pair';
            
            // Wait for connection to be ready
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const code = await this.sock.requestPairingCode(phoneNumber);
            const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
            
            pairCodeRequests.set(formattedCode.replace(/-/g, ''), {
                phoneNumber,
                sessionId: this.sessionId,
                timestamp: Date.now(),
                expiresAt: Date.now() + (10 * 60 * 1000)
            });

            console.log(chalk.green(`[${this.sessionId}] Pair code generated: ${formattedCode}`));
            return formattedCode;
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] Pair code error:`), error.message);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(chalk.yellow(`[${this.sessionId}] Retrying pair code (${this.retryCount}/${this.maxRetries})...`));
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.requestPairCode(phoneNumber);
            }
            
            throw error;
        }
    }

    cleanup() {
        if (this.sock) {
            this.sock.ws.close();
        }
        this.connectionStatus = 'disconnected';
        this.qrCode = null;
        this.qrDataURL = null;
        this.base64Session = null;
        this.sessionGenerated = false;
        qrCodes.delete(this.sessionId);
        
        if (this.qrTimeout) {
            clearTimeout(this.qrTimeout);
            this.qrTimeout = null;
        }
        
        this.ownerInfo = null;
        this.connectionMethod = null;
        this.retryCount = 0;
        this.hasSentSessionId = false;
        this.hasSentConnectionMessage = false;
    }

    getStatus() {
        return {
            status: this.connectionStatus,
            qr: this.qrCode,
            qrDataURL: this.qrDataURL,
            owner: this.ownerInfo,
            sessionId: this.sessionId,
            connectionMethod: this.connectionMethod,
            lastActivity: this.lastActivity,
            hasBase64Session: !!this.base64Session,
            base64Length: this.base64Session?.length || 0,
            sessionGenerated: this.sessionGenerated
        };
    }
}

// ====== SESSION CONTROLLER ======
async function getOrCreateSession(sessionId = null) {
    const actualSessionId = sessionId || generateSessionId();
    
    if (sessions.has(actualSessionId)) {
        const session = sessions.get(actualSessionId);
        if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
            session.cleanup();
            sessions.delete(actualSessionId);
            console.log(chalk.yellow(`🧹 Cleaned inactive session: ${actualSessionId}`));
        } else {
            return session;
        }
    }

    console.log(chalk.blue(`🔄 Creating new session: ${actualSessionId}`));
    const session = new SessionManager(actualSessionId);
    const initialized = await session.initialize();
    
    if (initialized) {
        sessions.set(actualSessionId, session);
        return session;
    } else {
        throw new Error('Failed to initialize session');
    }
}

// ====== API ROUTES ======

// Serve main page (uses your existing index.html)
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'index.html'));
});

// Serve pair code page (uses your existing paircode.html)
app.get('/paircode', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'paircode.html'));
});

// Serve QR code page (uses your existing qrcode.html)
app.get('/qrcode', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
});

app.get('/kip', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'kip.html'));
});

app.get('/dep', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'dep.html'));
});

// Server status
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        server: BOT_NAME,
        version: VERSION,
        port: PORT,
        serverUrl: SERVER_URL,
        activeSessions: sessions.size,
        uptime: process.uptime()
    });
});

// Generate QR Code
app.post('/generate-qr', async (req, res) => {
    try {
        const { sessionId = null } = req.body;
        
        console.log(chalk.blue(`🔗 QR generation request`));
        const session = await getOrCreateSession(sessionId);
        const status = session.getStatus();
        
        // Check if we have a stored QR code
        let qrData = null;
        if (status.status === 'qr' && status.qr) {
            if (!status.qrDataURL) {
                // Generate QR data URL if not already generated
                status.qrDataURL = await generateQRDataURL(status.qr);
            }
            qrData = {
                qr: status.qr,
                qrDataURL: status.qrDataURL
            };
        }
        
        res.json({
            success: true,
            sessionId: session.sessionId,
            status: status.status,
            qr: qrData?.qr,
            qrDataURL: qrData?.qrDataURL,
            hasBase64Session: status.hasBase64Session,
            base64Length: status.base64Length
        });
    } catch (error) {
        console.error(chalk.red('QR generation error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ====== GET REAL BASE64 SESSION ======
app.get('/base64-session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        
        if (session.connectionStatus !== 'connected') {
            return res.status(400).json({
                success: false,
                error: 'Session not connected yet. Please wait for WhatsApp connection.',
                status: session.connectionStatus
            });
        }
        
        // Generate or get Base64 session
        let base64Session = session.base64Session;
        if (!base64Session) {
            base64Session = session.generateRealBase64Session();
        }
        
        if (!base64Session) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate REAL Base64 WhatsApp session'
            });
        }
        
        // Log the REAL Base64 session details
        console.log(chalk.green(`[${sessionId}] 📦 Serving REAL Base64 session:`));
        console.log(chalk.cyan(`[${sessionId}] Length: ${base64Session.length} characters`));
        console.log(chalk.gray(`[${sessionId}] Sample: ${base64Session.substring(0, 100)}...`));
        
        res.json({
            success: true,
            sessionId,
            base64Session,
            ownerNumber: session.ownerInfo?.number,
            createdAt: new Date().toISOString(),
            sessionType: 'REAL_WHATSAPP_BASE64',
            length: base64Session.length,
            characters: base64Session.length,
            estimatedBytes: Math.ceil(base64Session.length * 3 / 4),
            instructions: 'Copy this ENTIRE Base64 string to your bot .env file',
            directEnvFormat: `BASE64_SESSION=${base64Session}`,
            warning: 'This is a REAL WhatsApp session. Keep it secure!',
            message: '✅ REAL Base64 WhatsApp session generated successfully. This contains FULL WhatsApp credentials.'
        });
        
    } catch (error) {
        console.error(chalk.red('Base64 session error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get QR Code Image
app.get('/qr-image/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        const status = session.getStatus();
        
        if (status.status !== 'qr' || !status.qr) {
            return res.status(404).json({
                success: false,
                error: 'No QR code available for this session'
            });
        }
        
        if (!status.qrDataURL) {
            status.qrDataURL = await generateQRDataURL(status.qr);
        }
        
        // Return QR code as image
        const qrData = status.qrDataURL.split(',')[1];
        const img = Buffer.from(qrData, 'base64');
        
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
        
    } catch (error) {
        console.error(chalk.red('QR image error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate Pair Code
app.post('/generate-paircode', async (req, res) => {
    try {
        const { number, sessionId = null } = req.body;
        
        if (!number || !number.match(/^\d{10,15}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use format: 254788710904'
            });
        }

        console.log(chalk.blue(`🔗 Pair code request for number: ${number}`));
        const session = await getOrCreateSession(sessionId);
        const status = session.getStatus();

        if (status.status === 'connected') {
            return res.json({
                success: true,
                status: 'connected',
                sessionId: session.sessionId,
                message: 'WhatsApp is already connected'
            });
        }

        const code = await session.requestPairCode(number);
        
        res.json({
            success: true,
            code,
            sessionId: session.sessionId,
            expiresIn: '10 minutes'
        });
    } catch (error) {
        console.error(chalk.red('Pair code generation error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get session status
app.get('/status/:sessionId?', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            const status = session.getStatus();
            
            res.json({
                success: true,
                ...status
            });
        } else {
            res.json({
                success: true,
                status: 'disconnected',
                sessionId: sessionId || 'not_found'
            });
        }
    } catch (error) {
        console.error(chalk.red('Status check error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all active sessions
app.get('/sessions', (req, res) => {
    const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
        sessionId,
        ...session.getStatus()
    }));
    
    res.json({
        success: true,
        sessions: activeSessions,
        total: activeSessions.length
    });
});

// Download session template
app.get('/download/:sessionId', (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const sessionPath = `./sessions/${sessionId}`;
        
        if (!fs.existsSync(sessionPath)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            sessionId,
            message: `Session folder: sessions/${sessionId}`,
            instructions: 'Copy the entire folder to your hosting environment'
        });
    } catch (error) {
        console.error(chalk.red('Download error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cleanup functions
function cleanupExpiredPairCodes() {
    const now = Date.now();
    for (const [code, data] of pairCodeRequests.entries()) {
        if (now > data.expiresAt) {
            pairCodeRequests.delete(code);
            console.log(chalk.gray(`🧹 Cleaned expired pair code: ${code}`));
        }
    }
}

function cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > 60 * 60 * 1000) {
            session.cleanup();
            sessions.delete(sessionId);
            console.log(chalk.yellow(`🧹 Cleaned inactive session: ${sessionId}`));
        }
    }
}

function cleanupExpiredQRCodes() {
    const now = Date.now();
    for (const [sessionId, qrData] of qrCodes.entries()) {
        if (now - qrData.timestamp > 5 * 60 * 1000) {
            qrCodes.delete(sessionId);
            console.log(chalk.gray(`🧹 Cleaned expired QR code for session: ${sessionId}`));
        }
    }
}

// ====== SERVER STARTUP ======
async function startServer() {
    // Install qrcode if not already installed
    console.log(chalk.blue('📦 Checking for QR code package...'));
    try {
        await import('qrcode');
        console.log(chalk.green('✅ QRCode package available'));
    } catch (error) {
        console.log(chalk.yellow('⚠️  QRCode package not found. Install it with:'));
        console.log(chalk.white('   npm install qrcode'));
    }

    // Create sessions directory if it doesn't exist
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
        console.log(chalk.green('✅ Created sessions directory'));
    }

    // Start cleanup intervals
    setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
    setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
    setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);

    app.listen(PORT, () => {
        console.log(chalk.greenBright(`
╔════════════════════════════════════════════════╗
║              🚀 SERVER RUNNING                 ║
╠════════════════════════════════════════════════╣
║ 🌐 URL: ${SERVER_URL}                   
║ 📁 Static files: ./Public                      
║ 💾 Sessions: ./sessions                        
║ 🆔 Auto Session ID Generation                  
║ 🔐 REAL Base64 WhatsApp Sessions               
║ 📏 Long session strings (1000+ chars)          
║ 📧 ONE-PART DM delivery                        
║ ⚡ API Ready for connections!                  
╚════════════════════════════════════════════════╝
`));

        console.log(chalk.blue('\n📋 Available Routes:'));
        console.log(chalk.white('  GET  /                     - Main page'));
        console.log(chalk.white('  GET  /paircode             - Pair code page'));
        console.log(chalk.white('  GET  /qrcode               - QR code page'));
        console.log(chalk.white('  GET  /status               - Server status'));
        console.log(chalk.white('  POST /generate-qr          - Generate QR code'));
        console.log(chalk.white('  GET  /qr-image/:id         - Get QR code image'));
        console.log(chalk.white('  POST /generate-paircode    - Generate pair code'));
        console.log(chalk.white('  GET  /status/:id           - Check session status'));
        console.log(chalk.white('  GET  /sessions             - List all sessions'));
        console.log(chalk.white('  GET  /download/:id         - Get session info'));
        console.log(chalk.white('  GET  /base64-session/:id   - Get REAL Base64 WhatsApp session\n'));
    });
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('💥 Uncaught Exception:'), error);
});

process.on('unhandledRejection', (error) => {
    console.error(chalk.red('💥 Unhandled Rejection:'), error);
});

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down server...'));
    for (const [sessionId, session] of sessions.entries()) {
        session.cleanup();
        console.log(chalk.gray(`🧹 Cleaned up session: ${sessionId}`));
    }
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error(chalk.red('💥 Failed to start server:'), error);
    process.exit(1);
});