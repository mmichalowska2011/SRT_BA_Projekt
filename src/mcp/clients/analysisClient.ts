import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type AnalyzeDocumentArgs = {
  filePath?: string;
  text?: string;
  model?: string;
};

export type AnalyzeDocumentResult = {
  analysisId: string;
  lastSourceFile: string | null;
  changes: unknown[];
  dataElements: string[];
  changesCount: number;
  dataElementsCount: number;
  dataElementsPreview: string[];
};

export type ListDataElementsArgs = {
  analysisId: string;
};

export type ListDataElementsResult = {
  lastSourceFile: string | null;
  count: number;
  dataElements: string[];
};

type ToolTextContent = { type: "text"; text: string };
type ToolResponse = {
  content?: ToolTextContent[];
  isError?: boolean;
};

function parseToolTextJson<T>(res: unknown): T {
  const r = res as ToolResponse;

  if (r?.isError) {
    const msg =
      r?.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP tool error";
    throw new Error(msg);
  }

  const text = r?.content?.find((c) => c.type === "text")?.text ?? "";

  if (!text.trim()) {
    throw new Error("MCP tool returned empty text content");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`MCP tool returned non-JSON text: ${text}`);
  }
}

export class AnalysisClient {
  public serverCommand: string;
  public serverArgs: string[];
  private client: Client | null;

  constructor(opts: { serverCommand?: string; serverArgs?: string[] } = {}) {
    this.serverCommand = opts.serverCommand ?? "node";
    // Default: starte den gebauten TS-Server (build/*)
    this.serverArgs = opts.serverArgs ?? ["build/mcp/servers/analysis-server.js"];
    this.client = null;
  }

  async connect(): Promise<void> {
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

  async close(): Promise<void> {
    if (this.client) await this.client.close();
    this.client = null;
  }

  async analyzeDocument(args: AnalyzeDocumentArgs = {}): Promise<AnalyzeDocumentResult> {
    if (!this.client) throw new Error("AnalysisClient not connected");

    const res = await this.client.callTool(
      {
        name: "analyze_document",
        arguments: args,
      },
      undefined,
      { timeout: 600_000 }
    );
    // const res = await this.client.callTool({
    //   name: "analyze_document",
    //   arguments: args,
    // });

    return parseToolTextJson<AnalyzeDocumentResult>(res);
  }

  async listDataElements(args: ListDataElementsArgs): Promise<ListDataElementsResult> {
    if (!this.client) throw new Error("AnalysisClient not connected");

    const res = await this.client.callTool({
      name: "list_data_elements",
      arguments: args,
    });

    return parseToolTextJson<ListDataElementsResult>(res);
  }
}