import { readTextFile } from "./io.js";
import { chatStructured } from "./ollama_structured.js";
import { chat } from "./ollama_llm.js";


export class Host {
  constructor({ llmModel = "qwen3-vl:235b" } = {}) {
    this.llmModel = llmModel;

    // Platzhalter für spätere Service/MCP-Clients
    this.clients = new Map();

    // State und Ergebnisse speichern
    this.state = "INITIAL";
    this.lastChanges = null;
    this.lastSourceFile = null;
  }

  async showVersionPlaceholder() {
    console.log("\n[Info] Version-Abfrage ist noch nicht implementiert.");
    //console.log("[Info] Hier wird später ein Service/MCP-Tool aufgerufen.");    
  }


  async checkDocumentForChanges(filePath) {
    const text = await readTextFile(filePath);

    try {
      const extracted = await chatStructured(this.llmModel, text);

      // Ergebnis (JSON) wird hier gespeichert
      this.lastChanges = extracted;
      this.lastSourceFile = filePath;
      this.state = "ANALYZED";

      console.log("\n[Ergebnis] Erkannte Änderungen:");
      console.log(JSON.stringify(extracted, null, 2));
    } catch (e) {
      console.log("\n[host] Structured Output Fehler:");
      console.log(e);
      throw e;
    }
  }

  // Liste für Datenelemente
  listDataElementsToCreate() {
    if (this.lastChanges.length === 0) {
      return [];
    }

    return this.lastChanges
      .map(c => (c["Field Name"] ?? "").trim())
      .filter(Boolean);
  }


  getStateInfo() {
    return {
      state: this.state,
      hasResults: Array.isArray(this.lastChanges) && this.lastChanges.length > 0,
      sourceFile: this.lastSourceFile ?? null,
      count: Array.isArray(this.lastChanges) ? this.lastChanges.length : 0,
    };
  }

  async askLlm(question) {
    const questions = question.toLowerCase().trim();

    // Statusabfrage 
    if (questions.includes("status") || questions.includes("zustand")) {
      console.log("\n[Status]");
      console.log(JSON.stringify(this.getStateInfo(), null, 2));
      return;
    }

    // Liste der Datenelemente
    if (questions.includes("liste") && (questions.includes("datenelement") || questions.includes("data element"))) {
      const list = this.listDataElementsToCreate();

      if (list.length === 0) {
        console.log("\n[host] Keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen (Dokument analysieren).");
        return;
      }

      console.log("\n[Liste] Zu erstellende Datenelemente:");
      console.log(JSON.stringify(list, null, 2));
      return;
    }

    console.log("\n[host] Frage wird verarbeitet...");
    const prompt = `Beantworte die folgende Frage präzise und in maximal 10 Sätzen:\n\nFrage: ${question}`;
    const res = await chat(this.llmModel, prompt);
    console.log("\n[Antwort]");
    console.log(res);
  }

  // Noch zu ergänzen: connectToServices, Embeddings, plan, toolCalling
}
