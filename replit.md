# WhatsApp OTP Bot

## Overview
This is a WhatsApp bot built with Node.js using the Baileys library. It connects to WhatsApp Web and responds to commands. The bot is designed to handle OTP (One-Time Password) operations and includes plugin support for extensibility.

## Project Status
- **Current State**: Fully configured and running on Replit
- **Last Updated**: October 22, 2025
- **Status**: Bot is operational and ready for WhatsApp connection

## Tech Stack
- **Runtime**: Node.js 20.x
- **Main Library**: @whiskeysockets/baileys (WhatsApp Web API)
- **Web Server**: Express.js (port 5000)
- **Session Storage**: File-based multi-auth state in `session/` directory
- **Dependencies**: SQLite3, Sequelize, jimp, moment, and others (see package.json)

## Project Structure
```
.
├── index.js              # Main bot entry point
├── settings.js           # Configuration settings
├── lib/
│   ├── command.js        # Command registration system
│   ├── functions.js      # Utility functions
│   └── msg.js            # Message handling utilities
├── plugins/
│   └── alive.js          # Example plugin (alive status command)
└── session/              # WhatsApp session data (auto-generated)
```

## Setup Instructions

### First Time Setup
1. The bot will generate a QR code when you first run it
2. Scan the QR code with your WhatsApp mobile app (Linked Devices)
3. Session credentials will be saved in the `session/` directory
4. On subsequent runs, the bot will use saved credentials

### Environment Variables (Optional)
You can configure these via Secrets or `.env` file:
- `SESSION_ID`: Pre-configured session (format: `SUBZERO;;;mega_url_hash`)
- `PREFIX`: Command prefix (default: `.`)
- `MODE`: Bot mode - `public`, `private`, `inbox`, or `groups` (default: `groups`)
- `AUTO_READ_STATUS`: Auto-read WhatsApp status (default: `true`)

## Recent Changes
- **2025-10-22**: Initial Replit setup
  - Fixed plugin import path in `alive.js`
  - Added missing dependencies: `moment`, `async-lock`, `link-preview-js`
  - Updated `jimp` to version 1.6.0 for Baileys compatibility
  - Changed Express server port from 9000 to 5000
  - Added proper host binding to 0.0.0.0 for Replit environment
  - Fixed SESSION_ID validation to handle missing or invalid sessions
  - Created `.gitignore` for Node.js project

## How It Works

### Bot Initialization
1. Express server starts on port 5000
2. After 9 seconds delay, WhatsApp connection initiates
3. Bot loads all plugins from `plugins/` directory
4. QR code displays in console (if no session exists)
5. Once connected, sends confirmation message

### Command System
- Commands are defined using the `cmd()` function in plugins
- Default prefix: `.` (configurable)
- Example: `.alive` - Shows bot uptime and status

### Plugin Development
Create new plugins in `plugins/` directory:
```javascript
const { cmd } = require("../lib/command");

cmd({
    pattern: "yourcommand",
    desc: "Command description",
    category: "category",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    // Your command logic here
    await reply("Hello!");
});
```

## Important Notes

### Session Management
- Session files are stored in `session/` directory
- These contain authentication credentials
- **Never commit session files to Git** (already in .gitignore)
- To reset: delete `session/` folder and restart bot

### Dependencies
All required packages are installed. Key dependencies:
- `@whiskeysockets/baileys`: WhatsApp Web API
- `express`: Web server for health checks
- `qrcode-terminal`: QR code display (deprecated but functional)
- `moment`: Time/date formatting
- `jimp`: Image processing
- `megajs`: MEGA cloud storage (for session import)

### Known Limitations
- `sharp` package not installed (requires Python for compilation, optional peer dependency)
- QR code terminal printing is deprecated by Baileys but still works
- Some npm warnings about deprecated packages (non-critical)

## Troubleshooting

### Bot won't connect
1. Check console logs for errors
2. Delete `session/` folder to force new QR code
3. Ensure WhatsApp mobile app is online

### Commands not working
1. Verify command prefix matches configuration
2. Check MODE setting allows messages from your chat type
3. Review console logs for plugin errors

### Port conflicts
- Bot uses port 5000 (required for Replit)
- This is configured and should not be changed

## Development

### Adding New Features
1. Create new plugin file in `plugins/`
2. Use existing plugins as templates
3. Test in development before deploying

### Modifying Bot Behavior
- Edit `settings.js` for configuration
- Modify `index.js` for core functionality
- Update `lib/functions.js` for utilities

## User Preferences
None configured yet. Add preferences here as the project evolves.
