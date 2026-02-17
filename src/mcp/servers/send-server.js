// src/mcp/servers/send-server.js
// MCP Send Server (stdio)
// Exposes one tool: send_payload({ payload, url?, headers? }) -> result summary
//
// IMPORTANT:
// - Use console.error for logs (stdout is reserved for MCP protocol).
// - Configure defaults via .env (recommended) or pass url/headers via tool args.
//
// Env vars supported (optional):
//   TARGET_URL="https://example.org/post"
//   AUTHORIZATION="Bearer ...."   (or any value you need)
//   COOKIE="cookiescookies, cookies, cookies"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// In Node 20+, fetch is available globally. If you use older Node, you'd need a polyfill.

const server = new McpServer({
  name: "srt-send-server",
  version: "1.0.0",
});

// A permissive "any JSON" schema for payload
const AnyJson = z.any();

server.registerTool(
  "send_payload",
  {
    description:
      "Send a JSON payload (usually the extracted change JSON-array) to an external system via HTTP POST.",
    inputSchema: {
      payload: AnyJson.describe("JSON payload to send (array or object)."),
      url: z
        .string()
        .url()
        .optional()
        .describe("Optional target URL. If omitted, uses env TARGET_URL."),
      headers: z
        .record(z.string())
        .optional()
        .describe(
          "Optional extra headers (e.g., Authorization/Cookie). If omitted, uses env AUTHORIZATION/COOKIE where applicable.",
        ),
    },
  },
  async ({ payload, url, headers }) => {
    const targetUrl = url ?? process.env.TARGET_URL;

    if (!targetUrl) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "Missing target URL. Provide 'url' in tool arguments or set env TARGET_URL.",
          },
        ],
      };
    }

    // Build headers: defaults + env + overrides
    const finalHeaders = {
      "Content-Type": "application/json",
      ...(process.env.AUTHORIZATION
        ? { Authorization: process.env.AUTHORIZATION }
        : {}),
      ...(process.env.COOKIE ? { Cookie: process.env.COOKIE } : {}),
      ...(headers ?? {}),
    };

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: finalHeaders,
        body: JSON.stringify(payload),
      });

      const bodyText = await response.text(); // read once

      // Build a structured summary (easy to consume by client/host)
      const result = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseBody: bodyText,
      };

      if (!response.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
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
  console.error("SRT Send MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in send-server:", error);
  process.exit(1);
});
