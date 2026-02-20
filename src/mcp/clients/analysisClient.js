import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class AnalysisClient {
    constructor({
        serverCommand = "node",
        serverArgs = ["src/mcp/servers/analysis-server.js"], } = {}) {
        this.serverCommand = serverCommand;
        this.serverArgs = serverArgs;
        this.client = null;
    }

    async connect() {
        const transport = new StdioClientTransport({
            command: this.serverCommand,
            args: this.serverArgs,
        });

        this.client = new Client(
            { name: "srt-analysis-client", version: "1.0.0" },
            { capabilities: {} }
        );

        await this.client.connect(transport);
    }

    async close() {
        if (this.client) await this.client.close();
        this.client = null;
    }

    async analyzeDocument({ filePath, text, model } = {}) {
        if (!this.client) throw new Error("AnalysisClient not connected");

        const res = await this.client.callTool({
            name: "analyze_document",
            arguments: { filePath, text, model },
        });

        if (res?.isError) {
            const msg = res?.content?.find(c => c.type === "text")?.text ?? "Unknown MCP tool error";
            throw new Error(msg);
        }

        const item = res?.content?.find(c => c.type === "json");
        if (!item?.json) throw new Error("MCP tool returned no json content");
        return item.json;
    }

    async listDataElements({ analysisId } = {}) {
        if (!this.client) throw new Error("AnalysisClient not connected");

        const res = await this.client.callTool({
            name: "list_data_elements",
            arguments: { analysisId },
        });

        if (res?.isError) {
            const msg = res?.content?.find(c => c.type === "text")?.text ?? "Unknown MCP tool error";
            throw new Error(msg);
        }

        const item = res?.content?.find(c => c.type === "json");
        if (!item?.json) throw new Error("MCP tool returned no json content");
        return item.json;
    }

}
