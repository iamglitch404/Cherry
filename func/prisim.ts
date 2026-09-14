// @ts-nocheck
"use strict";

const defaultStyles = {
  cdata: "color:#8292a2",
  comment: "color:#8292a2",
  doctype: "color:#8292a2",
  prolog: "color:#8292a2",
  punctuation: "color:#f8f8f2",
  namespace: "opacity:.7",
  constant: "color:#f92672",
  deleted: "color:#f92672",
  property: "color:#f92672",
  symbol: "color:#f92672",
  tag: "color:#f92672",
  boolean: "color:#ae81ff",
  number: "color:#ae81ff",
  "attr-name": "color:#a6e22e",
  builtin: "color:#a6e22e",
  char: "color:#a6e22e",
  inserted: "color:#a6e22e",
  selector: "color:#a6e22e",
  string: "color:#a6e22e",
  "language-css .token.string": "color:#f8f8f2",
  ".style .token.string": "color:#f8f8f2",
  entity: "color:#f8f8f2; cursor:help",
  operator: "color:#f8f8f2",
  url: "color:#f8f8f2",
  variable: "color:#f8f8f2",
  atrule: "color:#e6db74",
  "attr-value": "color:#e6db74",
  "class-name": "color:#e6db74",
  function: "color:#e6db74",
  keyword: "color:#66d9ef",
  regex: "color:#fd971f",
  important: "color:#fd971f; font-weight:bold",
  bold: "font-weight:bold",
  italic: "font-style:italic",
};

function LinkedList() {
  const head = { value: null, prev: null, next: null };
  const tail = { value: null, prev: head, next: null };
  head.next = tail;
  this.head = head;
  this.tail = tail;
  this.length = 0;
}

function addAfter(list, node, value) {
  const next = node.next;
  const newNode = { value, prev: node, next };
  node.next = newNode;
  next.prev = newNode;
  list.length++;
  return newNode;
}

function removeRange(list, node, count) {
  let next = node.next;
  let i = 0;
  for (; i < count && next !== list.tail; i++) {
    next = next.next;
  }
  node.next = next;
  next.prev = node;
  list.length -= i;
}

function toArray(list) {
  const array = [];
  let current = list.head.next;
  while (current !== list.tail) {
    array.push(current.value);
    current = current.next;
  }
  return array;
}

function matchPattern(pattern, pos, text, lookbehind) {
  pattern.lastIndex = pos;
  const match = pattern.exec(text);
  if (match && lookbehind && match[1]) {
    const lookbehindLength = match[1].length;
    match.index += lookbehindLength;
    match[0] = match[0].slice(lookbehindLength);
  }
  return match;
}

function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
  for (const token in grammar) {
    if (!grammar.hasOwnProperty(token) || !grammar[token]) continue;

    let patterns = grammar[token];
    patterns = Array.isArray(patterns) ? patterns : [patterns];

    for (let j = 0; j < patterns.length; ++j) {
      if (rematch && rematch.cause === token + "," + j) return;

      const patternObj = patterns[j];
      const inside = patternObj.inside;
      const lookbehind = !!patternObj.lookbehind;
      const greedy = !!patternObj.greedy;
      const alias = patternObj.alias;

      let regex = patternObj.pattern || patternObj;

      if (greedy && !regex.global) {
        const flags = regex.toString().match(/[imsuy]*$/)[0];
        regex = RegExp(regex.source, flags + "g");
      }

      for (
        let currentNode = startNode.next, pos = startPos;
        currentNode !== tokenList.tail && !(rematch && pos >= rematch.reach);
        pos += currentNode.value.length, currentNode = currentNode.next
      ) {
        let str = currentNode.value;
        if (tokenList.length > text.length) return;
        if (str instanceof Token) continue;

        let removeCount = 1;
        let match;

        if (greedy) {
          match = matchPattern(regex, pos, text, lookbehind);
          if (!match || match.index >= text.length) break;

          const from = match.index;
          const to = match.index + match[0].length;
          let p = pos;

          p += currentNode.value.length;
          while (from >= p) {
            currentNode = currentNode.next;
            p += currentNode.value.length;
          }
          p -= currentNode.value.length;
          pos = p;

          if (currentNode.value instanceof Token) continue;

          for (
            let k = currentNode;
            k !== tokenList.tail && (p < to || typeof k.value === "string");
            k = k.next
          ) {
            removeCount++;
            p += k.value.length;
          }
          removeCount--;
          str = text.slice(pos, p);
          match.index -= pos;
        } else {
          match = matchPattern(regex, 0, str, lookbehind);
          if (!match) continue;
        }

        const matchStart = match.index;
        const matchStr = match[0];
        const before = str.slice(0, matchStart);
        const after = str.slice(matchStart + matchStr.length);
        const reach = pos + str.length;

        if (rematch && reach > rematch.reach) {
          rematch.reach = reach;
        }

        let prevNode = currentNode.prev;
        if (before) {
          prevNode = addAfter(tokenList, prevNode, before);
          pos += before.length;
        }

        removeRange(tokenList, prevNode, removeCount);

        const wrapped = new Token(
          token,
          inside ? Prism.tokenize(matchStr, inside) : matchStr,
          alias,
          matchStr
        );
        currentNode = addAfter(tokenList, prevNode, wrapped);

        if (after) {
          addAfter(tokenList, currentNode, after);
        }

        if (removeCount > 1) {
          const nestedRematch = { cause: token + "," + j, reach };
          matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);
          if (rematch && nestedRematch.reach > rematch.reach) {
            rematch.reach = nestedRematch.reach;
          }
        }
      }
    }
  }
}

function Token(type, content, alias, matchedStr) {
  this.type = type;
  this.content = content;
  this.alias = alias;
  this.length = (matchedStr || "").length | 0;
}

Token.stringify = function stringify(token, language, options = {}) {
  const styles = options.styles || defaultStyles;
  if (typeof token === "string") return token;

  if (Array.isArray(token)) {
    return token.map((item) => stringify(item, language, options)).join("");
  }

  const env = {
    type: token.type,
    content: stringify(token.content, language, options),
    tag: "span",
    classes: ["token", token.type],
    attributes: {},
    language,
  };

  if (token.alias) {
    const aliases = Array.isArray(token.alias) ? token.alias : [token.alias];
    Array.prototype.push.apply(env.classes, aliases);
  }

  Prism.hooks.run("wrap", env);

  let attrStr = "";
  for (const attr in env.attributes) {
    attrStr += ` ${attr}="${(env.attributes[attr] || "").replace(/"/g, "&quot;")}"`;
  }

  const styleAttr = env.classes
    .map((cls) => styles[cls] || "")
    .filter(Boolean)
    .join(";");

  return `<${env.tag} class="${env.classes.join(" ")}"${attrStr} style="${styleAttr}">${env.content}</${env.tag}>`;
};

const Prism = {
  hooks: {
    all: {},
    add(name, callback) {
      const hooks = Prism.hooks.all;
      hooks[name] = hooks[name] || [];
      hooks[name].push(callback);
    },
    run(name, env) {
      const callbacks = Prism.hooks.all[name];
      if (!callbacks || !callbacks.length) return;
      for (const cb of callbacks) {
        cb(env);
      }
    },
  },

  util: {
    encode(tokens) {
      if (tokens instanceof Token) {
        return new Token(tokens.type, Prism.util.encode(tokens.content), tokens.alias);
      }
      if (Array.isArray(tokens)) {
        return tokens.map(Prism.util.encode);
      }
      return tokens
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\u00a0/g, " ");
    },
  },

  tokenize(text, grammar) {
    const rest = grammar.rest;
    if (rest) {
      for (const key in rest) {
        grammar[key] = rest[key];
      }
      delete grammar.rest;
    }

    const tokenList = new LinkedList();
    addAfter(tokenList, tokenList.head, text);
    matchGrammar(text, tokenList, grammar, tokenList.head, 0);
    return toArray(tokenList);
  },

  highlight(code, grammar, language, options = {}) {
    const env = { code, grammar, language };
    Prism.hooks.run("before-tokenize", env);

    if (!env.grammar) {
      throw new Error(`The language "${env.language}" has no grammar.`);
    }

    env.tokens = Prism.tokenize(env.code, env.grammar);
    Prism.hooks.run("after-tokenize", env);
    return Token.stringify(Prism.util.encode(env.tokens), env.language, options);
  },

  languages: {},
};

Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true,
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:false|true)\b/,
  null: { pattern: /\bnull\b/, alias: "keyword" },
};

Prism.languages.jsstacktrace = {
  "error-message": {
    pattern: /^\S.*/m,
    alias: "string",
  },
  "stack-frame": {
    pattern: /(^[ \t]+)at[ \t].*/m,
    lookbehind: true,
    inside: {
      "not-my-code": {
        pattern: /^at[ \t]+(?!\s)(?:node\.js|<unknown>|.*(?:node_modules|\(<anonymous>\)|\(<unknown>|<anonymous>$|\(internal\/|\(node\.js)).*/m,
        alias: "comment",
      },
      filename: {
        pattern: /(\bat\s+(?!\s)|\()(?:[a-zA-Z]:)?[^():]+(?=:)/,
        lookbehind: true,
        alias: "url",
      },
      function: {
        pattern: /(\bat\s+(?:new\s+)?)(?!\s)[_$a-zA-Z\xA0-\uFFFF<][.$\w\xA0-\uFFFF<>]*/,
        lookbehind: true,
        inside: { punctuation: /\./ },
      },
      punctuation: /[()]/,
      keyword: /\b(?:at|new)\b/,
      alias: {
        pattern: /\[(?:as\s+)?(?!\s)[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\]/,
        alias: "variable",
      },
      "line-number": {
        pattern: /:\d+(?::\d+)?\b/,
        alias: "number",
        inside: { punctuation: /:/ },
      },
    },
  },
};

Prism.languages.jsstack = Prism.languages.jsstacktrace;
Prism.languages.webmanifest = Prism.languages.json;

export default Prism;
