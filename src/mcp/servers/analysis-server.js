// src/mcp/servers/analysis-server.js
// MCP Analysis Server (stdio)
// Exposes one tool: analyze_document({ text, model? }) -> JSON array (as text)
//
// IMPORTANT: use console.error for logs (stdout is reserved for MCP protocol).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Reuse your existing structured-output extraction logic
// Path assumes: src/mcp/servers/analysis-server.js
//              src/llm/ollama_structured.js
import { chatStructured } from "../../llm/ollama_structured.js";

const server = new McpServer({
  name: "srt-analysis-server",
  version: "1.0.0",
});

// Tool: analyze_document
server.registerTool(
  "analyze_document",
  {
    description:
      "Analyze BAIS/SRT interface change text and return a JSON array of recognized changes (structured output).",
    inputSchema: {
      text: z
        .string()
        .min(1)
        .describe("Unstructured document text (copied from PDF into .txt)."),
      model: z
        .string()
        .optional()
        .describe("Optional model name. If omitted, server uses a default."),
    },
  },
  async ({ text, model }) => {
    try {
      const llmModel = model ?? "qwen3-vl:235b";
      const extracted = await chatStructured(llmModel, text);

      // Return JSON array as text (client can JSON.parse)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(extracted),
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SRT Analysis MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in analysis-server:", error);
  process.exit(1);
});
