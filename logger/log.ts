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

function logError(title, message, ...rest) {
  if (message === undefined) {
    message = title;
    title = "ERROR";
  }
  console.log(`${getTimestamp()} ${colors.redBright(`${title}:`)}`, message);
  for (let item of rest) {
    if (typeof item === "object" && !item.stack) {
      item = JSON.stringify(item, null, 2);
    }
    console.log(`${getTimestamp()} ${colors.redBright(`${title}:`)}`, item);
  }
}

export default {
  err: logError,
  error: logError,

  warn(title, message) {
    if (message === undefined) {
      message = title;
      title = "WARN";
    }
    console.log(`${getTimestamp()} ${colors.yellowBright(`${title}:`)}`, message);
  },

  info(title, message) {
    if (message === undefined) {
      message = title;
      title = "INFO";
    }
    console.log(`${getTimestamp()} ${colors.greenBright(`${title}:`)}`, message);
  },

  success(title, message) {
    if (message === undefined) {
      message = title;
      title = "SUCCESS";
    }
    console.log(`${getTimestamp()} ${colors.cyanBright(`${title}:`)}`, message);
  },

  master(title, message) {
    if (message === undefined) {
      message = title;
      title = "MASTER";
    }
    console.log(`${getTimestamp()} ${colors.hex("#eb6734", `${title}:`)}`, message);
  },

  dev(...args) {
    try {
      throw new Error();
    } catch (err) {
      const callerLine = err.stack?.split("\n")[2];
      if (callerLine) {
        let location = callerLine.slice(callerLine.indexOf(process.cwd()) + process.cwd().length + 1);
        if (location.endsWith(")")) {
          location = location.slice(0, -1);
        }
        console.log(`\x1B[36m${location} =>\x1B[0m`, ...args);
      } else {
        console.log("\x1B[36mdev =>\x1B[0m", ...args);
      }
    }
  },
};
