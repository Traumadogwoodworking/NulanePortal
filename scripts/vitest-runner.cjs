#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Module = require("module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");

function transpile(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowSyntheticDefaultImports: true,
      baseUrl: projectRoot,
      paths: {
        "@/*": ["src/*"],
      },
    },
    fileName: filename,
  });
  return result.outputText;
}

function installTsExtensions() {
  for (const ext of [".ts", ".tsx"]) {
    Module._extensions[ext] = function load(module, filename) {
      const code = transpile(filename);
      module._compile(code, filename);
    };
  }
}

function installPathAliases() {
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      const mapped = path.join(projectRoot, "src", request.slice(2));
      return originalResolveFilename.call(this, mapped, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}

const results = [];

global.describe = (name, fn) => {
  fn();
};

global.it = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
};

global.expect = (received) => ({
  toBe(expected) {
    assert.strictEqual(received, expected);
  },
  toContain(expected) {
    assert.ok(String(received).includes(expected), `${received} does not contain ${expected}`);
  },
});

installTsExtensions();
installPathAliases();

const testsDir = path.join(projectRoot, "src/__tests__");
for (const file of fs.readdirSync(testsDir)) {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
    require(path.join(testsDir, file));
  }
}

const failures = results.filter((result) => !result.ok);
for (const failure of failures) {
  console.error(`FAIL ${failure.name}`);
  console.error(failure.error);
}

if (failures.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`Passed ${results.length} tests`);
}
