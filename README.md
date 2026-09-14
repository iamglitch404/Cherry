# 🍒 Cherry WhatsApp Bot

**Cherry Bot** is a sleek, highly-professional, and completely autonomous WhatsApp bot built with Node.js and the `@whiskeysockets/baileys` library. It features a stunning CLI aesthetic, built-in SQLite database support, local dashboard, and a fully modular plugin system for incredibly easy command development.

---

## 🌟 Features
- **Pairing Code Login:** No QR code scanning needed! Just securely authenticate with an 8-character pairing code directly to your phone number.
- **Beautiful Terminal UI:** Minimalist, grey-themed, timestamped terminal logs for production-grade tracking.
- **Modular Plugin System:** Effortlessly drop `.ts` or `.js` files into `scripts/cmds/` and they are instantly loaded as commands.
- **Auto Uptime & Dashboard:** Built-in web dashboard and uptime-kuma compatible ping route.
- **Smart Reconnection:** Flawlessly handles disconnects, session resets, and WhatsApp restarts.
- **Multi-Language Support:** Core system logs and notifications are easily localizable.

---

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iamglitch404/Cherry.git
   cd Cherry
   ```

2. **Install dependencies:**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Configure the bot:**
   Open `config.json` and configure your preferences:
   ```json
   "WhatsaapAccount": {
       "number": "YOUR_PHONE_NUMBER_WITH_COUNTRY_CODE", // e.g. "9779863479066"
       "sessionFolder": "session"
   },
   "prefix": "+" // Your bot's trigger prefix
   ```

4. **Start the bot:**
   ```bash
   npm start
   ```
   *The bot will prompt you with an 8-character pairing code. Enter it into your WhatsApp linked devices screen to connect.*

---

## 🛠️ How to Create Commands

Adding a new command to Cherry Bot is incredibly simple. Just create a new TypeScript (`.ts`) or JavaScript (`.js`) file inside the `scripts/cmds/` folder.

Here is a standard template for a new command:

```typescript
"use strict";

export default {
    name: "hello",
    author: "YourName",
    aliases: ["hi", "hey"],
    prefix: true,

    onStart: async (sock, msg, context) => {
        const { reply, react, args, senderJid } = context;

        await react("👋");

        await reply(`Hello there! You said: ${args.join(" ")}`);
    }
};
```

### Advanced Command Structure
Commands can do more than just execute once! They can listen for replies.

```typescript
export default {
    name: "advanced",
    author: "YourName",
    prefix: true,

    onStart: async (sock, msg, context) => {
        const { reply } = context;
        const sentMsg = await reply("Reply to this message with a number!");
        
        if (sentMsg?.key?.id) {
            global.advancedSessions = global.advancedSessions || new Map();
            global.advancedSessions.set(sentMsg.key.id, { expectingNumber: true });
        }
    },

    onReply: async (sock, msg, context) => {
        const { reply, quotedKey, senderText } = context;
        
        if (quotedKey?.id && global.advancedSessions?.has(quotedKey.id)) {
            const num = parseInt(senderText.trim());
            if (isNaN(num)) {
                await reply("That's not a number!");
            } else {
                await reply(`You entered: ${num * 2}`);
            }
        }
    }
};
```

---

## 🎧 How to Create Events
Events run automatically in the background without needing a user to type a command. Put these in `scripts/events/`.

```typescript
export default {
    name: "MessageLogger",
    author: "YourName",
    
    onEvent: async (sock, msg, context) => {
        const { remoteJid, senderJid, senderText } = context;
        
        if (senderText) {
            console.log(`New message in ${remoteJid} from ${senderJid}: ${senderText}`);
        }
    }
};
```

### Context Object (`context`)
The `context` object passed to `onStart` provides extremely helpful utilities:
- `reply(text)`: Quickly send a message back to the chat.
- `react(emoji)`: React to the message that triggered the command.
- `args`: Array of strings containing the arguments after the command.
- `remoteJid`: The ID of the chat where the message was sent.
- `senderJid`: The ID of the person who sent the message.
- `quotedMsg`: If the user replied to a message, this contains the target message data.

---

## 📂 Project Structure

- `Cherry.ts` - The main entry point and orchestrator.
- `bot/` - Core systems (Login, Socket Handling, Reconnection logic, Uptime).
- `bot/handlers/` - Message routers and command dispatchers.
- `scripts/cmds/` - Your workspace! Drop all command plugins here.
- `scripts/events/` - Event listeners (like Welcome/Goodbye messages).
- `database/` - SQLite connection logic and schemas.
- `dashboard/` - Built-in express server for the local dashboard.

---

## 📜 License & Copyright

Cherry is free and open source (MIT). Made by **Yugant Xettri**.

Use it, fork it, change it, host it — all fine, even commercially. Just keep my
name on it. Don't strip the credit and don't pretend you wrote the whole thing.

See [`LICENSE`](LICENSE) for the full text, and [`NOTICE.md`](NOTICE.md) for the
short version.
