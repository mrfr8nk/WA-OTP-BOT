
/*
MADE BY DARRELL MUCHERI
W.A BOT FOR SENDING OTPS

*/


const {
    default: makeWASocket,
    getAggregateVotesInPollMessage, 
    useMultiFileAuthState,
    DisconnectReason,
    getDevice,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    getContentType,
    Browsers,
    makeInMemoryStore,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto
} = require('@whiskeysockets/baileys')
const { 
  getBuffer, 
  getGroupAdmins, 
  getRandom, 
  h2k, 
  isUrl, 
  Json, 
  runtime, 
  sleep, 
  fetchJson 
} = require('./lib/functions')
const fs = require('fs')
const P = require('pino')
const FileType = require('file-type')
const l = console.log
var config = require('./settings')
const qrcode = require('qrcode-terminal')
const NodeCache = require('node-cache')
const util = require('util')
const { 
  sms,
  downloadMediaMessage 
} = require('./lib/msg')
const axios = require('axios')
const { File } = require('megajs')
const { exec } = require('child_process');
const { tmpdir } = require('os')
const Crypto = require('crypto')
const path = require('path')
const zlib = require('zlib')

const Jimp = require('jimp')
const { setupOTPRoutes, setWAConnection } = require('./lib/otpRoutes')

var prefix = config.PREFIX
var prefixRegex = config.prefix === "false" || config.prefix === "null" ? "^" : new RegExp('^[' + config.PREFIX + ']');

 function genMsgId() {
  const lt = 'Supunmd';
  const prefix = "3EB";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomText = prefix;

  for (let i = prefix.length; i < 22; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomText += characters.charAt(randomIndex);
  }   
 return randomText;
}    

const msgRetryCounterCache = new NodeCache()

const ownerNumber =  ['263719647303']

//==================== SESSION MANAGEMENT ====================
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

// Create session directory if it doesn't exist
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log("📁 Created session directory");
}

// Session providers configuration
const SESSION_PROVIDERS = {
    DAREX_NEW: {
        SESSION_SITE: 'https://pair.subzero.gleeze.com',
        PREFIX: 'Ice~',
        ID_LENGTH: 6
    },
    DAREX_OLD: {
        SESSION_SITE: 'https://sessions.subzero.gleeze.com',
        PREFIX: 'Darex~',
        ID_LENGTH: 6
    },
    GITHUB: {
        REPO_NAME: 'sb-sessions',
        REPO_OWNER: 'mrfr8nk',
        PREFIX: 'SUBZERO~',
        SHORT_ID_LENGTH: 8
    },
    MONGO: {
        BASE_URL: 'https://subzero-md.koyeb.app',
        API_KEY: 'subzero-md',
        PREFIX: 'SUBZERO-MD~'
    },
    MEGA: {
        PREFIX_ALT: 'SUBZERO-MD;;;'
    }
};

const { Octokit } = require('@octokit/rest');
const octokit = process.env.GITHUB_TOKEN 
    ? new Octokit({ auth: process.env.GITHUB_TOKEN })
    : new Octokit();

async function loadSession() {
    try {
        if (!config.SESSION_ID) {
            console.log('[❌] No SESSION_ID provided - please add one!');
            return null;
        }

        console.log('[⏳] Attempting to load session...');

        // Method 1: Ice~ (NEW GitHub + MongoDB - Plain JSON)
        if (config.SESSION_ID.startsWith(SESSION_PROVIDERS.DAREX_NEW.PREFIX)) {
            console.log('[🗄️] Detected Ice~ session storage');
            const sessionId = config.SESSION_ID.replace(SESSION_PROVIDERS.DAREX_NEW.PREFIX, "");
            
            if (sessionId.length !== SESSION_PROVIDERS.DAREX_NEW.ID_LENGTH) {
                throw new Error(`Invalid Ice~ session ID. Expected ${SESSION_PROVIDERS.DAREX_NEW.ID_LENGTH} characters.`);
            }

            const response = await axios.get(
                `${SESSION_PROVIDERS.DAREX_NEW.SESSION_SITE}/session/${sessionId}`
            );

            if (!response.data.success) {
                throw new Error('Failed to retrieve session from Ice server');
            }

            const sessionData = response.data.session;
            fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2), 'utf8');
            console.log('[✅] Ice~ session loaded successfully');
            return sessionData;
        }

        // Method 2: Darex~ (OLD - zlib compression)
        else if (config.SESSION_ID.startsWith(SESSION_PROVIDERS.DAREX_OLD.PREFIX)) {
            console.log('[🗄️] Detected Darex~ session storage');
            const sessionId = config.SESSION_ID.replace(SESSION_PROVIDERS.DAREX_OLD.PREFIX, "");
            
            if (sessionId.length !== SESSION_PROVIDERS.DAREX_OLD.ID_LENGTH) {
                throw new Error(`Invalid Darex~ session ID. Expected ${SESSION_PROVIDERS.DAREX_OLD.ID_LENGTH} characters.`);
            }

            const response = await axios.get(
                `${SESSION_PROVIDERS.DAREX_OLD.SESSION_SITE}/session/${sessionId}`
            );

            if (!response.data.success) {
                throw new Error('Failed to retrieve session from Darex server');
            }

            // Check for plain JSON (migrated)
            if (response.data.session) {
                const sessionData = response.data.session;
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2), 'utf8');
                console.log('[✅] Darex~ session loaded (plain JSON)');
                return sessionData;
            }

            // OLD: zlib compressed format
            if (response.data.data) {
                const b64data = response.data.data;
                const compressedData = Buffer.from(b64data, 'base64');
                const decompressedData = zlib.gunzipSync(compressedData);

                fs.writeFileSync(credsPath, decompressedData, 'utf8');
                console.log('[✅] Darex~ session loaded (zlib decompressed)');
                return JSON.parse(decompressedData.toString());
            }

            throw new Error('Invalid Darex~ session response format');
        }

        // Method 3: SUBZERO~ (GitHub Direct Storage)
        else if (config.SESSION_ID.startsWith(SESSION_PROVIDERS.GITHUB.PREFIX)) {
            console.log('[🌐] Detected GitHub session storage');
            const sessionId = config.SESSION_ID.replace(SESSION_PROVIDERS.GITHUB.PREFIX, "");
            
            // Short ID format (8 characters)
            if (/^[a-f0-9]{8}$/.test(sessionId)) {
                console.log('[🆔] Detected short session ID format');
                const fileName = `SUBZERO_${sessionId}.json`;
                
                const fileResponse = await octokit.repos.getContent({
                    owner: SESSION_PROVIDERS.GITHUB.REPO_OWNER,
                    repo: SESSION_PROVIDERS.GITHUB.REPO_NAME,
                    path: `sessions/${fileName}`
                });

                const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
                fs.writeFileSync(credsPath, content);
                console.log('[✅] GitHub session loaded successfully (short ID)');
                return JSON.parse(content);
            }
            // Legacy SHA format
            else {
                console.log('[🆔] Detected legacy SHA session ID');
                const response = await octokit.repos.getContent({
                    owner: SESSION_PROVIDERS.GITHUB.REPO_OWNER,
                    repo: SESSION_PROVIDERS.GITHUB.REPO_NAME,
                    path: `sessions`
                });

                const file = response.data.find(f => f.sha === sessionId);
                if (!file) throw new Error('Session file not found');

                const fileResponse = await octokit.repos.getContent({
                    owner: SESSION_PROVIDERS.GITHUB.REPO_OWNER,
                    repo: SESSION_PROVIDERS.GITHUB.REPO_NAME,
                    path: file.path
                });

                const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
                fs.writeFileSync(credsPath, content);
                console.log('[✅] GitHub session loaded successfully (SHA)');
                return JSON.parse(content);
            }
        }

        // Method 4: SUBZERO-MD~ (MongoDB/API Storage)
        else if (config.SESSION_ID.startsWith(SESSION_PROVIDERS.MONGO.PREFIX)) {
            console.log('[🗄️] Detected MongoDB session storage');
            const response = await axios.get(
                `${SESSION_PROVIDERS.MONGO.BASE_URL}/api/downloadCreds.php/${config.SESSION_ID}`,
                { headers: { 'x-api-key': SESSION_PROVIDERS.MONGO.API_KEY } }
            );

            if (!response.data.credsData) {
                throw new Error('No credential data received');
            }

            fs.writeFileSync(credsPath, JSON.stringify(response.data.credsData), 'utf8');
            console.log('[✅] MongoDB session loaded successfully');
            return response.data.credsData;
        }

        // Method 5: MEGA.nz Storage (default)
        else {
            console.log('[☁️] Detected MEGA.nz session storage');
            const megaFileId = config.SESSION_ID.startsWith(SESSION_PROVIDERS.MEGA.PREFIX_ALT) ?
                config.SESSION_ID.replace(SESSION_PROVIDERS.MEGA.PREFIX_ALT, "") :
                config.SESSION_ID;

            const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);

            const data = await new Promise((resolve, reject) => {
                filer.download((err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            fs.writeFileSync(credsPath, data);
            console.log('[✅] MEGA session downloaded successfully');
            return JSON.parse(data.toString());
        }

    } catch (error) {
        console.error('[❌] Error loading session:', error.message);
        console.log('⚠️  Please visit: https://sessions.subzero.gleeze.com to generate a session');
        return null;
    }
}

//==================  PORTS ==================

const express = require("express");
const app = express();
const port = process.env.PORT || 7860;

setupOTPRoutes(app);

async function connectToWA() {
    try {
        console.log("[❄️] Connecting to WhatsApp ⏳️...");

        // Load session if available
        const creds = await loadSession();

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir, {
            creds: creds || undefined
        });

        const { version } = await fetchLatestBaileysVersion();
        console.log(`📱 Using WA v${version.join('.')}`);

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Firefox"),
            syncFullHistory: true,
            auth: state,
            version,
            getMessage: async() => ({})
        });

    conn.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update
        
        if (qr) {
            console.log('\n📱 Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('❌ Connection closed. Status code:', statusCode);
            console.log('Reason:', lastDisconnect?.error?.message || 'Unknown error');
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️  Device logged out. Deleting session files...');
                try {
                    if (fs.existsSync(credsPath)) {
                        fs.unlinkSync(credsPath);
                    }
                    console.log('Session cleared. Please restart the bot and scan QR code again.');
                } catch (err) {
                    console.error('Error deleting session:', err);
                }
                return;
            }
            
            if (shouldReconnect) {
                console.log('Reconnecting in 5 seconds...');
                setTimeout(() => connectToWA(), 5000);
            }
        } else if (connection === 'open') {
            console.log('[❄️] OTP Bot Connected ✅');

            console.log('Installing plugins... ')
            const pluginPath = path.join(__dirname, 'plugins');
            fs.readdirSync(pluginPath).forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() == ".js") {
                    require(path.join(pluginPath, plugin));
                }
            });
            console.log('W.A Bot Plugins installed.')
            
            setWAConnection(conn);

//================== CONNECT MG ==================

const mode = config.MODE
const statusRead = config.AUTO_READ_STATUS

let up = "✅ W.A OTP BOT CONNECTED SUCCESSFULLY\n\nPrefix: " + prefix + "\nMode: " + mode + "\nStatus Read: " + statusRead + "\n\n> POWERED BY MR FRANK OFC";

conn.sendMessage(conn.user.id,{ text: up, contextInfo: {
        mentionedJid: [''],
        groupMentions: [],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363421132465520@newsletter',
          newsletterName: "W.A OTP BOT",
          serverMessageId: 999
        },
        externalAdReply: { 
          title: 'W.A OTP BOT',
          body: 'Connected & Ready',
          mediaType: 1,
          sourceUrl: "",
          thumbnailUrl: "https://dabby.vercel.app/mrfrank-otp-bot.webp",
          renderLargerThumbnail: true,
          showAdAttribution: true
        }
      } 
})

}
})


conn.ev.on('creds.update', saveCreds)  

    conn.ev.on('messages.upsert', async (mek) => {
      try {
            mek = mek.messages[0]
            if (!mek.message) return
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message

//================== AUTO STATUS VIEW ==================

if (!mek.message) return        
mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true"){
await conn.readMessages([mek.key])  
const mnyako = await jidNormalizedUser(conn.user.id)
await conn.sendMessage(mek.key.remoteJid, { react: { key: mek.key, text: '🤧'}}, { statusJidList: [mek.key.participant, mnyako] })
}             
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            const m = sms(conn, mek)
                  var smg = m
            const type = getContentType(mek.message)
            const content = JSON.stringify(mek.message)
            const from = mek.key.remoteJid

//================== QUOTED ==================

const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []

//================== BODY ==================

const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :(type == 'interactiveResponseMessage' ) ? mek.message.interactiveResponseMessage  && mek.message.interactiveResponseMessage.nativeFlowResponseMessage && JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson) && JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id :(type == 'templateButtonReplyMessage' )? mek.message.templateButtonReplyMessage && mek.message.templateButtonReplyMessage.selectedId  : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
      

                  const isCmd = body.startsWith(prefix)     
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = body.trim().split(/ +/).slice(1)
            const q = args.join(' ')
            const isGroup = from.endsWith('@g.us')
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
            const senderNumber = sender.split('@')[0]
            const botNumber = conn.user.id.split(':')[0]
            const pushname = mek.pushName || 'OTP BOT USER'
                  const ownbot = config.SUDO
                  const isownbot = ownbot?.includes(senderNumber)
                  const developers = '263719647303'
            const isbot = botNumber.includes(senderNumber)
                  const isdev = developers.includes(senderNumber)           
                  const botNumber2 = await jidNormalizedUser(conn.user.id)
            const isCreator = [ botNumber2 ].map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(sender)    
                  const isMe = isbot ? isbot : isdev
            const isOwner = ownerNumber.includes(senderNumber) || isMe
            const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
            const groupName = isGroup ? groupMetadata.subject : ''
            const participants = isGroup ? await groupMetadata.participants : ''
            const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
            const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
            const isAdmins = isGroup ? groupAdmins.includes(sender) : false
            const isreaction = m.message.reactionMessage ? true : false
            const isReact =m.message.reactionMessage ? true : false
            const isAnti = (teks) => {
                let getdata = teks
                for (let i = 0; i < getdata.length; i++) {
                    if (getdata[i] === from) return true
                }
                return false
            }
            const reply = async(teks) => {
  return await conn.sendMessage(from, { text: teks }, { quoted: mek })
}
    
conn.edite = async (gg, newmg) => {
  await conn.relayMessage(from, {
    protocolMessage: {
key: gg.key,
type: 14,
editedMessage: {
  conversation: newmg
}
    }
  }, {})
}


//================== For RVO ==================
       
        conn.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
                let quoted = message.msg ? message.msg : message
                let mime = (message.msg || message).mimetype || ''
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
                const stream = await downloadContentFromMessage(quoted, messageType)
                let buffer = Buffer.from([])
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk])
                }
                let type = await FileType.fromBuffer(buffer)
                trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
                    // save to file
                await fs.writeFileSync(trueFileName, buffer)
                return trueFileName
            }

//================== FORWARD ==================
       
conn.forwardMessage = async (jid, message, forceForward = false, options = {}) => {
            let vtype
            if (options.readViewOnce) {
                message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
                vtype = Object.keys(message.message.viewOnceMessage.message)[0]
                delete (message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
                delete message.message.viewOnceMessage.message[vtype].viewOnce
                message.message = {
                    ...message.message.viewOnceMessage.message                             
                }
            }

            let mtype = Object.keys(message.message)[0]
            let content = await generateForwardMessageContent(message, forceForward)
            let ctype = Object.keys(content)[0]
            let context = {}
            if (mtype != "conversation") context = message.message[mtype].contextInfo
            content[ctype].contextInfo = {
                ...context,
                ...content[ctype].contextInfo
            }
            const waMessage = await generateWAMessageFromContent(jid, content, options ? {
                ...content[ctype],
                ...options,
                ...(options.contextInfo ? {
                    contextInfo: {
                        ...content[ctype].contextInfo,
                        ...options.contextInfo
                    }
                } : {})
            } : {})
            await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
            return waMessage
}

//================== OWN REACT ==================
       
if(senderNumber.includes("263719647303")){
if(isReact) return
m.react("👨‍💻")
}

//================== WORK TYPE ==================
       
if(!isOwner && config.MODE === "private") return 
if(!isOwner && isGroup && config.MODE === "inbox") return 
if(!isOwner && !isGroup && config.MODE === "groups") return 

//================== PLUGIN MAP ==================
       
const events = require('./lib/command')
const cmdName = isCmd ?  command : false;
if (isCmd) {
  const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName))
  if (cmd) {
    if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } })

    try {
cmd.function(conn, mek, m, { from, prefix, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, botNumber2 });
    } catch (e) {
console.error("[PLUGIN ERROR] ", e);
    }
  }
}
events.commands.map(async (command) => {
  if (body && command.on === "body") {
    command.function(conn, mek, m, { from, prefix, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, botNumber2 });
  } else if (mek.q && command.on === "text") {
    command.function(conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply , botNumber2 });
  } else if (
    (command.on === "image" || command.on === "photo") &&
    mek.type === "imageMessage"
  ) {
    command.function(conn, mek, m, { from, prefix, l, quoted, body,  isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply , botNumber2 });
  } else if (
    command.on === "sticker" &&
    mek.type === "stickerMessage"
  ) {
    command.function(conn, mek, m, { from, prefix, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply , botNumber2 });
  }
});




            switch (command) {
        case 'jid':
        reply(from)
        break
        
        default:                                
        if (isOwner && body.startsWith('$')) {
        let bodyy = body.split('$')[1]
        let code2 = bodyy.replace("°", ".toString()");
        try {
        let resultTest = await eval(code2);
        if (typeof resultTest === "object") {
        reply(util.format(resultTest));
        } else {
        reply(util.format(resultTest));
        }
        } catch (err) {
        reply(util.format(err));
        }}}
        } catch (e) {
            const isError = String(e)
            console.log(isError)
        }
    })
    } catch (error) {
        console.error('❌ Fatal error in connectToWA:', error);
        console.log('Retrying connection in 10 seconds...');
        setTimeout(() => connectToWA(), 10000);
    }
}
app.listen(port, '0.0.0.0', () => console.log(`Server listening on port http://0.0.0.0:` + port));
setTimeout(() => {
connectToWA()
}, 3000);
