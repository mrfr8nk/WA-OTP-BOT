const {
    generateOTP,
    formatPhoneNumber,
    getWhatsAppJID,
    saveOTP,
    verifyOTP,
    getOTPStats,
    connectDB
} = require('./otpService');

let waConnection = null;
let botStatus = {
    connected: false,
    connectionTime: null,
    phoneNumber: null
};

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

async function setupOTPRoutes(app) {
    await connectDB();

    app.use(require('express').json());
    app.use(require('express').urlencoded({ extended: true }));
    
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

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
            const otp = generateOTP();
            
            await saveOTP(formattedNumber, otp);
            
            const jid = getWhatsAppJID(formattedNumber);
            const message = `Your verification code is: *${otp}*\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`;
            
            await waConnection.sendMessage(jid, { 
                text: message,
                contextInfo: {
                    externalAdReply: { 
                        title: 'Verification Code',
                        body: 'OTP Verification System',
                        mediaType: 1,
                        sourceUrl: "",
                        thumbnailUrl: "https://i.ibb.co/6RPYc2rF/4681.jpg",
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });
            
            console.log(`✅ OTP sent to ${formattedNumber}: ${otp}`);
            
            res.json({
                success: true,
                message: 'OTP sent successfully',
                phoneNumber: formattedNumber,
                expiresIn: 600
            });
            
        } catch (error) {
            console.error('Send OTP error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP',
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
