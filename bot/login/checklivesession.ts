// @ts-nocheck
"use strict";

import fs from "fs";
import path from "path";

export function checkLiveSession(authState, targetPhoneNumber) {
  if (authState?.creds?.me?.id && targetPhoneNumber) {
    const activeId = authState.creds.me.id;
    const formattedJid = global.getFormattedJid ? global.getFormattedJid(targetPhoneNumber) : null;

    if (formattedJid) {
      const activeDigits = (activeId.split(":")[0] || "").replace(/\D/g, "");
      const targetDigits = (formattedJid.split("@")[0] || "").replace(/\D/g, "");

      if (activeDigits && targetDigits && activeDigits !== targetDigits) {
        return false;
      }
    }
  }
  return true;
}

export function clearInvalidSession(sessionFolder) {
  try {
    if (fs.existsSync(sessionFolder)) {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
      console.log(`[System] Cleared invalid session folder: ${sessionFolder}`);
    }
  } catch (err) {
    console.error("[System] Failed to clear session folder:", err);
    try {
      const credsPath = path.join(sessionFolder, "creds.json");
      if (fs.existsSync(credsPath)) {
        fs.unlinkSync(credsPath);
      }
    } catch {}
  }
}
