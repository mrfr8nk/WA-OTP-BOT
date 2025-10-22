const { MongoClient } = require('mongodb');

let db;
let otpCollection;

async function connectDB() {
    if (db) return db;
    
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('✅ MongoDB connected successfully');
        
        db = client.db('whatsapp_otp');
        otpCollection = db.collection('otps');
        
        await otpCollection.createIndex({ phoneNumber: 1 });
        await otpCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 });
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(number) {
    let cleaned = number.replace(/[^\d]/g, '');
    
    if (!cleaned.startsWith('263') && !cleaned.startsWith('1') && !cleaned.startsWith('91')) {
        if (cleaned.length === 9) {
            cleaned = '263' + cleaned;
        }
    }
    
    return cleaned;
}

function getWhatsAppJID(phoneNumber) {
    const formatted = formatPhoneNumber(phoneNumber);
    return `${formatted}@s.whatsapp.net`;
}

async function saveOTP(phoneNumber, code) {
    await connectDB();
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    const otpData = {
        phoneNumber: formattedNumber,
        code: code,
        verified: false,
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
    
    await otpCollection.updateOne(
        { phoneNumber: formattedNumber },
        { $set: otpData },
        { upsert: true }
    );
    
    return otpData;
}

async function verifyOTP(phoneNumber, code) {
    await connectDB();
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    const otpRecord = await otpCollection.findOne({
        phoneNumber: formattedNumber,
        verified: false
    });
    
    if (!otpRecord) {
        return { success: false, message: 'No OTP found or already verified' };
    }
    
    if (new Date() > otpRecord.expiresAt) {
        await otpCollection.deleteOne({ phoneNumber: formattedNumber });
        return { success: false, message: 'OTP has expired' };
    }
    
    if (otpRecord.attempts >= 5) {
        return { success: false, message: 'Too many attempts. Request a new OTP' };
    }
    
    if (otpRecord.code !== code) {
        await otpCollection.updateOne(
            { phoneNumber: formattedNumber },
            { $inc: { attempts: 1 } }
        );
        return { success: false, message: 'Invalid OTP code' };
    }
    
    await otpCollection.updateOne(
        { phoneNumber: formattedNumber },
        { $set: { verified: true, verifiedAt: new Date() } }
    );
    
    return { success: true, message: 'OTP verified successfully' };
}

async function getOTPStats() {
    await connectDB();
    
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const [totalCount, verifiedCount, todayCount] = await Promise.all([
        otpCollection.countDocuments({}),
        otpCollection.countDocuments({ verified: true }),
        otpCollection.countDocuments({ createdAt: { $gte: oneDayAgo } })
    ]);
    
    return {
        total: totalCount,
        verified: verifiedCount,
        pending: totalCount - verifiedCount,
        last24Hours: todayCount
    };
}

module.exports = {
    connectDB,
    generateOTP,
    formatPhoneNumber,
    getWhatsAppJID,
    saveOTP,
    verifyOTP,
    getOTPStats
};
