import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

let calls = 0;
const server = new Server({ name: "browser-fixture", version: "1" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: "browser_snapshot", inputSchema: { type: "object" } },
] }));
server.setRequestHandler(CallToolRequestSchema, async () => ({
  content: [{ type: "text", text: JSON.stringify({ owner: process.pid, calls: ++calls }) }],
}));
await server.connect(new StdioServerTransport());
