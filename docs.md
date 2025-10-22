# WhatsApp OTP Verification Bot - Documentation

## Overview

This is a WhatsApp-based OTP (One-Time Password) verification system that allows you to integrate phone number verification into your websites and applications. The bot sends 6-digit verification codes via WhatsApp and provides API endpoints to verify the codes.

## Features

- ✅ Send OTP codes via WhatsApp
- ✅ Verify OTP codes through API
- ✅ MongoDB database for secure OTP storage
- ✅ Automatic code expiration (10 minutes)
- ✅ Rate limiting (max 5 verification attempts)
- ✅ Real-time bot status dashboard
- ✅ Statistics tracking
- ✅ International phone number support

## Getting Started

### Prerequisites

1. A WhatsApp account (phone number)
2. MongoDB database (MongoDB Atlas recommended)
3. Node.js environment

### Installation

1. Clone or deploy the project
2. Add your MongoDB connection string as `MONGODB_URI` in environment secrets
3. Run the bot and scan the QR code with WhatsApp
4. Your OTP verification API is now live!

## API Endpoints

### Base URL
Your Replit deployment URL: `https://your-replit-app.replit.app`

---

### 1. Send OTP

**Endpoint:** `GET /api/sendotp`

**Description:** Generates and sends a 6-digit OTP code to the specified WhatsApp number.

**Query Parameters:**
- `number` (required): Phone number with country code

**Example Request:**
```
GET /api/sendotp?number=263719647303
GET /api/sendotp?number=+263719647303
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "263719647303",
  "expiresIn": 600
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "WhatsApp bot is not connected"
}
```

---

### 2. Verify OTP

**Endpoint:** `GET /api/verifyotp`

**Description:** Verifies the OTP code for a given phone number.

**Query Parameters:**
- `number` (required): Phone number with country code
- `code` (required): 6-digit OTP code

**Example Request:**
```
GET /api/verifyotp?number=263719647303&code=123456
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "phoneNumber": "263719647303"
}
```

**Response (Error - Invalid Code):**
```json
{
  "success": false,
  "message": "Invalid OTP code"
}
```

**Response (Error - Expired):**
```json
{
  "success": false,
  "message": "OTP has expired"
}
```

**Response (Error - Too Many Attempts):**
```json
{
  "success": false,
  "message": "Too many attempts. Request a new OTP"
}
```

---

### 3. Bot Status

**Endpoint:** `GET /api/status`

**Description:** Get the current status of the WhatsApp bot and OTP statistics.

**Example Request:**
```
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

---

## Integration Guide

### Phone Number Format

The system accepts phone numbers in multiple formats:
- With `+`: `+263719647303`
- Without `+`: `263719647303`
- Country code required for international numbers

The system automatically formats numbers to the correct WhatsApp JID format.

### Frontend Integration

#### Example: HTML Form

```html
<!DOCTYPE html>
<html>
<head>
    <title>Phone Verification</title>
</head>
<body>
    <div id="phone-form">
        <h2>Enter your phone number</h2>
        <input type="tel" id="phone" placeholder="+263719647303">
        <button onclick="sendOTP()">Send OTP</button>
    </div>

    <div id="otp-form" style="display:none;">
        <h2>Enter verification code</h2>
        <input type="text" id="otp-code" placeholder="123456" maxlength="6">
        <button onclick="verifyOTP()">Verify</button>
    </div>

    <script>
        const API_URL = 'https://your-replit-app.replit.app';
        let userPhone = '';

        async function sendOTP() {
            const phone = document.getElementById('phone').value;
            if (!phone) {
                alert('Please enter a phone number');
                return;
            }

            userPhone = phone;
            const response = await fetch(`${API_URL}/api/sendotp?number=${encodeURIComponent(phone)}`);
            const data = await response.json();

            if (data.success) {
                document.getElementById('phone-form').style.display = 'none';
                document.getElementById('otp-form').style.display = 'block';
                alert('OTP sent to your WhatsApp!');
            } else {
                alert('Error: ' + data.message);
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('otp-code').value;
            if (!code || code.length !== 6) {
                alert('Please enter a valid 6-digit code');
                return;
            }

            const response = await fetch(`${API_URL}/api/verifyotp?number=${encodeURIComponent(userPhone)}&code=${code}`);
            const data = await response.json();

            if (data.success) {
                alert('Phone verified successfully!');
                // Proceed with your application logic
            } else {
                alert('Verification failed: ' + data.message);
            }
        }
    </script>
</body>
</html>
```

#### Example: React Component

```jsx
import { useState } from 'react';

const PhoneVerification = () => {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('phone');
    const API_URL = 'https://your-replit-app.replit.app';

    const sendOTP = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sendotp?number=${encodeURIComponent(phone)}`);
            const data = await response.json();
            
            if (data.success) {
                setStep('verify');
                alert('OTP sent to your WhatsApp!');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Network error');
        }
    };

    const verifyOTP = async () => {
        try {
            const response = await fetch(`${API_URL}/api/verifyotp?number=${encodeURIComponent(phone)}&code=${code}`);
            const data = await response.json();
            
            if (data.success) {
                alert('Phone verified!');
                // Handle successful verification
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Network error');
        }
    };

    if (step === 'phone') {
        return (
            <div>
                <h2>Enter Phone Number</h2>
                <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+263719647303"
                />
                <button onClick={sendOTP}>Send OTP</button>
            </div>
        );
    }

    return (
        <div>
            <h2>Enter Verification Code</h2>
            <input 
                type="text" 
                value={code} 
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
            />
            <button onClick={verifyOTP}>Verify</button>
        </div>
    );
};

export default PhoneVerification;
```

#### Example: Node.js/Express Backend

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const OTP_API = 'https://your-replit-app.replit.app';

app.post('/signup', async (req, res) => {
    const { phone, otpCode, ...userData } = req.body;

    // Verify OTP first
    try {
        const response = await axios.get(`${OTP_API}/api/verifyotp`, {
            params: { number: phone, code: otpCode }
        });

        if (response.data.success) {
            // OTP verified, proceed with user registration
            // ... your user creation logic
            res.json({ success: true, message: 'User registered successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

app.post('/request-otp', async (req, res) => {
    const { phone } = req.body;

    try {
        const response = await axios.get(`${OTP_API}/api/sendotp`, {
            params: { number: phone }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

app.listen(3000);
```

---

## Database Schema

### OTP Collection

```javascript
{
    phoneNumber: String,      // Formatted phone number
    code: String,            // 6-digit OTP code
    verified: Boolean,       // Verification status
    attempts: Number,        // Number of verification attempts
    createdAt: Date,         // Creation timestamp
    expiresAt: Date,         // Expiration timestamp (10 minutes)
    verifiedAt: Date         // Verification timestamp (if verified)
}
```

**Indexes:**
- `phoneNumber`: For quick lookups
- `createdAt`: TTL index (automatic deletion after 10 minutes)

---

## Security Best Practices

1. **HTTPS Only**: Always use HTTPS in production
2. **Rate Limiting**: Implement rate limiting on your frontend to prevent abuse
3. **CORS**: Configure CORS properly for your domain
4. **Phone Validation**: Validate phone numbers on your frontend before sending requests
5. **Webhook Security**: Use API keys or tokens if implementing webhooks
6. **Environment Variables**: Never expose your MongoDB URI or secrets

---

## Error Handling

### Common Error Codes

| Status Code | Meaning |
|------------|---------|
| 200 | Success |
| 400 | Bad Request (missing parameters, invalid OTP) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (bot disconnected) |

### Error Messages

- `Phone number is required` - Missing number parameter
- `Phone number and code are required` - Missing parameters in verify
- `WhatsApp bot is not connected` - Bot is offline
- `No OTP found or already verified` - OTP doesn't exist or was already used
- `OTP has expired` - Code is older than 10 minutes
- `Too many attempts` - User exceeded 5 verification attempts
- `Invalid OTP code` - Wrong code provided

---

## Monitoring & Dashboard

Access the web dashboard at your deployment URL to monitor:

- Bot connection status
- Uptime tracking
- Total OTPs sent
- Verification success rate
- Pending verifications
- Last 24-hour activity

The dashboard auto-refreshes every 10 seconds.

---

## Configuration

### Environment Variables

- `MONGODB_URI`: MongoDB connection string (required)
- `PORT`: Server port (default: 5000)
- `SESSION_ID`: WhatsApp session ID (optional, for session persistence)
- `PREFIX`: Bot command prefix (default: '.')
- `MODE`: Bot mode - 'private', 'groups', 'inbox' (default: 'groups')

---

## Troubleshooting

### Bot Not Connecting
1. Check if WhatsApp Web is accessible
2. Verify session credentials
3. Scan QR code again if needed

### OTP Not Sending
1. Verify bot is connected (`/api/status`)
2. Check phone number format
3. Ensure recipient is on WhatsApp
4. Check MongoDB connection

### Database Errors
1. Verify MongoDB URI is correct
2. Check database permissions
3. Ensure MongoDB cluster is running

---

## Support & Credits

**Developer:** Darrell Mucheri  
**Phone:** +263719647303

---

## License

This project is provided as-is for integration purposes. Modify and use according to your needs.

---

## Changelog

### Version 1.0.0
- Initial release
- OTP generation and verification
- MongoDB integration
- Web dashboard
- API endpoints
- Documentation
