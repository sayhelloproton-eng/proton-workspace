#!/usr/bin/env node
import {
  createMonitorApiClient,
  currentProjection,
  printJson,
  requiredArg,
  runMain,
  stableRef,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(current, state);
  const kind = requiredArg("--kind");
  const incidentRef = requiredArg("--incident-ref");
  const title = requiredArg("--title");
  const message = requiredArg("--message");
  const chatId = valueArg("--chat-id") ?? projection.currentChatId ?? null;
  const eventId =
    valueArg("--event-id") ??
    stableRef("semantic-notification", [kind, chatId, incidentRef, title, message]);
  const input = {
    source: "MODEL",
    kind,
    chatId,
    incidentRef,
    title,
    message,
    eventId,
  };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("notification.enqueue", input);
  printJson(await client.invoke("notification.enqueue", { requestId, ...input }));
}
await runMain(main, "PROFLOW_MONITOR_NOTIFY");
