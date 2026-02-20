import { chat, chatWithTools, chatMessages } from "../../llm/ollama_llm.js";
import { STATES } from "../../states/states.js";
import { AnalysisClient } from "../clients/analysisClient.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import chalk from 'chalk';

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_host_state",
      description:
        "Returns the current internal host state and metadata like counts and last source file. Use this when the user asks about status/state/progress.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_data_elements_to_create",
      description:
        "Returns the list of data elements to create based on the last analyzed document. Use when user asks for list/output of data elements.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_system_version",
      description:
        "Returns the last fetched system version (and optionally fetches it if missing). Use when user asks about system version/build.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];


export class Host {
  constructor({ llmModel = "qwen3-vl:235b" } = {}) {
    this.llmModel = llmModel;
    this.clients = new Map();

    this.analysisClient = new AnalysisClient();
    this.analysisAnalysisId = null;

    // State und Ergebnisse speichern
    this.state = STATES.INITIAL;
    this.lastChanges = [];
    this.lastSourceFile = null;

    this.systemVersion = null;
  }

  async fetchSystemVersion() {
    const url = process.env.VERSION_URL;
    const user = process.env.SYSTEM_USER;
    const pass = process.env.SYSTEM_PASS;

    if (!url) throw new Error("TARGET_URL fehlt in .env");
    if (!user || !pass) throw new Error("SYSTEM_USER oder SYSTEM_PASS fehlt in .env");

    const auth = "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: auth,
      },
      redirect: "follow",
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Antwort war kein JSON: ${text}`);
    }

    let version = data?.SrtBaisVersion;

    if (version === undefined || version === null) {
      throw new Error(`Unerwartetes Response-Format: ${text}`);
    }

    version = String(version).trim();

    this.systemVersion = version;
    return version;
  }

  async init() {
    // absoluter Pfad zum analysis-server.js
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const serverPath = path.resolve(__dirname, "../servers/analysis-server.js");

    this.analysisClient.serverArgs = [serverPath]; // überschreibt Default

    console.log("[host] AnalysisClient connected ✅");

    await this.analysisClient.connect();
  }

  async showVersion() {
    try {
      const version = await this.fetchSystemVersion();
      console.log(chalk.green(`\nSystemversion: ${version}`));
    } catch (e) {
      console.log(chalk.red(`\nVersionsabfrage fehlgeschlagen: ${e?.message ?? String(e)}`));
    }
  }

  async checkDocumentForChanges(filePath) {
    try {
      const result = await this.analysisClient.analyzeDocument({
        filePath,
        model: this.llmModel,
      });

      if (!this.analysisClient) {
        throw new Error("analysisClient ist nicht initialisiert. init() vergessen?");
      }

      // result: { analysisId, changes, dataElements, lastSourceFile }
      this.analysisAnalysisId = result.analysisId;

      this.lastChanges = result.changes;           // optional, wenn man es im Host weiter nutzen will
      this.lastSourceFile = result.lastSourceFile;

      // State Logik bleibt im Host:
      this.state = STATES.ANALYZED;
      if ((result.dataElements ?? []).length > 0) {
        this.state = STATES.VALID;
      }

      console.log("\nDokument wurde erfolgreich analysiert.");
      if (this.state === STATES.VALID) {
        console.log("Es wurden neue Datenelemente erkannt. Du kannst sie über die Liste anzeigen lassen.");
      } else {
        console.log("[Info] Keine neuen Datenelemente erkannt.");
      }
    } catch (e) {
      console.log("\n[host] Analyse über MCP Client 1 fehlgeschlagen:");
      console.log(e);
      throw e;
    }
  }

  // Liste für Datenelemente erstellen + ausgeben
  listDataElementsToCreate() {
    if (this.lastChanges == null || this.lastChanges.length === 0) {
      return [];
    }

    return this.lastChanges
      .map(c => (c["Field Name"] ?? "").trim())
      .filter(Boolean);
  }

  async showDataElementsList() {
    if (!this.analysisAnalysisId) {
      console.log(chalk.magentaBright("\n[host] Keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen."));
      return;
    }

    const res = await this.analysisClient.listDataElements({
      analysisId: this.analysisAnalysisId,
    });

    const list = res?.dataElements ?? [];

    if (list.length === 0) {
      console.log(chalk.magentaBright("\n[host] Keine Datenelemente vorhanden."));
      return;
    }

    console.log("\nEs gibt folgende zu erstellende Datenelemente: ");
    console.log(JSON.stringify(list, null, 2));
  }

  getHostStateSnapshot() {
    const changesCount = Array.isArray(this.lastChanges) ? this.lastChanges.length : 0;
    const dataElements = this.listDataElementsToCreate();

    return {
      state: this.state,
      changesCount,
      lastSourceFile: this.lastSourceFile,
      hasDataElements: dataElements.length > 0,
    };
  }

  getDataElementsSnapshot() {
    const dataElements = this.listDataElementsToCreate();
    return {
      dataElements,
      count: dataElements.length,
      lastSourceFile: this.lastSourceFile,
    };
  }

  async askLlm(question) {
    console.log("\n[host] Frage wird verarbeitet...");

    const toolFns = {
      get_host_state: async () => this.getHostStateSnapshot(),
      list_data_elements_to_create: async () => this.getDataElementsSnapshot(),

      get_system_version: async () => {
        try {
          if (this.systemVersion) {
            return { SrtBaisVersion: this.systemVersion };
          }
          const sysVersion = await this.fetchSystemVersion();
          return { SrtVersion: sysVersion };
        } catch (e) {
          return { error: e?.message ?? String(e) };
        }
      },

    };

    const system = [
      "Du bist ein hilfreicher Assistent innerhalb einer CLI zur Wartung von SAP SRT-Schnittstellen.",
      "Deine Aufgabe ist es, die Frage des Nutzers menschlich und natürlich zu beantworten.",
      "Wenn der Nutzer nach dem Host-Status/Zustand/Fortschritt oder nach zu erstellenden Datenelementen fragt, MUSST du die verfügbaren Tools verwenden.",
      "Nutze Tools gezielt: Rufe KEINE Tools bei allgemeinen Wissensfragen auf.",
      "Wenn ein Tool-Ergebnis zeigt, dass noch keine Daten vorliegen, erkläre dem Nutzer, was als Nächstes zu tun ist (z. B. Option 2 ausführen).",
      "Wenn der Nutzer nach Version/Build fragt, MUSST du das Tool 'get_system_version' verwenden.",
    ].join(" ");


    const messages = [
      { role: "system", content: system },
      { role: "user", content: question },
    ];

    // 1) Entscheidung ob tool calling 
    const first = await chatWithTools(this.llmModel, messages, TOOLS, {
      options: { temperature: 0 },
    });

    const assistantMsg = first?.message ?? {};
    const toolCalls = assistantMsg.tool_calls ?? [];

    // 2) If tool calls exist than execute them and append tool results
    if (toolCalls.length > 0) {
      // Add assistant tool call message to history
      messages.push({
        role: "assistant",
        content: assistantMsg.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const name = call?.function?.name;
        const argsRaw = call?.function?.arguments ?? "{}";

        let args;
        try {
          args = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
        } catch {
          args = {};
        }

        const fn = toolFns[name];
        const result = fn ? await fn(args) : { error: `Unknown tool: ${name}` };

        messages.push({
          role: "tool",
          name,
          content: JSON.stringify(result),
        });
      }

      // 3) human answer using tool outputs
      const finalSystem = [
        "You have received tool results that represent ground truth from the host.",
        "Now answer the user in German, naturally and helpfully.",
        "Do not mention 'tool calls' or internal JSON unless the user explicitly asks.",
        "If state is INITIAL or no data elements exist, guide the user to run option 2.",
      ].join(" ");

      const finalMessages = [
        { role: "system", content: finalSystem },
        ...messages.filter(m => m.role !== "system"), // user + tool context
      ];

      const finalRes = await chatMessages(this.llmModel, finalMessages, {
        options: { temperature: 0.2 },
      });

      console.log("\n[Antwort]");
      console.log(chalk.bgMagenta(finalRes?.message?.content ?? "").trim());
      return;
    }

    // 4) No tool call then normal response from model    
    const content = (assistantMsg.content ?? "").trim();

    if (content) {
      console.log("\n[Antwort]");
      console.log(content);
      return;
    }

    // Absolute fallback wenn content leer und keine tools
    const fallbackPrompt = `Beantworte die folgende Frage präzise und in maximal 10 Sätzen:\n\nFrage: ${question}`;
    const res = await chat(this.llmModel, fallbackPrompt);
    console.log("\n[Antwort]");
    console.log(res);
  }

  async shutdown() {
    try { await this.analysisClient?.close?.(); } catch { }
    try { await this.versionClient?.close?.(); } catch { }
  }

  // Noch zu ergänzen: Embeddings, plan
}
