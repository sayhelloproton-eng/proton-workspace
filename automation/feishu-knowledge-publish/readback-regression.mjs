#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(dir, "feishu-knowledge-publish.mjs"), "utf8");

function fail(message) {
  process.stderr.write("READBACK_REGRESSION=FAIL " + message + "\n");
  process.exit(1);
}

function functionSource(name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  if (start < 0) fail("missing function " + name);
  const brace = source.indexOf("{", start);
  if (brace < 0) fail("missing function body " + name);
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail("unterminated function " + name);
}

function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) fail(label + " missing");
}

function requireExcludes(text, needle, label) {
  if (text.includes(needle)) fail(label + " unexpectedly present");
}

const publishOne = functionSource("publishOne");
const reconcile = functionSource("reconcileMode");
const verify = functionSource("verifyMode");
const receipt = functionSource("baseReceipt");
const fetch = functionSource("fetchDoc");

requireIncludes(fetch, 'purpose = "generic"', "fetch purpose");
requireIncludes(fetch, 'READBACK.postWriteFetches += 1', "post-write metric");
requireIncludes(fetch, 'READBACK.fullVerifyFetches += 1', "full-verify metric");

requireIncludes(publishOne, '"image-reuse"', "image reuse readback");
requireIncludes(publishOne, '"post-write"', "post-write readback");

requireIncludes(reconcile, "const structured = state.remote;", "structure readback reuse");
requireIncludes(reconcile, "const finalTree = crawlRemote(cfg);", "final tree readback");
requireIncludes(reconcile, "verifyTree(cfg, desired, finalTree);", "final tree verification");
requireExcludes(reconcile, "verifyAllBodies(", "duplicate full body rescan");

requireIncludes(verify, "verifyAllBodies(", "explicit full body verify");
requireIncludes(receipt, "readback: readbackMetrics()", "receipt readback metrics");
requireIncludes(source.slice(source.lastIndexOf("catch (error)")), "readback: readbackMetrics()", "blocked receipt readback metrics");

process.stdout.write("READBACK_REGRESSION=PASS\n");
