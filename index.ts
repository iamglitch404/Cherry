// @ts-nocheck
"use strict";import{spawn as i}from"child_process";import o from"./logger/log.ts";import e from"path";import{fileURLToPath as n}from"url";const s=n(import.meta.url),m=e.dirname(s);function t(){i("npx tsx Cherry.ts",{cwd:m,stdio:"inherit",shell:!0}).on("close",r=>{r===2&&(o.info?o.info("Restarting Project..."):console.log("Restarting Project..."),t())})}t();
