import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cookieParser from "cookie-parser";

interface OTPRecord {
    code: string;
    expires: number;
    attempts: number;
    lockUntil?: number;
}

const otpStore: Record<string, OTPRecord> = {};
const requestOtpCooldown: Record<string, number> = {};
const sessionStore: Record<string, { number: string; expires: number }> = {};

function maskSecrets(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(clone)) {
        if (/^(clientSecret|refreshToken|apiKey|password|uri|geminiApiKey|mistralApiKey)$/i.test(key)) {
            if (clone[key]) clone[key] = "********";
        } else if (typeof clone[key] === "object" && clone[key] !== null) {
            clone[key] = maskSecrets(clone[key]);
        }
    }
    return clone;
}

export function startDashboard() {
    const configPath = path.join(process.cwd(), "config.json");
    const getConfig = () => fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};

    const config = getConfig();
    if (!config.dashBoard?.enable) return;

    const app = express();
    const port = config.dashBoard?.port || 3001;
    const host = config.dashBoard?.host || "127.0.0.1";
    const publicPath = path.join(process.cwd(), "dashboard", "public");

    if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
    }

    app.use(express.static(publicPath));
    app.use(express.json());
    app.use(cookieParser());

    app.get(["/", "/uptime"], (req, res, next) => {
        if (req.path === '/uptime') {
            return res.json({ status: "ok", statusAccountBot: "online" });
        }
        next(); 
    });

    const checkAuth = (req: any, res: any, next: any) => {
        const session = req.cookies.admin_session;
        if (session && sessionStore[session] && sessionStore[session].expires > Date.now()) {
            req.adminNumber = sessionStore[session].number;
            return next();
        }
        res.status(401).json({ error: (global as any).lang?.dashboard?.unauthorized() || "Unauthorized" });
    };

    app.post("/api/request-otp", async (req, res) => {
        const botConfig = global.getBotConfig ? global.getBotConfig() : {};
        
        if (!botConfig.adminBot || botConfig.adminBot.length === 0) {
            return res.status(400).json({ error: (global as any).lang?.dashboard?.noAdmin() || "No admin configured in config.json" });
        }

        const adminNumber = botConfig.adminBot[0];
        const now = Date.now();

        if (otpStore[adminNumber]?.lockUntil && otpStore[adminNumber].lockUntil! > now) {
            const waitSec = Math.ceil((otpStore[adminNumber].lockUntil! - now) / 1000);
            return res.status(429).json({ error: `Too many failed attempts. Locked out for ${waitSec}s.` });
        }

        if (requestOtpCooldown[adminNumber] && requestOtpCooldown[adminNumber] > now) {
            const waitSec = Math.ceil((requestOtpCooldown[adminNumber] - now) / 1000);
            return res.status(429).json({ error: `Please wait ${waitSec}s before requesting a new OTP.` });
        }
        requestOtpCooldown[adminNumber] = now + 30 * 1000;

        const otp = crypto.randomInt(100000, 1000000).toString();
        otpStore[adminNumber] = {
            code: otp,
            expires: now + 5 * 60 * 1000,
            attempts: 0
        };

        const sock = (global as any).sock;
        if (sock) {
            const jid = `${adminNumber}@s.whatsapp.net`;
            try {
                const messageText = (global as any).lang?.dashboard?.otpMessage?.(otp) || `🍒 *CherryBot Dashboard*\n\nYour Admin OTP is: *${otp}*\n\n_Do not share this code with anyone. It expires in 5 minutes._`;
                await sock.sendMessage(jid, { text: messageText });
                return res.json({ success: true, message: (global as any).lang?.dashboard?.otpSent?.() || "OTP sent to your WhatsApp" });
            } catch (err) {
                return res.status(500).json({ error: (global as any).lang?.dashboard?.otpFailed?.() || "Failed to send OTP message" });
            }
        }
        res.status(500).json({ error: (global as any).lang?.dashboard?.notConnected?.() || "WhatsApp not connected yet" });
    });

    app.post("/api/verify-otp", (req, res) => {
        const { otp } = req.body;
        const botConfig = global.getBotConfig ? global.getBotConfig() : {};
        const adminNumber = botConfig.adminBot?.[0];
        if (!adminNumber) {
            return res.status(400).json({ error: "No admin configured" });
        }

        const now = Date.now();
        const store = otpStore[adminNumber];
        if (!store || store.expires < now) {
            return res.status(400).json({ error: (global as any).lang?.dashboard?.invalidOtp?.() || "Invalid or expired OTP" });
        }

        if (store.lockUntil && store.lockUntil > now) {
            const waitSec = Math.ceil((store.lockUntil - now) / 1000);
            return res.status(429).json({ error: `Too many failed attempts. Locked out for ${waitSec}s.` });
        }

        store.attempts = (store.attempts || 0) + 1;
        if (store.attempts > 5) {
            store.lockUntil = now + 5 * 60 * 1000;
            return res.status(429).json({ error: "Too many failed attempts. Locked out for 5 minutes." });
        }

        const safeCompare = (a: string, b: string) => {
            if (typeof a !== "string" || typeof b !== "string") return false;
            const bufA = Buffer.from(a);
            const bufB = Buffer.from(b);
            return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
        };

        if (!safeCompare(store.code, otp)) {
            const remaining = Math.max(0, 5 - store.attempts);
            return res.status(400).json({ error: `Invalid OTP. ${remaining} attempts remaining.` });
        }

        delete otpStore[adminNumber];

        const sessionToken = crypto.randomBytes(32).toString("hex");
        sessionStore[sessionToken] = {
            number: adminNumber,
            expires: now + 24 * 60 * 60 * 1000 
        };

        res.cookie("admin_session", sessionToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000
        });
        res.json({ success: true });
    });

    app.post("/api/logout", (req, res) => {
        const session = req.cookies.admin_session;
        if (session) delete sessionStore[session];
        res.clearCookie("admin_session");
        res.json({ success: true });
    });

    app.get("/api/auth-status", (req, res) => {
        const session = req.cookies.admin_session;
        if (session && sessionStore[session] && sessionStore[session].expires > Date.now()) {
            return res.json({ loggedIn: true, admin: sessionStore[session].number });
        }
        res.json({ loggedIn: false });
    });

    app.get("/api/stats", checkAuth, (req, res) => {
        res.json({
            status: "Online",
            uptime: process.uptime(),
            commandsCount: (global as any).commands?.size || 0,
            memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
            prefix: getConfig().prefix || "+"
        });
    });

    app.get("/api/config", checkAuth, (req, res) => {
        const configData = getConfig();
        const masked = maskSecrets(configData);
        res.json(masked);
    });

    app.get("/api/users", checkAuth, async (req, res) => {
        try {
            let users: any[] = [];
            if ((global.db as any)?.Users?.getAll) {
                users = await (global.db as any).Users.getAll();
            } else if ((global.db as any)?.allUserData) {
                users = (global.db as any).allUserData;
            }

            const formattedUsers = users.map((raw: any) => {
                const u = raw?.get ? raw.get({ plain: true }) : raw;
                const data = typeof u.data === "string" ? JSON.parse(u.data || "{}") : (u.data || {});
                const msgCount = data?.exp || data?.messages || u.messages || 0;
                return {
                    id: u.userID || u.id || "Unknown",
                    name: u.name || "Unknown",
                    messages: msgCount,
                    money: data?.money || u.money || 0
                };
            }).sort((a: any, b: any) => b.messages - a.messages).slice(0, 50); 
            res.json(formattedUsers);
        } catch {
            res.json([]);
        }
    });

    app.listen(port, host, () => {
        console.log(`\x1B[90m  [DASHBOARD] Web interface running at http://${host}:${port}\x1B[0m`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\x1b[31m  [DASHBOARD] Port ${port} is already in use. Dashboard failed to start.\x1b[0m`);
        }
    });
}
