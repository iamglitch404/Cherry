// @ts-nocheck
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import pathModule from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

(global as any).fileURLToPath = fileURLToPath;
(global as any).path = pathModule;
(global as any).fs = require('fs');

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const axios = require("axios");
const fs = require("fs-extra");
const google = require("googleapis").google;
const nodemailer = require("nodemailer");
const { execSync } = require('child_process');
const log = require('./logger/log.ts').default || require('./logger/log.ts');
const path = require("path");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = "0"; // Disable warning

function validJSON(pathDir: string) {
	try {
		if (!fs.existsSync(pathDir))
			throw new Error(`File "${pathDir}" not found`);
		execSync(`npx jsonlint "${pathDir}"`, { stdio: 'pipe' });
		return true;
	}
	catch (err: any) {
		let msgError = err.message;
		msgError = msgError.split("\n").slice(1).join("\n");
		const indexPos = msgError.indexOf("    at");
		msgError = msgError.slice(0, indexPos != -1 ? indexPos - 1 : msgError.length);
		throw new Error(msgError);
	}
}

const { NODE_ENV } = process.env;
const dirConfig = path.normalize(`${__dirname}/config${['production', 'development'].includes(NODE_ENV as string) ? '.dev.json' : '.json'}`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands${['production', 'development'].includes(NODE_ENV as string) ? '.dev.json' : '.json'}`);
const dirAccount = path.normalize(`${__dirname}/account${['production', 'development'].includes(NODE_ENV as string) ? '.dev.txt' : '.txt'}`);

for (const pathDir of [dirConfig, dirConfigCommands]) {
	try {
		validJSON(pathDir);
	}
	catch (err: any) { }
}

const config = fs.existsSync(dirConfig) ? require(dirConfig) : require('./config.json');
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
	config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map((id: any) => id.toString());
const configCommands = fs.existsSync(dirConfigCommands) ? require(dirConfigCommands) : { commandBanned: {} };

(global as any).Cherry = {
	startTime: Date.now() - process.uptime() * 1000,
	commands: new Map(),
	eventCommands: new Map(),
	commandFilesPath: [],
	eventCommandsFilesPath: [],
	aliases: new Map(),
	onFirstChat: [],
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	onAnyEvent: [],
	config,
	configCommands,
	envCommands: {},
	envEvents: {},
	envGlobal: {},
	reLoginBot: function () { },
	Listening: null,
	oldListening: [],
	callbackListenTime: {},
	storage5Message: [],
	fcaApi: null,
	botID: null
};

global.db = {
	allThreadData: [],
	allUserData: [],
	allDashBoardData: [],
	allGlobalData: [],
	threadModel: null,
	userModel: null,
	dashboardModel: null,
	globalModel: null,
	threadsData: null,
	usersData: null,
	dashBoardData: null,
	globalData: null,
	receivedTheFirstMessage: {}
} as any;

(global as any).client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: [],
		creatingGlobalData: []
	},
	commandBanned: configCommands.commandBanned
};

const utils = require("./utils.ts").default || require("./utils.ts");
(global as any).utils = utils;
const { colors } = utils;

(global as any).temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [],
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	},
	contentScripts: {
		cmds: {},
		events: {}
	}
};

const watchAndReloadConfig = (dir: string, type: string, prop: string, logName: string) => {
	let lastModified = fs.existsSync(dir) ? fs.statSync(dir).mtimeMs : 0;
	let isFirstModified = true;
	if (!fs.existsSync(dir)) return;

	fs.watch(dir, (eventType: string) => {
		if (eventType === type) {
			const oldConfig = (global as any).Cherry[prop];

			setTimeout(() => {
				try {
					if (isFirstModified) {
						isFirstModified = false;
						return;
					}
					if (lastModified === fs.statSync(dir).mtimeMs) {
						return;
					}
					(global as any).Cherry[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
					if (typeof (global as any).invalidateBotConfig === 'function') {
						(global as any).invalidateBotConfig();
					}
					if (log.success) log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
				}
				catch (err) {
					if (log.warn) log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
					(global as any).Cherry[prop] = oldConfig;
				}
				finally {
					lastModified = fs.statSync(dir).mtimeMs;
				}
			}, 200);
		}
	});
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

(global as any).Cherry.envGlobal = (global as any).Cherry.configCommands.envGlobal;
(global as any).Cherry.envCommands = (global as any).Cherry.configCommands.envCommands;
(global as any).Cherry.envEvents = (global as any).Cherry.configCommands.envEvents;

// LOAD LANGUAGE FIRST SO WE CAN USE IT GLOBALLY!
await import('./language/langgetfunc.ts');

if (config.autoRestart) {
	const time = config.autoRestart.time;
	if (!isNaN(time) && time > 0) {
		utils.log.info("AUTO RESTART", (global as any).lang.Cherry.autoRestart1(utils.convertTime(time, true)));
		setTimeout(() => {
			utils.log.info("AUTO RESTART", (global as any).lang.system.restarting());
			process.exit(2);
		}, time);
	}
	else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
		utils.log.info("AUTO RESTART", (global as any).lang.Cherry.autoRestart2(time));
		const cron = require("node-cron");
		cron.schedule(time, () => {
			utils.log.info("AUTO RESTART", (global as any).lang.system.restarting());
			process.exit(2);
		});
	}
}

(async () => {
	const { gmailAccount } = config.credentials || {};
	const { email, clientId, clientSecret, refreshToken } = gmailAccount || {};
	if (clientId && google) {
		const OAuth2 = google.auth.OAuth2;
		const OAuth2_client = new OAuth2(clientId, clientSecret);
		OAuth2_client.setCredentials({ refresh_token: refreshToken });
		let accessToken;
		try {
			accessToken = await OAuth2_client.getAccessToken();
		}
		catch (err) {
			console.error((global as any).lang.Cherry.googleApiTokenExpired());
		}
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			service: 'Gmail',
			auth: {
				type: 'OAuth2',
				user: email,
				clientId,
				clientSecret,
				refreshToken,
				accessToken
			}
		});

		async function sendMail({ to, subject, text, html, attachments }: any) {
			const transporter = nodemailer.createTransport({
				host: 'smtp.gmail.com',
				service: 'Gmail',
				auth: {
					type: 'OAuth2',
					user: email,
					clientId,
					clientSecret,
					refreshToken,
					accessToken
				}
			});
			const mailOptions = {
				from: email,
				to,
				subject,
				text,
				html,
				attachments
			};
			const info = await transporter.sendMail(mailOptions);
			return info;
		}

		(global as any).utils.sendMail = sendMail;
		(global as any).utils.transporter = transporter;
	}

	const { data: { version } } = await axios.get("https://raw.githubusercontent.com/Yugant-xettri/Cherry-V2/main/package.json").catch(() => ({ data: { version: '1.0.0' } }));
	const currentVersion = require("./package.json").version;
	if (compareVersion(version, currentVersion) === 1)
		if (utils.log.master) utils.log.master("NEW VERSION", (global as any).lang.Cherry.newVersionDetected(
			colors?.gray(currentVersion) || currentVersion,
			colors?.hex("#eb6a07", version) || version,
			colors?.hex("#eb6a07", "node update") || "node update"
		));

	if (utils.drive?.default && utils.drive?.checkAndCreateParentFolder) {
		const parentIdGoogleDrive = await utils.drive.checkAndCreateParentFolder("CherryBot");
		utils.drive.parentID = parentIdGoogleDrive;
	}

	// ---------------------------------------------------------
	// PORTED OVER FROM INDEX.TS (WHATSAPP INITIALIZATION)
	// ---------------------------------------------------------

	// Single instance lock to prevent concurrent bots
	const lockFile = pathModule.join(process.cwd(), 'bot.lock');
	try {
		if (fs.existsSync(lockFile)) {
			const pid = fs.readFileSync(lockFile, 'utf-8');
			try {
				process.kill(parseInt(pid), 0);
				console.error(`\x1b[31m${(global as any).lang.system.botRunning(pid)}\x1b[0m`);
				process.exit(1);
			} catch (e) { }
		}
		fs.writeFileSync(lockFile, process.pid.toString());
		process.on('exit', () => fs.existsSync(lockFile) && fs.unlinkSync(lockFile));
		process.on('SIGINT', () => process.exit(0));
		process.on('SIGTERM', () => process.exit(0));
	} catch (e) { }

	const originalInfo = console.info;
	const originalWarn = console.warn;
	const originalError = console.error;
	console.info = (...args: any[]) => {
		const msg = args.join(' ');
		if (msg.includes('Closing session:') || msg.includes('Removing old closed session:')) return;
		originalInfo(...args);
	};
	console.warn = (...args: any[]) => {
		const msg = args.join(' ');
		if (msg.includes('Closing session:') || msg.includes('Removing old closed session:') || msg.includes('Decrypted message with old')) return;
		originalWarn(...args);
	};
	console.error = (...args: any[]) => {
		const msg = args.join(' ');
		if (msg.includes('Failed to decrypt') || msg.includes('V1 session')) return;
		originalError(...args);
	};

	const { pathToFileURL } = await import('url');
	const pino = (await import('pino')).default;
	const qrcode = (await import('qrcode-terminal')).default;
	const { Boom } = await import('@hapi/boom');
	const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, fetchLatestWaWebVersion } = await import('@whiskeysockets/baileys');

	(global as any).fs = fs;
	(global as any).path = pathModule;
	(global as any).fileURLToPath = fileURLToPath;
	(global as any).pathToFileURL = pathToFileURL;
	(global as any).pino = pino;
	(global as any).qrcode = qrcode;
	(global as any).Boom = Boom;
	(global as any).makeWASocket = makeWASocket;
	(global as any).DisconnectReason = DisconnectReason;
	(global as any).useMultiFileAuthState = useMultiFileAuthState;
	(global as any).Browsers = Browsers;
	(global as any).fetchLatestBaileysVersion = fetchLatestBaileysVersion;
	(global as any).fetchLatestWaWebVersion = fetchLatestWaWebVersion;

	const commands = new Map<string, any>();
	const aliases = new Map<string, string>();
	const commandCooldowns = new Map<string, Map<string, number>>();
	(global as any).commands = commands;
	(global as any).aliases = aliases;
	(global as any).commandCooldowns = commandCooldowns;

	(global as any).__welcomeState = (global as any).__welcomeState || {};
	(global as any).__welcomeMsg = (global as any).__welcomeMsg || {};
	(global as any).__goodbyeState = (global as any).__goodbyeState || {};
	(global as any).__goodbyeMsg = (global as any).__goodbyeMsg || {};

	let cachedBotConfig: any = null;
	(global as any).invalidateBotConfig = () => {
		cachedBotConfig = null;
	};

	function getBotConfig() {
		if (cachedBotConfig) return cachedBotConfig;
		const defaultConfig: any = {
			number: null,
			printQR: true,
			sessionFolder: 'auth_info_baileys',
			adminBot: [],
			prefix: '!',
			adminOnly: { enable: false, ignoreCommand: [] },
			whiteListMode: { enable: false, whiteListIds: [] },
			whiteListGroup: { enable: false, whiteListThreadIds: [] },
			whiteListChannel: { enable: false, whiteListChannelIds: [] },
			admins: [],
			whitelistGroups: [],
			whitelistUsers: []
		};

		try {
			const configPath = global.path.join(__dirname, 'config.json');
			if (global.fs.existsSync(configPath)) {
				const configData = JSON.parse(global.fs.readFileSync(configPath, 'utf-8'));
				const account = configData.WhatsaapAccount || configData.whatsappAccount;
				if (account && typeof account === 'object') {
					if (typeof account.number === 'string') defaultConfig.number = account.number.trim();
					if (typeof account.printQR === 'boolean') defaultConfig.printQR = account.printQR;
					const sessionVal = account.session || account.sessionFolder;
					if (typeof sessionVal === 'string' && sessionVal.trim() !== '') defaultConfig.sessionFolder = sessionVal.trim();
				}
				if (Array.isArray(configData.admins)) defaultConfig.admins = configData.admins.filter((n: any) => typeof n === 'string').map((n: string) => n.replace(/\D/g, ''));
				if (Array.isArray(configData.whitelistGroups)) defaultConfig.whitelistGroups = configData.whitelistGroups.filter((g: any) => typeof g === 'string').map((g: string) => g.trim());
				if (Array.isArray(configData.whitelistUsers)) defaultConfig.whitelistUsers = configData.whitelistUsers.filter((n: any) => typeof n === 'string').map((n: string) => n.replace(/\D/g, ''));
				if (typeof configData.prefix === 'string' && configData.prefix !== '') defaultConfig.prefix = configData.prefix;
				if (configData.adminOnly && typeof configData.adminOnly === 'object') {
					if (typeof configData.adminOnly.enable === 'boolean') defaultConfig.adminOnly.enable = configData.adminOnly.enable;
					if (Array.isArray(configData.adminOnly.ignoreCommand)) defaultConfig.adminOnly.ignoreCommand = configData.adminOnly.ignoreCommand.filter((c: any) => typeof c === 'string').map((c: string) => c.toLowerCase());
				}
				if (configData.whiteListMode && typeof configData.whiteListMode === 'object') {
					if (typeof configData.whiteListMode.enable === 'boolean') defaultConfig.whiteListMode.enable = configData.whiteListMode.enable;
					if (Array.isArray(configData.whiteListMode.whiteListIds)) defaultConfig.whiteListMode.whiteListIds = configData.whiteListMode.whiteListIds.filter((n: any) => typeof n === 'string').map((n: string) => n.replace(/\D/g, ''));
				}
				if (configData.whiteListGroup && typeof configData.whiteListGroup === 'object') {
					if (typeof configData.whiteListGroup.enable === 'boolean') defaultConfig.whiteListGroup.enable = configData.whiteListGroup.enable;
					if (Array.isArray(configData.whiteListGroup.whiteListThreadIds)) defaultConfig.whiteListGroup.whiteListThreadIds = configData.whiteListGroup.whiteListThreadIds.filter((g: any) => typeof g === 'string').map((g: string) => g.trim());
				}
				if (configData.whiteListChannel && typeof configData.whiteListChannel === 'object') {
					if (typeof configData.whiteListChannel.enable === 'boolean') defaultConfig.whiteListChannel.enable = configData.whiteListChannel.enable;
					if (Array.isArray(configData.whiteListChannel.whiteListChannelIds)) defaultConfig.whiteListChannel.whiteListChannelIds = configData.whiteListChannel.whiteListChannelIds.filter((c: any) => typeof c === 'string').map((c: string) => c.trim());
				}
				if (Array.isArray(configData.adminBot)) defaultConfig.adminBot = configData.adminBot.filter((n: any) => typeof n === 'string').map((n: string) => n.replace(/\D/g, ''));
				if (configData.autoUptime && typeof configData.autoUptime === 'object') {
					defaultConfig.autoUptime = {
						enable: !!configData.autoUptime.enable,
						url: configData.autoUptime.url || '',
						timeInterval: configData.autoUptime.timeInterval || 180,
						port: configData.autoUptime.port || 8080
					};
				}
			}
		} catch (error) {
			console.error((global as any).lang.config.readError(String(error)));
		}
		cachedBotConfig = defaultConfig;
		return defaultConfig;
	}

	function getFormattedJid(phoneNumber: string): string | null {
		const cleaned = phoneNumber.replace(/\D/g, '');
		if (!cleaned) return null;
		return `${cleaned}@s.whatsapp.net`;
	}

	function renderPairingCodeBox(code: string) {
		const border = "║";
		const line = "═".repeat(46);
		const titleText = (global as any).lang.pairing.title();
		const leftTitlePad = Math.floor((46 - titleText.length) / 2);
		const rightTitlePad = 46 - titleText.length - leftTitlePad;
		const formattedTitle = " ".repeat(leftTitlePad) + titleText + " ".repeat(rightTitlePad);
		const leftCodePad = Math.floor((46 - code.length) / 2);
		const rightCodePad = 46 - code.length - leftCodePad;
		const formattedCode = " ".repeat(leftCodePad) + `\x1b[1m\x1b[32m${code}\x1b[0m` + " ".repeat(rightCodePad);

		console.log(`\n╔${line}╗`);
		console.log(`${border}${" ".repeat(46)}${border}`);
		console.log(`${border}${formattedTitle}${border}`);
		console.log(`${border}${" ".repeat(46)}${border}`);
		console.log(`${border}${formattedCode}${border}`);
		console.log(`${border}${" ".repeat(46)}${border}`);
		console.log(`╚${line}╝\n`);
	}

	const { handleConnectionError } = await import('./bot/login/handlewhenlistenhaserror.ts');
	const { loginToWhatsApp } = await import('./bot/login/login.ts');
	(global as any).handleReconnect = handleConnectionError;

	async function connectToWhatsApp() {
		const sentMessageIds = new Set<string>();
		const sock = await loginToWhatsApp(sentMessageIds);
		if (!sock) return;
		(global as any).sock = sock;

		const { registerAllEventsToSocket } = await import('./bot/login/loadscripts.ts');
		registerAllEventsToSocket(sock);

		const { createHandlerAction } = await import('./bot/handlers/handleraction.ts');
		const handlerAction = createHandlerAction(sock, sentMessageIds);
		sock.ev.on('messages.upsert', handlerAction);

		(global as any).finishBootSequence();
	}

	(global as any).lidToPnCache = (global as any).lidToPnCache || new Map<string, string>();

	function getCleanedNumber(number: string): string {
		if (!number) return '';
		const part1 = number.split('@')[0];
		const part2 = part1 ? part1.split(':')[0] : undefined;
		return part2 ? part2.replace(/\D/g, '') : '';
	}

	function resolvePhoneNumber(jidOrLid: string): string {
		if (!jidOrLid) return '';
		const clean = getCleanedNumber(jidOrLid);
		if (!clean) return '';

		// 1. Check in-memory global cache
		if ((global as any).lidToPnCache?.has(clean)) {
			return (global as any).lidToPnCache.get(clean)!;
		}

		// 2. Check Baileys internal signalRepository mapping cache
		try {
			const signalRepo = (global as any).sock?.signalRepository;
			const cached = signalRepo?.lidMapping?.mappingCache?.get(`lid:${clean}`);
			if (cached && typeof cached === 'string') {
				const pn = cached.replace(/\D/g, '');
				if (pn) {
					(global as any).lidToPnCache?.set(clean, pn);
					return pn;
				}
			}
		} catch { }

		// 3. Check session reverse mapping files on disk
		try {
			const config = getBotConfig();
			const sessionFolder = pathModule.resolve(config.sessionFolder || 'session');
			const reverseFile = pathModule.join(sessionFolder, `lid-mapping-${clean}_reverse.json`);
			if (fs.existsSync(reverseFile)) {
				const raw = fs.readFileSync(reverseFile, 'utf-8');
				const parsed = JSON.parse(raw);
				if (typeof parsed === 'string' && parsed.length > 0) {
					const pn = parsed.replace(/\D/g, '');
					if (pn) {
						(global as any).lidToPnCache?.set(clean, pn);
						return pn;
					}
				}
			}
		} catch { }

		return clean;
	}

	async function resolvePhoneNumberAsync(jidOrLid: string): Promise<string> {
		const syncResult = resolvePhoneNumber(jidOrLid);
		const clean = getCleanedNumber(jidOrLid);
		if (syncResult && syncResult !== clean) return syncResult;

		try {
			const signalRepo = (global as any).sock?.signalRepository;
			if (signalRepo?.lidMapping?.getPNForLID) {
				const fullLid = jidOrLid.includes('@lid') ? jidOrLid : `${clean}@lid`;
				const pn = await signalRepo.lidMapping.getPNForLID(fullLid);
				if (pn) {
					const cleanPn = String(pn).split('@')[0].split(':')[0].replace(/\D/g, '');
					if (cleanPn) {
						(global as any).lidToPnCache?.set(clean, cleanPn);
						return cleanPn;
					}
				}
			}
		} catch { }

		return syncResult || clean;
	}

	function isAdmin(number: string): boolean {
		if (!number) return false;
		const config = getBotConfig();
		const adminList = (config.adminBot || []).map((a: any) => String(a).replace(/\D/g, ''));

		const cleaned = getCleanedNumber(number);
		if (cleaned && adminList.includes(cleaned)) return true;

		const resolved = resolvePhoneNumber(number);
		if (resolved && adminList.includes(resolved)) return true;

		const botId = ((global as any).sock?.user?.id || '').split(':')[0].replace(/\D/g, '');
		const botLid = ((global as any).sock?.user?.lid || '').split(':')[0].replace(/\D/g, '');
		if (cleaned && (cleaned === botId || cleaned === botLid)) return true;
		if (resolved && (resolved === botId || resolved === botLid)) return true;

		return false;
	}

	function isWhitelistedGroup(groupId: string): boolean {
		const config = getBotConfig();
		if (!config.whiteListGroup.enable) return true;
		return config.whiteListGroup.whiteListThreadIds.includes(groupId.trim());
	}

	function isWhitelistedUser(number: string): boolean {
		if (!number) return false;
		const config = getBotConfig();
		if (!config.whiteListMode.enable) return true;
		const cleaned = getCleanedNumber(number);
		const resolved = resolvePhoneNumber(number);
		const whiteList = (config.whiteListMode.whiteListIds || []).map((a: any) => String(a).replace(/\D/g, ''));
		return whiteList.includes(cleaned) || (!!resolved && whiteList.includes(resolved));
	}

	(global as any).getBotConfig = getBotConfig;
	(global as any).getFormattedJid = getFormattedJid;
	(global as any).resolvePhoneNumber = resolvePhoneNumber;
	(global as any).resolvePhoneNumberAsync = resolvePhoneNumberAsync;
	(global as any).isAdmin = isAdmin;
	(global as any).isWhitelistedGroup = isWhitelistedGroup;
	(global as any).isWhitelistedUser = isWhitelistedUser;
	(global as any).connectToWhatsApp = connectToWhatsApp;
	(global as any).renderPairingCodeBox = renderPairingCodeBox;

	const { printBootLogo } = await import('./bot/login/login.ts');
	printBootLogo();

	let bootSequenceCompleted = false;
	(global as any).finishBootSequence = async () => {
		if (bootSequenceCompleted) return;
		bootSequenceCompleted = true;

		const { startAutoUptime } = await import('./bot/autoUptime.ts');
		startAutoUptime();

		const { startDashboard } = await import('./dashboard/server.ts');
		startDashboard();

		const { checkDataAndConnectDB } = await import('./bot/handlers/checkdata.ts');
		await checkDataAndConnectDB();

		const { checkAndLoadScripts } = await import('./bot/login/loadscripts.ts');
		await checkAndLoadScripts();

		const termWidth = process.stdout.columns || 100;
		const msg = (global as any).lang?.loader?.listening() || " BOT IS NOW LISTENING FOR MESSAGES ";
		const dashCount = Math.floor((termWidth - msg.length) / 2);
		const dashes = "─".repeat(Math.max(0, dashCount));
		console.log(`\n\x1B[90m${dashes}\x1B[32m${msg}\x1B[90m${dashes}\x1B[0m\n`);
	};

	(global as any).connectToWhatsApp();

})();

function compareVersion(version1: string, version2: string) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i])) return 1;
		if (parseInt(v1[i]) < parseInt(v2[i])) return -1;
	}
	return 0;
}
