import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cookieParser from "cookie-parser";

const otpStore: Record<string, { code: string; expires: number }> = {};
const sessionStore: Record<string, { number: string; expires: number }> = {};

export function startDashboard() {
    const configPath = path.join(process.cwd(), "config.json");
    const getConfig = () => fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};

    const config = getConfig();
    if (!config.dashBoard?.enable) return;

    const app = express();
    const port = config.autoUptime?.port || config.dashBoard?.port || 3000;
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
        const botConfig = global.getBotConfig();
        
        if (!botConfig.adminBot || botConfig.adminBot.length === 0) {
            return res.status(400).json({ error: (global as any).lang?.dashboard?.noAdmin() || "No admin configured in config.json" });
        }

        const adminNumber = botConfig.adminBot[0];

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[adminNumber] = {
            code: otp,
            expires: Date.now() + 5 * 60 * 1000 
        };

        const sock = (global as any).sock;
        if (sock) {
            const jid = `${adminNumber}@s.whatsapp.net`;
            try {
                const messageText = (global as any).lang?.dashboard?.otpMessage(otp) || `🍒 *CherryBot Dashboard*\n\nYour Admin OTP is: *${otp}*\n\n_Do not share this code with anyone. It expires in 5 minutes._`;
                await sock.sendMessage(jid, { text: messageText });
                return res.json({ success: true, message: (global as any).lang?.dashboard?.otpSent() || "OTP sent to your WhatsApp" });
            } catch (err) {
                return res.status(500).json({ error: (global as any).lang?.dashboard?.otpFailed() || "Failed to send OTP message" });
            }
        }
        res.status(500).json({ error: (global as any).lang?.dashboard?.notConnected() || "WhatsApp not connected yet" });
    });

    app.post("/api/verify-otp", (req, res) => {
        const { otp } = req.body;
        const botConfig = global.getBotConfig();
        const adminNumber = botConfig.adminBot?.[0];
        
        const store = otpStore[adminNumber];
        if (!store || store.code !== otp || store.expires < Date.now()) {
            return res.status(400).json({ error: (global as any).lang?.dashboard?.invalidOtp() || "Invalid or expired OTP" });
        }

        delete otpStore[adminNumber];

        const sessionToken = crypto.randomBytes(32).toString("hex");
        sessionStore[sessionToken] = {
            number: adminNumber,
            expires: Date.now() + 24 * 60 * 60 * 1000 
        };

        res.cookie("admin_session", sessionToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
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
        if (configData.credentials?.gmailAccount?.password) configData.credentials.gmailAccount.password = "********";
        res.json(configData);
    });

    app.get("/api/users", checkAuth, (req, res) => {
        const users = (global.db as any)?.allUserData || [];
        const formattedUsers = users.map((u: any) => {
            const msgCount = u.data?.exp || u.data?.messages || 0;
            return {
                id: u.userID,
                name: u.name || "Unknown",
                messages: msgCount,
                money: u.data?.money || 0
            };
        }).sort((a: any, b: any) => b.messages - a.messages).slice(0, 50); 
        res.json(formattedUsers);
    });

    app.listen(port, () => {
        console.log(`\x1B[90m  [DASHBOARD] Web interface running at http://localhost:${port}\x1B[0m`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\x1b[31m  [DASHBOARD] Port ${port} is already in use. Dashboard failed to start.\x1b[0m`);
        }
    });
}
