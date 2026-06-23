// @ts-nocheck
"use strict";export async function createSocket(a,n){const{version:o}=await global.fetchLatestBaileysVersion(),e=global.makeWASocket({auth:a,logger:n,browser:["Ubuntu","Chrome","22.04.4"],version:o,syncFullHistory:!1,printQRInTerminal:!1,generateHighQualityLinkPreview:!1});return global.sock=e,e}
