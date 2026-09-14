// @ts-nocheck
"use strict";

export async function getSession(sessionPath) {
  return await global.useMultiFileAuthState(sessionPath);
}
