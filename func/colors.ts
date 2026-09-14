// @ts-nocheck
"use strict";

export const isHexColor = (str) => {
  return typeof str === "string" && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(str);
};

const ansiCodes = {
  // Styles
  bold: (text) => `\x1B[1m${text}\x1B[0m`,
  italic: (text) => `\x1B[3m${text}\x1B[0m`,
  underline: (text) => `\x1B[4m${text}\x1B[0m`,
  strikethrough: (text) => `\x1B[9m${text}\x1B[0m`,
  blink: (text) => `\x1B[5m${text}\x1B[0m`,
  inverse: (text) => `\x1B[7m${text}\x1B[0m`,
  hidden: (text) => `\x1B[8m${text}\x1B[0m`,
  reset: (text) => text,
  default: (text) => text,

  // Text Colors
  black: (text) => `\x1B[30m${text}\x1B[0m`,
  red: (text) => `\x1B[31m${text}\x1B[0m`,
  green: (text) => `\x1B[32m${text}\x1B[0m`,
  yellow: (text) => `\x1B[33m${text}\x1B[0m`,
  blue: (text) => `\x1B[34m${text}\x1B[0m`,
  magenta: (text) => `\x1B[35m${text}\x1B[0m`,
  cyan: (text) => `\x1B[36m${text}\x1B[0m`,
  white: (text) => `\x1B[37m${text}\x1B[0m`,
  gray: (text) => `\x1B[90m${text}\x1B[0m`,
  grey: (text) => `\x1B[90m${text}\x1B[0m`,

  // Bright Text Colors
  redBright: (text) => `\x1B[91m${text}\x1B[0m`,
  greenBright: (text) => `\x1B[92m${text}\x1B[0m`,
  yellowBright: (text) => `\x1B[93m${text}\x1B[0m`,
  blueBright: (text) => `\x1B[94m${text}\x1B[0m`,
  cyanBright: (text) => `\x1B[96m${text}\x1B[0m`,

  // Background Colors
  bgBlack: (text) => `\x1B[40m${text}\x1B[0m`,
  bgRed: (text) => `\x1B[41m${text}\x1B[0m`,
  bgGreen: (text) => `\x1B[42m${text}\x1B[0m`,
  bgYellow: (text) => `\x1B[43m${text}\x1B[0m`,
  bgBlue: (text) => `\x1B[44m${text}\x1B[0m`,
  bgMagenta: (text) => `\x1B[45m${text}\x1B[0m`,
  bgCyan: (text) => `\x1B[46m${text}\x1B[0m`,
  bgWhite: (text) => `\x1B[47m${text}\x1B[0m`,
  bgGray: (text) => `\x1B[100m${text}\x1B[0m`,
  bgGrey: (text) => `\x1B[100m${text}\x1B[0m`,

  // 24-bit TrueColor Hex support
  hex(hexCode, text) {
    if (isHexColor(text)) {
      [hexCode, text] = [text, hexCode];
    }
    const parse = (hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];

    if (text) {
      const [r, g, b] = parse(hexCode);
      return `\x1B[38;2;${r};${g};${b}m${text}\x1B[0m`;
    }

    if (isHexColor(hexCode)) {
      const [r, g, b] = parse(hexCode);
      return (str) => `\x1B[38;2;${r};${g};${b}m${str}\x1B[0m`;
    }

    return (str) => `\x1B[38;2;${parse(str).join(";")}m${hexCode}\x1B[0m`;
  },

  bgHex(hexCode, text) {
    if (isHexColor(text)) {
      [hexCode, text] = [text, hexCode];
    }
    const parse = (hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];

    if (text) {
      const [r, g, b] = parse(hexCode);
      return `\x1B[48;2;${r};${g};${b}m${text}\x1B[0m`;
    }

    if (isHexColor(hexCode)) {
      const [r, g, b] = parse(hexCode);
      return (str) => `\x1B[48;2;${r};${g};${b}m${str}\x1B[0m`;
    }

    return (str) => `\x1B[48;2;${parse(str).join(";")}m${hexCode}\x1B[0m`;
  },
};

export const colors = {};
colors.bold = {};

for (const name in ansiCodes) {
  if (name !== "bold") {
    colors[name] = ansiCodes[name];
    colors[name].bold = (text, extra) => ansiCodes.bold(ansiCodes[name](text, extra));
    colors.bold[name] = (text, extra) => ansiCodes.bold(ansiCodes[name](text, extra));
  }
}

export default { isHexColor, colors };
