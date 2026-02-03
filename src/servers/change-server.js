import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

console.error("[change-server] starting...");

const server = new McpServer({
  name: "srt_change",
  version: "1.0.0",
});

server.registerTool(
  "copy_structure_with_suffix",
  {
    title: "Copy structure with version suffix",
    description:
      "Creates a copy of a structure before applying changes (e.g. /ABC/SBS_TAB1 -> /ABC/SBS_TAB1_1).",
    inputSchema: z
      .object({
        sourceStructure: z.string().min(1),
        targetStructure: z.string().min(1),
      })
      .strict(),
  },
  async ({ sourceStructure, targetStructure }) => {
    const result = {
      action: "copy_structure_with_suffix",
      sourceStructure,
      targetStructure,
      status: "ok",
      note: "Mock response",
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "add_field_to_structure",
  {
    title: "Add field to structure",
    description: "Adds a component/field to an existing structure definition (mock).",
    inputSchema: z
      .object({
        structure: z.string().min(1),
        fieldName: z.string().min(1),
        dataElement: z.string().min(1),
        positionAfter: z.string().optional(),
      })
      .strict(),
  },
  async ({ structure, fieldName, dataElement, positionAfter }) => {
    const result = {
      action: "add_field_to_structure",
      structure,
      fieldName,
      dataElement,
      positionAfter: positionAfter ?? null,
      status: "ok",
      note: "Mock response",
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[change-server] ready (stdio connected)");
