import "./timeout.js";

import { Host } from "./host/mcphost.js";
import { runCli } from "./cli/cli.js";

const host = new Host({ llmModel: "qwen3-vl:235b" });
await runCli(host);
