// @ts-nocheck
"use strict";

import axios from "axios";
import fsExtra from "fs-extra";
import * as cheerio from "cheerio";
import https from "https";
import moment from "moment-timezone";
import mimeDb from "mime-db";
import lodash from "lodash";
import ora from "ora";
import log from "./logger/log.ts";
import { isHexColor, colors } from "./func/colors.ts";
import Prism from "./func/prisim.ts";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export class CustomError extends Error {
  constructor(err) {
    super(err?.message || err);
    Object.assign(this, typeof err === "string" ? {} : err);
  }
}

export const convertTime = (
  ms,
  secUnit = "s",
  minUnit = "m",
  hourUnit = "h",
  dayUnit = "d",
  monthUnit = "M",
  yearUnit = "y",
  hideZero = false
) => {
  if (typeof secUnit === "boolean") {
    hideZero = secUnit;
    secUnit = "s";
  }

  let result = "";
  const units = [
    { value: Math.floor(ms / 1000 / 60 / 60 / 24 / 30 / 12), unit: yearUnit },
    { value: Math.floor((ms / 1000 / 60 / 60 / 24 / 30) % 12), unit: monthUnit },
    { value: Math.floor((ms / 1000 / 60 / 60 / 24) % 30), unit: dayUnit },
    { value: Math.floor((ms / 1000 / 60 / 60) % 24), unit: hourUnit },
    { value: Math.floor((ms / 1000 / 60) % 60), unit: minUnit },
    { value: Math.floor((ms / 1000) % 60), unit: secUnit },
  ];

  units.forEach((item, index) => {
    if (item.value) {
      result += item.value + item.unit;
    } else if (result) {
      result += "00" + item.unit;
    } else if (index === units.length - 1) {
      result += "0" + item.unit;
    }
  });

  return hideZero ? result.replace(/00\w+/g, "") : result || "0" + secUnit;
};

const originalClearLine = process.stderr.clearLine;
export const enableStderrClearLine = (enabled = true) => {
  process.stderr.clearLine = enabled ? originalClearLine : () => {};
};

export const createOraDots = (text) => {
  const spinner = ora({
    text,
    spinner: {
      interval: 80,
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    },
  });

  return Object.assign(spinner, {
    _start: () => {
      enableStderrClearLine(false);
      spinner.start();
    },
    _stop: () => {
      enableStderrClearLine(true);
      spinner.stop();
    },
  });
};

export class TaskQueue {
  constructor(callback) {
    this.cb = callback;
    this.queue = [];
    this.running = null;
  }

  push(task) {
    this.queue.push(task);
    if (this.queue.length === 1) {
      this.next();
    }
  }

  next() {
    if (this.queue.length > 0) {
      this.running = this.queue[0];
      this.cb(this.running, () => {
        this.running = null;
        this.queue.shift();
        this.next();
      });
    }
  }

  length() {
    return this.queue.length;
  }
}

export const formatNumber = (num) => {
  const config = global.Cherry?.config || {};
  return Number(num).toLocaleString(config.language || "en-US");
};

export const getExtFromAttachmentType = (type) => {
  const map = {
    photo: "png",
    animated_image: "gif",
    video: "mp4",
    audio: "mp3",
  };
  return map[type] || "txt";
};

export const getExtFromMimeType = (mime = "") => {
  return mimeDb[mime]?.extensions?.[0] || "unknown";
};

export const getExtFromUrl = (url = "") => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match ? match[1] : "";
};

export const getPrefix = (remoteJid) => {
  const config = global.getBotConfig ? global.getBotConfig() : global.Cherry?.config || {};
  return config.prefix || "!";
};

export const getTime = (time, format) => {
  const config = global.Cherry?.config || {};
  return moment(format ? time : undefined)
    .tz(config.timeZone || "UTC")
    .format(format || time);
};

export const getType = (obj) => {
  return Object.prototype.toString.call(obj).slice(8, -1);
};

export const isNumber = (val) => {
  return !isNaN(parseFloat(val)) && isFinite(val);
};

export const jsonStringifyColor = (obj, filter, indent = 0, depth = 0) => {
  const pad = " ".repeat(indent + depth * indent);
  let output = "";

  if (typeof obj === "string") {
    return colors.green(`"${obj}"`);
  }
  if (typeof obj === "number" || typeof obj === "boolean" || obj === null) {
    return colors.yellow(String(obj));
  }
  if (obj === undefined) {
    return colors.gray("undefined");
  }
  if (typeof obj !== "object") {
    return colors.green(obj.toString());
  }

  if (Array.isArray(obj)) {
    if (!obj.length) return "[]";
    output += colors.gray("[\n");
    obj.forEach((item) => {
      output += pad + jsonStringifyColor(item, filter, indent, depth + 1) + ",\n";
    });
    output = output.replace(/,\n$/, "\n") + " ".repeat(depth * indent) + colors.gray("]");
    return output;
  }

  const keys = Object.keys(obj);
  if (!keys.length) return "{}";

  output += colors.gray("{\n");
  keys.forEach((key) => {
    let val = obj[key];
    if (typeof filter === "function") {
      val = filter(key, val);
    }
    const formattedKey = /[^a-zA-Z0-9_]/.test(key) ? colors.green(JSON.stringify(key)) : key;
    output += `${pad}${formattedKey}:${indent ? " " : ""}${jsonStringifyColor(val, filter, indent, depth + 1)},\n`;
  });
  output = output.replace(/,\n$/, "\n") + " ".repeat(depth * indent) + colors.gray("}");
  return output;
};

export const randomString = (length = 10, unique = false, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") => {
  let str = "";
  for (let i = 0; i < length; i++) {
    let char = chars[Math.floor(Math.random() * chars.length)];
    if (unique) {
      while (str.includes(char)) {
        char = chars[Math.floor(Math.random() * chars.length)];
      }
    }
    str += char;
  }
  return str;
};

export const randomNumber = (min, max) => {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const removeHomeDir = (str) => {
  if (typeof str !== "string") return str;
  return str.split(process.cwd()).join("");
};

export const splitPage = (array, pageSize) => {
  const chunks = lodash.chunk(array, pageSize);
  return {
    totalPage: chunks.length,
    allPage: chunks,
  };
};

export const translateAPI = async (text, targetLang) => {
  try {
    const res = await axios.get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    return res.data[0][0][0];
  } catch (err) {
    throw new CustomError(err.response?.data || err);
  }
};

export const downloadFile = async (url, targetPath) => {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    fsExtra.writeFileSync(targetPath, Buffer.from(res.data));
    return targetPath;
  } catch (err) {
    throw new CustomError(err.response?.data || err);
  }
};

export const getStreamFromURL = async (url, customPath = "", options = {}) => {
  const res = await axios({ url, method: "GET", responseType: "stream", ...options });
  const ext = res.headers["content-type"] ? "." + getExtFromMimeType(res.headers["content-type"]) : ".noext";
  res.data.path = customPath || `${randomString(10)}${ext}`;
  return res.data;
};

export const getStreamFromUrl = getStreamFromURL;

export const getStreamsFromAttachment = async (attachments) => {
  return Promise.all(
    attachments.map(async (att) => {
      const res = await axios({ url: att.url, method: "GET", responseType: "stream" });
      res.data.path = `${randomString(10)}.${getExtFromUrl(att.url)}`;
      return res.data;
    })
  );
};

export const shortenURL = async (url) => {
  try {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    return res.data;
  } catch (err) {
    throw new CustomError(err.response?.data || err);
  }
};

export const uploadImgbb = async (fileOrUrl) => {
  try {
    const page = await axios.get("https://imgbb.com");
    const authToken = page.data.match(/auth_token="([^"]+)"/)?.[1];
    const isUrl = typeof fileOrUrl === "string" && /^https?:\/\//.test(fileOrUrl);

    const res = await axios.post(
      "https://imgbb.com/json",
      {
        source: fileOrUrl,
        type: isUrl ? "url" : "file",
        action: "upload",
        timestamp: Date.now(),
        auth_token: authToken,
      },
      { headers: { "content-type": "multipart/form-data" } }
    );
    return res.data;
  } catch (err) {
    throw new CustomError(err.response?.data || err);
  }
};

export const getText = (category, key, ...args) => {
  return global.lang?.[category]?.[key]?.(...args) || "";
};

export { colors, isHexColor, log, Prism };

export default {
  colors,
  isHexColor,
  log,
  Prism,
  CustomError,
  convertTime,
  createOraDots,
  TaskQueue,
  enableStderrClearLine,
  defaultStderrClearLine: originalClearLine,
  formatNumber,
  getExtFromAttachmentType,
  getExtFromMimeType,
  getExtFromUrl,
  getPrefix,
  getText,
  getTime,
  getType,
  isNumber,
  jsonStringifyColor,
  randomString,
  randomNumber,
  removeHomeDir,
  splitPage,
  translateAPI,
  downloadFile,
  getStreamsFromAttachment,
  getStreamFromURL,
  getStreamFromUrl,
  shortenURL,
  uploadImgbb,
};
