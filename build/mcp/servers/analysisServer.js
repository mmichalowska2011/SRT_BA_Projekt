import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readTextFile } from "#root/io.js";
import { chatStructured } from "#root/llm/ollama_structured.js";
const store = new Map();
function extractDataElementsFromChanges(changes) {
    if (!Array.isArray(changes))
        return [];
    return changes
        .map((c) => String(c?.["Field Name"] ?? "").trim())
        .filter(Boolean);
}
function newAnalysisId() {
    return crypto.randomBytes(8).toString("hex");
}
const server = new McpServer({
    name: "srt-analysis-server",
    version: "1.0.0",
});
server.registerTool("analyze_document", {
    description: "Analysiert ein Dokument (filePath oder text) und liefert Analyse + Datenelemente.",
    inputSchema: z.object({
        filePath: z.string().optional(),
        text: z.string().optional(),
        model: z.string().optional(),
    }),
}, async ({ filePath, text, model }) => {
    if (!filePath && !text) {
        return {
            content: [{ type: "text", text: "BadRequest: Entweder 'filePath' oder 'text' muss angegeben werden." }],
            isError: true,
        };
    }
    // const llmModel = model ?? "qwen3-vl:235b";
    const llmModel = model ?? "qwen3-vl:235b-cloud";
    const inputText = text ?? (await readTextFile(filePath));
    const changes = (await chatStructured(llmModel, inputText));
    const dataElements = extractDataElementsFromChanges(changes);
    const analysisId = newAnalysisId();
    store.set(analysisId, { lastSourceFile: filePath ?? null, changes, dataElements });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    analysisId,
                    lastSourceFile: filePath ?? null,
                    changes,
                    dataElements,
                    changesCount: Array.isArray(changes) ? changes.length : 0,
                    dataElementsCount: dataElements.length,
                    dataElementsPreview: dataElements.slice(0, 10),
                }, null, 2),
            },
        ],
    };
});
server.registerTool("list_data_elements", {
    description: "Listet die zu erstellenden Datenelemente für eine Analyse (analysisId).",
    inputSchema: z.object({ analysisId: z.string() }),
}, async ({ analysisId }) => {
    const entry = store.get(analysisId);
    if (!entry) {
        return {
            content: [{ type: "text", text: `NotFound: Keine Analyse mit analysisId='${analysisId}' gefunden.` }],
            isError: true,
        };
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    lastSourceFile: entry.lastSourceFile,
                    count: entry.dataElements.length,
                    dataElements: entry.dataElements,
                }, null, 2),
            },
        ],
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
