
# 📱 WhatsApp OTP Verification Bot

<div align="center">
  <img src="https://dabby.vercel.app/mrfrank-otp-bot.webp" alt="WhatsApp OTP Bot" width="200"/>
  
  [![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
</div>

## 📋 Overview

A powerful WhatsApp-based OTP (One-Time Password) verification system that seamlessly integrates phone number verification into your websites and applications. Send 6-digit verification codes via WhatsApp and verify them through simple API endpoints.

## ✨ Features

- 🔐 **Secure OTP Generation** - Random 6-digit codes sent via WhatsApp
- ✅ **API-Based Verification** - RESTful endpoints for easy integration
- 💾 **MongoDB Storage** - Secure and scalable OTP data management
- ⏰ **Auto-Expiration** - OTPs expire after 10 minutes
- 🛡️ **Rate Limiting** - Maximum 5 verification attempts per OTP
- 📊 **Real-time Dashboard** - Monitor bot status and statistics
- 🌍 **International Support** - Works with phone numbers worldwide
- 🔌 **Plugin System** - Extensible architecture for custom features
- 📱 **Multi-Session Support** - Multiple session storage methods

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **WhatsApp Client**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- **Web Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose ODM

### Authentication & Session
- Multi-file auth state with Baileys
- Session persistence across multiple providers:
  - GitHub Repository Storage
  - MongoDB API Storage
  - MEGA.nz Cloud Storage
  - Custom Ice/Darex Session Servers

### Utilities
- **QR Code**: qrcode-terminal - Terminal QR code generation
- **Image Processing**: Jimp - Image manipulation
- **Date/Time**: Moment.js - Time formatting and calculations
- **HTTP Client**: Axios - API requests
- **File Type Detection**: file-type
- **Logging**: Pino (P)

### Development
- **Package Manager**: npm
- **Version Control**: Git
- **Deployment**: Replit (recommended)

## 🚀 Quick Start

### Prerequisites

1. WhatsApp account (phone number)
2. MongoDB database (MongoDB Atlas recommended)
3. Node.js environment (20.x or higher)

### Installation

1. **Clone or Deploy**
   ```bash
   git clone <repository-url>
   cd wa-otp-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   
   Add to Replit Secrets or create `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_ID=your_session_id (optional)
   PREFIX=. (default)
   MODE=public (public/private/inbox/groups)
   ```

4. **Start the Bot**
   ```bash
   npm start
   ```

5. **Scan QR Code**
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices
   - Scan the QR code displayed in terminal

6. **Your OTP API is Live!**
   ```
   https://your-replit-app.replit.app
   ```

## 📡 API Endpoints

### Base URL
```
https://your-replit-app.replit.app
```

### 1. Send OTP
```http
GET /api/sendotp?number=263719647303
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "263719647303",
  "expiresIn": 600
}
```

### 2. Verify OTP
```http
GET /api/verifyotp?number=263719647303&code=123456
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "phoneNumber": "263719647303"
}
```

### 3. Bot Status
```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "bot": {
    "connected": true,
    "uptime": 3600,
    "phoneNumber": "1234567890"
  },
  "stats": {
    "total": 150,
    "verified": 120,
    "pending": 30,
    "last24Hours": 45
  }
}
```

## 💻 Integration Examples

## See demo:
<a href="https://otp-webtest.onrender.com/"> Click me</a>

### HTML/JavaScript
```html
<script>
const API_URL = 'https://your-app.replit.app';

async function sendOTP(phone) {
  const res = await fetch(`${API_URL}/api/sendotp?number=${phone}`);
  return await res.json();
}

async function verifyOTP(phone, code) {
  const res = await fetch(`${API_URL}/api/verifyotp?number=${phone}&code=${code}`);
  return await res.json();
}
</script>
```

### React
```jsx
const verifyPhone = async (phone, code) => {
  try {
    const response = await fetch(
      `${API_URL}/api/verifyotp?number=${phone}&code=${code}`
    );
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
};
```

### Node.js Backend
```javascript
const axios = require('axios');

app.post('/verify-user', async (req, res) => {
  const { phone, otpCode } = req.body;
  
  const response = await axios.get(
    `${OTP_API}/api/verifyotp?number=${phone}&code=${otpCode}`
  );
  
  if (response.data.success) {
    // User verified, proceed with registration
    res.json({ verified: true });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});
```

## 🏗️ Project Structure

```
.
├── index.js              # Main bot entry point & connection logic
├── settings.js           # Configuration settings
├── lib/
│   ├── command.js        # Command registration system
│   ├── functions.js      # Utility functions
│   ├── msg.js            # Message handling utilities
│   ├── otpRoutes.js      # API endpoints & web dashboard
│   └── otpService.js     # OTP generation & MongoDB logic
├── plugins/
│   └── alive.js          # Bot status command plugin
├── session/              # WhatsApp session data (auto-generated)
├── docs.md               # Complete API documentation
└── package.json          # Dependencies & scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `SESSION_ID` | WhatsApp session ID | Optional |
| `PREFIX` | Bot command prefix | `.` |
| `MODE` | Bot mode (public/private/inbox/groups) | `public` |
| `PORT` | Server port | `5000` |

### Bot Modes

- **public**: Responds to everyone
- **private**: Owner only
- **inbox**: Private chats only
- **groups**: Group chats only

## 📊 Database Schema

```javascript
{
  phoneNumber: String,      // Formatted phone number
  code: String,            // 6-digit OTP code
  verified: Boolean,       // Verification status
  attempts: Number,        // Verification attempts count
  createdAt: Date,         // Creation timestamp
  expiresAt: Date,         // Expiration (10 mins)
  verifiedAt: Date         // Verification timestamp
}
```

## 🔒 Security Features

- ✅ HTTPS recommended for production
- ✅ Rate limiting (max 5 attempts per OTP)
- ✅ Auto-expiration (10 minutes)
- ✅ Secure MongoDB storage
- ✅ Phone number validation
- ✅ No OTP reuse after verification

## 🐛 Troubleshooting

### Bot Not Connecting
1. Verify WhatsApp Web is accessible
2. Check session credentials
3. Scan QR code again if needed
4. Review console logs for errors

### OTP Not Sending
1. Confirm bot status via `/api/status`
2. Verify phone number format (with country code)
3. Ensure recipient is on WhatsApp
4. Check MongoDB connection

### Database Errors
1. Verify `MONGODB_URI` is correct
2. Check database permissions
3. Ensure MongoDB cluster is running

## 📖 Documentation

For complete API documentation and integration guides, see [docs.md](docs.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Credits

**Developer**: Darrell Mucheri (Mr Frank)  
**Contact**: +263719647303  
**GitHub**: [@mrfr8nk](https://github.com/mrfr8nk)

### Special Thanks
- Baileys WhatsApp Web API team
- Open source community
- All contributors

---

<div align="center">
  
Made with ❤️ by **Mr Frank (Darrell Mucheri)**

⭐ Star this repo if you find it helpful!

</div>
