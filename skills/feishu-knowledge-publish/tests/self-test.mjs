import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
const contract = readFileSync(path.join(root, "references/01-publish-contract.md"), "utf8");
const imageRef = readFileSync(path.join(root, "references/02-image-pipeline.md"), "utf8");
const recovery = readFileSync(path.join(root, "references/03-efficiency-and-recovery.md"), "utf8");
const cases = JSON.parse(readFileSync(path.join(root, "tests/evals/cases.json"), "utf8"));

for (const marker of [
  "docs/知识库/",
  "禁止为了比较内容而 fetch 旧正文",
  "图片必须先完成上传，再覆盖正文",
  "drive +upload --wiki-token",
  "UNKNOWN",
  "Environment boundary",
]) {
  assert.ok(skill.includes(marker), `missing publish invariant: ${marker}`);
}
for (const forbidden of ["Stable ID、Registry、Projection Manifest", "双向同步协议"]) {
  assert.ok(skill.includes(forbidden), `missing explicit retirement boundary: ${forbidden}`);
}
assert.ok(contract.includes("docs +update"));
assert.ok(imageRef.includes("update document with image placeholder"));
assert.ok(imageRef.includes("<img src=\"FILE_TOKEN\""));
assert.ok(recovery.includes("UNKNOWN` 不能直接当 `FAILED` 重试"));
assert.equal(cases.length >= 8, true);

const run = (args, options = {}) => spawnSync("lark-cli", args, {
  encoding: "utf8",
  cwd: options.cwd,
  maxBuffer: 2_000_000,
});
const version = run(["--version"]);
assert.equal(version.status, 0, version.stderr || version.stdout);
for (const args of [
  ["docs", "+update", "--help"],
  ["drive", "+upload", "--help"],
  ["wiki", "+node-list", "--help"],
  ["wiki", "+node-create", "--help"],
]) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

const temp = mkdtempSync(path.join(os.tmpdir(), "feishu-publish-skill-"));
try {
  mkdirSync(path.join(temp, "images"));
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  writeFileSync(path.join(temp, "images/pixel.png"), pixel);
  writeFileSync(path.join(temp, "local.md"), "# 测试\n\n![pixel](@./images/pixel.png)\n");

  const direct = run([
    "docs", "+update", "--dry-run", "--doc", "doccnDryRunExample",
    "--command", "overwrite", "--doc-format", "markdown", "--content", "@./local.md",
  ], { cwd: temp });
  assert.equal(direct.status, 0, direct.stderr || direct.stdout);
  const directJson = JSON.parse(direct.stdout);
  const directApis = directJson.data.api.map((item) => `${item.method} ${item.url}`);
  const overwriteIndex = directApis.findIndex((item) => item.includes("/docs_ai/v1/documents/"));
  const uploadIndex = directApis.findIndex((item) => item.includes("/drive/v1/medias/upload_all"));
  assert.ok(overwriteIndex >= 0 && uploadIndex > overwriteIndex, "native local-image overwrite order changed; revisit strict pre-upload policy");

  const preupload = run([
    "drive", "+upload", "--dry-run", "--file", "./images/pixel.png",
    "--wiki-token", "wikcnDryRunExample",
  ], { cwd: temp });
  assert.equal(preupload.status, 0, preupload.stderr || preupload.stdout);
  assert.ok(preupload.stdout.includes("/drive/v1/files/upload_all"));

  writeFileSync(path.join(temp, "token.md"), "# 测试\n\n<img src=\"filetokenDryRunExample\" caption=\"pixel\"/>\n");
  const tokenBody = run([
    "docs", "+update", "--dry-run", "--doc", "doccnDryRunExample",
    "--command", "overwrite", "--doc-format", "markdown", "--content", "@./token.md",
  ], { cwd: temp });
  assert.equal(tokenBody.status, 0, tokenBody.stderr || tokenBody.stdout);
  const tokenJson = JSON.parse(tokenBody.stdout);
  assert.equal(tokenJson.data.api.some((item) => item.url.includes("medias/upload_all")), false, "token-backed body should not trigger local image upload");
  assert.ok(tokenBody.stdout.includes("filetokenDryRunExample"));
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(`feishu-knowledge-publish self-test PASS (${version.stdout.trim()})`);
