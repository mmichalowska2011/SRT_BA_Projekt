import crypto from "node:crypto";
import { readTextFile } from "../../io.js";
import { chatStructured } from "../../llm/ollama_structured.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

console.error("[analysis-server] started");

// --- In-memory Store (pro Laufzeit) ---
const store = new Map(); // analysisId -> { lastSourceFile, changes, dataElements }


function extractDataElementsFromChanges(changes) {
  if (!Array.isArray(changes)) return [];
  return changes
    .map(c => (c?.["Field Name"] ?? "").trim())
    .filter(Boolean);
}

function newAnalysisId() {
  return crypto.randomBytes(8).toString("hex");
}

// --- MCP Server ---
const server = new McpServer({
  name: "srt-analysis-server",
  version: "1.0.0",
});

// Tool analyze_document
server.registerTool(
  "analyze_document",
  {
    description: "Analysiert ein Dokument (filePath oder text) und liefert Analyse + Datenelemente.",
    inputSchema: z.object({
      filePath: z.string().optional(),
      text: z.string().optional(),
      model: z.string().optional(),
    }),
  },
  async ({ filePath, text, model }) => {
    if (!filePath && !text) {
      return {
        content: [{ type: "text", text: "BadRequest: Entweder 'filePath' oder 'text' muss angegeben werden." }],
        isError: true,
      };
    }

    const llmModel = model ?? "qwen3-vl:235b";
    const inputText = text ?? (await readTextFile(filePath));
    const changes = await chatStructured(llmModel, inputText);
    const dataElements = extractDataElementsFromChanges(changes);

    const analysisId = newAnalysisId();
    store.set(analysisId, { lastSourceFile: filePath ?? null, changes, dataElements });

    return {
      content: [{
        type: "json",
        json: {
          analysisId,
          lastSourceFile: filePath ?? null,
          changes,
          dataElements,
          changesCount: Array.isArray(changes) ? changes.length : 0,
          dataElementsCount: dataElements.length,
          dataElementsPreview: dataElements.slice(0, 10),
        },
      }],
    };
  }
);

// Tool list_data_elements
server.registerTool(
  "list_data_elements",
  {
    description: "Listet die zu erstellenden Datenelemente für eine Analyse (analysisId).",
    inputSchema: z.object({ analysisId: z.string() }),
  },
  async ({ analysisId }) => {
    const entry = store.get(analysisId);
    if (!entry) {
      return {
        content: [{ type: "text", text: `NotFound: Keine Analyse mit analysisId='${analysisId}' gefunden.` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "json",
        json: {
          lastSourceFile: entry.lastSourceFile,
          count: entry.dataElements.length,
          dataElements: entry.dataElements,
        },
      }],
    };
  }
);

// Start über stdio (Host startet Server als Child Process)
const transport = new StdioServerTransport();
await server.connect(transport);
