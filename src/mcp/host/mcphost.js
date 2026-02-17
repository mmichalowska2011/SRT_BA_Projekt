import { readTextFile } from "../../io.js";
import { chatStructured } from "../../llm/ollama_structured.js";
import { chat, chatWithTools, chatMessages } from "../../llm/ollama_llm.js";
import { STATES, getStateText } from "../../states/states.js";
import chalk from 'chalk';

// console.log(chalk.blue('Hello world!'));

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
];

export class Host {
  constructor({ llmModel = "qwen3-vl:235b" } = {}) {
    this.llmModel = llmModel;

    // Platzhalter für spätere Service/MCP-Clients
    this.clients = new Map();

    // State und Ergebnisse speichern
    this.state = STATES.INITIAL;
    // this.lastChanges = null;
    this.lastChanges = [];
    this.lastSourceFile = null;
  }

  async showVersionPlaceholder() {
    console.log(chalk.bgYellowBright("\n[Info]"));
    console.log(chalk.yellowBright("Version-Abfrage ist noch nicht implementiert."));
    //console.log("[Info] Hier wird später ein Service/MCP-Tool aufgerufen.");    
  }

  async checkDocumentForChanges(filePath) {
    const text = await readTextFile(filePath);

    try {
      const extracted = await chatStructured(this.llmModel, text);

      // Ergebnis speichern
      this.lastChanges = extracted;
      this.lastSourceFile = filePath;

      // State abhängig davon, ob neue Datenelemente existieren
      // Dokument wurde erfolgreich verarbeitet 
      this.state = STATES.ANALYZED;

      // Wenn zusätzlich neue Datenelemente existieren
      const dataElements = this.listDataElementsToCreate();
      if (dataElements.length > 0) {
        this.state = STATES.VALID;
      }



      console.log("\nDokument wurde erfolgreich analysiert.");
      if (this.state === "VALID") {
        console.log("Es wurden neue Datenelemente erkannt. Du kannst sie über die Liste anzeigen lassen.");
      } else {
        console.log("[Info] Keine neuen Datenelemente erkannt.");
      }
    } catch (e) {
      console.log("\n[host] Structured Output Fehler:");
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

  showDataElementsList() {
    const list = this.listDataElementsToCreate();

    if (list.length === 0) {
      console.log(chalk.magentaBright("\n[host] Keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen (Dokument analysieren)."));
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
    };

    const system = [
      "Du bist ein hilfreicher Assistent innerhalb einer CLI zur Wartung von SAP SRT-Schnittstellen.",
      "Deine Aufgabe ist es, die Frage des Nutzers menschlich und natürlich zu beantworten.",
      "Wenn der Nutzer nach dem Host-Status/Zustand/Fortschritt oder nach zu erstellenden Datenelementen fragt, MUSST du die verfügbaren Tools verwenden.",
      "Nutze Tools gezielt: Rufe KEINE Tools bei allgemeinen Wissensfragen auf.",
      "Wenn ein Tool-Ergebnis zeigt, dass noch keine Daten vorliegen, erkläre dem Nutzer, was als Nächstes zu tun ist (z. B. Option 2 ausführen).",
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

  // async askLlm(question) {
  //   const questions = question.toLowerCase().trim();

  //   // Statusabfrage 
  //   if (questions.includes("status") || questions.includes("zustand") || questions.includes("zust")) {
  //     console.log("\n[Antwort]");
  //     console.log(
  //       getStateText({
  //         state: this.state,
  //         lastChanges: this.lastChanges,
  //         lastSourceFile: this.lastSourceFile,
  //       })
  //     );
  //     return;
  //   }


  //   // Liste der Datenelemente
  //   if (questions.includes("liste") && (questions.includes("datenelement") || questions.includes("data element"))) {
  //     const list = this.listDataElementsToCreate();

  //     if (list.length === 0) {
  //       console.log("\n[Antwort]");
  //       console.log("\nEs sind noch keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen (Dokument hochladen und analysieren).");
  //       return;
  //     }

  //     console.log("\n[Liste] Zu erstellende Datenelemente:");
  //     console.log(JSON.stringify(list, null, 2));
  //     return;
  //   }

  //   console.log("\n[host] Frage wird verarbeitet...");
  //   const prompt = `Beantworte die folgende Frage präzise und in maximal 10 Sätzen:\n\nFrage: ${question}`;
  //   const res = await chat(this.llmModel, prompt);
  //   console.log("\n[Antwort]");
  //   console.log(res);
  // }

  // Noch zu ergänzen: connectToServices, Embeddings, plan, toolCalling
}
