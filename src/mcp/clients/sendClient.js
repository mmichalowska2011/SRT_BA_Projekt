// src/mcp/clients/sendClient.js
// MCP Client that connects to a local MCP "send server" via stdio
// and calls a tool like: send_payload({ payload: any[] })
//
// Assumptions:
// - You run a local MCP server script at: src/mcp/servers/send-server.js
// - That server exposes a tool named: "send_payload"
// - The tool returns a result (often as text content; could be JSON)

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

/**
 * Minimal MCP send client (stdio transport).
 */
export class SendClient {
    constructor({
        name = "srt-send-client",
        version = "1.0.0",
        serverScript = new URL("../servers/send-server.js", import.meta.url),
    } = {}) {
        this.client = new Client({ name, version }, { capabilities: {} });
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

        this.transport = new StdioClientTransport({
            command: "node",
            args: [this._serverPath()],
            env: process.env, // forward env (cookies/keys can live in server env)
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
     * Calls the MCP tool "send_payload" on the send server.
     * @param {any[]|object} payload - JSON payload to send (array or object). Usually your JSON-Array.
     * @returns {Promise<{ ok: boolean, status?: number, data?: any, text?: string }>}
     */
    async sendPayload(payload) {
        if (!this.connected) {
            throw new Error("SendClient not connected. Call await connect() first.");
        }
        if (payload == null) {
            throw new Error("sendPayload(payload): payload must not be null/undefined.");
        }

        // Server decides what to do with payload (e.g., POST it to a system)
        const result = await this.client.callTool({
            name: "send_payload",
            arguments: { payload },
        });

        // Prefer structured field if server returns it
        if (result?.structured != null) {
            return result.structured;
        }

        // Otherwise interpret text content
        const content = Array.isArray(result?.content) ? result.content : [];
        const textParts = content
            .filter((c) => c && c.type === "text" && typeof c.text === "string")
            .map((c) => c.text);

        const combined = textParts.join("\n").trim();

        // If server returned nothing, treat as ok with empty message
        if (!combined) {
            return { ok: true, text: "" };
        }

        // If server returns JSON (common), parse it; otherwise keep as text
        const fenced = combined.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const jsonText = fenced?.[1]?.trim() ?? combined;

        try {
            const parsed = JSON.parse(jsonText);
            // If server returns something like { ok, status, ... } we keep it as-is
            return typeof parsed === "object" && parsed !== null
                ? parsed
                : { ok: true, data: parsed };
        } catch {
            return { ok: true, text: combined };
        }
    }

    /**
     * Optional helper: list tools exposed by the server (debug).
     */
    async listTools() {
        if (!this.connected) {
            throw new Error("SendClient not connected. Call await connect() first.");
        }
        const res = await this.client.listTools();
        return res?.tools ?? [];
    }


}
