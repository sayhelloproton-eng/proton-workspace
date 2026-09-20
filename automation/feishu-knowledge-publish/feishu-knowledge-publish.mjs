#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const W = path.resolve(process.env.PROTON_WORKSPACE_ROOT || "/Users/agent/Desktop/proton-workspace");
const D = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(D, ".runtime");
const RECEIPT = path.join(R, "latest-receipt.json");
const TARGET = path.join(D, "knowledge-target.json");
const LARK = process.env.LARK_CLI_BIN || "lark-cli";
const READBACK = {
  docFetchCalls: 0,
  imageReuseFetches: 0,
  postWriteFetches: 0,
  fullVerifyFetches: 0
};

function readbackMetrics() {
  return { ...READBACK };
}

class PublishError extends Error {
  constructor(code, options = {}) {
    super(options.message || code);
    this.code = code;
    this.path = options.path || null;
    this.sideEffectState = options.sideEffectState || "NOT_STARTED";
    this.safeToRetry = options.safeToRetry === true;
    this.evidence = options.evidence || null;
  }
}

const fail = (code, options) => { throw new PublishError(code, options); };
const keyOf = (parts) => parts.join("\u0000");
const rel = (p) => path.relative(W, p).replaceAll("\\", "/");
const within = (root, p) => {
  const r = path.relative(root, p);
  return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
};
const normalize = (text) => String(text || "")
  .replace(/[\u200B-\u200D\uFEFF]/g, "")
  .replace(/[#>*_~|\[\]()`]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

function emit(value, exitCode = 0) {
  atomicJson(RECEIPT, value);
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exitCode = exitCode;
}

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    cwd: options.cwd || W,
    encoding: "utf8",
    timeout: options.timeoutMs || 60000,
    maxBuffer: 8_000_000
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    out: result.stdout || "",
    err: result.stderr || (result.error && result.error.message) || ""
  };
}

function cli(args, timeoutMs = 60000) {
  return run(LARK, args, { timeoutMs });
}

function jsonResult(result, code) {
  if (!result.ok) fail(code, { evidence: result.err.slice(-1200), safeToRetry: true });
  try { return JSON.parse(result.out); }
  catch { fail(code, { evidence: "invalid json", safeToRetry: true }); }
}

function findValue(value, names) {
  if (!value || typeof value !== "object") return null;
  for (const name of names) if (typeof value[name] === "string" && value[name]) return value[name];
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findValue(child, names);
    if (found) return found;
  }
  return null;
}

function collectNodes(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (!Array.isArray(value) && typeof value.title === "string" &&
      (value.node_token || value.nodeToken || value.obj_token || value.objToken)) out.push(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) collectNodes(child, out);
  return out;
}

function readConfig() {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(TARGET, "utf8")); }
  catch { fail("TARGET_CONFIG_INVALID"); }
  const ok = cfg && cfg.contract === "feishu-knowledge-target.v3" &&
    typeof cfg.name === "string" && typeof cfg.sourceRoot === "string" &&
    typeof cfg.spaceId === "string" && ["user", "bot"].includes(cfg.identity) &&
    cfg.manageEntireSpace === true && cfg.firstDocument &&
    typeof cfg.firstDocument.title === "string" &&
    typeof cfg.firstDocument.nodeToken === "string" &&
    typeof cfg.firstDocument.source === "string" &&
    Array.isArray(cfg.managedTopLevel) && cfg.managedTopLevel.length > 0;
  if (!ok) fail("TARGET_CONFIG_INVALID");
  const sourceRoot = path.resolve(W, cfg.sourceRoot);
  if (!within(W, sourceRoot) || !fs.statSync(sourceRoot, { throwIfNoEntry: false })?.isDirectory()) {
    fail("SOURCE_ROOT_INVALID");
  }
  return { ...cfg, sourceRoot };
}

function readOrder(cfg) {
  const p = path.join(cfg.sourceRoot, "_order.json");
  let order;
  try { order = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { fail("ORDER_INVALID"); }
  if (order?.contract !== "knowledge-order.v2" || !Array.isArray(order.topLevel)) fail("ORDER_INVALID");
  if (order.children !== undefined) {
    if (!order.children || typeof order.children !== "object" || Array.isArray(order.children)) {
      fail("ORDER_INVALID");
    }
    for (const [source, entries] of Object.entries(order.children)) {
      if (!source || !Array.isArray(entries) || entries.some((x) => typeof x !== "string" || !x)) {
        fail("ORDER_INVALID");
      }
      if (new Set(entries).size !== entries.length) fail("ORDER_INVALID");
    }
  }
  const actual = cfg.managedTopLevel.map((x) => x.title);
  if (JSON.stringify(order.topLevel) !== JSON.stringify(actual)) {
    fail("ORDER_TARGET_MISMATCH", { evidence: "knowledge order and managedTopLevel differ" });
  }
  return order;
}

function safeSource(cfg, relative, kind = "file") {
  const p = path.resolve(cfg.sourceRoot, relative);
  if (!within(cfg.sourceRoot, p)) fail("SOURCE_OUTSIDE_ROOT", { path: relative });
  const st = fs.statSync(p, { throwIfNoEntry: false });
  if (kind === "file" && !st?.isFile()) fail("SOURCE_MISSING", { path: relative });
  if (kind === "dir" && !st?.isDirectory()) fail("SOURCE_MISSING", { path: relative });
  return p;
}

function headingTitle(file) {
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m) return m[1].trim();
  }
  fail("SOURCE_TITLE_MISSING", { path: rel(file) });
}

function stripLeadingHeading(raw) {
  const lines = raw.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;
  if (index < lines.length && /^#\s+/.test(lines[index])) {
    lines.splice(index, 1);
    if (index < lines.length && !lines[index].trim()) lines.splice(index, 1);
  }
  return lines.join("\n").trimStart();
}

function fingerprint(raw) {
  const body = stripLeadingHeading(raw);
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim() || /^!\[/.test(line.trim()) || /^```/.test(line.trim())) continue;
    const value = normalize(line);
    if (value.length >= 16) return value.slice(0, 100);
  }
  const title = /^#\s+(.+)$/m.exec(raw);
  return normalize(title ? title[1] : raw).slice(0, 100);
}

function localImages(file, raw) {
  const out = [];
  const seen = new Set();
  const re = /!\[([^\]]*)\]\((@?[^)]+)\)/g;
  for (const match of raw.matchAll(re)) {
    const original = match[2].trim();
    const value = original.startsWith("@") ? original.slice(1).trim() : original;
    if (/^(?:https?:|data:|#)/i.test(value)) continue;
    const p = path.resolve(path.dirname(file), value);
    if (!within(W, p) || !fs.statSync(p, { throwIfNoEntry: false })?.isFile()) {
      fail("IMAGE_SOURCE_INVALID", { path: rel(file), evidence: value });
    }
    const k = p + "\u0000" + match[1];
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ raw: match[0], alt: match[1], path: p });
    }
  }
  return out;
}

function desiredNode(cfg, title, pathTitles, bodySource, sourceTag) {
  let raw = null;
  let images = [];
  let fp = null;
  if (bodySource) {
    raw = fs.readFileSync(bodySource, "utf8");
    images = localImages(bodySource, raw);
    fp = fingerprint(raw);
  }
  return {
    title,
    path: pathTitles,
    key: keyOf(pathTitles),
    parentKey: keyOf(pathTitles.slice(0, -1)),
    depth: pathTitles.length,
    bodySource,
    sourceTag,
    images,
    fingerprint: fp
  };
}

function orderedEntries(cfg, dir, order, ignored = []) {
  const ignore = new Set(["README.md", ...ignored]);
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => !ignore.has(entry.name));
  const relative = path.relative(cfg.sourceRoot, dir).replaceAll("\\", "/");
  const explicit = order.children?.[relative];
  if (!explicit) {
    return entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
  }
  const publishable = entries.filter((entry) =>
    entry.isDirectory() || (entry.isFile() && entry.name.endsWith(".md"))
  );
  const byName = new Map(publishable.map((entry) => [entry.name, entry]));
  const actual = [...byName.keys()].sort();
  const expected = [...explicit].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("ORDER_CHILDREN_MISMATCH", {
      path: relative,
      evidence: "explicit child order must cover every publishable direct child exactly once"
    });
  }
  return explicit.map((name) => byName.get(name));
}

function addDirChildren(cfg, dir, parentTitles, out, order, ignored = []) {
  const entries = orderedEntries(cfg, dir, order, ignored);
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const title = headingTitle(p);
      out.push(desiredNode(cfg, title, [...parentTitles, title], p, rel(p)));
    } else if (entry.isDirectory()) {
      const readme = path.join(p, "README.md");
      const hasReadme = fs.statSync(readme, { throwIfNoEntry: false })?.isFile();
      const title = hasReadme ? headingTitle(readme) : entry.name;
      out.push(desiredNode(cfg, title, [...parentTitles, title], hasReadme ? readme : null, rel(p)));
      addDirChildren(cfg, p, [...parentTitles, title], out, order);
    }
  }
}

function buildDesired(cfg) {
  const order = readOrder(cfg);
  const out = [];
  const first = cfg.firstDocument;
  const firstBody = safeSource(cfg, first.source, "file");
  out.push(desiredNode(cfg, first.title, [first.title], firstBody, first.source));
  if (first.childrenSource) {
    const childDir = safeSource(cfg, first.childrenSource, "dir");
    addDirChildren(cfg, childDir, [first.title], out, order, first.ignoreChildren || []);
  }
  for (const item of cfg.managedTopLevel.slice(1)) {
    if (typeof item.title !== "string" || typeof item.source !== "string") fail("TARGET_CONFIG_INVALID");
    const dir = safeSource(cfg, item.source, "dir");
    const readme = path.join(dir, "README.md");
    const body = fs.statSync(readme, { throwIfNoEntry: false })?.isFile() ? readme : null;
    out.push(desiredNode(cfg, item.title, [item.title], body, item.source));
    addDirChildren(cfg, dir, [item.title], out, order);
  }
  const keys = new Set();
  for (const node of out) {
    if (keys.has(node.key)) fail("DESIRED_DUPLICATE_PATH", { path: node.path.join("/") });
    keys.add(node.key);
  }
  return out;
}

function identityArgs(cfg) { return ["--as", cfg.identity]; }

function listChildren(cfg, parent) {
  const args = [
    "wiki", "+node-list", "--space-id", cfg.spaceId,
    "--page-all", "--page-limit", "0", "--format", "json",
    ...identityArgs(cfg)
  ];
  if (parent) args.push("--parent-node-token", parent);
  const value = jsonResult(cli(args), "REMOTE_TREE_READ_FAILED");
  return collectNodes(value).map((x, index) => ({
    title: x.title,
    node: x.node_token || x.nodeToken || x.obj_token || x.objToken,
    obj: x.obj_token || x.objToken || x.node_token || x.nodeToken,
    hasChild: x.has_child === true || x.hasChild === true,
    index
  }));
}

function crawlRemote(cfg) {
  const out = [];
  const walk = (parent, parentPath) => {
    const children = listChildren(cfg, parent);
    for (const child of children) {
      const pathTitles = [...parentPath, child.title];
      const value = {
        ...child,
        path: pathTitles,
        key: keyOf(pathTitles),
        parentKey: keyOf(parentPath),
        depth: pathTitles.length
      };
      out.push(value);
      if (child.hasChild) walk(child.node, pathTitles);
    }
  };
  walk(null, []);
  return out;
}

function assertAnchor(cfg, remote) {
  const first = cfg.firstDocument;
  const match = remote.find((x) => x.node === first.nodeToken);
  if (!match || match.title !== first.title || match.depth !== 1) {
    fail("TARGET_IDENTITY_MISMATCH", {
      path: first.title,
      evidence: match ? match.path.join("/") : "anchor token not found"
    });
  }
}

function maps(remote) {
  const byPath = new Map();
  const byTitle = new Map();
  for (const node of remote) {
    const p = byPath.get(node.key) || [];
    p.push(node); byPath.set(node.key, p);
    const t = byTitle.get(node.title) || [];
    t.push(node); byTitle.set(node.title, t);
  }
  return { byPath, byTitle };
}

function computeDiff(cfg, desired, remote) {
  assertAnchor(cfg, remote);
  const m = maps(remote);
  const claimed = new Set();
  const create = [];
  const move = [];
  for (const d of desired) {
    const exact = m.byPath.get(d.key) || [];
    if (exact.length > 1) fail("AMBIGUOUS_NODE", { path: d.path.join("/"), evidence: "duplicate exact path" });
    if (exact.length === 1) {
      claimed.add(exact[0].node);
      continue;
    }
    const candidates = (m.byTitle.get(d.title) || []).filter((x) => !claimed.has(x.node));
    if (candidates.length > 1) {
      fail("AMBIGUOUS_NODE", { path: d.path.join("/"), evidence: "same title exists at multiple paths" });
    }
    if (candidates.length === 1) {
      claimed.add(candidates[0].node);
      move.push({ desired: d, current: candidates[0] });
    } else {
      create.push(d);
    }
  }
  const stale = cfg.manageEntireSpace ? remote.filter((x) => !claimed.has(x.node)) : [];
  const staleKeys = new Set(stale.map((x) => x.key));
  const deleteRoots = stale.filter((x) => {
    for (let i = 1; i < x.path.length; i += 1) {
      if (staleKeys.has(keyOf(x.path.slice(0, i)))) return false;
    }
    return true;
  });
  return { create, move, stale, deleteRoots };
}

function createNode(cfg, d, parentNode) {
  const args = [
    "wiki", "+node-create", "--space-id", cfg.spaceId,
    "--title", d.title, "--obj-type", "docx", "--format", "json",
    ...identityArgs(cfg)
  ];
  if (parentNode) args.push("--parent-node-token", parentNode);
  const result = cli(args, 120000);
  if (result.ok) {
    const value = JSON.parse(result.out);
    return {
      title: d.title,
      node: findValue(value, ["node_token", "nodeToken"]),
      obj: findValue(value, ["obj_token", "objToken"])
    };
  }
  const found = listChildren(cfg, parentNode).filter((x) => x.title === d.title);
  if (found.length === 1) return found[0];
  fail("UNKNOWN_SIDE_EFFECT", {
    path: d.path.join("/"),
    sideEffectState: "UNKNOWN",
    safeToRetry: false,
    evidence: "node-create returned non-terminal result"
  });
}

function moveNode(cfg, current, d, parentNode) {
  const args = [
    "wiki", "+move", "--node-token", current.node,
    "--source-space-id", cfg.spaceId, "--target-space-id", cfg.spaceId,
    "--format", "json", ...identityArgs(cfg)
  ];
  if (parentNode) args.push("--target-parent-token", parentNode);
  const result = cli(args, 120000);
  if (result.ok) return;
  let after;
  try { after = crawlRemote(cfg); } catch { after = []; }
  const applied = after.find((x) => x.node === current.node && x.key === d.key);
  if (applied) return;
  fail("UNKNOWN_SIDE_EFFECT", {
    path: d.path.join("/"),
    sideEffectState: "UNKNOWN",
    safeToRetry: false,
    evidence: "wiki move result unresolved"
  });
}

function ensureStructure(cfg, desired, allowMove) {
  let created = 0;
  let moved = 0;
  const maxDepth = Math.max(...desired.map((x) => x.depth));
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const remote = crawlRemote(cfg);
    assertAnchor(cfg, remote);
    const m = maps(remote);
    for (const d of desired.filter((x) => x.depth === depth)) {
      const exact = m.byPath.get(d.key) || [];
      if (exact.length === 1) continue;
      if (exact.length > 1) fail("AMBIGUOUS_NODE", { path: d.path.join("/") });
      const candidates = m.byTitle.get(d.title) || [];
      if (candidates.length > 1) fail("AMBIGUOUS_NODE", { path: d.path.join("/") });
      const parent = depth === 1 ? null : (m.byPath.get(d.parentKey) || [])[0];
      if (depth > 1 && !parent) fail("STRUCTURE_CONFLICT", { path: d.path.join("/"), evidence: "parent missing" });
      if (candidates.length === 1) {
        if (!allowMove) fail("STRUCTURE_CONFLICT", {
          path: d.path.join("/"),
          evidence: "node exists under wrong parent; use reconcile --all"
        });
        moveNode(cfg, candidates[0], d, parent?.node || null);
        moved += 1;
      } else {
        createNode(cfg, d, parent?.node || null);
        created += 1;
      }
    }
  }
  return { created, moved, remote: crawlRemote(cfg) };
}

function deleteStale(cfg, desired, remote) {
  const diff = computeDiff(cfg, desired, remote);
  let deleted = 0;
  for (const stale of diff.deleteRoots.sort((a, b) => b.depth - a.depth)) {
    const result = cli([
      "wiki", "+node-delete", "--node-token", stale.node,
      "--space-id", cfg.spaceId, "--obj-type", "wiki",
      "--include-children=true", "--format", "json", "--yes",
      ...identityArgs(cfg)
    ], 120000);
    if (!result.ok) {
      let after;
      try { after = crawlRemote(cfg); } catch { after = null; }
      if (!after || after.some((x) => x.node === stale.node)) {
        fail("UNKNOWN_SIDE_EFFECT", {
          path: stale.path.join("/"),
          sideEffectState: "UNKNOWN",
          safeToRetry: false,
          evidence: "node-delete result unresolved"
        });
      }
    }
    deleted += diff.stale.filter((x) =>
      x.key === stale.key || x.key.startsWith(stale.key + "\u0000")
    ).length;
  }
  return deleted;
}

function fetchDoc(cfg, token, purpose = "generic") {
  READBACK.docFetchCalls += 1;
  if (purpose === "image-reuse") READBACK.imageReuseFetches += 1;
  if (purpose === "post-write") READBACK.postWriteFetches += 1;
  if (purpose === "full-verify") READBACK.fullVerifyFetches += 1;
  const result = cli([
    "docs", "+fetch", "--doc", token, "--doc-format", "markdown",
    "--scope", "full", ...identityArgs(cfg)
  ], 60000);
  if (!result.ok) fail("REMOTE_READ_FAILED", { safeToRetry: true, evidence: result.err.slice(-1000) });
  let value;
  try { value = JSON.parse(result.out); } catch { fail("REMOTE_READ_FAILED", { safeToRetry: true }); }
  return findValue(value, ["content"]) || "";
}

function tokenMap(content) {
  const out = new Map();
  const dup = new Set();
  for (const match of content.matchAll(/!\[([^\]]*)\]\(https:\/\/(?:www\.)?(?:feishu\.cn|larksuite\.com)\/file\/([^)]+)\)/g)) {
    if (out.has(match[1]) && out.get(match[1]) !== match[2]) dup.add(match[1]);
    else out.set(match[1], match[2]);
  }
  for (const value of dup) out.delete(value);
  return out;
}

function uploadImage(cfg, image) {
  const result = cli(["drive", "+upload", "--file", image.path, "--format", "json", ...identityArgs(cfg)], 120000);
  if (!result.ok) fail("IMAGE_UPLOAD_UNKNOWN", {
    path: rel(image.path), sideEffectState: "UNKNOWN", safeToRetry: false, evidence: result.err.slice(-1000)
  });
  const token = findValue(JSON.parse(result.out), ["file_token", "fileToken"]);
  if (!token) fail("IMAGE_UPLOAD_UNKNOWN", {
    path: rel(image.path), sideEffectState: "UNKNOWN", safeToRetry: false, evidence: "missing file token"
  });
  return token;
}

function remoteHasImage(content, alt) {
  return content.includes(alt) && (content.includes("/file/") || content.includes("<img"));
}

function verifyBodyContent(d, content) {
  if (d.fingerprint && !normalize(content).includes(d.fingerprint)) {
    fail("CONTENT_VERIFY_FAILED", { path: d.path.join("/"), evidence: "fingerprint missing" });
  }
  for (const image of d.images) {
    if (!remoteHasImage(content, image.alt)) {
      fail("IMAGE_VERIFY_FAILED", { path: d.path.join("/"), evidence: image.alt });
    }
  }
}

function publishOne(cfg, d, remoteNode, runDir) {
  const raw = fs.readFileSync(d.bodySource, "utf8");
  let body = stripLeadingHeading(raw);
  let existing = "";
  if (d.images.length) existing = fetchDoc(cfg, remoteNode.obj || remoteNode.node, "image-reuse");
  const reusable = tokenMap(existing);
  for (const image of d.images) {
    const token = reusable.get(image.alt) || uploadImage(cfg, image);
    const alt = image.alt.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    body = body.split(image.raw).join('<img src="' + token + '" caption="' + alt + '"/>');
  }
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "publish.md"), body + "\n");
  const result = run(LARK, [
    "docs", "+update", "--doc", remoteNode.obj || remoteNode.node,
    "--command", "overwrite", "--doc-format", "markdown",
    "--content", "@./publish.md", ...identityArgs(cfg)
  ], { cwd: runDir, timeoutMs: 120000 });
  if (!result.ok) {
    try {
      const after = fetchDoc(cfg, remoteNode.obj || remoteNode.node, "post-write");
      verifyBodyContent(d, after);
      return;
    } catch {
      fail("UNKNOWN_SIDE_EFFECT", {
        path: d.path.join("/"), sideEffectState: "UNKNOWN", safeToRetry: false,
        evidence: "doc overwrite result unresolved"
      });
    }
  }
  const after = fetchDoc(cfg, remoteNode.obj || remoteNode.node, "post-write");
  verifyBodyContent(d, after);
}

function bodySelectionChanged(cfg, desired) {
  const changed = new Set();
  const diff = run("git", [
    "-C", W, "diff", "--name-status", "--no-renames", "HEAD", "--",
    cfg.sourceRoot, path.join(W, "assets/知识库")
  ]);
  if (!diff.ok) fail("GIT_CHANGED_SCOPE_FAILED", { safeToRetry: true, evidence: diff.err.slice(-1000) });
  for (const line of diff.out.split(/\r?\n/).filter(Boolean)) {
    const parts = line.split("\t");
    const status = parts[0];
    const file = parts.slice(1).join("\t");
    if (status.startsWith("D") || file.endsWith("/_order.json") || file.endsWith("_order.json")) {
      fail("STRUCTURE_CHANGE_REQUIRES_RECONCILE", { path: file, safeToRetry: false });
    }
    changed.add(file);
  }
  const untracked = run("git", [
    "-C", W, "ls-files", "--others", "--exclude-standard", "--",
    cfg.sourceRoot, path.join(W, "assets/知识库")
  ]);
  if (!untracked.ok) fail("GIT_CHANGED_SCOPE_FAILED", { safeToRetry: true });
  for (const file of untracked.out.split(/\r?\n/).filter(Boolean)) changed.add(file);
  const selected = new Set();
  for (const d of desired) {
    if (!d.bodySource) continue;
    if (changed.has(rel(d.bodySource))) selected.add(d.key);
    for (const image of d.images) if (changed.has(rel(image.path))) selected.add(d.key);
  }
  return selected;
}

function exactRemoteMap(cfg, desired, remote) {
  const m = maps(remote);
  const out = new Map();
  for (const d of desired) {
    const exact = m.byPath.get(d.key) || [];
    if (exact.length !== 1) fail("STRUCTURE_CONFLICT", { path: d.path.join("/") });
    out.set(d.key, exact[0]);
  }
  assertAnchor(cfg, remote);
  return out;
}

function publishBodies(cfg, desired, selectedKeys, remote) {
  const map = exactRemoteMap(cfg, desired, remote);
  const dir = fs.mkdtempSync(path.join(R, "publish-"));
  let updated = 0;
  try {
    for (const d of desired) {
      if (!d.bodySource || !selectedKeys.has(d.key)) continue;
      publishOne(cfg, d, map.get(d.key), path.join(dir, String(updated)));
      updated += 1;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return updated;
  } catch (error) {
    if (error instanceof PublishError && !error.evidence) error.evidence = "evidenceDir=" + dir;
    throw error;
  }
}

function verifyTree(cfg, desired, remote) {
  assertAnchor(cfg, remote);
  const desiredKeys = new Set(desired.map((x) => x.key));
  const remoteKeys = new Set(remote.map((x) => x.key));
  if (desiredKeys.size !== remoteKeys.size ||
      [...desiredKeys].some((x) => !remoteKeys.has(x)) ||
      [...remoteKeys].some((x) => !desiredKeys.has(x))) {
    fail("REMOTE_TREE_DIVERGENCE", { evidence: "remote tree does not equal desired tree" });
  }
  const desiredByParent = new Map();
  for (const d of desired) {
    const list = desiredByParent.get(d.parentKey) || [];
    list.push(d.title); desiredByParent.set(d.parentKey, list);
  }
  const remoteByParent = new Map();
  for (const r of remote) {
    const list = remoteByParent.get(r.parentKey) || [];
    list.push(r.title); remoteByParent.set(r.parentKey, list);
  }
  for (const [parent, titles] of desiredByParent) {
    if (JSON.stringify(titles) !== JSON.stringify(remoteByParent.get(parent) || [])) {
      fail("UNSUPPORTED_REMOTE_OPERATION", {
        path: parent.split("\u0000").join("/"),
        evidence: "sibling order differs and API has no position writer"
      });
    }
  }
}

function verifyAllBodies(cfg, desired, remote) {
  const map = exactRemoteMap(cfg, desired, remote);
  for (const d of desired) {
    if (!d.bodySource) continue;
    const content = fetchDoc(cfg, map.get(d.key).obj || map.get(d.key).node, "full-verify");
    verifyBodyContent(d, content);
  }
}

function baseReceipt(cfg, mode) {
  return {
    contract: "feishu-knowledge-publish-receipt.v1",
    status: "SUCCEEDED",
    target: cfg.name,
    mode,
    summary: { created: 0, updated: 0, deleted: 0, moved: 0, unchanged: 0 },
    verification: { tree: "NOT_RUN", content: "NOT_RUN", images: "NOT_RUN" },
    readback: readbackMetrics(),
    unknown: []
  };
}

function planMode(cfg, desired) {
  const remote = crawlRemote(cfg);
  const diff = computeDiff(cfg, desired, remote);
  const receipt = baseReceipt(cfg, "plan");
  receipt.summary.created = diff.create.length;
  receipt.summary.moved = diff.move.length;
  receipt.summary.deleted = diff.stale.length;
  receipt.summary.updated = desired.filter((x) => x.bodySource).length;
  receipt.actions = {
    create: diff.create.map((x) => x.path.join("/")),
    move: diff.move.map((x) => ({ from: x.current.path.join("/"), to: x.desired.path.join("/") })),
    delete: diff.deleteRoots.map((x) => x.path.join("/"))
  };
  return receipt;
}

function syncMode(cfg, desired, scope) {
  const selected = scope === "all"
    ? new Set(desired.filter((x) => x.bodySource).map((x) => x.key))
    : bodySelectionChanged(cfg, desired);
  const state = ensureStructure(cfg, desired, false);
  const updated = publishBodies(cfg, desired, selected, state.remote);
  const after = crawlRemote(cfg);
  exactRemoteMap(cfg, desired, after);
  const receipt = baseReceipt(cfg, "sync-" + scope);
  receipt.summary.created = state.created;
  receipt.summary.updated = updated;
  receipt.summary.unchanged = desired.filter((x) => x.bodySource).length - updated;
  receipt.verification = { tree: "DESIRED_NODES_PRESENT", content: "PASS", images: "PASS" };
  return receipt;
}

function reconcileMode(cfg, desired) {
  const initial = crawlRemote(cfg);
  assertAnchor(cfg, initial);

  let requiresRebuild = false;
  try {
    verifyTree(cfg, desired, initial);
  } catch (error) {
    if (
      error instanceof PublishError &&
      ["REMOTE_TREE_DIVERGENCE", "UNSUPPORTED_REMOTE_OPERATION"].includes(error.code)
    ) {
      requiresRebuild = true;
    } else {
      throw error;
    }
  }

  let state = { created: 0, moved: 0, remote: initial };
  let deleted = 0;
  let strategy = "IN_PLACE";

  if (requiresRebuild) {
    strategy = "REBUILD_MANAGED_TREE";
    const anchor = initial.find((x) => x.node === cfg.firstDocument.nodeToken);
    const anchorKey = keyOf([cfg.firstDocument.title]);
    const victims = initial.filter((x) =>
      (x.depth === 1 && x.node !== anchor.node) ||
      (x.depth === 2 && x.parentKey === anchorKey)
    );

    for (const victim of victims) {
      const result = cli([
        "wiki", "+node-delete", "--node-token", victim.node,
        "--space-id", cfg.spaceId, "--obj-type", "wiki",
        "--include-children=true", "--format", "json", "--yes",
        ...identityArgs(cfg)
      ], 120000);
      if (!result.ok) {
        let after;
        try { after = crawlRemote(cfg); } catch { after = null; }
        if (!after || after.some((x) => x.node === victim.node)) {
          fail("UNKNOWN_SIDE_EFFECT", {
            path: victim.path.join("/"),
            sideEffectState: "UNKNOWN",
            safeToRetry: false,
            evidence: "managed-tree rebuild delete result unresolved"
          });
        }
      }
    }

    deleted = Math.max(0, initial.length - 1);
    state = ensureStructure(cfg, desired, false);
  }

  const structured = state.remote;
  verifyTree(cfg, desired, structured);
  const selected = new Set(desired.filter((x) => x.bodySource).map((x) => x.key));
  const updated = publishBodies(cfg, desired, selected, structured);
  const finalTree = crawlRemote(cfg);
  verifyTree(cfg, desired, finalTree);

  const receipt = baseReceipt(cfg, "reconcile");
  receipt.strategy = strategy;
  receipt.summary.created = state.created;
  receipt.summary.moved = state.moved;
  receipt.summary.deleted = deleted;
  receipt.summary.updated = updated;
  receipt.summary.unchanged = desired.length - updated;
  receipt.verification = { tree: "PASS", content: "PASS", images: "PASS" };
  return receipt;
}

function verifyMode(cfg, desired) {
  const remote = crawlRemote(cfg);
  verifyTree(cfg, desired, remote);
  verifyAllBodies(cfg, desired, remote);
  const receipt = baseReceipt(cfg, "verify");
  receipt.summary.unchanged = desired.length;
  receipt.verification = { tree: "PASS", content: "PASS", images: "PASS" };
  return receipt;
}

let cfg = null;
let mode = process.argv[2] || null;
try {
  cfg = readConfig();
  const desired = buildDesired(cfg);
  const args = process.argv.slice(3);
  if (mode === "plan" && args.length === 0) emit(planMode(cfg, desired));
  else if (mode === "verify" && args.length === 0) emit(verifyMode(cfg, desired));
  else if (mode === "sync" && args.length === 1 && ["--changed", "--all"].includes(args[0])) {
    emit(syncMode(cfg, desired, args[0].slice(2)));
  } else if (mode === "reconcile" && args.length === 1 && args[0] === "--all") {
    emit(reconcileMode(cfg, desired));
  } else {
    fail("USAGE", { evidence: "plan | sync --changed | sync --all | reconcile --all | verify" });
  }
} catch (error) {
  const e = error instanceof PublishError
    ? error
    : new PublishError("INTERNAL_ERROR", { evidence: error && error.stack ? error.stack.slice(-1800) : String(error) });
  emit({
    contract: "feishu-knowledge-publish-receipt.v1",
    status: "BLOCKED",
    target: cfg?.name || "unknown",
    mode: mode || "unknown",
    firstDivergence: e.code,
    path: e.path,
    sideEffectState: e.sideEffectState,
    safeToRetry: e.safeToRetry,
    evidence: e.evidence,
    readback: readbackMetrics(),
    unknown: e.sideEffectState === "UNKNOWN"
      ? [{ firstDivergence: e.code, path: e.path, sideEffectState: "UNKNOWN" }]
      : []
  }, 1);
}
