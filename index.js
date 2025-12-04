// // // // ====== WOLF BOT SERVER - index.js ======
// // // // Web server for WhatsApp pairing with QR and Pair Code

// // // import express from 'express';
// // // import cors from 'cors';
// // // import { fileURLToPath } from 'url';
// // // import { dirname, join } from 'path';
// // // import fs from 'fs';
// // // import dotenv from 'dotenv';
// // // import chalk from 'chalk';
// // // import crypto from 'crypto';

// // // // Correct Baileys imports
// // // import makeWASocket, {
// // //     useMultiFileAuthState,
// // //     DisconnectReason,
// // //     fetchLatestBaileysVersion,
// // //     makeCacheableSignalKeyStore,
// // //     Browsers
// // // } from '@whiskeysockets/baileys';

// // // import pino from 'pino';
// // // import QRCode from 'qrcode';

// // // // ====== CONFIGURATION ======
// // // dotenv.config();

// // // const __filename = fileURLToPath(import.meta.url);
// // // const __dirname = dirname(__filename);

// // // const PORT = process.env.PORT || 5000;
// // // const PREFIX = process.env.PREFIX || '.';
// // // const BOT_NAME = process.env.BOT_NAME || 'Silent Wolf';
// // // const VERSION = '1.0.0';
// // // const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// // // const app = express();

// // // // Middleware
// // // app.use(cors());
// // // app.use(express.json());
// // // app.use(express.static(join(__dirname, 'public')));

// // // // Global variables
// // // const sessions = new Map();
// // // const pairCodeRequests = new Map();
// // // const qrCodes = new Map(); // Store QR codes separately

// // // console.log(chalk.cyan(`
// // // ╔════════════════════════════════════════════════╗
// // // ║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SERVER — ${chalk.green('STARTING')}  
// // // ║   ⚙️ Version : ${VERSION}
// // // ║   🌐 Port    : ${PORT}
// // // ║   💬 Prefix  : "${PREFIX}"
// // // ╚════════════════════════════════════════════════╝
// // // `));

// // // // ====== UTILITY FUNCTIONS ======
// // // function generateSessionId() {
// // //     // Much longer session ID with multiple random components
// // //     const timestamp = Date.now().toString(36);
// // //     const random1 = crypto.randomBytes(20).toString('hex');
// // //     const random2 = crypto.randomBytes(16).toString('hex');
// // //     const random3 = crypto.randomBytes(12).toString('hex');
// // //     const random4 = crypto.randomBytes(8).toString('hex');
// // //     return `wolf_${timestamp}_${random1}_${random2}_${random3}_${random4}`;
// // // }

// // // function generateQRDataURL(qrString) {
// // //     return new Promise((resolve, reject) => {
// // //         QRCode.toDataURL(qrString, (err, url) => {
// // //             if (err) reject(err);
// // //             else resolve(url);
// // //         });
// // //     });
// // // }

// // // // ====== SESSION MANAGEMENT ======
// // // class SessionManager {
// // //     constructor(sessionId = null) {
// // //         this.sessionId = sessionId || generateSessionId();
// // //         this.sock = null;
// // //         this.state = null;
// // //         this.saveCreds = null;
// // //         this.qrCode = null;
// // //         this.qrDataURL = null;
// // //         this.connectionStatus = 'disconnected';
// // //         this.ownerInfo = null;
// // //         this.lastActivity = Date.now();
// // //         this.connectionMethod = null;
// // //         this.retryCount = 0;
// // //         this.maxRetries = 3;
// // //         this.qrTimeout = null;
// // //         this.hasSentSessionId = false;
// // //         this.hasSentConnectionMessage = false;
// // //     }

// // //     async initialize() {
// // //         try {
// // //             const authFolder = `./sessions/${this.sessionId}`;
// // //             console.log(chalk.blue(`[${this.sessionId}] Initializing session...`));
            
// // //             // Ensure session directory exists
// // //             if (!fs.existsSync(authFolder)) {
// // //                 fs.mkdirSync(authFolder, { recursive: true });
// // //             }
            
// // //             const { state, saveCreds } = await useMultiFileAuthState(authFolder);
            
// // //             this.state = state;
// // //             this.saveCreds = saveCreds;

// // //             const { version } = await fetchLatestBaileysVersion();
// // //             console.log(chalk.blue(`[${this.sessionId}] Baileys version: ${version}`));

// // //             this.sock = makeWASocket({
// // //                 version,
// // //                 logger: pino({ level: 'warn' }),
// // //                 browser: Browsers.ubuntu('Chrome'),
// // //                 printQRInTerminal: true, // Enable terminal QR for debugging
// // //                 auth: {
// // //                     creds: state.creds,
// // //                     keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
// // //                 },
// // //                 markOnlineOnConnect: true,
// // //                 generateHighQualityLinkPreview: true,
// // //                 connectTimeoutMs: 60000,
// // //                 keepAliveIntervalMs: 10000,
// // //                 defaultQueryTimeoutMs: 0,
// // //                 emitOwnEvents: true,
// // //                 mobile: false
// // //             });

// // //             this.setupEventHandlers();
// // //             this.connectionStatus = 'initializing';
            
// // //             console.log(chalk.green(`✅ Session ${this.sessionId} initialized`));
// // //             return true;
// // //         } catch (error) {
// // //             console.error(chalk.red(`❌ Failed to initialize session ${this.sessionId}:`), error.message);
// // //             this.connectionStatus = 'error';
// // //             return false;
// // //         }
// // //     }

// // //     setupEventHandlers() {
// // //         if (!this.sock) return;

// // //         // Connection updates
// // //         this.sock.ev.on('connection.update', async (update) => {
// // //             const { connection, qr, lastDisconnect } = update;
// // //             this.lastActivity = Date.now();

// // //             console.log(chalk.gray(`[${this.sessionId}] Connection: ${connection}`));

// // //             if (qr) {
// // //                 this.qrCode = qr;
// // //                 this.connectionStatus = 'qr';
                
// // //                 try {
// // //                     // Generate QR code data URL
// // //                     this.qrDataURL = await generateQRDataURL(qr);
// // //                     qrCodes.set(this.sessionId, {
// // //                         qr: qr,
// // //                         qrDataURL: this.qrDataURL,
// // //                         timestamp: Date.now()
// // //                     });
// // //                     console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
// // //                     // Clear previous timeout
// // //                     if (this.qrTimeout) {
// // //                         clearTimeout(this.qrTimeout);
// // //                     }
                    
// // //                     // Set timeout to clear QR code after 5 minutes
// // //                     this.qrTimeout = setTimeout(() => {
// // //                         if (this.connectionStatus === 'qr') {
// // //                             console.log(chalk.yellow(`[${this.sessionId}] QR Code expired`));
// // //                             this.qrCode = null;
// // //                             this.qrDataURL = null;
// // //                             qrCodes.delete(this.sessionId);
// // //                         }
// // //                     }, 5 * 60 * 1000);
                    
// // //                 } catch (error) {
// // //                     console.error(chalk.red(`[${this.sessionId}] QR generation error:`), error);
// // //                 }
                
// // //                 if (!this.connectionMethod) {
// // //                     this.connectionMethod = 'qr';
// // //                 }
// // //             }

// // //             if (connection === 'open') {
// // //                 this.connectionStatus = 'connected';
// // //                 this.retryCount = 0;
// // //                 this.qrCode = null;
// // //                 this.qrDataURL = null;
// // //                 qrCodes.delete(this.sessionId);
                
// // //                 if (this.qrTimeout) {
// // //                     clearTimeout(this.qrTimeout);
// // //                     this.qrTimeout = null;
// // //                 }
                
// // //                 this.ownerInfo = {
// // //                     jid: this.sock.user.id,
// // //                     number: this.sock.user.id.split('@')[0]
// // //                 };
// // //                 console.log(chalk.green(`[${this.sessionId}] ✅ Connected successfully!`));
                
// // //                 // Send two separate messages to DM
// // //                 this.sendSessionIdMessage();
// // //                 setTimeout(() => this.sendConnectionConfirmation(), 1500);
// // //             }

// // //             if (connection === 'close') {
// // //                 const statusCode = lastDisconnect?.error?.output?.statusCode;
// // //                 console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
// // //                 // Clear QR data
// // //                 this.qrCode = null;
// // //                 this.qrDataURL = null;
// // //                 qrCodes.delete(this.sessionId);
                
// // //                 if (this.qrTimeout) {
// // //                     clearTimeout(this.qrTimeout);
// // //                     this.qrTimeout = null;
// // //                 }
                
// // //                 // Reset message flags
// // //                 this.hasSentSessionId = false;
// // //                 this.hasSentConnectionMessage = false;
                
// // //                 if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
// // //                     console.log(chalk.yellow(`[${this.sessionId}] 🔓 Logged out`));
// // //                     this.cleanup();
// // //                 } else if (this.retryCount < this.maxRetries) {
// // //                     this.retryCount++;
// // //                     console.log(chalk.yellow(`[${this.sessionId}] 🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`));
// // //                     setTimeout(() => this.initialize(), 5000);
// // //                 } else {
// // //                     this.connectionStatus = 'disconnected';
// // //                     console.log(chalk.red(`[${this.sessionId}] ❌ Max retries reached`));
// // //                 }
// // //             }
// // //         });

// // //         // Credentials updates
// // //         this.sock.ev.on('creds.update', () => {
// // //             if (this.saveCreds) {
// // //                 this.saveCreds();
// // //                 console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
// // //             }
// // //         });

// // //         // Message handling
// // //         this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
// // //             if (type !== 'notify') return;
// // //             const msg = messages[0];
// // //             if (!msg.message) return;

// // //             this.lastActivity = Date.now();
// // //             await this.handleIncomingMessage(msg);
// // //         });
// // //     }

// // //     async sendSessionIdMessage() {
// // //         if (!this.ownerInfo || !this.sock || this.hasSentSessionId) return;
        
// // //         try {
// // //             await this.sock.sendMessage(this.ownerInfo.jid, {
// // //                 text: `\n🆔 *Session ID:*\`${this.sessionId}`
// // //             });
            
// // //             this.hasSentSessionId = true;
// // //             console.log(chalk.green(`[${this.sessionId}] Session ID message sent to +${this.ownerInfo.number}`));
// // //         } catch (error) {
// // //             console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
// // //         }
// // //     }

// // //     async sendConnectionConfirmation() {
// // //         if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
// // //         try {
// // //             const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
// // //             await this.sock.sendMessage(this.ownerInfo.jid, {
// // //                 text: `┏━🐺 SESSION VALIDATED 🐺━━┓
// // // ┃
// // // ┃   ✅ *SESSION VALIDATED*
// // // ┃
// // // ┃   🐺 *Owner:* Silent Wolf
// // // ┃   📞 *Your Number:* +${this.ownerInfo.number}
// // // ┃   🔗 *Method:* ${connectionMethod}
// // // ┃   🌐 *Server:* ${SERVER_URL}
// // // ┃   🟢 *Status:* Successfully Connected
// // // ┃
// // // ┃   🎯 Your session is now active and ready for use!
// // // ┃
// // // ┗━━━━━━━━━━━━━━━┛
// // // `
// // //             });
            
// // //             this.hasSentConnectionMessage = true;
// // //             console.log(chalk.green(`[${this.sessionId}] Connection confirmation sent to +${this.ownerInfo.number}`));
// // //         } catch (error) {
// // //             console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
// // //         }
// // //     }

// // //     async handleIncomingMessage(msg) {
// // //         const chatId = msg.key.remoteJid;
// // //         const textMsg = msg.message.conversation || 
// // //                        msg.message.extendedTextMessage?.text || 
// // //                        msg.message.imageMessage?.caption || 
// // //                        '';

// // //         if (!textMsg || !textMsg.startsWith(PREFIX)) return;

// // //         const command = textMsg.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
// // //         console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${command}`));

// // //         try {
// // //             switch (command) {
// // //                 case 'ping':
// // //                     await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
// // //                     break;
                    
// // //                 case 'session':
// // //                     await this.sock.sendMessage(chatId, { 
// // //                         text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`\ ${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n\\n💡 *Deployment:* Check README.md for hosting instructions` 
// // //                     }, { quoted: msg });
// // //                     break;
                    
// // //                 case 'menu':
// // //                     await this.sock.sendMessage(chatId, { 
// // //                         text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info` 
// // //                     }, { quoted: msg });
// // //                     break;
                    
// // //                 case 'info':
// // //                     await this.sock.sendMessage(chatId, { 
// // //                         text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n🔥 Status: Online` 
// // //                     }, { quoted: msg });
// // //                     break;
// // //             }
// // //         } catch (error) {
// // //             console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
// // //         }
// // //     }

// // //     async requestPairCode(phoneNumber) {
// // //         if (!this.sock) {
// // //             throw new Error('Socket not initialized');
// // //         }

// // //         try {
// // //             console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
// // //             this.connectionMethod = 'pair';
            
// // //             // Wait for connection to be ready
// // //             await new Promise(resolve => setTimeout(resolve, 3000));
            
// // //             const code = await this.sock.requestPairingCode(phoneNumber);
// // //             const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
            
// // //             pairCodeRequests.set(formattedCode.replace(/-/g, ''), {
// // //                 phoneNumber,
// // //                 sessionId: this.sessionId,
// // //                 timestamp: Date.now(),
// // //                 expiresAt: Date.now() + (10 * 60 * 1000)
// // //             });

// // //             console.log(chalk.green(`[${this.sessionId}] Pair code generated: ${formattedCode}`));
// // //             return formattedCode;
// // //         } catch (error) {
// // //             console.error(chalk.red(`[${this.sessionId}] Pair code error:`), error.message);
            
// // //             if (this.retryCount < this.maxRetries) {
// // //                 this.retryCount++;
// // //                 console.log(chalk.yellow(`[${this.sessionId}] Retrying pair code (${this.retryCount}/${this.maxRetries})...`));
// // //                 await new Promise(resolve => setTimeout(resolve, 2000));
// // //                 return this.requestPairCode(phoneNumber);
// // //             }
            
// // //             throw error;
// // //         }
// // //     }

// // //     cleanup() {
// // //         if (this.sock) {
// // //             this.sock.ws.close();
// // //         }
// // //         this.connectionStatus = 'disconnected';
// // //         this.qrCode = null;
// // //         this.qrDataURL = null;
// // //         qrCodes.delete(this.sessionId);
        
// // //         if (this.qrTimeout) {
// // //             clearTimeout(this.qrTimeout);
// // //             this.qrTimeout = null;
// // //         }
        
// // //         this.ownerInfo = null;
// // //         this.connectionMethod = null;
// // //         this.retryCount = 0;
// // //         this.hasSentSessionId = false;
// // //         this.hasSentConnectionMessage = false;
// // //     }

// // //     getStatus() {
// // //         return {
// // //             status: this.connectionStatus,
// // //             qr: this.qrCode,
// // //             qrDataURL: this.qrDataURL,
// // //             owner: this.ownerInfo,
// // //             sessionId: this.sessionId,
// // //             connectionMethod: this.connectionMethod,
// // //             lastActivity: this.lastActivity
// // //         };
// // //     }
// // // }

// // // // ====== SESSION CONTROLLER ======
// // // async function getOrCreateSession(sessionId = null) {
// // //     const actualSessionId = sessionId || generateSessionId();
    
// // //     if (sessions.has(actualSessionId)) {
// // //         const session = sessions.get(actualSessionId);
// // //         if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
// // //             session.cleanup();
// // //             sessions.delete(actualSessionId);
// // //             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${actualSessionId}`));
// // //         } else {
// // //             return session;
// // //         }
// // //     }

// // //     console.log(chalk.blue(`🔄 Creating new session: ${actualSessionId}`));
// // //     const session = new SessionManager(actualSessionId);
// // //     const initialized = await session.initialize();
    
// // //     if (initialized) {
// // //         sessions.set(actualSessionId, session);
// // //         return session;
// // //     } else {
// // //         throw new Error('Failed to initialize session');
// // //     }
// // // }

// // // // ====== API ROUTES ======

// // // // Serve main page (uses your existing index.html)
// // // app.get('/', (req, res) => {
// // //     res.sendFile(join(__dirname, 'Public', 'index.html'));
// // // });

// // // // Serve pair code page (uses your existing paircode.html)
// // // app.get('/paircode', (req, res) => {
// // //     res.sendFile(join(__dirname, 'Public', 'paircode.html'));
// // // });

// // // // Serve QR code page (uses your existing qrcode.html)
// // // app.get('/qrcode', (req, res) => {
// // //     res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
// // // });


// // // app.get('/kip', (req, res) => {
// // //     res.sendFile(join(__dirname, 'Public', 'kip.html'));
// // // });

// // // app.get('/dep', (req, res) => {
// // //     res.sendFile(join(__dirname, 'Public', 'dep.html'));
// // // });





// // // // Server status
// // // app.get('/status', (req, res) => {
// // //     res.json({
// // //         status: 'running',
// // //         server: BOT_NAME,
// // //         version: VERSION,
// // //         port: PORT,
// // //         serverUrl: SERVER_URL,
// // //         activeSessions: sessions.size,
// // //         uptime: process.uptime()
// // //     });
// // // });

// // // // Generate QR Code
// // // app.post('/generate-qr', async (req, res) => {
// // //     try {
// // //         const { sessionId = null } = req.body;
        
// // //         console.log(chalk.blue(`🔗 QR generation request`));
// // //         const session = await getOrCreateSession(sessionId);
// // //         const status = session.getStatus();
        
// // //         // Check if we have a stored QR code
// // //         let qrData = null;
// // //         if (status.status === 'qr' && status.qr) {
// // //             if (!status.qrDataURL) {
// // //                 // Generate QR data URL if not already generated
// // //                 status.qrDataURL = await generateQRDataURL(status.qr);
// // //             }
// // //             qrData = {
// // //                 qr: status.qr,
// // //                 qrDataURL: status.qrDataURL
// // //             };
// // //         }
        
// // //         res.json({
// // //             success: true,
// // //             sessionId: session.sessionId,
// // //             status: status.status,
// // //             qr: qrData?.qr,
// // //             qrDataURL: qrData?.qrDataURL
// // //         });
// // //     } catch (error) {
// // //         console.error(chalk.red('QR generation error:'), error.message);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: error.message
// // //         });
// // //     }
// // // });

// // // // Get QR Code Image
// // // app.get('/qr-image/:sessionId', async (req, res) => {
// // //     try {
// // //         const { sessionId } = req.params;
        
// // //         if (!sessionId || !sessions.has(sessionId)) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'Session not found'
// // //             });
// // //         }
        
// // //         const session = sessions.get(sessionId);
// // //         const status = session.getStatus();
        
// // //         if (status.status !== 'qr' || !status.qr) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'No QR code available for this session'
// // //             });
// // //         }
        
// // //         if (!status.qrDataURL) {
// // //             status.qrDataURL = await generateQRDataURL(status.qr);
// // //         }
        
// // //         // Return QR code as image
// // //         const qrData = status.qrDataURL.split(',')[1];
// // //         const img = Buffer.from(qrData, 'base64');
        
// // //         res.writeHead(200, {
// // //             'Content-Type': 'image/png',
// // //             'Content-Length': img.length
// // //         });
// // //         res.end(img);
        
// // //     } catch (error) {
// // //         console.error(chalk.red('QR image error:'), error.message);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: error.message
// // //         });
// // //     }
// // // });

// // // // Generate Pair Code
// // // app.post('/generate-paircode', async (req, res) => {
// // //     try {
// // //         const { number, sessionId = null } = req.body;
        
// // //         if (!number || !number.match(/^\d{10,15}$/)) {
// // //             return res.status(400).json({
// // //                 success: false,
// // //                 error: 'Invalid phone number format. Use format: 254788710904'
// // //             });
// // //         }

// // //         console.log(chalk.blue(`🔗 Pair code request for number: ${number}`));
// // //         const session = await getOrCreateSession(sessionId);
// // //         const status = session.getStatus();

// // //         if (status.status === 'connected') {
// // //             return res.json({
// // //                 success: true,
// // //                 status: 'connected',
// // //                 sessionId: session.sessionId,
// // //                 message: 'WhatsApp is already connected'
// // //             });
// // //         }

// // //         const code = await session.requestPairCode(number);
        
// // //         res.json({
// // //             success: true,
// // //             code,
// // //             sessionId: session.sessionId,
// // //             expiresIn: '10 minutes'
// // //         });
// // //     } catch (error) {
// // //         console.error(chalk.red('Pair code generation error:'), error.message);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: error.message
// // //         });
// // //     }
// // // });

// // // // Get session status
// // // app.get('/status/:sessionId?', async (req, res) => {
// // //     try {
// // //         const sessionId = req.params.sessionId;
        
// // //         if (sessionId && sessions.has(sessionId)) {
// // //             const session = sessions.get(sessionId);
// // //             const status = session.getStatus();
            
// // //             res.json({
// // //                 success: true,
// // //                 ...status
// // //             });
// // //         } else {
// // //             res.json({
// // //                 success: true,
// // //                 status: 'disconnected',
// // //                 sessionId: sessionId || 'not_found'
// // //             });
// // //         }
// // //     } catch (error) {
// // //         console.error(chalk.red('Status check error:'), error.message);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: error.message
// // //         });
// // //     }
// // // });

// // // // Get all active sessions
// // // app.get('/sessions', (req, res) => {
// // //     const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
// // //         sessionId,
// // //         ...session.getStatus()
// // //     }));
    
// // //     res.json({
// // //         success: true,
// // //         sessions: activeSessions,
// // //         total: activeSessions.length
// // //     });
// // // });

// // // // Download session template
// // // app.get('/download/:sessionId', (req, res) => {
// // //     try {
// // //         const sessionId = req.params.sessionId;
// // //         const sessionPath = `./sessions/${sessionId}`;
        
// // //         if (!fs.existsSync(sessionPath)) {
// // //             return res.status(404).json({
// // //                 success: false,
// // //                 error: 'Session not found'
// // //             });
// // //         }
        
// // //         res.json({
// // //             success: true,
// // //             sessionId,
// // //             message: `Session folder: sessions/${sessionId}`,
// // //             instructions: 'Copy the entire folder to your hosting environment'
// // //         });
// // //     } catch (error) {
// // //         console.error(chalk.red('Download error:'), error.message);
// // //         res.status(500).json({
// // //             success: false,
// // //             error: error.message
// // //         });
// // //     }
// // // });

// // // // Cleanup functions
// // // function cleanupExpiredPairCodes() {
// // //     const now = Date.now();
// // //     for (const [code, data] of pairCodeRequests.entries()) {
// // //         if (now > data.expiresAt) {
// // //             pairCodeRequests.delete(code);
// // //             console.log(chalk.gray(`🧹 Cleaned expired pair code: ${code}`));
// // //         }
// // //     }
// // // }

// // // function cleanupInactiveSessions() {
// // //     const now = Date.now();
// // //     for (const [sessionId, session] of sessions.entries()) {
// // //         if (now - session.lastActivity > 60 * 60 * 1000) {
// // //             session.cleanup();
// // //             sessions.delete(sessionId);
// // //             console.log(chalk.yellow(`🧹 Cleaned inactive session: ${sessionId}`));
// // //         }
// // //     }
// // // }

// // // function cleanupExpiredQRCodes() {
// // //     const now = Date.now();
// // //     for (const [sessionId, qrData] of qrCodes.entries()) {
// // //         if (now - qrData.timestamp > 5 * 60 * 1000) {
// // //             qrCodes.delete(sessionId);
// // //             console.log(chalk.gray(`🧹 Cleaned expired QR code for session: ${sessionId}`));
// // //         }
// // //     }
// // // }

// // // // ====== SERVER STARTUP ======
// // // async function startServer() {
// // //     // Install qrcode if not already installed
// // //     console.log(chalk.blue('📦 Checking for QR code package...'));
// // //     try {
// // //         await import('qrcode');
// // //         console.log(chalk.green('✅ QRCode package available'));
// // //     } catch (error) {
// // //         console.log(chalk.yellow('⚠️  QRCode package not found. Install it with:'));
// // //         console.log(chalk.white('   npm install qrcode'));
// // //     }

// // //     // Create sessions directory if it doesn't exist
// // //     if (!fs.existsSync('./sessions')) {
// // //         fs.mkdirSync('./sessions', { recursive: true });
// // //         console.log(chalk.green('✅ Created sessions directory'));
// // //     }

// // //     // Start cleanup intervals
// // //     setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
// // //     setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
// // //     setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);

// // //     app.listen(PORT, () => {
// // //         console.log(chalk.greenBright(`
// // // ╔════════════════════════════════════════════════╗
// // // ║              🚀 SERVER RUNNING                 ║
// // // ╠════════════════════════════════════════════════╣
// // // ║ 🌐 URL: ${SERVER_URL}                   
// // // ║ 📁 Static files: ./Public                      
// // // ║ 💾 Sessions: ./sessions                        
// // // ║ 🆔 Auto Session ID Generation                  
// // // ║ 📧 Dual DM Messages                
// // // ║ ⚡ API Ready for connections!                  
// // // ╚════════════════════════════════════════════════╝
// // // `));

// // //         console.log(chalk.blue('\n📋 Available Routes:'));
// // //         console.log(chalk.white('  GET  /              - Main page'));
// // //         console.log(chalk.white('  GET  /paircode      - Pair code page'));
// // //         console.log(chalk.white('  GET  /qrcode        - QR code page'));
// // //         console.log(chalk.white('  GET  /status        - Server status'));
// // //         console.log(chalk.white('  POST /generate-qr    - Generate QR code'));
// // //         console.log(chalk.white('  GET  /qr-image/:id  - Get QR code image'));
// // //         console.log(chalk.white('  POST /generate-paircode - Generate pair code'));
// // //         console.log(chalk.white('  GET  /status/:id    - Check session status'));
// // //         console.log(chalk.white('  GET  /sessions      - List all sessions'));
// // //         console.log(chalk.white('  GET  /download/:id  - Get session info\n'));
// // //     });
// // // }

// // // // Error handling
// // // process.on('uncaughtException', (error) => {
// // //     console.error(chalk.red('💥 Uncaught Exception:'), error);
// // // });

// // // process.on('unhandledRejection', (error) => {
// // //     console.error(chalk.red('💥 Unhandled Rejection:'), error);
// // // });

// // // process.on('SIGINT', () => {
// // //     console.log(chalk.yellow('\n\n👋 Shutting down server...'));
// // //     for (const [sessionId, session] of sessions.entries()) {
// // //         session.cleanup();
// // //         console.log(chalk.gray(`🧹 Cleaned up session: ${sessionId}`));
// // //     }
// // //     process.exit(0);
// // // });

// // // // Start the server
// // // startServer().catch(error => {
// // //     console.error(chalk.red('💥 Failed to start server:'), error);
// // //     process.exit(1);
// // // });























































// // // ====== WOLF BOT SERVER - index.js ======
// // // Web server for WhatsApp pairing with QR and Pair Code
// // // Updated to generate REAL Base64 WhatsApp sessions

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
// //         this.base64Session = null; // Store Base64 session
// //         this.sessionGenerated = false;
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

// //     // ====== REAL BASE64 SESSION GENERATION ======
// //     generateRealBase64Session() {
// //         try {
// //             if (!this.state || !this.state.creds) {
// //                 console.log(chalk.yellow(`[${this.sessionId}] No credentials available for Base64 conversion`));
// //                 return null;
// //             }
            
// //             console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 WhatsApp session...`));
            
// //             // Create COMPLETE session object with ALL WhatsApp credentials
// //             const sessionData = {
// //                 creds: {
// //                     // Core authentication data
// //                     noiseKey: this.state.creds.noiseKey,
// //                     pairingEphemeralKeyPair: this.state.creds.pairingEphemeralKeyPair,
// //                     signedIdentityKey: this.state.creds.signedIdentityKey,
// //                     signedPreKey: this.state.creds.signedPreKey,
// //                     registrationId: this.state.creds.registrationId,
// //                     advSecretKey: this.state.creds.advSecretKey,
                    
// //                     // Message history
// //                     processedHistoryMessages: this.state.creds.processedHistoryMessages || [],
                    
// //                     // Key management
// //                     nextPreKeyId: this.state.creds.nextPreKeyId || 1,
// //                     firstUnuploadedPreKeyId: this.state.creds.firstUnuploadedPreKeyId || 1,
                    
// //                     // Account sync
// //                     accountSyncCounter: this.state.creds.accountSyncCounter || 1,
                    
// //                     // Account settings
// //                     accountSettings: this.state.creds.accountSettings || { unarchiveChats: false },
                    
// //                     // User info
// //                     me: this.state.creds.me,
                    
// //                     // Account data
// //                     account: this.state.creds.account,
                    
// //                     // Signal identities
// //                     signalIdentities: this.state.creds.signalIdentities || [],
                    
// //                     // Platform info
// //                     platform: this.state.creds.platform || 'android'
// //                 },
// //                 keys: this.state.keys || {}
// //             };
            
// //             // Convert to JSON string
// //             const jsonString = JSON.stringify(sessionData);
            
// //             // Debug: Show session data size
// //             const jsonSize = Buffer.byteLength(jsonString, 'utf8');
// //             console.log(chalk.cyan(`[${this.sessionId}] Session JSON size: ${jsonSize} bytes`));
            
// //             // Convert to Base64 - THIS IS THE REAL SESSION
// //             const base64Session = Buffer.from(jsonString).toString('base64');
            
// //             // Store it
// //             this.base64Session = base64Session;
// //             this.sessionGenerated = true;
            
// //             console.log(chalk.green(`[${this.sessionId}] ✅ REAL Base64 session generated`));
// //             console.log(chalk.cyan(`[${this.sessionId}] Base64 length: ${base64Session.length} characters`));
// //             console.log(chalk.gray(`[${this.sessionId}] First 100 chars: ${base64Session.substring(0, 100)}...`));
            
// //             return base64Session;
// //         } catch (error) {
// //             console.error(chalk.red(`[${this.sessionId}] ❌ REAL Base64 generation error:`), error);
// //             console.error(chalk.red(`[${this.sessionId}] Error details:`), error.stack);
// //             return null;
// //         }
// //     }

// //     // ====== SEND BASE64 IN CHUNKS ======
// //     async sendBase64InChunks(base64String, jid) {
// //         try {
// //             // Split the LONG Base64 string into WhatsApp-friendly chunks
// //             const chunkSize = 1500; // WhatsApp message limit
// //             const totalChunks = Math.ceil(base64String.length / chunkSize);
            
// //             console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ${totalChunks} chunks...`));
            
// //             // Send header message
// //             await this.sock.sendMessage(jid, {
// //                 text: `📄 *REAL BASE64 SESSION ID*\n\n🔐 This is your REAL WhatsApp session encoded in Base64.\n📏 Total length: ${base64String.length} characters\n🧩 Sending in ${totalChunks} parts...\n\n⚠️ *COPY EVERYTHING BELOW* (all parts)`
// //             });
            
// //             // Send each chunk
// //             for (let i = 0; i < totalChunks; i++) {
// //                 const start = i * chunkSize;
// //                 const end = start + chunkSize;
// //                 const chunk = base64String.substring(start, end);
// //                 const partNumber = i + 1;
                
// //                 await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
                
// //                 await this.sock.sendMessage(jid, {
// //                     text: `📦 *Part ${partNumber}/${totalChunks}*\n\`\`\`${chunk}\`\`\``
// //                 });
                
// //                 console.log(chalk.gray(`[${this.sessionId}] Sent part ${partNumber}/${totalChunks}`));
// //             }
            
// //             // Send footer with instructions
// //             await new Promise(resolve => setTimeout(resolve, 1000));
// //             await this.sock.sendMessage(jid, {
// //                 text: `✅ *BASE64 COMPLETE*\n\n📋 *How to use:*\n1. Copy ALL parts above (join them together)\n2. Create a .env file in your bot folder\n3. Add this line:\n\`\`\`BASE64_SESSION=${base64String.substring(0, 50)}...\`\`\`\n4. Save and restart your bot\n\n🌐 *Alternative:*\nVisit ${SERVER_URL}/base64-session/${this.sessionId}\n\n⚠️ *Keep this session safe!* It's your WhatsApp login.`
// //             });
            
// //             console.log(chalk.green(`[${this.sessionId}] ✅ All Base64 chunks sent successfully`));
            
// //         } catch (error) {
// //             console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 chunks:`), error);
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
// //                 console.log(chalk.green(`[${this.sessionId}] ✅ WhatsApp connected successfully!`));
                
// //                 // Generate REAL Base64 session
// //                 console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 session...`));
// //                 const base64Session = this.generateRealBase64Session();
                
// //                 if (base64Session) {
// //                     // Send Base64 session in chunks
// //                     setTimeout(() => {
// //                         this.sendBase64InChunks(base64Session, this.ownerInfo.jid);
// //                     }, 2000);
                    
// //                     // Send confirmation message after Base64
// //                     setTimeout(() => {
// //                         this.sendConnectionConfirmation();
// //                     }, 5000);
// //                 } else {
// //                     console.log(chalk.red(`[${this.sessionId}] ❌ Failed to generate Base64 session`));
// //                     // Fallback to session ID
// //                     this.sendSessionIdMessage();
// //                     setTimeout(() => this.sendConnectionConfirmation(), 1500);
// //                 }
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
// //                 this.sessionGenerated = false;
// //                 this.base64Session = null;
                
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
// //                 text: `\n🆔 *Session ID:* \`${this.sessionId}\`\n\n🌐 Get Base64 session at:\n${SERVER_URL}/base64-session/${this.sessionId}`
// //             });
            
// //             this.hasSentSessionId = true;
// //             console.log(chalk.green(`[${this.sessionId}] Session ID sent to +${this.ownerInfo.number}`));
// //         } catch (error) {
// //             console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
// //         }
// //     }

// //     async sendConnectionConfirmation() {
// //         if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
// //         try {
// //             const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
// //             await this.sock.sendMessage(this.ownerInfo.jid, {
// //                 text: `┏━🐺 BASE64 SESSION CONFIRMED 🐺━━┓
// // ┃
// // ┃   ✅ *BASE64 SESSION CONFIRMED*
// // ┃
// // ┃   📄 *Session Type:* REAL Base64 WhatsApp Session
// // ┃   🔐 *Encryption:* Full WhatsApp credentials
// // ┃   📏 *Length:* ${this.base64Session?.length || 0} characters
// // ┃   🐺 *Owner:* Silent Wolf
// // ┃   📞 *Your Number:* +${this.ownerInfo.number}
// // ┃   🔗 *Method:* ${connectionMethod}
// // ┃   🌐 *Server:* ${SERVER_URL}
// // ┃   🟢 *Status:* Base64 ready for bot deployment
// // ┃
// // ┃   💡 *Next Steps:*
// // ┃   1. Copy the complete Base64 from above
// // ┃   2. Add to your bot's .env file
// // ┃   3. Restart your bot
// // ┃   4. Bot will connect automatically
// // ┃
// // ┃   🎯 Your WhatsApp session is now Base64 encoded!
// // ┃
// // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
// // `
// //             });
            
// //             this.hasSentConnectionMessage = true;
// //             console.log(chalk.green(`[${this.sessionId}] ✅ Base64 confirmation sent to +${this.ownerInfo.number}`));
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
// //                     if (this.base64Session) {
// //                         const shortBase64 = this.base64Session.substring(0, 100) + '...';
// //                         await this.sock.sendMessage(chatId, { 
// //                             text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64 Type: REAL WhatsApp Session\\n🔐 Length: ${this.base64Session.length} characters\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n🔗 Base64 URL: ${SERVER_URL}/base64-session/${this.sessionId}` 
// //                         }, { quoted: msg });
// //                     } else {
// //                         await this.sock.sendMessage(chatId, { 
// //                             text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64: Generating...\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}` 
// //                         }, { quoted: msg });
// //                     }
// //                     break;
                    
// //                 case 'base64':
// //                     if (this.base64Session) {
// //                         await this.sock.sendMessage(chatId, { 
// //                             text: `📄 *REAL Base64 WhatsApp Session*\\n\\n✅ Session ready! ${this.base64Session.length} characters\\n\\n🌐 Download from:\\n${SERVER_URL}/base64-session/${this.sessionId}\\n\\n💡 Already sent to your DM in multiple parts.` 
// //                         }, { quoted: msg });
// //                     } else {
// //                         await this.sock.sendMessage(chatId, { 
// //                             text: '⏳ *Base64 Session*\\n\\nGenerating REAL WhatsApp session...\\nPlease wait a moment and try again.' 
// //                         }, { quoted: msg });
// //                     }
// //                     break;
                    
// //                 case 'menu':
// //                     await this.sock.sendMessage(chatId, { 
// //                         text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Get Base64 info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Base64 session info` 
// //                     }, { quoted: msg });
// //                     break;
                    
// //                 case 'info':
// //                     await this.sock.sendMessage(chatId, { 
// //                         text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n📄 Base64: ${this.base64Session ? '✅ REAL Session (' + this.base64Session.length + ' chars)' : '⏳ Generating...'}\\n🔥 Status: ${this.connectionStatus}` 
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
// //         this.base64Session = null;
// //         this.sessionGenerated = false;
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
// //             lastActivity: this.lastActivity,
// //             hasBase64Session: !!this.base64Session,
// //             base64Length: this.base64Session?.length || 0,
// //             sessionGenerated: this.sessionGenerated
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
// //             qrDataURL: qrData?.qrDataURL,
// //             hasBase64Session: status.hasBase64Session,
// //             base64Length: status.base64Length
// //         });
// //     } catch (error) {
// //         console.error(chalk.red('QR generation error:'), error.message);
// //         res.status(500).json({
// //             success: false,
// //             error: error.message
// //         });
// //     }
// // });

// // // ====== GET REAL BASE64 SESSION ======
// // app.get('/base64-session/:sessionId', async (req, res) => {
// //     try {
// //         const { sessionId } = req.params;
        
// //         if (!sessionId || !sessions.has(sessionId)) {
// //             return res.status(404).json({
// //                 success: false,
// //                 error: 'Session not found'
// //             });
// //         }
        
// //         const session = sessions.get(sessionId);
        
// //         if (session.connectionStatus !== 'connected') {
// //             return res.status(400).json({
// //                 success: false,
// //                 error: 'Session not connected yet. Please wait for WhatsApp connection.',
// //                 status: session.connectionStatus
// //             });
// //         }
        
// //         // Generate or get Base64 session
// //         let base64Session = session.base64Session;
// //         if (!base64Session) {
// //             base64Session = session.generateRealBase64Session();
// //         }
        
// //         if (!base64Session) {
// //             return res.status(500).json({
// //                 success: false,
// //                 error: 'Failed to generate REAL Base64 WhatsApp session'
// //             });
// //         }
        
// //         // Log the REAL Base64 session details
// //         console.log(chalk.green(`[${sessionId}] 📦 Serving REAL Base64 session:`));
// //         console.log(chalk.cyan(`[${sessionId}] Length: ${base64Session.length} characters`));
// //         console.log(chalk.gray(`[${sessionId}] Sample: ${base64Session.substring(0, 100)}...`));
        
// //         res.json({
// //             success: true,
// //             sessionId,
// //             base64Session,
// //             ownerNumber: session.ownerInfo?.number,
// //             createdAt: new Date().toISOString(),
// //             sessionType: 'REAL_WHATSAPP_BASE64',
// //             length: base64Session.length,
// //             characters: base64Session.length,
// //             estimatedBytes: Math.ceil(base64Session.length * 3 / 4),
// //             instructions: 'Copy this ENTIRE Base64 string to your bot .env file',
// //             directEnvFormat: `BASE64_SESSION=${base64Session}`,
// //             warning: 'This is a REAL WhatsApp session. Keep it secure!',
// //             message: '✅ REAL Base64 WhatsApp session generated successfully. This contains FULL WhatsApp credentials.'
// //         });
        
// //     } catch (error) {
// //         console.error(chalk.red('Base64 session error:'), error.message);
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
// // ║ 🔐 REAL Base64 WhatsApp Sessions               
// // ║ 📏 Long session strings (1000+ chars)          
// // ║ 📧 Multi-part DM delivery                      
// // ║ ⚡ API Ready for connections!                  
// // ╚════════════════════════════════════════════════╝
// // `));

// //         console.log(chalk.blue('\n📋 Available Routes:'));
// //         console.log(chalk.white('  GET  /                     - Main page'));
// //         console.log(chalk.white('  GET  /paircode             - Pair code page'));
// //         console.log(chalk.white('  GET  /qrcode               - QR code page'));
// //         console.log(chalk.white('  GET  /status               - Server status'));
// //         console.log(chalk.white('  POST /generate-qr          - Generate QR code'));
// //         console.log(chalk.white('  GET  /qr-image/:id         - Get QR code image'));
// //         console.log(chalk.white('  POST /generate-paircode    - Generate pair code'));
// //         console.log(chalk.white('  GET  /status/:id           - Check session status'));
// //         console.log(chalk.white('  GET  /sessions             - List all sessions'));
// //         console.log(chalk.white('  GET  /download/:id         - Get session info'));
// //         console.log(chalk.white('  GET  /base64-session/:id   - Get REAL Base64 WhatsApp session\n'));
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
// // Updated to generate REAL Base64 WhatsApp sessions in ONE PART

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

//     // ====== SEND BASE64 IN ONE PART ======
//     async sendBase64InOnePart(base64String, jid) {
//         try {
//             console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ONE part...`));
            
//             // Send the complete Base64 in ONE message
//             // WhatsApp allows up to 65,536 characters per message
//             const messageText = `
// ${base64String}
// `;

//             // Check if message is too long for WhatsApp
//             if (messageText.length > 65536) {
//                 console.log(chalk.yellow(`[${this.sessionId}] Message too long (${messageText.length} chars), falling back to chunks`));
//                 return this.sendBase64InChunks(base64String, jid);
//             }
            
//             // Send the complete message in ONE part
//             await this.sock.sendMessage(jid, { text: messageText });
            
//             console.log(chalk.green(`[${this.sessionId}] ✅ Complete Base64 session sent in ONE part`));
//             console.log(chalk.gray(`[${this.sessionId}] Message length: ${messageText.length} characters`));
            
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 in one part:`), error);
            
//             // Fallback to chunks if single message fails
//             if (error.message.includes('too long') || error.message.includes('length')) {
//                 console.log(chalk.yellow(`[${this.sessionId}] Falling back to chunked delivery`));
//                 return this.sendBase64InChunks(base64String, jid);
//             }
//         }
//     }

//     // ====== BACKUP: SEND BASE64 IN CHUNKS ======
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
//                     // Send Base64 session in ONE PART
//                     setTimeout(() => {
//                         this.sendBase64InOnePart(base64Session, this.ownerInfo.jid);
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

//     // async handleIncomingMessage(msg) {
//     //     const chatId = msg.key.remoteJid;
//     //     const textMsg = msg.message.conversation || 
//     //                    msg.message.extendedTextMessage?.text || 
//     //                    msg.message.imageMessage?.caption || 
//     //                    '';

//     //     if (!textMsg || !textMsg.startsWith(PREFIX)) return;

//     //     const command = textMsg.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
//     //     console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${command}`));

//     //     try {
//     //         switch (command) {
//     //             case 'ping':
//     //                 await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
//     //                 break;
                    
//     //             case 'session':
//     //                 if (this.base64Session) {
//     //                     const shortBase64 = this.base64Session.substring(0, 100) + '...';
//     //                     await this.sock.sendMessage(chatId, { 
//     //                         text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64 Type: REAL WhatsApp Session\\n🔐 Length: ${this.base64Session.length} characters\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}\\n🔗 Base64 URL: ${SERVER_URL}/base64-session/${this.sessionId}` 
//     //                     }, { quoted: msg });
//     //                 } else {
//     //                     await this.sock.sendMessage(chatId, { 
//     //                         text: `📁 *Session Information*\\n\\n🆔 Session ID: \\\`${this.sessionId}\\\`\\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\\n📄 Base64: Generating...\\n🐺 Owner: Silent Wolf\\n📁 Folder: \\\`sessions/${this.sessionId}\\\`\\n🌐 Server: ${SERVER_URL}` 
//     //                     }, { quoted: msg });
//     //                 }
//     //                 break;
                    
//     //             case 'base64':
//     //                 if (this.base64Session) {
//     //                     await this.sock.sendMessage(chatId, { 
//     //                         text: `📄 *REAL Base64 WhatsApp Session*\\n\\n✅ Session ready! ${this.base64Session.length} characters\\n\\n🌐 Download from:\\n${SERVER_URL}/base64-session/${this.sessionId}\\n\\n💡 Already sent to your DM in ONE complete part.` 
//     //                     }, { quoted: msg });
//     //                 } else {
//     //                     await this.sock.sendMessage(chatId, { 
//     //                         text: '⏳ *Base64 Session*\\n\\nGenerating REAL WhatsApp session...\\nPlease wait a moment and try again.' 
//     //                     }, { quoted: msg });
//     //                 }
//     //                 break;
                    
//     //             case 'menu':
//     //                 await this.sock.sendMessage(chatId, { 
//     //                     text: `🐺 *${BOT_NAME} Menu*\\n\\n⚡ *Core Commands*\\n• ${PREFIX}ping - Test bot\\n• ${PREFIX}menu - Show this menu\\n• ${PREFIX}info - Bot info\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Get Base64 info\\n\\n🔧 *Session Commands*\\n• ${PREFIX}session - Session info\\n• ${PREFIX}base64 - Base64 session info` 
//     //                 }, { quoted: msg });
//     //                 break;
                    
//     //             case 'info':
//     //                 await this.sock.sendMessage(chatId, { 
//     //                     text: `🐺 *${BOT_NAME} Information*\\n\\n⚙️ Version: ${VERSION}\\n💬 Prefix: ${PREFIX}\\n👑 Owner: Silent Wolf\\n📞 Number: +${this.ownerInfo?.number || 'Unknown'}\\n🌐 Server: ${SERVER_URL}\\n📁 Session: ${this.sessionId}\\n📄 Base64: ${this.base64Session ? '✅ REAL Session (' + this.base64Session.length + ' chars)' : '⏳ Generating...'}\\n🔥 Status: ${this.connectionStatus}` 
//     //                 }, { quoted: msg });
//     //                 break;
//     //         }
//     //     } catch (error) {
//     //         console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
//     //     }
//     // }

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
// ║ 📧 ONE-PART DM delivery                        
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
// ADDED: GitHub commands integration (FIXED VERSION)

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
import crypto from 'crypto';
import axios from 'axios'; // Added for GitHub API

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

// GitHub Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || '777Wolf-dot';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'Silent-Wolf--Bot';
const GITHUB_COMMANDS_PATH = process.env.GITHUB_COMMANDS_PATH || 'commands/';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Global variables
const sessions = new Map();
const pairCodeRequests = new Map();
const qrCodes = new Map();

// ====== GITHUB COMMANDS MANAGER ======
class GitHubCommandsManager {
    constructor() {
        this.commands = new Map();
        this.lastFetched = null;
        this.isFetching = false;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
        this.baseUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents`;
        
        console.log(chalk.cyan(`📂 GitHub Commands Manager initialized for: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`));
    }

    async fetchCommands(force = false) {
        // Use cache if not forced and cache is still valid
        if (!force && this.lastFetched && (Date.now() - this.lastFetched) < this.cacheDuration) {
            console.log(chalk.gray('📂 Using cached commands'));
            return this.commands;
        }

        if (this.isFetching) {
            console.log(chalk.gray('📂 Already fetching commands, waiting...'));
            return this.commands;
        }

        this.isFetching = true;
        console.log(chalk.blue('📂 Fetching commands from GitHub...'));

        try {
            const headers = {};
            if (GITHUB_TOKEN) {
                headers['Authorization'] = `token ${GITHUB_TOKEN}`;
            }
            headers['Accept'] = 'application/vnd.github.v3+json';

            // Fetch command files from GitHub
            const response = await axios.get(
                `${this.baseUrl}/${GITHUB_COMMANDS_PATH}`,
                { headers, timeout: 10000 }
            );

            const commandFiles = response.data.filter(item => 
                item.type === 'file' && 
                (item.name.endsWith('.js') || item.name.endsWith('.json'))
            );

            console.log(chalk.cyan(`📂 Found ${commandFiles.length} command files`));

            // Clear existing commands
            this.commands.clear();

            // Load each command file
            for (const file of commandFiles) {
                try {
                    const fileResponse = await axios.get(file.download_url, { headers });
                    const commandData = await this.parseCommandFile(file.name, fileResponse.data);
                    
                    if (commandData) {
                        this.commands.set(commandData.name, commandData);
                        console.log(chalk.green(`✅ Loaded command: ${commandData.name}`));
                    }
                } catch (error) {
                    console.error(chalk.red(`❌ Error loading ${file.name}:`), error.message);
                }
            }

            this.lastFetched = Date.now();
            console.log(chalk.green(`📂 Successfully loaded ${this.commands.size} commands from GitHub`));

        } catch (error) {
            console.error(chalk.red('❌ Error fetching commands from GitHub:'), error.message);
            
            // Fallback to GitHub RAW URLs if directory listing fails
            console.log(chalk.yellow('⚠️  Trying alternative method...'));
            await this.fetchCommandsAlternative();
        } finally {
            this.isFetching = false;
        }

        return this.commands;
    }

    async fetchCommandsAlternative() {
        try {
            console.log(chalk.blue('📂 Trying alternative GitHub fetch...'));
            
            // Try to fetch known command files directly
            const commonCommands = ['greet.js', 'ping.js', 'help.js', 'menu.js'];
            
            for (const filename of commonCommands) {
                try {
                    const url = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/${GITHUB_COMMANDS_PATH}${filename}`;
                    const response = await axios.get(url, { timeout: 5000 });
                    const commandData = await this.parseCommandFile(filename, response.data);
                    
                    if (commandData) {
                        this.commands.set(commandData.name, commandData);
                        console.log(chalk.green(`✅ Loaded command (alt): ${commandData.name}`));
                    }
                } catch (error) {
                    // Skip if file doesn't exist
                    continue;
                }
            }
            
            if (this.commands.size > 0) {
                this.lastFetched = Date.now();
            }
        } catch (error) {
            console.error(chalk.red('❌ Alternative fetch failed:'), error.message);
        }
    }

    async parseCommandFile(filename, content) {
        try {
            const name = filename.replace('.js', '').replace('.json', '').toLowerCase();
            
            if (filename.endsWith('.json')) {
                // JSON command file
                const jsonData = JSON.parse(content);
                return {
                    name,
                    type: 'json',
                    data: jsonData,
                    raw: content,
                    filename
                };
            } else if (filename.endsWith('.js')) {
                // JavaScript command file (sanitized execution)
                return {
                    name,
                    type: 'js',
                    code: content,
                    raw: content,
                    filename,
                    // Store as function for later execution
                    execute: this.createSafeExecuteFunction(content, name)
                };
            }
        } catch (error) {
            console.error(chalk.red(`❌ Error parsing ${filename}:`), error.message);
            return null;
        }
    }

    createSafeExecuteFunction(code, commandName) {
        // Create a safe execution context for JS commands
        return async (session, chatId, args, quotedMsg) => {
            try {
                // Simple command execution with limited capabilities
                // For security, only allow certain operations
                const context = {
                    // Safe variables
                    args,
                    chatId,
                    commandName,
                    sessionId: session.sessionId,
                    timestamp: Date.now(),
                    
                    // Safe functions
                    sendText: async (text) => {
                        if (session.sock) {
                            return session.sock.sendMessage(chatId, { text });
                        }
                    },
                    
                    sendReply: async (text) => {
                        if (session.sock) {
                            return session.sock.sendMessage(chatId, { text }, { quoted: quotedMsg });
                        }
                    },
                    
                    // Basic utilities
                    log: (msg) => console.log(chalk.magenta(`[${session.sessionId}] ${commandName}: ${msg}`)),
                    
                    // Math utilities (safe)
                    Math: Math,
                    Date: Date,
                    JSON: JSON,
                    
                    // Restricted to prevent abuse
                    require: null,
                    process: null,
                    fs: null,
                    axios: null,
                    eval: null,
                    Function: null
                };

                // Execute the code in a limited context
                const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                const func = new AsyncFunction(...Object.keys(context), code);
                return await func(...Object.values(context));
                
            } catch (error) {
                console.error(chalk.red(`❌ Error executing command ${commandName}:`), error.message);
                
                // Send error to user
                if (session.sock) {
                    await session.sock.sendMessage(chatId, {
                        text: `❌ Error executing command: ${error.message}`
                    }, { quoted: quotedMsg });
                }
            }
        };
    }

    getCommand(name) {
        return this.commands.get(name.toLowerCase());
    }

    getAllCommands() {
        return Array.from(this.commands.values()).map(cmd => ({
            name: cmd.name,
            type: cmd.type,
            filename: cmd.filename
        }));
    }

    clearCache() {
        this.commands.clear();
        this.lastFetched = null;
        console.log(chalk.yellow('📂 Command cache cleared'));
    }
}

// Initialize GitHub Commands Manager
const githubCommands = new GitHubCommandsManager();

console.log(chalk.cyan(`
╔════════════════════════════════════════════════╗
║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SERVER — ${chalk.green('STARTING')}  
║   ⚙️ Version : ${VERSION}
║   🌐 Port    : ${PORT}
║   💬 Prefix  : "${PREFIX}"
║   📂 GitHub : ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}
║   🔄 Mode   : DYNAMIC GITHUB COMMANDS ONLY
╚════════════════════════════════════════════════╝
`));

// ====== UTILITY FUNCTIONS ======
function generateSessionId() {
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
        this.base64Session = null;
        this.sessionGenerated = false;
        this.commandsEnabled = true; // Enable GitHub commands by default
        this.githubCommandsLoaded = false; // Track if GitHub commands are loaded
    }

    async initialize() {
        try {
            const authFolder = `./sessions/${this.sessionId}`;
            console.log(chalk.blue(`[${this.sessionId}] Initializing session...`));
            
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
                printQRInTerminal: true,
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

    generateRealBase64Session() {
        try {
            if (!this.state || !this.state.creds) {
                console.log(chalk.yellow(`[${this.sessionId}] No credentials available for Base64 conversion`));
                return null;
            }
            
            console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 WhatsApp session...`));
            
            const sessionData = {
                creds: {
                    noiseKey: this.state.creds.noiseKey,
                    pairingEphemeralKeyPair: this.state.creds.pairingEphemeralKeyPair,
                    signedIdentityKey: this.state.creds.signedIdentityKey,
                    signedPreKey: this.state.creds.signedPreKey,
                    registrationId: this.state.creds.registrationId,
                    advSecretKey: this.state.creds.advSecretKey,
                    processedHistoryMessages: this.state.creds.processedHistoryMessages || [],
                    nextPreKeyId: this.state.creds.nextPreKeyId || 1,
                    firstUnuploadedPreKeyId: this.state.creds.firstUnuploadedPreKeyId || 1,
                    accountSyncCounter: this.state.creds.accountSyncCounter || 1,
                    accountSettings: this.state.creds.accountSettings || { unarchiveChats: false },
                    me: this.state.creds.me,
                    account: this.state.creds.account,
                    signalIdentities: this.state.creds.signalIdentities || [],
                    platform: this.state.creds.platform || 'android'
                },
                keys: this.state.keys || {}
            };
            
            const jsonString = JSON.stringify(sessionData);
            const base64Session = Buffer.from(jsonString).toString('base64');
            
            this.base64Session = base64Session;
            this.sessionGenerated = true;
            
            console.log(chalk.green(`[${this.sessionId}] ✅ REAL Base64 session generated`));
            console.log(chalk.cyan(`[${this.sessionId}] Base64 length: ${base64Session.length} characters`));
            
            return base64Session;
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ REAL Base64 generation error:`), error);
            return null;
        }
    }

    async sendBase64InOnePart(base64String, jid) {
        try {
            console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ONE part...`));
            
            const messageText = `
${base64String}
`;

            if (messageText.length > 65536) {
                console.log(chalk.yellow(`[${this.sessionId}] Message too long (${messageText.length} chars), falling back to chunks`));
                return this.sendBase64InChunks(base64String, jid);
            }
            
            await this.sock.sendMessage(jid, { text: messageText });
            
            console.log(chalk.green(`[${this.sessionId}] ✅ Complete Base64 session sent in ONE part`));
            
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ Error sending Base64 in one part:`), error);
            
            if (error.message.includes('too long') || error.message.includes('length')) {
                console.log(chalk.yellow(`[${this.sessionId}] Falling back to chunked delivery`));
                return this.sendBase64InChunks(base64String, jid);
            }
        }
    }

    async sendBase64InChunks(base64String, jid) {
        try {
            const chunkSize = 1500;
            const totalChunks = Math.ceil(base64String.length / chunkSize);
            
            console.log(chalk.cyan(`[${this.sessionId}] Sending Base64 in ${totalChunks} chunks...`));
            
            await this.sock.sendMessage(jid, {
                text: `📄 *REAL BASE64 SESSION ID*\n\n🔐 This is your REAL WhatsApp session encoded in Base64.\n📏 Total length: ${base64String.length} characters\n🧩 Sending in ${totalChunks} parts...\n\n⚠️ *COPY EVERYTHING BELOW* (all parts)`
            });
            
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = start + chunkSize;
                const chunk = base64String.substring(start, end);
                const partNumber = i + 1;
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                await this.sock.sendMessage(jid, {
                    text: `📦 *Part ${partNumber}/${totalChunks}*\n\`\`\`${chunk}\`\`\``
                });
                
                console.log(chalk.gray(`[${this.sessionId}] Sent part ${partNumber}/${totalChunks}`));
            }
            
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

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            this.lastActivity = Date.now();

            console.log(chalk.gray(`[${this.sessionId}] Connection: ${connection}`));

            if (qr) {
                this.qrCode = qr;
                this.connectionStatus = 'qr';
                
                try {
                    this.qrDataURL = await generateQRDataURL(qr);
                    qrCodes.set(this.sessionId, {
                        qr: qr,
                        qrDataURL: this.qrDataURL,
                        timestamp: Date.now()
                    });
                    console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
                    if (this.qrTimeout) {
                        clearTimeout(this.qrTimeout);
                    }
                    
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
                
                // Load GitHub commands when connected
                await this.loadGitHubCommands();
                
                // Generate REAL Base64 session
                console.log(chalk.cyan(`[${this.sessionId}] 🔐 Generating REAL Base64 session...`));
                const base64Session = this.generateRealBase64Session();
                
                if (base64Session) {
                    setTimeout(() => {
                        this.sendBase64InOnePart(base64Session, this.ownerInfo.jid);
                    }, 2000);
                    
                    setTimeout(() => {
                        this.sendConnectionConfirmation();
                    }, 5000);
                } else {
                    console.log(chalk.red(`[${this.sessionId}] ❌ Failed to generate Base64 session`));
                    this.sendSessionIdMessage();
                    setTimeout(() => this.sendConnectionConfirmation(), 1500);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
                this.qrCode = null;
                this.qrDataURL = null;
                qrCodes.delete(this.sessionId);
                
                if (this.qrTimeout) {
                    clearTimeout(this.qrTimeout);
                    this.qrTimeout = null;
                }
                
                this.hasSentSessionId = false;
                this.hasSentConnectionMessage = false;
                this.sessionGenerated = false;
                this.base64Session = null;
                this.githubCommandsLoaded = false;
                
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

        this.sock.ev.on('creds.update', () => {
            if (this.saveCreds) {
                this.saveCreds();
                console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
            }
        });

        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message) return;

            this.lastActivity = Date.now();
            await this.handleIncomingMessage(msg);
        });
    }

    async loadGitHubCommands() {
        if (this.githubCommandsLoaded) return;
        
        try {
            console.log(chalk.blue(`[${this.sessionId}] Loading GitHub commands...`));
            await githubCommands.fetchCommands(false);
            this.githubCommandsLoaded = true;
            
            const commandsCount = githubCommands.getAllCommands().length;
            console.log(chalk.green(`[${this.sessionId}] ✅ Loaded ${commandsCount} GitHub commands`));
            
            // Notify owner
            if (this.ownerInfo) {
                await this.sock.sendMessage(this.ownerInfo.jid, {
                    text: `📂 *GitHub Commands Loaded*\n\n✅ Successfully loaded ${commandsCount} commands from GitHub!\n\nUse ${PREFIX}menu to see available commands.`
                });
            }
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ Failed to load GitHub commands:`), error.message);
            
            // Notify owner about failure
            if (this.ownerInfo) {
                await this.sock.sendMessage(this.ownerInfo.jid, {
                    text: `⚠️ *GitHub Commands Error*\n\nFailed to load commands from GitHub.\nError: ${error.message}\n\nUsing basic commands only.`
                });
            }
        }
    }

    // ====== MESSAGE HANDLER - GITHUB COMMANDS ONLY ======
    async handleIncomingMessage(msg) {
        const chatId = msg.key.remoteJid;
        const textMsg = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       '';

        if (!textMsg || !textMsg.startsWith(PREFIX)) return;

        const fullCommand = textMsg.slice(PREFIX.length).trim();
        const commandParts = fullCommand.split(' ');
        const commandName = commandParts[0].toLowerCase();
        const args = commandParts.slice(1);

        console.log(chalk.magenta(`[${this.sessionId}] 📩 ${chatId} → ${PREFIX}${commandName} ${args.join(' ')}`));

        try {
            // Ensure GitHub commands are loaded
            if (!this.githubCommandsLoaded) {
                await this.loadGitHubCommands();
            }

            // First check GitHub commands
            const githubCommand = githubCommands.getCommand(commandName);
            
            if (githubCommand && this.commandsEnabled) {
                console.log(chalk.cyan(`[${this.sessionId}] Executing GitHub command: ${commandName}`));
                
                if (githubCommand.type === 'js' && githubCommand.execute) {
                    await githubCommand.execute(this, chatId, args, msg);
                } else if (githubCommand.type === 'json') {
                    await this.handleJSONCommand(githubCommand, chatId, args, msg);
                }
                return;
            }

            // Only basic built-in commands (no website commands)
            switch (commandName) {
                case 'ping':
                    await this.sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: msg });
                    break;
                    
                case 'session':
                    if (this.base64Session) {
                        await this.sock.sendMessage(chatId, { 
                            text: `📁 *Session Information*\n\n🆔 Session ID: \`${this.sessionId}\`\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\n📄 Base64 Type: REAL WhatsApp Session\n🔐 Length: ${this.base64Session.length} characters\n🐺 Owner: Silent Wolf\n📁 Folder: \`sessions/${this.sessionId}\`\n🌐 Server: ${SERVER_URL}\n🔗 Base64 URL: ${SERVER_URL}/base64-session/${this.sessionId}` 
                        }, { quoted: msg });
                    } else {
                        await this.sock.sendMessage(chatId, { 
                            text: `📁 *Session Information*\n\n🆔 Session ID: \`${this.sessionId}\`\n👑 Your Number: +${this.ownerInfo?.number || 'Unknown'}\n📄 Base64: Generating...\n🐺 Owner: Silent Wolf\n📁 Folder: \`sessions/${this.sessionId}\`\n🌐 Server: ${SERVER_URL}` 
                        }, { quoted: msg });
                    }
                    break;
                    
                case 'base64':
                    if (this.base64Session) {
                        await this.sock.sendMessage(chatId, { 
                            text: `📄 *REAL Base64 WhatsApp Session*\n\n✅ Session ready! ${this.base64Session.length} characters\n\n🌐 Download from:\n${SERVER_URL}/base64-session/${this.sessionId}\n\n💡 Already sent to your DM in ONE complete part.` 
                        }, { quoted: msg });
                    } else {
                        await this.sock.sendMessage(chatId, { 
                            text: '⏳ *Base64 Session*\n\nGenerating REAL WhatsApp session...\nPlease wait a moment and try again.' 
                        }, { quoted: msg });
                    }
                    break;
                    
                case 'menu':
                    await this.showGitHubMenu(chatId, msg);
                    break;
                    
                case 'commands':
                    await this.showGitHubCommands(chatId, msg);
                    break;
                    
                case 'reload':
                    // Only owner can reload commands
                    if (chatId === this.ownerInfo?.jid) {
                        this.githubCommandsLoaded = false;
                        await this.loadGitHubCommands();
                    }
                    break;
                    
                case 'source':
                    await this.sock.sendMessage(chatId, { 
                        text: `📂 *GitHub Source*\n\n🌐 Repository: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}\n📁 Commands Path: ${GITHUB_COMMANDS_PATH}\n🔗 Website: ${SERVER_URL}\n\nAll commands are loaded dynamically from GitHub! 🚀`
                    }, { quoted: msg });
                    break;
                    
                case 'help':
                    await this.sock.sendMessage(chatId, { 
                        text: `🐺 *${BOT_NAME} Help*\n\nThis bot loads ALL commands from GitHub!\n\n📂 *Available Commands:*\n• ${PREFIX}menu - Show command menu\n• ${PREFIX}commands - List GitHub commands\n• ${PREFIX}source - Show GitHub source\n• ${PREFIX}reload - Reload commands (Owner)\n\n💡 All other commands come from:\nhttps://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`
                    }, { quoted: msg });
                    break;
                    
                default:
                    // Unknown command - check if it's a GitHub command that hasn't loaded yet
                    await this.sock.sendMessage(chatId, { 
                        text: `❌ *Command Not Found*\n\nCommand "${PREFIX}${commandName}" not found.\n\n💡 Try ${PREFIX}commands to see available GitHub commands.\n📂 Source: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`
                    }, { quoted: msg });
            }
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] Error handling command:`), error);
            await this.sock.sendMessage(chatId, { 
                text: `❌ *Command Error*\n\nError executing command: ${error.message}`
            }, { quoted: msg });
        }
    }

    async handleJSONCommand(commandData, chatId, args, msg) {
        const jsonCmd = commandData.data;
        
        if (jsonCmd.response) {
            let response = jsonCmd.response;
            
            // Replace variables
            response = response.replace(/{user}/g, args[0] || 'User');
            response = response.replace(/{args}/g, args.join(' ') || '');
            response = response.replace(/{prefix}/g, PREFIX);
            
            await this.sock.sendMessage(chatId, { text: response }, { quoted: msg });
        }
        
        if (jsonCmd.actions) {
            for (const action of jsonCmd.actions) {
                if (action.type === 'text') {
                    await this.sock.sendMessage(chatId, { text: action.content }, { quoted: msg });
                }
            }
        }
    }

    async showGitHubMenu(chatId, quotedMsg) {
        const githubCommandsList = githubCommands.getAllCommands();
        
        let menuText = `🐺 *${BOT_NAME} - GitHub Commands Menu*\n\n`;
        menuText += `📂 *All commands loaded from GitHub:*\n`;
        menuText += `🌐 Repo: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}\n\n`;
        
        // Show available GitHub commands
        if (githubCommandsList.length > 0) {
            menuText += `📋 *Available Commands (${githubCommandsList.length})*\n`;
            githubCommandsList.forEach(cmd => {
                menuText += `• ${PREFIX}${cmd.name}\n`;
            });
        } else {
            menuText += `⚠️ No commands loaded from GitHub yet.\n`;
            menuText += `Commands will load automatically...\n`;
        }
        
        menuText += `\n🔧 *System Commands*\n`;
        menuText += `• ${PREFIX}commands - List GitHub commands\n`;
        menuText += `• ${PREFIX}source - Show GitHub source\n`;
        menuText += `• ${PREFIX}help - Show help\n`;
        menuText += `• ${PREFIX}menu - Show this menu\n`;
        
        menuText += `\n💡 *Note:* All commands (except system ones) come from GitHub!\n`;
        menuText += `🔄 Auto-updates when GitHub repo changes`;
        
        await this.sock.sendMessage(chatId, { text: menuText }, { quoted: quotedMsg });
    }

    async showGitHubCommands(chatId, quotedMsg) {
        const commands = githubCommands.getAllCommands();
        
        if (commands.length === 0) {
            await this.sock.sendMessage(chatId, { 
                text: `📂 *GitHub Commands*\n\nNo commands loaded from GitHub yet.\n\n📁 Repository: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}\n🔄 Commands will load automatically when available.\n\n💡 Add commands to the "${GITHUB_COMMANDS_PATH}" folder in your repo.`
            }, { quoted: quotedMsg });
            return;
        }
        
        let commandList = `📂 *GitHub Commands*\n\n`;
        commandList += `📦 Total: ${commands.length} commands\n`;
        commandList += `🌐 Source: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}\n`;
        commandList += `📁 Path: ${GITHUB_COMMANDS_PATH}\n\n`;
        
        commands.forEach((cmd, index) => {
            commandList += `${index + 1}. ${PREFIX}${cmd.name}\n`;
            commandList += `   📄 ${cmd.filename}\n`;
            commandList += `   ⚙️ ${cmd.type.toUpperCase()}\n\n`;
        });
        
        commandList += `\n💡 *Usage:* ${PREFIX}commandname\n`;
        commandList += `🔄 *Auto-updates:* Commands update from GitHub automatically\n`;
        commandList += `📂 *Add your own:* Add .js or .json files to GitHub repo!`;
        
        await this.sock.sendMessage(chatId, { text: commandList }, { quoted: quotedMsg });
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
                text: `┏━🐺 WHATSAPP CONNECTED 🐺━━┓
┃
┃   ✅ *WHATSAPP CONNECTED*
┃
┃   📞 *Your Number:* +${this.ownerInfo.number}
┃   🔗 *Method:* ${connectionMethod}
┃   🌐 *Server:* ${SERVER_URL}
┃   📂 *Commands:* GitHub Integrated
┃
┃   💡 *GitHub Commands:*
┃   All commands are loaded from:
┃   ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}
┃
┃   🎯 Ready to use GitHub commands!
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`
            });
            
            this.hasSentConnectionMessage = true;
            console.log(chalk.green(`[${this.sessionId}] ✅ Connection confirmation sent to +${this.ownerInfo.number}`));
        } catch (error) {
            console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
        }
    }

    async requestPairCode(phoneNumber) {
        if (!this.sock) {
            throw new Error('Socket not initialized');
        }

        try {
            console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
            this.connectionMethod = 'pair';
            
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
        this.githubCommandsLoaded = false;
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
            sessionGenerated: this.sessionGenerated,
            githubCommandsLoaded: this.githubCommandsLoaded,
            githubCommandsCount: githubCommands.getAllCommands().length
        };
    }
}

// ====== NEW API ROUTES FOR GITHUB INTEGRATION ======

// Get loaded commands
app.get('/api/commands', async (req, res) => {
    try {
        const commands = githubCommands.getAllCommands();
        res.json({
            success: true,
            commands: commands,
            total: commands.length,
            source: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
            path: GITHUB_COMMANDS_PATH,
            lastFetched: githubCommands.lastFetched ? new Date(githubCommands.lastFetched).toISOString() : null,
            note: 'All commands are loaded dynamically from GitHub repository'
        });
    } catch (error) {
        console.error(chalk.red('❌ API Commands error:'), error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Reload commands from GitHub
app.post('/api/commands/reload', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        await githubCommands.fetchCommands(force);
        
        const commands = githubCommands.getAllCommands();
        
        res.json({
            success: true,
            message: `Successfully reloaded ${commands.length} commands from GitHub`,
            commands: commands,
            reloadedAt: new Date().toISOString(),
            source: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`
        });
    } catch (error) {
        console.error(chalk.red('❌ API Reload error:'), error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GitHub webhook handler
app.post('/api/webhook/github', async (req, res) => {
    try {
        // Verify webhook signature if secret is set
        if (GITHUB_WEBHOOK_SECRET) {
            const signature = req.headers['x-hub-signature-256'];
            if (!signature) {
                return res.status(401).json({ error: 'No signature provided' });
            }
            // Add signature verification logic here
        }
        
        const event = req.headers['x-github-event'];
        const payload = req.body;
        
        console.log(chalk.cyan(`📬 GitHub Webhook Received: ${event}`));
        
        if (event === 'push') {
            const { ref, repository, commits } = payload;
            
            if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
                console.log(chalk.blue('🔄 Main branch updated, reloading commands...'));
                
                // Check if commands were modified
                const commandFilesModified = commits.some(commit => 
                    commit.added.concat(commit.modified, commit.removed).some(file => 
                        file.startsWith(GITHUB_COMMANDS_PATH.replace(/\/$/, ''))
                    )
                );
                
                if (commandFilesModified) {
                    await githubCommands.fetchCommands(true);
                    console.log(chalk.green('✅ Commands reloaded from GitHub webhook'));
                    
                    // Notify all active sessions
                    let notifiedSessions = 0;
                    sessions.forEach(session => {
                        if (session.ownerInfo && session.connectionStatus === 'connected' && session.sock) {
                            session.sock.sendMessage(session.ownerInfo.jid, {
                                text: `🔄 *GitHub Commands Updated*\n\nCommands have been automatically updated from GitHub!\n\nUse ${PREFIX}menu to see new commands.`
                            }).catch(console.error);
                            notifiedSessions++;
                        }
                    });
                    
                    console.log(chalk.green(`📢 Notified ${notifiedSessions} active sessions`));
                }
            }
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Webhook processed',
            commandsCount: githubCommands.getAllCommands().length
        });
    } catch (error) {
        console.error(chalk.red('❌ GitHub Webhook error:'), error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get GitHub repo info
app.get('/api/github/info', async (req, res) => {
    try {
        res.json({
            success: true,
            repo: {
                owner: GITHUB_REPO_OWNER,
                name: GITHUB_REPO_NAME,
                url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
                commandsPath: GITHUB_COMMANDS_PATH,
                commandsUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/tree/main/${GITHUB_COMMANDS_PATH}`
            },
            bot: {
                name: BOT_NAME,
                prefix: PREFIX,
                server: SERVER_URL,
                version: VERSION
            },
            commands: {
                loaded: githubCommands.getAllCommands().length,
                lastFetched: githubCommands.lastFetched ? new Date(githubCommands.lastFetched).toISOString() : null
            }
        });
    } catch (error) {
        console.error(chalk.red('❌ GitHub Info error:'), error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== KEEP YOUR EXISTING ROUTES ======
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'index.html'));
});

app.get('/paircode', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'paircode.html'));
});

app.get('/qrcode', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
});

app.get('/kip', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'kip.html'));
});

app.get('/dep', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'dep.html'));
});

// Add new route for GitHub commands info
app.get('/github', (req, res) => {
    const githubInfo = {
        repo: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
        commandsPath: GITHUB_COMMANDS_PATH,
        url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
        botName: BOT_NAME,
        serverUrl: SERVER_URL
    };
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${BOT_NAME} - GitHub Integration</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; }
                .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .command { background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🐺 ${BOT_NAME} - GitHub Integration</h1>
                <div class="info">
                    <h3>📂 Repository Information</h3>
                    <p><strong>GitHub Repo:</strong> ${githubInfo.repo}</p>
                    <p><strong>Commands Path:</strong> ${githubInfo.commandsPath}</p>
                    <p><strong>URL:</strong> <a href="${githubInfo.url}" target="_blank">${githubInfo.url}</a></p>
                </div>
                
                <h3>🚀 How It Works</h3>
                <ol>
                    <li>This bot loads ALL commands from your GitHub repository</li>
                    <li>Add .js or .json files to the ${githubInfo.commandsPath} folder</li>
                    <li>Commands automatically load when someone pairs with the bot</li>
                    <li>Commands update automatically when GitHub repo changes</li>
                </ol>
                
                <h3>📋 API Endpoints</h3>
                <div class="command">
                    <code>GET ${githubInfo.serverUrl}/api/commands</code> - List loaded commands
                </div>
                <div class="command">
                    <code>GET ${githubInfo.serverUrl}/api/github/info</code> - GitHub repo info
                </div>
                <div class="command">
                    <code>POST ${githubInfo.serverUrl}/api/commands/reload</code> - Reload commands
                </div>
                
                <h3>💡 Bot Commands</h3>
                <p>After pairing, use these commands in WhatsApp:</p>
                <ul>
                    <li><code>${PREFIX}menu</code> - Show all GitHub commands</li>
                    <li><code>${PREFIX}commands</code> - List GitHub commands</li>
                    <li><code>${PREFIX}source</code> - Show GitHub source info</li>
                    <li><code>${PREFIX}reload</code> - Reload commands (Owner only)</li>
                </ul>
                
                <p><a href="/">← Back to Home</a></p>
            </div>
        </body>
        </html>
    `);
});

// ... [KEEP ALL YOUR EXISTING ROUTES AS THEY ARE]
// generate-qr, base64-session, qr-image, generate-paircode, status, sessions, download

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

// ====== SERVER STARTUP ======
async function startServer() {
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

    // DO NOT create commands directory - we don't want local commands!
    // The bot will ONLY use GitHub commands

    // Start cleanup intervals
    setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
    setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
    setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);
    
    // Auto-refresh commands every 30 minutes
    setInterval(async () => {
        try {
            await githubCommands.fetchCommands(false);
            console.log(chalk.gray('📂 Auto-refreshed commands from GitHub'));
        } catch (error) {
            console.error(chalk.yellow('⚠️  Auto-refresh failed:'), error.message);
        }
    }, 30 * 60 * 1000);

    app.listen(PORT, () => {
        console.log(chalk.greenBright(`
╔══════════════════════════════════════════════════════════════╗
║                     🚀 SERVER RUNNING                        ║
╠══════════════════════════════════════════════════════════════╣
║ 🌐 URL: ${SERVER_URL}                                        
║ 📁 Static files: ./Public                                    
║ 💾 Sessions: ./sessions                                      
║ 📦 GitHub: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}            
║ 📂 Commands: ${GITHUB_COMMANDS_PATH}                          
║ 🔄 Mode: GITHUB COMMANDS ONLY (No local commands)           
║ 🆔 Auto Session ID Generation                                
║ 🔐 REAL Base64 WhatsApp Sessions                             
║ ⚡ GitHub Integration: ✅ ENABLED                           
╚══════════════════════════════════════════════════════════════╝
`));

        console.log(chalk.blue('\n📋 Available Routes:'));
        console.log(chalk.white('  GET  /                     - Main page'));
        console.log(chalk.white('  GET  /github               - GitHub integration info'));
        console.log(chalk.white('  GET  /paircode             - Pair code page'));
        console.log(chalk.white('  GET  /qrcode               - QR code page'));
        console.log(chalk.white('  GET  /api/commands         - List loaded commands'));
        console.log(chalk.white('  GET  /api/github/info      - GitHub repo info'));
        console.log(chalk.white('  POST /api/commands/reload  - Force reload commands'));
        console.log(chalk.white('  POST /api/webhook/github   - GitHub webhook endpoint'));
        console.log(chalk.white('  GET  /base64-session/:id   - Get REAL Base64 session\n'));
        
        console.log(chalk.yellow('💡 Bot Commands (after pairing):'));
        console.log(chalk.white(`  ${PREFIX}menu      - Show GitHub commands menu`));
        console.log(chalk.white(`  ${PREFIX}commands  - List GitHub commands`));
        console.log(chalk.white(`  ${PREFIX}source    - Show GitHub source info`));
        console.log(chalk.white(`  ${PREFIX}help      - Show help`));
        console.log(chalk.white(`  ${PREFIX}reload    - Reload commands (Owner only)\n`));
        
        console.log(chalk.cyan('🔧 Configuration:'));
        console.log(chalk.white(`  GitHub Repo: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`));
        console.log(chalk.white(`  Commands Path: ${GITHUB_COMMANDS_PATH}`));
        console.log(chalk.white(`  Prefix: ${PREFIX}`));
        console.log(chalk.white(`  Bot Name: ${BOT_NAME}\n`));
        
        if (!GITHUB_TOKEN) {
            console.log(chalk.yellow('⚠️  No GitHub Token set.'));
            console.log(chalk.white('   Add GITHUB_TOKEN to Render environment variables for better rate limits.\n'));
        }
        
        console.log(chalk.green('✅ Server is ready! All commands will be loaded from GitHub when users pair.'));
    });
}

// ====== CLEANUP FUNCTIONS ======
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