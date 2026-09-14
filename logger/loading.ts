// @ts-nocheck
"use strict";

import { colors } from "../func/colors.ts";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getTimezone() {
  try {
    const configPath = path.join(__dirname, "../config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return config.timeZone || config.timezone || "Asia/Kathmandu";
  } catch {
    return "Asia/Kathmandu";
  }
}

const getTimestamp = () => {
  return colors.gray(moment().tz(getTimezone()).format("HH:mm:ss DD/MM/YYYY"));
};

function writeLine(colorFn, title, message) {
  if (message === undefined) {
    message = title;
  }
  process.stderr.write(`\r${getTimestamp()} ${colorFn(`${title}:`)} ${message}`);
}

export default {
  err(title, message) {
    writeLine(colors.redBright, title || "ERROR", message);
  },
  error(title, message) {
    writeLine(colors.redBright, title || "ERROR", message);
  },
  warn(title, message) {
    writeLine(colors.yellowBright, title || "WARN", message);
  },
  info(title, message) {
    writeLine(colors.greenBright, title || "INFO", message);
  },
  success(title, message) {
    writeLine(colors.cyanBright, title || "SUCCESS", message);
  },
  master(title, message) {
    writeLine(colors.hex("#eb6734"), title || "MASTER", message);
  },
};
