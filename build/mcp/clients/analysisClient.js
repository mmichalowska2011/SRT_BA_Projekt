import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
function parseToolTextJson(res) {
    const r = res;
    if (r?.isError) {
        const msg = r?.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP tool error";
        throw new Error(msg);
    }
    const text = r?.content?.find((c) => c.type === "text")?.text ?? "";
    if (!text.trim()) {
        throw new Error("MCP tool returned empty text content");
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`MCP tool returned non-JSON text: ${text}`);
    }
}
export class AnalysisClient {
    serverCommand;
    serverArgs;
    client;
    constructor(opts = {}) {
        this.serverCommand = opts.serverCommand ?? "node";
        // Default: starte den gebauten TS-Server (build/*)
        this.serverArgs = opts.serverArgs ?? ["build/mcp/servers/analysis-server.js"];
        this.client = null;
    }
    async connect() {
        const transport = new StdioClientTransport({
            command: this.serverCommand,
            args: this.serverArgs,
        });
        this.client = new Client({ name: "srt-analysis-client", version: "1.0.0" }, { capabilities: {} });
        await this.client.connect(transport);
    }
    async close() {
        if (this.client)
            await this.client.close();
        this.client = null;
    }
    async analyzeDocument(args = {}) {
        if (!this.client)
            throw new Error("AnalysisClient not connected");
        const res = await this.client.callTool({
            name: "analyze_document",
            arguments: args,
        }, undefined, { timeout: 600_000 });
        // const res = await this.client.callTool({
        //   name: "analyze_document",
        //   arguments: args,
        // });
        return parseToolTextJson(res);
    }
    async listDataElements(args) {
        if (!this.client)
            throw new Error("AnalysisClient not connected");
        const res = await this.client.callTool({
            name: "list_data_elements",
            arguments: args,
        });
        return parseToolTextJson(res);
    }
}
