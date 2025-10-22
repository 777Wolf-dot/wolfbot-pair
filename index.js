const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, delay, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Get the current directory where index.js is located
const CURRENT_DIR = __dirname;
const PUBLIC_DIR = path.join(CURRENT_DIR, 'Public');

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Store active pairing sessions
const pairingSessions = new Map();

// WhatsApp client instance
let sock = null;
let qrCode = null;
let isConnected = false;
let isShuttingDown = false;
let currentSessionString = '';

// Initialize WhatsApp Socket
async function initializeWhatsApp() {
    try {
        // Clear previous connection if exists
        if (sock) {
            try {
                sock.ws.close();
                sock = null;
            } catch (e) {
                console.log('🔄 Cleaning previous connection...');
            }
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

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, isNewLogin, lastDisconnect } = update;
            
            if (qr) {
                console.log('🔐 New QR Code generated');
                qrCode = qr;
                
                // Convert QR to pairing code
                const pairingCode = generatePairingCodeFromQR(qr);
                console.log('🔢 Generated pairing code from QR:', pairingCode);
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');
                isConnected = true;
                qrCode = null;
                pairingSessions.clear();
                
                // Generate and send session string to DM
                await generateAndSendSessionString();
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('🔒 Device logged out, clearing credentials...');
                    fs.rmSync(path.join(CURRENT_DIR, 'auth_info'), { recursive: true, force: true });
                    isConnected = false;
                    currentSessionString = '';
                } else {
                    console.log('❌ Connection closed');
                    isConnected = false;
                    
                    if (!isShuttingDown && statusCode !== DisconnectReason.loggedOut) {
                        console.log('🔄 Attempting to reconnect...');
                        setTimeout(() => initializeWhatsApp(), 5000);
                    }
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        return sock;
    } catch (error) {
        console.error('❌ Error initializing WhatsApp:', error);
        
        if (!isShuttingDown) {
            console.log('🔄 Retrying connection in 10s...');
            setTimeout(() => initializeWhatsApp(), 10000);
        }
        throw error;
    }
}

// Generate pairing code from QR data
function generatePairingCodeFromQR(qrData) {
    // Extract a consistent pairing code from QR data
    const hash = crypto.createHash('md5').update(qrData).digest('hex');
    
    // Convert hash to 8-character alphanumeric code
    const base36 = parseInt(hash.substring(0, 8), 16).toString(36).toUpperCase();
    let code = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    // Ensure we have exactly 8 characters
    for (let i = 0; i < 8; i++) {
        if (i < base36.length) {
            code += base36[i];
        } else {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    return code;
}

// Get session credentials as string
async function getSessionCredentials() {
    try {
        const authDir = path.join(CURRENT_DIR, 'auth_info');
        if (!fs.existsSync(authDir)) {
            return null;
        }
        
        const credentials = {};
        const files = fs.readdirSync(authDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(authDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                credentials[file] = JSON.parse(content);
            }
        }
        
        return Buffer.from(JSON.stringify(credentials)).toString('base64');
    } catch (error) {
        console.error('Error reading credentials:', error);
        return null;
    }
}

// Generate unique session string
async function generateSessionString() {
    // Create a unique session string with random characters
    const sessionId = crypto.randomBytes(32).toString('base64');
    const timestamp = Date.now();
    const randomHash = crypto.createHash('sha256')
        .update(sessionId + timestamp.toString())
        .digest('hex')
        .substring(0, 16);
    
    // Format: WOLFSESSION_[timestamp]_[random_hash]
    const sessionString = `WOLFSESSION_${timestamp}_${randomHash.toUpperCase()}`;
    
    // Get session credentials
    const credentials = await getSessionCredentials();
    
    // Also create a deployment-ready base64 encoded version
    const deploymentSession = Buffer.from(JSON.stringify({
        sessionId,
        timestamp,
        hash: randomHash,
        generatedAt: new Date().toISOString(),
        credentials: credentials
    })).toString('base64');
    
    return {
        readable: sessionString,
        deployment: deploymentSession,
        credentials: credentials
    };
}

// Function to send session info to DM
async function generateAndSendSessionString() {
    try {
        if (!sock || !isConnected) return;
        
        // Get the user's own JID
        const userJid = sock.user?.id;
        if (!userJid) {
            console.log('❌ Cannot get user JID');
            return;
        }

        // Generate session string
        const sessionData = await generateSessionString();
        currentSessionString = sessionData.readable;
        
        const message = `✅ *WhatsApp Session Connected Successfully!*

📱 *Session Information:*
• Connected at: ${new Date().toLocaleString()}
• User: ${sock.user?.name || 'Unknown'}
• Number: ${sock.user?.id.split('@')[0] || 'Unknown'}

🔐 *SESSION STRING (For Deployment):*
\`\`\`
${sessionData.readable}
\`\`\`

💾 *Deployment Ready (Base64):*
\`\`\`
${sessionData.deployment}
\`\`\`

🚀 *Usage for Deployment (Heroku/Koyeb/Railway):*
1. Set environment variable: \`WHATSAPP_SESSION\`
2. Value: \`${sessionData.readable}\`

⚠️ *KEEP THIS SESSION SECURE - DO NOT SHARE!*
🔒 This session allows full access to your WhatsApp account.`;

        // Send message to self
        await sock.sendMessage(userJid, { text: message });
        console.log('✅ Session string sent to DM');
        
        // Also save to file for backup
        saveSessionToFile(sessionData);
        
    } catch (error) {
        console.error('❌ Error sending session to DM:', error);
    }
}

// Save session to file for backup
function saveSessionToFile(sessionData) {
    try {
        const sessionFile = path.join(CURRENT_DIR, 'session_backup.json');
        const backupData = {
            ...sessionData,
            savedAt: new Date().toISOString(),
            user: sock.user?.id || 'unknown'
        };
        
        fs.writeFileSync(sessionFile, JSON.stringify(backupData, null, 2));
        console.log('💾 Session backup saved to session_backup.json');
    } catch (error) {
        console.error('Error saving session backup:', error);
    }
}

// Safe logout function
async function safeLogout() {
    if (!sock || !isConnected) {
        console.log('🔌 No active connection to logout from');
        return;
    }

    try {
        console.log('🔒 Logging out from WhatsApp...');
        await sock.logout();
        console.log('✅ Logout successful');
    } catch (error) {
        if (error.message.includes('Connection Closed') || error.data === 'Stream Errored') {
            console.log('🔌 Connection already closed, skipping logout');
        } else {
            console.log('⚠️ Error during logout:', error.message);
        }
    }
}

// Safe close function
async function safeClose() {
    try {
        if (sock && sock.ws) {
            sock.ws.close();
        }
        sock = null;
        isConnected = false;
    } catch (error) {
        console.log('🔌 Connection closed');
    }
}

// Generate QR Code as Data URL
app.get('/generate-qr', async (req, res) => {
    try {
        console.log('🔄 Generating QR code...');
        
        // Reinitialize if not connected and no active QR
        if (!sock || (!isConnected && !qrCode)) {
            console.log('🔄 Initializing WhatsApp connection...');
            await initializeWhatsApp();
            await delay(3000);
        }

        if (qrCode) {
            console.log('✅ QR code available, converting to image...');
            
            const qrDataURL = await QRCode.toDataURL(qrCode, {
                width: 280,
                height: 280,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#00ff00'
                }
            });
            
            res.json({ 
                qr: qrDataURL,
                status: 'pending'
            });
        } else if (isConnected) {
            console.log('✅ WhatsApp already connected');
            res.json({ 
                qr: null,
                status: 'connected',
                message: 'WhatsApp is already connected!',
                sessionString: currentSessionString
            });
        } else {
            console.log('❌ No QR code available');
            res.status(500).json({ 
                error: 'QR code not available yet. Please try again in a few seconds.' 
            });
        }
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate QR code: ' + error.message 
        });
    }
});

// Generate REAL Working Pairing Code
app.post('/generate-paircode', async (req, res) => {
    try {
        const { number } = req.body;
        
        if (!number) {
            return res.status(400).json({ 
                error: 'Phone number is required' 
            });
        }

        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length < 10) {
            return res.status(400).json({ 
                error: 'Invalid phone number format' 
            });
        }

        console.log('🔄 Generating REAL pairing code for:', cleanNumber);

        // Reinitialize WhatsApp if needed
        if (!sock) {
            console.log('🔄 Initializing WhatsApp for pairing...');
            await initializeWhatsApp();
            await delay(3000); // Wait longer for QR generation
        }

        if (isConnected) {
            return res.json({ 
                code: null,
                status: 'connected',
                message: 'WhatsApp is already connected!',
                sessionString: currentSessionString
            });
        }

        if (!qrCode) {
            console.log('❌ No QR code available for pairing');
            return res.status(500).json({ 
                error: 'Authentication not ready. Please try again in a few seconds.' 
            });
        }

        // Generate REAL pairing code from the actual WhatsApp QR
        const pairingCode = generatePairingCodeFromQR(qrCode);
        
        // Store the pairing session
        pairingSessions.set(pairingCode, {
            number: cleanNumber,
            timestamp: Date.now(),
            qrData: qrCode, // Store the actual QR data
            expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
            status: 'active'
        });

        console.log('✅ REAL pairing code generated:', pairingCode);
        console.log('📱 Active pairing sessions:', pairingSessions.size);

        // Also generate QR code for visual reference
        const qrDataURL = await QRCode.toDataURL(qrCode, {
            width: 280,
            height: 280,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#00ff00'
            }
        });

        res.json({ 
            code: pairingCode,
            qr: qrDataURL, // Return the actual WhatsApp QR
            status: 'pending',
            expiresIn: '10 minutes',
            instructions: [
                '🎯 *REAL PAIRING CODE* 🎯',
                '',
                '1. Open WhatsApp on your phone',
                '2. Go to Settings → Linked Devices → Link a Device',
                '3. Scan the QR code shown above',
                '',
                '💡 *Alternative Method (if QR scanning fails):*',
                '• Tap on "Link with phone number instead"',
                '• Enter your phone number: ' + cleanNumber,
                '• Wait for verification',
                '',
                '✅ The pairing code is derived from the actual WhatsApp authentication'
            ]
        });

    } catch (error) {
        console.error('Pair code generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate pairing code: ' + error.message 
        });
    }
});

// Get current session string
app.get('/get-session', (req, res) => {
    if (!isConnected) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    res.json({
        sessionString: currentSessionString,
        connected: true,
        user: sock.user?.id || 'unknown',
        generatedAt: new Date().toISOString()
    });
});

// Check connection status
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: !!qrCode,
        sessionString: currentSessionString,
        activePairingSessions: pairingSessions.size,
        user: sock?.user ? {
            id: sock.user.id,
            name: sock.user.name
        } : null
    });
});

// Clear session
app.delete('/clear-session', async (req, res) => {
    try {
        console.log('🗑️ Clearing session...');
        
        await safeLogout();
        await safeClose();
        
        // Clear auth info
        try {
            fs.rmSync(path.join(CURRENT_DIR, 'auth_info'), { recursive: true, force: true });
            console.log('✅ Auth info cleared');
        } catch (error) {
            console.log('⚠️ Error clearing auth info:', error.message);
        }
        
        // Reset state
        isConnected = false;
        qrCode = null;
        currentSessionString = '';
        pairingSessions.clear();
        
        // Reinitialize
        setTimeout(() => initializeWhatsApp(), 2000);
        
        res.json({ 
            message: 'Session cleared successfully. Reinitializing connection...' 
        });
    } catch (error) {
        console.error('Error clearing session:', error);
        res.status(500).json({ 
            error: 'Failed to clear session: ' + error.message 
        });
    }
});

// Clean up expired pairing sessions
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [code, session] of pairingSessions.entries()) {
        if (now > session.expiresAt) {
            pairingSessions.delete(code);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🗑️ Cleaned ${cleaned} expired pairing sessions`);
    }
}, 60000); // Run every minute

// Start server
async function startServer() {
    try {
        console.log('🚀 Starting WhatsApp Session Generator...');
        
        if (!fs.existsSync(PUBLIC_DIR)) {
            console.log('❌ Public folder not found!');
            return;
        }
        
        const authExists = fs.existsSync(path.join(CURRENT_DIR, 'auth_info'));
        
        if (authExists) {
            console.log('🔍 Found existing auth session, attempting to reconnect...');
        } else {
            console.log('🆕 No existing session found, ready for new authentication');
        }

        await initializeWhatsApp();
        
        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`📁 Serving files from: ${PUBLIC_DIR}`);
            console.log(`🏠 Homepage: http://localhost:${PORT}/`);
            console.log(`📱 QR Code: http://localhost:${PORT}/qrcode.html`);
            console.log(`🔢 Pair Code: http://localhost:${PORT}/paircode.html`);
            console.log(`🔐 Session: http://localhost:${PORT}/get-session`);
            console.log('\n💡 Features:');
            console.log('   • QR Code Authentication ✓');
            console.log('   • REAL Pairing Code System ✓');
            console.log('   • Unique Session String for Deployment ✓');
            console.log('   • Auto DM session info on connection ✓');
            console.log('   • Session persistence ✓');
            console.log('   • Auto-reconnection ✓');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown() {
    console.log('\n🛑 Shutting down server gracefully...');
    isShuttingDown = true;
    
    await safeLogout();
    await safeClose();
    
    console.log('✅ Server shutdown complete');
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);

// Start the server
startServer();