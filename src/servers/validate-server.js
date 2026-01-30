import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

console.error("[validate-server] starting...");

const server = new McpServer({
  name: "srt_validate",
  version: "1.0.0",
});

server.registerTool(
  "get_current_versions",
  {
    title: "Get current SRT/BAIS versions",
    description: "Mock: returns current SRT release and BAIS version",
    inputSchema: z.object({}).strict(),
  },
  async () => {
    const result = {
      srtRelease: "SRT-2026.01",
      baisVersion: "BAIS-2.5",
      note: "Mock response (replace with real API call).",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "check_object_exists",
  {
    title: "Check if object exists",
    description: "Mock: checks if an object exists by name",
    inputSchema: z
      .object({
        objectType: z.enum(["DTEL", "DOMA", "STRU", "TABL"]),
        name: z.string().min(1),
      })
      .strict(),
  },
  async ({ objectType, name }) => {
    const exists = name.toUpperCase().includes("VNAME");
    const result = { objectType, name, exists };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[validate-server] ready (stdio connected)");
