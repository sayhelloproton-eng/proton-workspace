import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export const MANAGED_DEV_TUNNEL_VERSION = '1.0.2030';
const DOWNLOAD_TIMEOUT_MS = 120_000;
const toolRoot = dirname(fileURLToPath(import.meta.url));
const runtimeRoot = () => join(toolRoot, '.runtime', 'cli');

function artifact() {
  const key = `${platform()}-${arch()}`;
  const artifacts = {
    'darwin-x64': { url: 'https://aka.ms/TunnelsCliDownload/osx-x64-zip', archive: 'zip', executable: 'devtunnel', sha256: '4a7d426df3edb63441f24f0b465d3642da284c982e88eed9a410033379fad33f' },
    'darwin-arm64': { url: 'https://aka.ms/TunnelsCliDownload/osx-arm64-zip', archive: 'zip', executable: 'devtunnel', sha256: '41794a24ccee6c5dc2821fadc97285ee39894fdbd96ad9869ee62ae0d7c5c8ed' },
    'linux-x64': { url: 'https://aka.ms/TunnelsCliDownload/linux-x64', archive: 'binary', executable: 'devtunnel', sha256: 'ff6911548907b5abaea4ed5baa36b2420be7c5debcb637a4f50f7a4002b10b60' },
    'win32-x64': { url: 'https://aka.ms/TunnelsCliDownload/win-x64', archive: 'binary', executable: 'devtunnel.exe', sha256: '78190ac81c664828858de2390fd9c15eeec0e4edfe4e7b0d6a323dc49df625db' },
  };
  const selected = artifacts[key];
  if (!selected) throw new Error(`DEV_TUNNEL_PLATFORM_UNSUPPORTED: ${key}`);
  return selected;
}
export function devTunnelCliPath() {
  const selected = artifact();
  return join(runtimeRoot(), MANAGED_DEV_TUNNEL_VERSION, `${platform()}-${arch()}`, selected.executable);
}
async function sha256(path) { return createHash('sha256').update(await readFile(path)).digest('hex'); }
async function validCached(path) {
  try {
    const selected = artifact();
    const metadata = JSON.parse(await readFile(`${path}.json`, 'utf8'));
    return typeof metadata === 'object' && metadata !== null && metadata.sha256 === await sha256(path) && metadata.artifactSha256 === selected.sha256 && metadata.version === MANAGED_DEV_TUNNEL_VERSION;
  } catch { return false; }
}
async function downloadManaged() {
  const selected = artifact();
  const target = devTunnelCliPath();
  const directory = dirname(target);
  if (await validCached(target)) return target;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let response;
  try { response = await fetch(selected.url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }); }
  catch (error) { throw new Error(`DEV_TUNNEL_DOWNLOAD_FAILED: ${error instanceof Error ? error.message : 'request failed'}`); }
  if (!response.ok) throw new Error(`DEV_TUNNEL_DOWNLOAD_FAILED: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const temporary = `${target}.${process.pid}.download`;
  const extraction = `${directory}/extract-${process.pid}`;
  try {
    await writeFile(temporary, bytes, { mode: 0o600 });
    if (await sha256(temporary) !== selected.sha256) throw new Error('DEV_TUNNEL_DOWNLOAD_CHECKSUM_MISMATCH');
    if (selected.archive === 'zip') {
      await mkdir(extraction, { recursive: true, mode: 0o700 });
      await execute('unzip', ['-oq', temporary, '-d', extraction], { timeout: 30_000 });
      const extracted = join(extraction, selected.executable);
      await stat(extracted); await rename(extracted, target);
    } else await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
    await rm(extraction, { recursive: true, force: true });
  }
  if (platform() !== 'win32') await chmod(target, 0o700);
  await writeFile(`${target}.json`, `${JSON.stringify({ source: selected.url, version: MANAGED_DEV_TUNNEL_VERSION, sha256: await sha256(target), artifactSha256: selected.sha256, file: basename(target) }, null, 2)}\n`, { mode: 0o600 });
  return target;
}
export async function resolveDevTunnelCli() {
  return { command: await downloadManaged(), source: 'workspace', version: MANAGED_DEV_TUNNEL_VERSION };
}
