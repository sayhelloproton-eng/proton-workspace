#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDevTunnelCli } from '../../tools/dev-tunnel/cli-resolver.mjs';

const [rawOperation = 'help', ...args] = process.argv.slice(2);
const operation = rawOperation === '--help' || rawOperation === '-h' ? 'help' : rawOperation;
const stateRoot = join(dirname(fileURLToPath(import.meta.url)), '.runtime');
const output = value => console.log(JSON.stringify(value));
const resolved = operation === 'help' ? null : await resolveDevTunnelCli();
const run = argv => new Promise(resolve => execFile(resolved.command, argv, { timeout: 30_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => resolve({ code: error ? (error.killed ? null : error.code) : 0, stdout, stderr })));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const interactive = argv => new Promise((resolve, reject) => {
  const child = spawn(resolved.command, argv, { stdio: 'inherit' });
  const onInt = () => child.kill('SIGINT');
  const onTerm = () => child.kill('SIGTERM');
  process.on('SIGINT', onInt); process.on('SIGTERM', onTerm);
  child.once('error', reject);
  child.once('exit', code => {
    process.off('SIGINT', onInt); process.off('SIGTERM', onTerm);
    resolve(code ?? 1);
  });
});
function parsed(result) {
  if (result.code !== 0) throw new Error(result.code === null ? 'QUERY_TIMEOUT' : 'CLI_ERROR');
  return JSON.parse(result.stdout);
}
async function auth() {
  const result = await run(['user', 'show', '--json']);
  let status = '';
  try { status = JSON.parse(result.stdout).status ?? ''; } catch {}
  const diagnostic = `${status}\n${result.stderr}`;
  if (/cached access token[^\n]*expired at|login token expired|expired/i.test(diagnostic)) return 'AUTH_EXPIRED';
  if (/not logged|login required|sign[ -]?in required|not authenticated/i.test(diagnostic)) return 'NOT_LOGGED_IN';
  if (result.code === null) return 'QUERY_TIMEOUT';
  if (result.code !== 0) return 'CLI_ERROR';
  return /logged in|authenticated/i.test(status) ? 'LOGGED_IN' : 'UNKNOWN';
}
async function ensureLogin() {
  let state = await auth();
  if (['AUTH_EXPIRED', 'NOT_LOGGED_IN'].includes(state)) {
    if (await interactive(['user', 'login', '--github', '--use-browser-auth']) !== 0) throw new Error('AUTH_TRANSACTION_FAILED');
    state = await auth();
  }
  if (state !== 'LOGGED_IN') throw new Error(state);
  return state;
}
function id(value) {
  if (!value || !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(value)) throw new Error('TUNNEL_ID_REQUIRED');
  return value;
}
async function localState(tunnel) {
  try { return JSON.parse(await readFile(join(stateRoot, `${tunnel}.json`), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function owns(record, tunnel) {
  if (!record || !Number.isInteger(record.pid) || record.command !== resolved.command || record.tunnel !== tunnel) return false;
  try {
    process.kill(record.pid, 0);
    return true;
  } catch { return false; }
}
async function waitForExit(pid, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { process.kill(pid, 0); } catch { return true; }
    await sleep(50);
  }
  try { process.kill(pid, 0); return false; } catch { return true; }
}
async function remoteTunnel(tunnel) {
  const result = await run(['show', tunnel, '--json']);
  if (result.code !== 0) return { result, fact: null };
  const raw = parsed(result), fact = raw.tunnel ?? raw;
  if (typeof fact.tunnelId !== 'string' || !(fact.tunnelId === tunnel || fact.tunnelId.startsWith(`${tunnel}.`))) throw new Error('TUNNEL_IDENTITY_MISMATCH');
  return { result, fact };
}
async function startHost(tunnel) {
  const record = await localState(tunnel);
  if (owns(record, tunnel)) return { tunnel, state: 'RUNNING', pid: record.pid };
  const remote = await remoteTunnel(tunnel);
  if (!remote.fact) throw new Error(remote.result.code === null ? 'TUNNEL_STATE_UNKNOWN' : 'TUNNEL_NOT_FOUND');
  if (typeof remote.fact.hostConnections !== 'number') throw new Error('HOST_STATE_UNKNOWN');
  if (remote.fact.hostConnections > 0) throw new Error('EXISTING_REMOTE_HOST');
  if ((await auth()) !== 'LOGGED_IN') throw new Error('LOGIN_NOT_READY');
  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
  const lock = join(stateRoot, `${tunnel}.lock`);
  try { await mkdir(lock); } catch { throw new Error('HOST_START_LOCKED'); }
  try {
    const current = await localState(tunnel);
    if (owns(current, tunnel)) return { tunnel, state: 'RUNNING', pid: current.pid };
    if (current) await rm(join(stateRoot, `${tunnel}.json`), { force: true });
    const log = await open(join(stateRoot, `${tunnel}.log`), 'a', 0o600);
    const child = spawn(resolved.command, ['host', tunnel], { detached: true, stdio: ['ignore', log.fd, log.fd] });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref(); await log.close();
    const target = join(stateRoot, `${tunnel}.json`), temporary = `${target}.${process.pid}`;
    await writeFile(temporary, JSON.stringify({ tunnel, command: resolved.command, pid: child.pid }), { mode: 0o600 });
    await rename(temporary, target);
    await sleep(500);
    const persisted = await localState(tunnel);
    if (!owns(persisted, tunnel)) {
      await rm(target, { force: true });
      throw new Error('HOST_START_FAILED');
    }
    return { tunnel, state: 'RUNNING', pid: child.pid };
  } finally { await rm(lock, { recursive: true, force: true }); }
}
async function stopHost(tunnel) {
  const record = await localState(tunnel);
  if (!record) return { tunnel, state: 'STOPPED' };
  if (!owns(record, tunnel)) throw new Error('HOST_IDENTITY_UNKNOWN');
  process.kill(record.pid, 'SIGTERM');
  if (!(await waitForExit(record.pid))) return { tunnel, state: 'UNKNOWN', pid: record.pid };
  await rm(join(stateRoot, `${tunnel}.json`), { force: true });
  return { tunnel, state: 'STOPPED' };
}

try {
  if (operation === 'help') {
    output({ commands: ['resolve', 'auth [--login]', 'ensure ID PORT [--public]', 'start ID', 'host ID', 'status ID', 'stop ID', 'recover ID', 'resource METHOD JSON', 'cli <native arguments>'], owner: 'workspace Microsoft Dev Tunnel; products retain service topology and ingress policy' });
  } else if (operation === 'resolve') output(resolved);
  else if (operation === 'auth') {
    let state = await auth();
    if (args.includes('--login') && ['AUTH_EXPIRED', 'NOT_LOGGED_IN'].includes(state)) state = await ensureLogin();
    output({ auth: state });
    if (state !== 'LOGGED_IN') process.exitCode = 1;
  } else if (operation === 'cli') process.exitCode = await interactive(args);
  else if (operation === 'resource') {
    const [method, payloadText = '{}'] = args;
    const payload = JSON.parse(payloadText);
    if (typeof payload !== 'object' || payload === null) throw new Error('RESOURCE_INPUT_INVALID');
    if (method === 'ensureLogin') output(await ensureLogin());
    else {
      const tunnel = id(payload.tunnelId);
      if (method === 'inspectTunnel') {
        const remote = await remoteTunnel(tunnel);
        if (!remote.fact) output({ state: remote.result.code !== null && /not found|does not exist|could not be found/i.test(remote.result.stderr) ? 'MISSING' : 'UNKNOWN', hostState: 'UNKNOWN' });
        else output({ state: 'EXISTS', hostState: typeof remote.fact.hostConnections === 'number' ? (remote.fact.hostConnections > 0 ? 'RUNNING' : 'STOPPED') : 'UNKNOWN' });
      } else if (method === 'createTunnel') {
        const raw = parsed(await run(['create', tunnel, ...(payload.public === true ? ['--allow-anonymous'] : []), '--json']));
        const fact = raw.tunnel ?? raw;
        if (typeof fact.tunnelId !== 'string' || !(fact.tunnelId === tunnel || fact.tunnelId.startsWith(`${tunnel}.`))) throw new Error('TUNNEL_IDENTITY_MISMATCH');
        output(tunnel);
      } else if (['ensurePort', 'discoverPublicBaseUrl'].includes(method)) {
        const port = payload.port;
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT_INVALID');
        const raw = parsed(await run(['port', 'list', tunnel, '--json']));
        const ports = Array.isArray(raw) ? raw : raw.ports ?? raw.tunnel?.ports ?? (/no ports found/i.test(raw.warning ?? '') ? [] : undefined);
        if (!Array.isArray(ports)) throw new Error('PORT_LIST_INVALID');
        const existing = ports.find(item => item.portNumber === port);
        if (method === 'ensurePort') {
          if (existing && existing.protocol?.toLowerCase() !== 'http') throw new Error('PORT_PROTOCOL_CONFLICT');
          if (!existing) parsed(await run(['port', 'create', tunnel, '--port-number', String(port), '--protocol', 'http', '--json']));
          output(existing ? 'REUSED' : 'CREATED');
        } else {
          const candidate = existing?.portForwardingUris?.[0] ?? existing?.portUri;
          if (typeof candidate !== 'string') throw new Error('PUBLIC_URL_NOT_AVAILABLE');
          const url = new URL(candidate);
          if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('PUBLIC_URL_INVALID');
          output(url.origin);
        }
      } else throw new Error('RESOURCE_METHOD_INVALID');
    }
  } else if (operation === 'ensure') {
    const tunnel = id(args[0]), port = Number(args[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT_INVALID');
    await ensureLogin();
    const remote = await remoteTunnel(tunnel);
    if (!remote.fact) {
      if (remote.result.code === null || !/not found|does not exist|could not be found/i.test(remote.result.stderr)) throw new Error('TUNNEL_STATE_UNKNOWN');
      parsed(await run(['create', tunnel, ...(args.includes('--public') ? ['--allow-anonymous'] : []), '--json']));
    }
    const raw = parsed(await run(['port', 'list', tunnel, '--json']));
    const ports = Array.isArray(raw) ? raw : raw.ports ?? raw.tunnel?.ports ?? (/no ports found/i.test(raw.warning ?? '') ? [] : undefined);
    if (!Array.isArray(ports)) throw new Error('PORT_LIST_INVALID');
    const existing = ports.find(item => item.portNumber === port);
    if (existing && existing.protocol?.toLowerCase() !== 'http') throw new Error('PORT_PROTOCOL_CONFLICT');
    if (!existing) parsed(await run(['port', 'create', tunnel, '--port-number', String(port), '--protocol', 'http', '--json']));
    output({ tunnel, port, state: 'CONFIGURED', access: remote.fact ? 'PRESERVED' : args.includes('--public') ? 'PUBLIC' : 'AUTHENTICATED' });
  } else {
    const tunnel = id(args[0]);
    if (operation === 'status') {
      const record = await localState(tunnel);
      const remote = await remoteTunnel(tunnel);
      output({ tunnel, local: owns(record, tunnel) ? 'RUNNING' : record ? 'STALE' : 'STOPPED', remote: remote.fact ?? { state: remote.result.code === null ? 'UNKNOWN' : 'MISSING' } });
    } else if (operation === 'stop') {
      const result = await stopHost(tunnel); output(result); if (result.state === 'UNKNOWN') process.exitCode = 1;
    } else if (['start', 'host', 'recover'].includes(operation)) output(await startHost(tunnel));
    else throw new Error('UNKNOWN_OPERATION');
  }
} catch (error) {
  console.error(JSON.stringify({ error: /^[A-Z_]+$/.test(error.message) ? error.message : 'DEV_TUNNEL_OPERATION_FAILED' }));
  process.exitCode = 1;
}
