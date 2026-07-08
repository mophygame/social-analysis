import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

const targets = [
  ["src/app.js", "assets/app.min.js"],
  ["worker.js", "worker.min.js"]
];

for (const [input, output] of targets) {
  const inputPath = resolve(root, input);
  const outputPath = resolve(root, output);
  const source = readFileSync(inputPath, "utf8");
  const minified = minifyJs(source);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${minified}\n`);
  console.log(`${input} -> ${output} (${source.length} -> ${minified.length} bytes)`);
}

function minifyJs(source) {
  return collapseWhitespace(stripComments(source)).trim();
}

function stripComments(source) {
  let output = "";
  let state = "code";
  let quote = "";
  let previousSignificant = "";

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (state === "line-comment") {
      if (char === "\n" || char === "\r") {
        output += " ";
        state = "code";
      }
      continue;
    }

    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        output += " ";
        i++;
        state = "code";
      }
      continue;
    }

    if (state === "string") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === quote) {
        state = "code";
      }
      continue;
    }

    if (state === "template") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "`") {
        state = "code";
      }
      continue;
    }

    if (state === "regex") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "[") {
        state = "regex-class";
      } else if (char === "/") {
        while (/[a-z]/i.test(source[i + 1] || "")) {
          output += source[++i];
        }
        state = "code";
      }
      continue;
    }

    if (state === "regex-class") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "]") {
        state = "regex";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      i++;
      state = "line-comment";
      continue;
    }

    if (char === "/" && next === "*") {
      i++;
      state = "block-comment";
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      state = "string";
      output += char;
      previousSignificant = char;
      continue;
    }

    if (char === "`") {
      state = "template";
      output += char;
      previousSignificant = char;
      continue;
    }

    if (char === "/" && isRegexStart(previousSignificant)) {
      state = "regex";
      output += char;
      previousSignificant = char;
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      previousSignificant = char;
    }
  }

  return output;
}

function collapseWhitespace(source) {
  let output = "";
  let state = "code";
  let quote = "";

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (state === "string") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === quote) {
        state = "code";
      }
      continue;
    }

    if (state === "template") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "`") {
        state = "code";
      }
      continue;
    }

    if (state === "regex") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "[") {
        state = "regex-class";
      } else if (char === "/") {
        while (/[a-z]/i.test(source[i + 1] || "")) {
          output += source[++i];
        }
        state = "code";
      }
      continue;
    }

    if (state === "regex-class") {
      output += char;
      if (char === "\\") {
        output += next || "";
        i++;
      } else if (char === "]") {
        state = "regex";
      }
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      state = "string";
      output += char;
      continue;
    }

    if (char === "`") {
      state = "template";
      output += char;
      continue;
    }

    if (char === "/" && isRegexStart(lastSignificant(output))) {
      state = "regex";
      output += char;
      continue;
    }

    if (/\s/.test(char)) {
      const previous = lastSignificant(output);
      const nextSignificant = findNextSignificant(source, i + 1);
      if (needsSpace(previous, nextSignificant) && !output.endsWith(" ")) {
        output += " ";
      }
      continue;
    }

    if ("{}[]();,:?=+-*/%<>!&|^~".includes(char) && output.endsWith(" ")) {
      output = output.slice(0, -1);
    }
    output += char;
  }

  return output.replace(/\s+([{}[\]();,:?=+\-*/%<>!&|^~])/g, "$1");
}

function isRegexStart(previous) {
  return !previous || "([{=,:;!&|?+-*~^<>".includes(previous);
}

function lastSignificant(value) {
  for (let i = value.length - 1; i >= 0; i--) {
    if (!/\s/.test(value[i])) return value[i];
  }
  return "";
}

function findNextSignificant(value, start) {
  for (let i = start; i < value.length; i++) {
    if (!/\s/.test(value[i])) return value[i];
  }
  return "";
}

function needsSpace(previous, next) {
  if (!previous || !next) return false;
  return /[$_\p{L}\p{N}]/u.test(previous) && /[$_\p{L}\p{N}]/u.test(next);
}
