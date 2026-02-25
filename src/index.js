import "./timeout.js";

import { Host } from "./mcp/host/mcphost.js";
import { runCli } from "./cli/cli.js";

// const host = new Host({ llmModel: "qwen3-vl:235b" });
const host = new Host({ llmModel: "qwen3-vl:235b-cloud" });
// const host = new Host();
await host.init();         // MCP Host startet den Server als Child Process (stdio) und verbindet sich
await runCli(host);
