
























// // ====== WOLF BOT SERVER - Session Generator ======
// // Updated to generate SILENT-WOLF session IDs compatible with Silent Wolf Bot

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
//     Browsers,
//     initAuthCreds
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
// const VERSION = '2.0.0';
// const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(join(__dirname, 'public')));

// // Global variables
// const sessions = new Map();
// const pairCodeRequests = new Map();
// const qrCodes = new Map();
// const generatedSessions = new Map(); // Store generated session IDs

// console.log(chalk.cyan(`
// ╔════════════════════════════════════════════════╗
// ║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SESSION GENERATOR ║
// ╠════════════════════════════════════════════════╣
// ║   ⚙️ Version : ${VERSION}                      ║
// ║   🌐 Port    : ${PORT}                         ║
// ║   🔑 Prefix  : SILENT-WOLF-                    ║
// ║   📱 Compatible with Silent Wolf Bot v2.2.1+   ║
// ╚════════════════════════════════════════════════╝
// `));

// // ====== SILENT-WOLF SESSION ID GENERATOR ======
// function generateSilentWolfSessionID(sessionData) {
//     try {
//         // Create a structured session object
//         const sessionObject = {
//             prefix: "SILENT-WOLF",
//             version: "2.0",
//             timestamp: Date.now(),
//             data: sessionData,
//             signature: crypto.createHmac('sha256', 'silent-wolf-secret')
//                 .update(JSON.stringify(sessionData))
//                 .digest('hex').substring(0, 16)
//         };
        
//         // Convert to base64 for compact storage
//         const jsonString = JSON.stringify(sessionObject, null, 2);
//         const base64Session = Buffer.from(jsonString).toString('base64');
        
//         // Format: SILENT-WOLF-[base64]
//         const sessionID = `SILENT-WOLF-${base64Session}`;
        
//         // Generate short ID for display
//         const shortID = `SW${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
//         return {
//             full: sessionID,
//             short: shortID,
//             json: sessionObject,
//             base64: base64Session,
//             length: sessionID.length,
//             createdAt: new Date().toISOString()
//         };
//     } catch (error) {
//         console.error(chalk.red('❌ Failed to generate SILENT-WOLF session ID:'), error);
//         return null;
//     }
// }

// // ====== EXTRACT SESSION DATA ======
// function extractSessionData(authState) {
//     try {
//         const { state } = authState;
        
//         // Extract all necessary session data
//         const sessionData = {
//             creds: {
//                 me: state.creds.me,
//                 phoneId: state.creds.phoneId || `phone_${Date.now()}`,
//                 platform: state.creds.platform || 'chrome',
//                 noiseKey: state.creds.noiseKey || { private: {}, public: {} },
//                 signedIdentityKey: state.creds.signedIdentityKey || { private: {}, public: {} },
//                 signedPreKey: state.creds.signedPreKey || {},
//                 registrationId: state.creds.registrationId || 1234,
//                 advSecretKey: state.creds.advSecretKey || 'secret',
//                 pairingCode: state.creds.pairingCode,
//                 processedHistoryMessages: state.creds.processedHistoryMessages,
//                 account: state.creds.account,
//                 accountSettings: state.creds.accountSettings
//             },
//             keys: {}
//         };
        
//         // Extract keys from state
//         if (state.keys) {
//             const keysObj = {};
//             // Convert Map to object for serialization
//             if (state.keys instanceof Map) {
//                 for (const [key, value] of state.keys.entries()) {
//                     keysObj[key] = value;
//                 }
//             } else if (typeof state.keys === 'object') {
//                 Object.assign(keysObj, state.keys);
//             }
//             sessionData.keys = keysObj;
//         }
        
//         // Add metadata
//         sessionData.metadata = {
//             generatedAt: new Date().toISOString(),
//             device: 'Silent Wolf Generator',
//             version: '2.0',
//             compatibleWith: 'Silent Wolf Bot v2.2.1+',
//             server: SERVER_URL
//         };
        
//         return sessionData;
//     } catch (error) {
//         console.error(chalk.red('❌ Failed to extract session data:'), error);
//         return null;
//     }
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
//         this.sessionId = sessionId || `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
//         this.generatedSessionID = null; // Store the SILENT-WOLF session ID
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
//                 printQRInTerminal: true,
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
//                     this.qrDataURL = await generateQRDataURL(qr);
//                     qrCodes.set(this.sessionId, {
//                         qr: qr,
//                         qrDataURL: this.qrDataURL,
//                         timestamp: Date.now()
//                     });
//                     console.log(chalk.yellow(`[${this.sessionId}] QR Code generated and stored`));
                    
//                     if (this.qrTimeout) {
//                         clearTimeout(this.qrTimeout);
//                     }
                    
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
//                 console.log(chalk.green(`[${this.sessionId}] ✅ Connected successfully!`));
                
//                 // Generate SILENT-WOLF session ID
//                 this.generateAndStoreSessionID();
                
//                 setTimeout(() => this.sendSessionIdMessage(), 1000);
//             }

//             if (connection === 'close') {
//                 const statusCode = lastDisconnect?.error?.output?.statusCode;
//                 console.log(chalk.yellow(`[${this.sessionId}] Connection closed, status: ${statusCode}`));
                
//                 this.qrCode = null;
//                 this.qrDataURL = null;
//                 qrCodes.delete(this.sessionId);
                
//                 if (this.qrTimeout) {
//                     clearTimeout(this.qrTimeout);
//                     this.qrTimeout = null;
//                 }
                
//                 this.hasSentSessionId = false;
//                 this.hasSentConnectionMessage = false;
                
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

//         this.sock.ev.on('creds.update', () => {
//             if (this.saveCreds) {
//                 this.saveCreds();
//                 console.log(chalk.gray(`[${this.sessionId}] Credentials updated`));
//             }
//         });

//         this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
//             if (type !== 'notify') return;
//             const msg = messages[0];
//             if (!msg.message) return;

//             this.lastActivity = Date.now();
//         });
//     }

//     generateAndStoreSessionID() {
//         try {
//             // Extract session data
//             const sessionData = extractSessionData({
//                 state: this.state,
//                 saveCreds: this.saveCreds
//             });
            
//             if (!sessionData) {
//                 throw new Error('Failed to extract session data');
//             }
            
//             // Generate SILENT-WOLF session ID
//             const sessionInfo = generateSilentWolfSessionID(sessionData);
            
//             if (!sessionInfo) {
//                 throw new Error('Failed to generate session ID');
//             }
            
//             this.generatedSessionID = sessionInfo;
//             generatedSessions.set(this.sessionId, sessionInfo);
            
//             // Save to file for download
//             const outputDir = './generated_sessions';
//             if (!fs.existsSync(outputDir)) {
//                 fs.mkdirSync(outputDir, { recursive: true });
//             }
            
//             const sessionFile = `${outputDir}/session_${sessionInfo.short}.txt`;
//             const sessionContent = `
// ╔════════════════════════════════════════════════════════╗
// ║              🐺 SILENT WOLF SESSION ID                ║
// ╠════════════════════════════════════════════════════════╣
// ║ 📅 Generated: ${new Date().toLocaleString()}                 
// ║ 🔑 Short ID: ${sessionInfo.short}                          
// ║ 📏 Length: ${sessionInfo.full.length} characters            
// ║ 👤 User: ${sessionData.creds.me?.id || 'Unknown'}           
// ╠════════════════════════════════════════════════════════╣
// ║                   📋 SESSION ID:                       
// ║                                                       
// ${sessionInfo.full}
// ║                                                       
// ╠════════════════════════════════════════════════════════╣
// ║                   📝 HOW TO USE:                       
// ║ 1. Copy the ENTIRE session ID above                    
// ║ 2. In Silent Wolf bot, choose "Session ID Login"       
// ║ 3. Paste the session ID when prompted                  
// ║ 4. The bot will connect automatically                  
// ║                                                       
// ║ 💡 Tip: This session ID contains encrypted             
// ║     credentials and is ready to use                    
// ╚════════════════════════════════════════════════════════╝

// === SESSION DETAILS ===
// Short ID: ${sessionInfo.short}
// Full Length: ${sessionInfo.full.length} chars
// Generated: ${new Date().toISOString()}
// User: ${sessionData.creds.me?.id || 'Unknown'}
// Contains: WhatsApp credentials, encryption keys, session data

// === FOR DEVELOPERS ===
// Base64: ${sessionInfo.base64.substring(0, 50)}...
//             `;
            
//             fs.writeFileSync(sessionFile, sessionContent);
//             console.log(chalk.green(`[${this.sessionId}] ✅ Session ID saved to: ${sessionFile}`));
            
//             // Also save JSON for programmatic use
//             const jsonFile = `${outputDir}/session_${sessionInfo.short}.json`;
//             fs.writeFileSync(jsonFile, JSON.stringify(sessionInfo, null, 2));
            
//             return sessionInfo;
            
//         } catch (error) {
//             console.error(chalk.red(`[${this.sessionId}] ❌ Failed to generate session ID:`), error.message);
//             return null;
//         }
//     }

//     async sendSessionIdMessage() {
//         if (!this.ownerInfo || !this.sock || this.hasSentSessionId || !this.generatedSessionID) return;
        
//         try {
//             // Send the SILENT-WOLF session ID
//             await this.sock.sendMessage(this.ownerInfo.jid, {
//                 text: `🔑 *YOUR SILENT-WOLF SESSION ID*\n\n` +
//                       `${this.generatedSessionID.full}\n\n` +
//                       `📋 *How to use:*\n` +
//                       `1. Copy the ENTIRE session ID above\n` +
//                       `2. In Silent Wolf bot, choose "Session ID Login"\n` +
//                       `3. Paste when prompted\n` +
//                       `4. Bot will connect instantly!\n\n` +
//                       `💡 *Session Info:*\n` +
//                       `• Short ID: ${this.generatedSessionID.short}\n` +
//                       `• Length: ${this.generatedSessionID.full.length} chars\n` +
//                       `• Generated: ${new Date(this.generatedSessionID.createdAt).toLocaleTimeString()}\n\n` +
//                       `⚠️ *Keep this session ID secure!*`
//             });
            
//             this.hasSentSessionId = true;
//             console.log(chalk.green(`[${this.sessionId}] ✅ Session ID sent to +${this.ownerInfo.number}`));
            
//             setTimeout(() => this.sendConnectionConfirmation(), 2000);
//         } catch (error) {
//             console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
//         }
//     }

//     async sendConnectionConfirmation() {
//         if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
//         try {
//             const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
//             await this.sock.sendMessage(this.ownerInfo.jid, {
//                 text: `┏━🐺 SESSION GENERATED 🐺━━┓
// ┃
// ┃   ✅ *SILENT-WOLF SESSION READY*
// ┃
// ┃   🐺 *Owner:* Silent Wolf
// ┃   📞 *Your Number:* +${this.ownerInfo.number}
// ┃   🔗 *Method:* ${connectionMethod}
// ┃   🌐 *Server:* ${SERVER_URL}
// ┃   🔑 *Session ID:* ${this.generatedSessionID?.short || 'Generated'}
// ┃   🟢 *Status:* Ready for Silent Wolf Bot
// ┃
// ┃   🎯 Your SILENT-WOLF session has been generated!
// ┃   📋 Check your messages for the session ID.
// ┃
// ┗━━━━━━━━━━━━━━━┛
// `
//             });
            
//             this.hasSentConnectionMessage = true;
//             console.log(chalk.green(`[${this.sessionId}] ✅ Connection confirmation sent`));
//         } catch (error) {
//             console.log(chalk.yellow(`[${this.sessionId}] Could not send connection confirmation`));
//         }
//     }

//     async requestPairCode(phoneNumber) {
//         if (!this.sock) {
//             throw new Error('Socket not initialized');
//         }

//         try {
//             console.log(chalk.cyan(`[${this.sessionId}] Requesting pair code for: ${phoneNumber}`));
            
//             this.connectionMethod = 'pair';
            
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
//         this.generatedSessionID = null;
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
//             generatedSessionID: this.generatedSessionID?.short,
//             hasSessionID: !!this.generatedSessionID
//         };
//     }
// }

// // ====== SESSION CONTROLLER ======
// async function getOrCreateSession(sessionId = null) {
//     const actualSessionId = sessionId || `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
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

// app.get('/', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'index.html'));
// });

// app.get('/paircode', (req, res) => {
//     res.sendFile(join(__dirname, 'Public', 'paircode.html'));
// });

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
//         generatedSessions: generatedSessions.size,
//         uptime: process.uptime(),
//         sessionFormat: 'SILENT-WOLF-[base64]',
//         compatibility: 'Silent Wolf Bot v2.2.1+'
//     });
// });

// // Generate QR Code
// app.post('/generate-qr', async (req, res) => {
//     try {
//         const { sessionId = null } = req.body;
        
//         console.log(chalk.blue(`🔗 QR generation request`));
//         const session = await getOrCreateSession(sessionId);
//         const status = session.getStatus();
        
//         let qrData = null;
//         if (status.status === 'qr' && status.qr) {
//             if (!status.qrDataURL) {
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
//             sessionFormat: 'Will generate SILENT-WOLF ID upon connection'
//         });
//     } catch (error) {
//         console.error(chalk.red('QR generation error:'), error.message);
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
// app.get('/status/:sessionId', async (req, res) => {
//     try {
//         const { sessionId } = req.params;
        
//         if (sessionId && sessions.has(sessionId)) {
//             const session = sessions.get(sessionId);
//             const status = session.getStatus();
            
//             res.json({
//                 success: true,
//                 ...status,
//                 sessionFormat: status.generatedSessionID ? 'SILENT-WOLF' : 'pending'
//             });
//         } else {
//             res.json({
//                 success: true,
//                 status: 'disconnected',
//                 sessionId: sessionId || 'not_found',
//                 message: 'Session not found or expired'
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

// // Get generated session ID
// app.get('/session-id/:sessionId', (req, res) => {
//     try {
//         const { sessionId } = req.params;
        
//         if (!sessionId || !sessions.has(sessionId)) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found'
//             });
//         }
        
//         const session = sessions.get(sessionId);
//         const generatedSession = generatedSessions.get(sessionId);
        
//         if (!generatedSession) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session ID not yet generated. Connect WhatsApp first.'
//             });
//         }
        
//         res.json({
//             success: true,
//             sessionId: sessionId,
//             generatedSession: {
//                 full: generatedSession.full,
//                 short: generatedSession.short,
//                 length: generatedSession.length,
//                 createdAt: generatedSession.createdAt,
//                 user: session.ownerInfo?.jid || 'Unknown'
//             },
//             downloadUrl: `${SERVER_URL}/download-session/${generatedSession.short}`
//         });
        
//     } catch (error) {
//         console.error(chalk.red('Session ID fetch error:'), error.message);
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// // Download session file
// app.get('/download-session/:shortId', (req, res) => {
//     try {
//         const { shortId } = req.params;
//         const sessionFile = `./generated_sessions/session_${shortId}.txt`;
        
//         if (!fs.existsSync(sessionFile)) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session file not found'
//             });
//         }
        
//         const content = fs.readFileSync(sessionFile, 'utf8');
        
//         res.set({
//             'Content-Type': 'text/plain',
//             'Content-Disposition': `attachment; filename="silent-wolf-session-${shortId}.txt"`
//         });
        
//         res.send(content);
        
//     } catch (error) {
//         console.error(chalk.red('Download error:'), error.message);
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
//         total: activeSessions.length,
//         generatedSessions: Array.from(generatedSessions.keys()).length
//     });
// });

// // Test SILENT-WOLF session format
// app.get('/test-format', (req, res) => {
//     // Create a test session to demonstrate the format
//     const testSessionData = {
//         creds: {
//             me: { id: '12345678901@s.whatsapp.net' },
//             phoneId: 'phone_test',
//             platform: 'chrome'
//         },
//         metadata: {
//             test: true,
//             timestamp: Date.now()
//         }
//     };
    
//     const sessionInfo = generateSilentWolfSessionID(testSessionData);
    
//     res.json({
//         success: true,
//         format: 'SILENT-WOLF-[base64]',
//         example: sessionInfo?.full.substring(0, 100) + '...',
//         length: sessionInfo?.length,
//         structure: {
//             prefix: 'SILENT-WOLF',
//             version: '2.0',
//             contains: ['credentials', 'encryption keys', 'metadata'],
//             compatibleWith: 'Silent Wolf Bot v2.2.1+'
//         }
//     });
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

// // Cleanup old generated sessions
// function cleanupOldGeneratedSessions() {
//     const outputDir = './generated_sessions';
//     if (!fs.existsSync(outputDir)) return;
    
//     const files = fs.readdirSync(outputDir);
//     const now = Date.now();
//     const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
//     files.forEach(file => {
//         const filePath = `${outputDir}/${file}`;
//         try {
//             const stats = fs.statSync(filePath);
//             if (now - stats.mtimeMs > maxAge) {
//                 fs.unlinkSync(filePath);
//                 console.log(chalk.gray(`🧹 Cleaned old session file: ${file}`));
//             }
//         } catch (error) {
//             // Ignore errors
//         }
//     });
// }

// // ====== SERVER STARTUP ======
// async function startServer() {
//     console.log(chalk.blue('📦 Initializing SILENT-WOLF Session Generator...'));

//     // Create necessary directories
//     if (!fs.existsSync('./sessions')) {
//         fs.mkdirSync('./sessions', { recursive: true });
//         console.log(chalk.green('✅ Created sessions directory'));
//     }
    
//     if (!fs.existsSync('./generated_sessions')) {
//         fs.mkdirSync('./generated_sessions', { recursive: true });
//         console.log(chalk.green('✅ Created generated_sessions directory'));
//     }

//     // Start cleanup intervals
//     setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
//     setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
//     setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);
//     setInterval(cleanupOldGeneratedSessions, 60 * 60 * 1000);

//     app.listen(PORT, () => {
//         console.log(chalk.greenBright(`
// ╔════════════════════════════════════════════════════════╗
// ║              🚀 SILENT-WOLF GENERATOR ONLINE           ║
// ╠════════════════════════════════════════════════════════╣
// ║ 🌐 URL: ${SERVER_URL}                                  
// ║ 🔑 Session Format: SILENT-WOLF-[base64]                
// ║ 📱 Compatible with: Silent Wolf Bot v2.2.1+            
// ║ 💾 Sessions saved to: ./generated_sessions/            
// ║ 🆔 Auto-generates SILENT-WOLF session IDs              
// ║ 📨 Sends session ID via WhatsApp message               
// ║ ⚡ Ready to generate sessions!                          
// ╚════════════════════════════════════════════════════════╝
// `));

//         console.log(chalk.blue('\n📋 API Endpoints:'));
//         console.log(chalk.white('  GET  /                        - Main page'));
//         console.log(chalk.white('  GET  /paircode                - Pair code page'));
//         console.log(chalk.white('  GET  /qrcode                  - QR code page'));
//         console.log(chalk.white('  GET  /status                  - Server status'));
//         console.log(chalk.white('  GET  /test-format             - Test session format'));
//         console.log(chalk.white('  POST /generate-qr             - Generate QR code'));
//         console.log(chalk.white('  GET  /qr-image/:id            - Get QR code image'));
//         console.log(chalk.white('  POST /generate-paircode       - Generate pair code'));
//         console.log(chalk.white('  GET  /status/:id              - Check session status'));
//         console.log(chalk.white('  GET  /session-id/:id          - Get generated session ID'));
//         console.log(chalk.white('  GET  /download-session/:id    - Download session file'));
//         console.log(chalk.white('  GET  /sessions                - List all sessions'));
//         console.log(chalk.cyan('\n🔑 Session ID Format: SILENT-WOLF-[base64-encoded-data]'));
//         console.log(chalk.cyan('📱 Works with Silent Wolf Bot "Session ID Login" option'));
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
//     console.log(chalk.yellow('\n\n👋 Shutting down SILENT-WOLF Generator...'));
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


























// ====== WOLF BOT SERVER - Session Generator ======
// Updated to generate SILENT-WOLF session IDs compatible with Silent Wolf Bot

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
    Browsers,
    initAuthCreds
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
const VERSION = '2.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Global variables
const sessions = new Map();
const pairCodeRequests = new Map();
const qrCodes = new Map();
const generatedSessions = new Map(); // Store generated session IDs

console.log(chalk.cyan(`
╔════════════════════════════════════════════════╗
║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SESSION GENERATOR ║
╠════════════════════════════════════════════════╣
║   ⚙️ Version : ${VERSION}                      ║
║   🌐 Port    : ${PORT}                         ║
║   🔑 Prefix  : SILENT-WOLF~                    ║
║   📱 Compatible with Silent Wolf Bot v2.2.1+   ║
╚════════════════════════════════════════════════╝
`));

// ====== CONVERT BAILEYS TO WHATSAPP-WEB.JS FORMAT ======
function convertBaileysToWWeb(baileysSession) {
    try {
        // Extract credentials
        const creds = baileysSession.creds || {};
        const keys = baileysSession.keys || {};
        
        // Convert to whatsapp-web.js format
        const wwebSession = {
            WABrowserId: generateBrowserId(),
            WASecretBundle: generateSecretBundle(creds),
            WAToken1: generateToken1(creds),
            WAToken2: generateToken2(creds),
            // Add original credentials for compatibility
            creds: {
                me: creds.me,
                phoneId: creds.phoneId || generatePhoneId(),
                platform: creds.platform || 'chrome',
                noiseKey: creds.noiseKey || { private: {}, public: {} },
                signedIdentityKey: creds.signedIdentityKey || { private: {}, public: {} },
                signedPreKey: creds.signedPreKey || {},
                registrationId: creds.registrationId || crypto.randomInt(1000, 9999),
                advSecretKey: creds.advSecretKey || generateAdvSecret()
            },
            keys: keys
        };
        
        return wwebSession;
    } catch (error) {
        console.error(chalk.red('❌ Failed to convert Baileys to WWeb format:'), error);
        return null;
    }
}

function generateBrowserId() {
    return 'Browser-' + crypto.randomBytes(16).toString('base64');
}

function generateSecretBundle(creds) {
    return {
        key: crypto.randomBytes(32).toString('base64'),
        encKey: crypto.randomBytes(32).toString('base64'),
        macKey: crypto.randomBytes(32).toString('base64')
    };
}

function generateToken1(creds) {
    const me = creds.me || {};
    const id = me.id || 'unknown';
    return crypto.createHash('sha256').update(id + Date.now()).digest('base64').substring(0, 32);
}

function generateToken2(creds) {
    const me = creds.me || {};
    const phoneId = creds.phoneId || generatePhoneId();
    return crypto.createHash('sha256').update(phoneId + Date.now()).digest('base64').substring(0, 32);
}

function generatePhoneId() {
    return 'phone-' + crypto.randomBytes(8).toString('hex');
}

function generateAdvSecret() {
    return crypto.randomBytes(32).toString('hex');
}

// ====== SILENT-WOLF SESSION ID GENERATOR ======
function generateSilentWolfSessionID(sessionData) {
    try {
        // Convert Baileys session to whatsapp-web.js format
        const wwebSession = convertBaileysToWWeb(sessionData);
        
        if (!wwebSession) {
            throw new Error('Failed to convert session format');
        }
        
        // Create a structured session object
        const sessionObject = {
            prefix: "SILENT-WOLF",
            version: "2.0",
            timestamp: Date.now(),
            data: wwebSession,  // Use converted whatsapp-web.js session
            signature: crypto.createHmac('sha256', 'silent-wolf-secret')
                .update(JSON.stringify(wwebSession))
                .digest('hex').substring(0, 16),
            metadata: {
                generator: "Silent Wolf Generator",
                compatibleWith: "whatsapp-web.js",
                format: "wweb-converted"
            }
        };
        
        // Convert to base64 for compact storage
        const jsonString = JSON.stringify(sessionObject);
        const base64Session = Buffer.from(jsonString).toString('base64');
        
        // Format: SILENT-WOLF~[base64] (using ~ as separator)
        const sessionID = `SILENT-WOLF~${base64Session}`;
        
        // Generate short ID for display
        const shortID = `SW${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        return {
            full: sessionID,
            short: shortID,
            json: sessionObject,
            base64: base64Session,
            length: sessionID.length,
            createdAt: new Date().toISOString(),
            user: sessionData.creds?.me?.id || 'Unknown'
        };
    } catch (error) {
        console.error(chalk.red('❌ Failed to generate SILENT-WOLF session ID:'), error);
        return null;
    }
}

// ====== EXTRACT SESSION DATA ======
function extractSessionData(authState) {
    try {
        const { state } = authState;
        
        // Extract all necessary session data from Baileys
        const sessionData = {
            creds: {
                me: state.creds.me,
                phoneId: state.creds.phoneId || generatePhoneId(),
                platform: state.creds.platform || 'chrome',
                noiseKey: state.creds.noiseKey || { private: {}, public: {} },
                signedIdentityKey: state.creds.signedIdentityKey || { private: {}, public: {} },
                signedPreKey: state.creds.signedPreKey || {},
                registrationId: state.creds.registrationId || crypto.randomInt(1000, 9999),
                advSecretKey: state.creds.advSecretKey || generateAdvSecret(),
                pairingCode: state.creds.pairingCode,
                processedHistoryMessages: state.creds.processedHistoryMessages,
                account: state.creds.account,
                accountSettings: state.creds.accountSettings
            },
            keys: {}
        };
        
        // Extract keys from state
        if (state.keys) {
            const keysObj = {};
            // Convert Map to object for serialization
            if (state.keys instanceof Map) {
                for (const [key, value] of state.keys.entries()) {
                    keysObj[key] = value;
                }
            } else if (typeof state.keys === 'object') {
                Object.assign(keysObj, state.keys);
            }
            sessionData.keys = keysObj;
        }
        
        // Add metadata
        sessionData.metadata = {
            generatedAt: new Date().toISOString(),
            device: 'Silent Wolf Generator',
            version: '2.0',
            compatibleWith: 'Silent Wolf Bot v2.2.1+',
            server: SERVER_URL,
            originalFormat: 'baileys'
        };
        
        return sessionData;
    } catch (error) {
        console.error(chalk.red('❌ Failed to extract session data:'), error);
        return null;
    }
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
        this.sessionId = sessionId || `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
        this.generatedSessionID = null; // Store the SILENT-WOLF session ID
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
                    number: this.sock.user.id.split('@')[0],
                    name: this.sock.user.name || 'User'
                };
                console.log(chalk.green(`[${this.sessionId}] ✅ Connected successfully!`));
                
                // Generate SILENT-WOLF session ID
                this.generateAndStoreSessionID();
                
                setTimeout(() => this.sendSessionIdMessage(), 1000);
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
        });
    }

    generateAndStoreSessionID() {
        try {
            // Extract session data
            const sessionData = extractSessionData({
                state: this.state,
                saveCreds: this.saveCreds
            });
            
            if (!sessionData) {
                throw new Error('Failed to extract session data');
            }
            
            // Generate SILENT-WOLF session ID
            const sessionInfo = generateSilentWolfSessionID(sessionData);
            
            if (!sessionInfo) {
                throw new Error('Failed to generate session ID');
            }
            
            this.generatedSessionID = sessionInfo;
            generatedSessions.set(this.sessionId, sessionInfo);
            
            // Save to file for download
            const outputDir = './generated_sessions';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const sessionFile = `${outputDir}/session_${sessionInfo.short}.txt`;
            const sessionContent = `
╔════════════════════════════════════════════════════════╗
║              🐺 SILENT WOLF SESSION ID                ║
╠════════════════════════════════════════════════════════╣
║ 📅 Generated: ${new Date().toLocaleString()}                 
║ 🔑 Short ID: ${sessionInfo.short}                          
║ 📏 Length: ${sessionInfo.full.length} characters            
║ 👤 User: ${sessionInfo.user || this.ownerInfo?.jid || 'Unknown'}           
╠════════════════════════════════════════════════════════╣
║                   📋 SESSION ID:                       
║                                                       
${sessionInfo.full}
║                                                       
╠════════════════════════════════════════════════════════╣
║                   📝 HOW TO USE:                       
║ 1. Copy the ENTIRE session ID above                    
║ 2. In Silent Wolf bot, choose "Session ID Login"       
║ 3. Paste the session ID when prompted                  
║ 4. The bot will connect automatically                  
║                                                       
║ 💡 Tip: This session ID contains encrypted             
║     credentials and is ready to use                    
╚════════════════════════════════════════════════════════╝

=== SESSION DETAILS ===
Short ID: ${sessionInfo.short}
Full Length: ${sessionInfo.full.length} chars
Generated: ${new Date().toISOString()}
User: ${sessionInfo.user || this.ownerInfo?.jid || 'Unknown'}
Format: whatsapp-web.js compatible
Contains: WhatsApp credentials, encryption keys, session data

=== FOR DEVELOPERS ===
Base64: ${sessionInfo.base64.substring(0, 50)}...
            `;
            
            fs.writeFileSync(sessionFile, sessionContent);
            console.log(chalk.green(`[${this.sessionId}] ✅ Session ID saved to: ${sessionFile}`));
            
            // Also save JSON for programmatic use
            const jsonFile = `${outputDir}/session_${sessionInfo.short}.json`;
            fs.writeFileSync(jsonFile, JSON.stringify(sessionInfo, null, 2));
            
            return sessionInfo;
            
        } catch (error) {
            console.error(chalk.red(`[${this.sessionId}] ❌ Failed to generate session ID:`), error.message);
            return null;
        }
    }

    async sendSessionIdMessage() {
        if (!this.ownerInfo || !this.sock || this.hasSentSessionId || !this.generatedSessionID) return;
        
        try {
            // Send the SILENT-WOLF session ID
            await this.sock.sendMessage(this.ownerInfo.jid, {
                text: 
                      `${this.generatedSessionID.full}`
                             });
            
            this.hasSentSessionId = true;
            console.log(chalk.green(`[${this.sessionId}] ✅ Session ID sent to +${this.ownerInfo.number}`));
            
            setTimeout(() => this.sendConnectionConfirmation(), 2000);
        } catch (error) {
            console.log(chalk.yellow(`[${this.sessionId}] Could not send session ID message`));
        }
    }

    async sendConnectionConfirmation() {
        if (!this.ownerInfo || !this.sock || this.hasSentConnectionMessage) return;
        
        try {
            const connectionMethod = this.connectionMethod === 'pair' ? 'Pair Code' : 'QR Code';
            
            await this.sock.sendMessage(this.ownerInfo.jid, {
                text: `┏━🐺 SESSION GENERATED 🐺━━┓
┃   ✅ *WOLFBOT SESSION READY*
┃   📞 *Your Number:* +${this.ownerInfo.number}
┃   🔗 *Method:* ${connectionMethod}
┃   🟢 *Status:* Ready for *WOLFBOT* 
┃
┃   🎯 Your session has been generated!
┗━━━━━━━━━━━━━━━━━━━━━━━┛`
            });
            
            this.hasSentConnectionMessage = true;
            console.log(chalk.green(`[${this.sessionId}] ✅ Connection confirmation sent`));
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
        this.generatedSessionID = null;
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
            generatedSessionID: this.generatedSessionID?.short,
            hasSessionID: !!this.generatedSessionID
        };
    }
}

// ====== SESSION CONTROLLER ======
async function getOrCreateSession(sessionId = null) {
    const actualSessionId = sessionId || `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
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

// Server status
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        server: BOT_NAME,
        version: VERSION,
        port: PORT,
        serverUrl: SERVER_URL,
        activeSessions: sessions.size,
        generatedSessions: generatedSessions.size,
        uptime: process.uptime(),
        sessionFormat: 'SILENT-WOLF~[base64]',
        compatibility: 'Silent Wolf Bot v2.2.1+'
    });
});

// Generate QR Code
app.post('/generate-qr', async (req, res) => {
    try {
        const { sessionId = null } = req.body;
        
        console.log(chalk.blue(`🔗 QR generation request`));
        const session = await getOrCreateSession(sessionId);
        const status = session.getStatus();
        
        let qrData = null;
        if (status.status === 'qr' && status.qr) {
            if (!status.qrDataURL) {
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
            sessionFormat: 'Will generate SILENT-WOLF ID upon connection'
        });
    } catch (error) {
        console.error(chalk.red('QR generation error:'), error.message);
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
app.get('/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            const status = session.getStatus();
            
            res.json({
                success: true,
                ...status,
                sessionFormat: status.generatedSessionID ? 'SILENT-WOLF~' : 'pending'
            });
        } else {
            res.json({
                success: true,
                status: 'disconnected',
                sessionId: sessionId || 'not_found',
                message: 'Session not found or expired'
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

// Get generated session ID
app.get('/session-id/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        const generatedSession = generatedSessions.get(sessionId);
        
        if (!generatedSession) {
            return res.status(404).json({
                success: false,
                error: 'Session ID not yet generated. Connect WhatsApp first.'
            });
        }
        
        res.json({
            success: true,
            sessionId: sessionId,
            generatedSession: {
                full: generatedSession.full,
                short: generatedSession.short,
                length: generatedSession.length,
                createdAt: generatedSession.createdAt,
                user: session.ownerInfo?.jid || 'Unknown'
            },
            downloadUrl: `${SERVER_URL}/download-session/${generatedSession.short}`
        });
        
    } catch (error) {
        console.error(chalk.red('Session ID fetch error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download session file
app.get('/download-session/:shortId', (req, res) => {
    try {
        const { shortId } = req.params;
        const sessionFile = `./generated_sessions/session_${shortId}.txt`;
        
        if (!fs.existsSync(sessionFile)) {
            return res.status(404).json({
                success: false,
                error: 'Session file not found'
            });
        }
        
        const content = fs.readFileSync(sessionFile, 'utf8');
        
        res.set({
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="silent-wolf-session-${shortId}.txt"`
        });
        
        res.send(content);
        
    } catch (error) {
        console.error(chalk.red('Download error:'), error.message);
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
        total: activeSessions.length,
        generatedSessions: Array.from(generatedSessions.keys()).length
    });
});

// Test SILENT-WOLF session format
app.get('/test-format', (req, res) => {
    // Create a test session to demonstrate the format
    const testSessionData = {
        creds: {
            me: { id: '12345678901@s.whatsapp.net' },
            phoneId: 'phone_test',
            platform: 'chrome'
        },
        metadata: {
            test: true,
            timestamp: Date.now()
        }
    };
    
    const sessionInfo = generateSilentWolfSessionID(testSessionData);
    
    res.json({
        success: true,
        format: 'SILENT-WOLF~[base64]',
        example: sessionInfo?.full.substring(0, 100) + '...',
        length: sessionInfo?.length,
        structure: {
            prefix: 'SILENT-WOLF',
            version: '2.0',
            contains: ['credentials', 'encryption keys', 'metadata'],
            compatibleWith: 'Silent Wolf Bot v2.2.1+'
        }
    });
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

// Cleanup old generated sessions
function cleanupOldGeneratedSessions() {
    const outputDir = './generated_sessions';
    if (!fs.existsSync(outputDir)) return;
    
    const files = fs.readdirSync(outputDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    files.forEach(file => {
        const filePath = `${outputDir}/${file}`;
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                console.log(chalk.gray(`🧹 Cleaned old session file: ${file}`));
            }
        } catch (error) {
            // Ignore errors
        }
    });
}

// ====== SERVER STARTUP ======
async function startServer() {
    console.log(chalk.blue('📦 Initializing SILENT-WOLF Session Generator...'));

    // Create necessary directories
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
        console.log(chalk.green('✅ Created sessions directory'));
    }
    
    if (!fs.existsSync('./generated_sessions')) {
        fs.mkdirSync('./generated_sessions', { recursive: true });
        console.log(chalk.green('✅ Created generated_sessions directory'));
    }

    // Start cleanup intervals
    setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
    setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
    setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);
    setInterval(cleanupOldGeneratedSessions, 60 * 60 * 1000);

    app.listen(PORT, () => {
        console.log(chalk.greenBright(`
╔════════════════════════════════════════════════════════╗
║              🚀 SILENT-WOLF GENERATOR ONLINE           ║
╠════════════════════════════════════════════════════════╣
║ 🌐 URL: ${SERVER_URL}                                  
║ 🔑 Session Format: SILENT-WOLF~[base64]                
║ 📱 Compatible with: Silent Wolf Bot v2.2.1+            
║ 💾 Sessions saved to: ./generated_sessions/            
║ 🆔 Auto-generates SILENT-WOLF session IDs              
║ 📨 Sends session ID via WhatsApp message               
║ ⚡ Ready to generate sessions!                          
╚════════════════════════════════════════════════════════╝
`));

        console.log(chalk.blue('\n📋 API Endpoints:'));
        console.log(chalk.white('  GET  /                        - Main page'));
        console.log(chalk.white('  GET  /paircode                - Pair code page'));
        console.log(chalk.white('  GET  /qrcode                  - QR code page'));
        console.log(chalk.white('  GET  /status                  - Server status'));
        console.log(chalk.white('  GET  /test-format             - Test session format'));
        console.log(chalk.white('  POST /generate-qr             - Generate QR code'));
        console.log(chalk.white('  GET  /qr-image/:id            - Get QR code image'));
        console.log(chalk.white('  POST /generate-paircode       - Generate pair code'));
        console.log(chalk.white('  GET  /status/:id              - Check session status'));
        console.log(chalk.white('  GET  /session-id/:id          - Get generated session ID'));
        console.log(chalk.white('  GET  /download-session/:id    - Download session file'));
        console.log(chalk.white('  GET  /sessions                - List all sessions'));
        console.log(chalk.cyan('\n🔑 Session ID Format: SILENT-WOLF~[base64-encoded-data]'));
        console.log(chalk.cyan('📱 Works with Silent Wolf Bot "Session ID Login" option'));
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
    console.log(chalk.yellow('\n\n👋 Shutting down SILENT-WOLF Generator...'));
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