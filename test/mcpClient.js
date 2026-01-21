import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListToolsResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClientHandle {
  constructor({ id, command, args }) {
    this.id = id;
    this.command = command;
    this.args = args;
    this.transport = null;
    this.client = null;
  }

  async connect() {
    this.transport = new StdioClientTransport({
      command: this.command,
      args: this.args,
    });

    this.client = new Client(
      { name: `srt-host-${this.id}`, version: "1.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async listTools() {
    if (!this.client) throw new Error(`[${this.id}] not connected`);

    const res = await this.client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );
    return res.tools ?? [];
  }

  async callTool(name, args = {}) {
    if (!this.client) throw new Error(`[${this.id}] not connected`);

    const res = await this.client.request(
      {
        method: "tools/call",
        params: { name, args },
      },
      CallToolResultSchema
    );

    return res;
  }

  async close() {
    try {
      if (this.client) await this.client.close();
    } finally {
      if (this.transport) await this.transport.close();
    }
  }
}
