import { Host } from "./mcphost.js";
import { runCli } from "./cli.js";

const host = new Host({ llmModel: "qwen3" });
await runCli(host);
