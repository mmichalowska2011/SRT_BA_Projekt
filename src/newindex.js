import { Host } from "./newhost.js";
import { runCli } from "./cli2.js";

const host = new Host({ llmModel: "qwen3" });
await runCli(host);
