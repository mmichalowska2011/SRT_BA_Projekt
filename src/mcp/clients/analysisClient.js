// src/mcp/clients/analysisClient.js
// MCP Client that connects to a local MCP "analysis server" via stdio
// and calls the tool: analyze_document({ text: string })
//
// Assumptions:
// - You run a local MCP server script at: src/mcp/servers/analysis-server.js
// - That server exposes a tool named: "analyze_document"
// - The tool returns the JSON array either as a JSON value or as text that is valid JSON

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";



/**
 * Minimal MCP analysis client (stdio transport).
 */
export class AnalysisClient {
    constructor({
        name = "srt-analysis-client",
        version = "1.0.0",
        serverScript = new URL("../servers/analysis-server.js", import.meta.url),
    } = {}) {
        this.client = new Client(
            { name, version },
            { capabilities: {} }
        );

        this.transport = null;
        this.serverScript = serverScript;
        this.connected = false;
    }

    _serverPath() {
        if (this.serverScript instanceof URL) {
            return fileURLToPath(this.serverScript);
        }
        return String(this.serverScript);
    }

    /**
     * Connect to the MCP server (spawns: node <serverScript>).
     */
    async connect() {
        if (this.connected) return;

        // Stdio server process: node <path-to-server.js>
        this.transport = new StdioClientTransport({
            command: "node",
            args: [this._serverPath()],
            env: process.env, // forward env (useful if server needs keys)
        });

        await this.client.connect(this.transport);
        this.connected = true;
    }

    /**
     * Disconnect gracefully.
     */
    async disconnect() {
        try {
            if (this.client) await this.client.close();
        } finally {
            this.connected = false;
            this.transport = null;
        }
    }

    /**
     * Calls the MCP tool "analyze_document" on the analysis server.
     * @param {string} text - full document text to analyze
     * @returns {Promise<any[]>} JSON array result from the server tool
     */
    async analyzeDocument(text) {
        if (!this.connected) {
            throw new Error("AnalysisClient not connected. Call await connect() first.");
        }
        if (typeof text !== "string" || text.trim().length === 0) {
            throw new Error("analyzeDocument(text): text must be a non-empty string.");
        }

        // const result = await this.client.callTool({
        //     name: "analyze_document",
        //     arguments: { text },
        // });
        const result = await this.client.callTool(
            {
                name: "analyze_document",
                arguments: { text },
            },
            { timeout: 600_000 } // 10 Minuten
        );


        // Typical MCP tool response has a "content" array with items like:
        // { type: "text", text: "..." } or other content types.
        // We handle common cases robustly.

        // 1) If server returns JSON directly in a known field, prefer it
        // (Some servers put structured data under result.structured or similar)
        if (result?.structured != null) return result.structured;

        // 2) Fall back: concatenate all text content and JSON.parse it
        const content = Array.isArray(result?.content) ? result.content : [];
        const textParts = content
            .filter((c) => c && c.type === "text" && typeof c.text === "string")
            .map((c) => c.text);

        const combined = textParts.join("\n").trim();

        if (!combined) {
            throw new Error("Tool returned no text content to parse as JSON.");
        }

        // If server wraps JSON in fences, strip them
        const fenced = combined.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const jsonText = fenced?.[1]?.trim() ?? combined;

        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (e) {
            throw new Error(
                `Tool response was not valid JSON.\nRaw content:\n${combined}\n\nParse error: ${e?.message ?? e}`
            );
        }

        if (!Array.isArray(parsed)) {
            throw new Error("Expected JSON array from analyze_document tool.");
        }

        return parsed;
    }

    /**
     * Optional helper: list tools exposed by the server (debug).
     */
    async listTools() {
        if (!this.connected) {
            throw new Error("AnalysisClient not connected. Call await connect() first.");
        }
        const res = await this.client.listTools();
        return res?.tools ?? [];
    }


}
