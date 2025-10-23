const {
    generateOTP,
    formatPhoneNumber,
    getWhatsAppJID,
    saveOTP,
    verifyOTP,
    getOTPStats,
    connectDB
} = require('./otpService');

const { MongoClient } = require('mongodb');
let otpCollection;

let waConnection = null;
let botStatus = {
    connected: false,
    connectionTime: null,
    phoneNumber: null
};

// Store timestamps of recent OTP requests to implement rate limiting
const otpRequestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Allow 5 requests per minute per number

function setWAConnection(conn) {
    waConnection = conn;
    botStatus.connected = true;
    botStatus.connectionTime = new Date();
    if (conn && conn.user) {
        botStatus.phoneNumber = conn.user.id.split(':')[0];
    }
}

function getBotStatus() {
    return botStatus;
}

// Function to handle button responses
function setupButtonHandler() {
    if (!waConnection) return;
    
    waConnection.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message?.buttonsResponseMessage) return;

        const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
        const from = msg.key.remoteJid;

        // Check if it's a copy button
        if (buttonId.startsWith('copy_')) {
            const otp = buttonId.replace('copy_', '');
            
            // Send confirmation message
            await waConnection.sendMessage(from, {
                text: `✅ OTP *${otp}* has been copied to your clipboard!\n\nYou can now paste it wherever needed.`
            }, { quoted: msg });

            console.log(`📋 User copied OTP: ${otp}`);
        }
    });
}

async function setupOTPRoutes(app) {
    const db = await connectDB();
    otpCollection = db.collection('otps');

    app.use(require('express').json());
    app.use(require('express').urlencoded({ extended: true }));

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // Setup button handler when routes are initialized
    setupButtonHandler();

    app.get('/api/status', async (req, res) => {
        try {
            const stats = await getOTPStats();
            res.json({
                success: true,
                bot: {
                    connected: botStatus.connected,
                    uptime: botStatus.connectionTime ? Math.floor((Date.now() - botStatus.connectionTime) / 1000) : 0,
                    phoneNumber: botStatus.phoneNumber
                },
                stats
            });
        } catch (error) {
            console.error('Status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get status',
                error: error.message
            });
        }
    });

    app.get('/api/sendotp', async (req, res) => {
        try {
            const { number } = req.query;

            if (!number) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }

            if (!waConnection || !botStatus.connected) {
                return res.status(503).json({
                    success: false,
                    message: 'WhatsApp bot is not connected'
                });
            }

            const formattedNumber = formatPhoneNumber(number);

            // Rate limiting implementation
            const currentTime = Date.now();
            const requestTimestamps = otpRequestTimestamps.get(formattedNumber) || [];

            // Filter out timestamps older than the rate limit window
            const recentTimestamps = requestTimestamps.filter(timestamp => currentTime - timestamp < RATE_LIMIT_WINDOW_MS);

            if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please try again later.',
                    phoneNumber: formattedNumber
                });
            }

            // Add current timestamp and update the map
            recentTimestamps.push(currentTime);
            otpRequestTimestamps.set(formattedNumber, recentTimestamps);

            const otp = generateOTP();

            await saveOTP(formattedNumber, otp);

            const jid = getWhatsAppJID(formattedNumber);
            
            // Interactive message with copy button for OTP
            const interactiveMessage = {
                text: `*\`🔐 VERIFICATION CODE\`*\n\n\`\`\`Your OTP is:\n\n*${otp}*\`\`\`\n\nThis code will expire in 10 minutes.\n\n⚠️ Do not share this code with anyone.\n\n> Made By Darrell Mucheri`,
                footer: "OTP Verification System",
                buttons: [
                    {
                        buttonId: `copy_${otp}`,
                        buttonText: { displayText: '📋 Copy Code' },
                        type: 1
                    },
                    {
                        buttonId: `resend_${formattedNumber}`,
                        buttonText: { displayText: '🔄 Resend Code' },
                        type: 1
                    }
                ],
                headerType: 1
            };

            await waConnection.sendMessage(jid, interactiveMessage);

            console.log(`✅ OTP sent to ${formattedNumber}: ${otp}`);

            res.json({
                success: true,
                message: 'OTP sent successfully',
                phoneNumber: formattedNumber,
                expiresIn: 600
            });

        } catch (error) {
            console.error('Send OTP error:', error);
            // Clear timestamp if an error occurred during sending to allow retries
            const { number } = req.query;
            if (number) {
                const formattedNumber = formatPhoneNumber(number);
                const requestTimestamps = otpRequestTimestamps.get(formattedNumber) || [];
                const currentTime = Date.now();
                const updatedTimestamps = requestTimestamps.filter(timestamp => currentTime - timestamp < RATE_LIMIT_WINDOW_MS);
                otpRequestTimestamps.set(formattedNumber, updatedTimestamps);
            }

            res.status(500).json({
                success: false,
                message: 'Failed to send OTP',
                error: error.message
            });
        }
    });

    // Handle resend button
    app.get('/api/resendotp', async (req, res) => {
        try {
            const { number } = req.query;

            if (!number) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }

            const formattedNumber = formatPhoneNumber(number);
            const otp = generateOTP();

            await saveOTP(formattedNumber, otp);

            const jid = getWhatsAppJID(formattedNumber);
            
            const interactiveMessage = {
                text: `*\`🔄 NEW VERIFICATION CODE\`*\n\n\`\`\`Your new OTP is:\n\n*${otp}*\`\`\`\n\nThis code will expire in 10 minutes.\n\n⚠️ Do not share this code with anyone.`,
                footer: "OTP Verification System",
                buttons: [
                    {
                        buttonId: `copy_${otp}`,
                        buttonText: { displayText: '📋 Copy Code' },
                        type: 1
                    }
                ],
                headerType: 1
            };

            await waConnection.sendMessage(jid, interactiveMessage);

            console.log(`🔄 OTP resent to ${formattedNumber}: ${otp}`);

            res.json({
                success: true,
                message: 'OTP resent successfully',
                phoneNumber: formattedNumber
            });

        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend OTP',
                error: error.message
            });
        }
    });

    app.get('/api/verifyotp', async (req, res) => {
        try {
            const { number, code } = req.query;

            if (!number || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number and code are required'
                });
            }

            const result = await verifyOTP(number, code);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    phoneNumber: formatPhoneNumber(number)
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify OTP',
                error: error.message
            });
        }
    });

    app.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp OTP Bot</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        max-width: 600px;
                        width: 100%;
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 28px;
                        margin-bottom: 10px;
                    }
                    .status {
                        display: inline-block;
                        padding: 8px 20px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 20px;
                        font-size: 14px;
                        margin-top: 10px;
                    }
                    .status.online {
                        background: rgba(255,255,255,0.3);
                    }
                    .status.offline {
                        background: rgba(255,0,0,0.3);
                    }
                    .content {
                        padding: 30px;
                    }
                    .stats {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 32px;
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 5px;
                    }
                    .stat-label {
                        font-size: 14px;
                        color: #6c757d;
                    }
                    .api-section {
                        margin-top: 30px;
                        padding-top: 30px;
                        border-top: 2px solid #f0f0f0;
                    }
                    .api-section h2 {
                        color: #333;
                        margin-bottom: 20px;
                    }
                    .endpoint {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                    }
                    .method {
                        display: inline-block;
                        padding: 4px 12px;
                        background: #28a745;
                        color: white;
                        border-radius: 4px;
                        font-size: 12px;
                        margin-right: 10px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #6c757d;
                        font-size: 14px;
                    }
                    .refresh-btn {
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                        width: 100%;
                    }
                    .refresh-btn:hover {
                        background: #5568d3;
                    }
                    .test-section {
                        margin-top: 30px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 10px;
                    }
                    .test-input {
                        width: 100%;
                        padding: 12px;
                        margin: 10px 0;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-size: 16px;
                    }
                    .test-btn {
                        background: #25D366;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📱 WhatsApp OTP Bot</h1>
                        <p>Verification System API</p>
                        <div class="status" id="status">
                            <span id="status-text">Checking...</span>
                        </div>
                    </div>

                    <div class="content">
                        <div class="stats">
                            <div class="stat-card">
                                <div class="stat-value" id="total-otps">-</div>
                                <div class="stat-label">Total OTPs</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="verified-otps">-</div>
                                <div class="stat-label">Verified</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="pending-otps">-</div>
                                <div class="stat-label">Pending</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="uptime">-</div>
                                <div class="stat-label">Uptime (min)</div>
                            </div>
                        </div>

                        <button class="refresh-btn" onclick="fetchStatus()">🔄 Refresh Status</button>

                        <div class="test-section">
                            <h3>Test OTP System</h3>
                            <input type="text" id="testNumber" class="test-input" placeholder="263719647303" />
                            <button class="test-btn" onclick="sendOTP()">📤 Send OTP</button>
                            <div id="testResult"></div>
                        </div>

                        <div class="api-section">
                            <h2>API Endpoints</h2>

                            <div class="endpoint">
                                <span class="method">GET</span>
                                /api/sendotp?number=YOUR_PHONE_NUMBER
                            </div>

                            <div class="endpoint">
                                <span class="method">GET</span>
                                /api/verifyotp?number=YOUR_PHONE_NUMBER&code=123456
                            </div>

                            <div class="endpoint">
                                <span class="method">GET</span>
                                /api/status
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        Made with ❤️ by Darrell Mucheri
                    </div>
                </div>

                <script>
                    async function fetchStatus() {
                        try {
                            const response = await fetch('/api/status');
                            const data = await response.json();

                            if (data.success) {
                                const statusEl = document.getElementById('status');
                                statusEl.className = 'status ' + (data.bot.connected ? 'online' : 'offline');
                                document.getElementById('status-text').textContent = data.bot.connected ? '🟢 Online' : '🔴 Offline';

                                document.getElementById('total-otps').textContent = data.stats.total || 0;
                                document.getElementById('verified-otps').textContent = data.stats.verified || 0;
                                document.getElementById('pending-otps').textContent = data.stats.pending || 0;
                                document.getElementById('uptime').textContent = Math.floor((data.bot.uptime || 0) / 60);
                            }
                        } catch (error) {
                            console.error('Failed to fetch status:', error);
                            document.getElementById('status-text').textContent = '⚠️ Error';
                        }
                    }

                    async function sendOTP() {
                        const number = document.getElementById('testNumber').value;
                        const resultDiv = document.getElementById('testResult');
                        
                        if (!number) {
                            resultDiv.innerHTML = '<span style="color: red;">Please enter a phone number</span>';
                            return;
                        }

                        resultDiv.innerHTML = 'Sending OTP...';

                        try {
                            const response = await fetch('/api/sendotp?number=' + number);
                            const data = await response.json();

                            if (data.success) {
                                resultDiv.innerHTML = '<span style="color: green;">✅ OTP sent successfully! Check WhatsApp</span>';
                            } else {
                                resultDiv.innerHTML = '<span style="color: red;">❌ ' + data.message + '</span>';
                            }
                        } catch (error) {
                            resultDiv.innerHTML = '<span style="color: red;">❌ Failed to send OTP</span>';
                        }
                    }

                    fetchStatus();
                    setInterval(fetchStatus, 10000);
                </script>
            </body>
            </html>
        `);
    });
}

module.exports = {
    setupOTPRoutes,
    setWAConnection,
    getBotStatus
};
