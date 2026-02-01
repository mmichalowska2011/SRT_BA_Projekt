import { readTextFile } from "./io.js";
import { chatStructured } from "./ollama_structured.js";
import { chat } from "./ollama_llm.js";


export class Host {
  constructor({ llmModel = "qwen3" } = {}) {
    this.llmModel = llmModel;

    // Platzhalter für spätere Service/MCP-Clients
    this.clients = new Map();
  }

  async showVersionPlaceholder() {
    console.log("\n[Info] Version-Abfrage ist noch nicht implementiert.");
    console.log("[Info] Hier wird später ein Service/MCP-Tool aufgerufen.");    
  }

  
  async checkDocumentForChanges(filePath) {
    const text = await readTextFile(filePath);      

    let extracted;
    try {
      extracted = await chatStructured(this.llmModel, text);
    } catch (e) {
      console.log("\n[host] Konnte kein gültiges JSON parsen. Raw-Antwort:");
      console.log(e);
      throw e;
    }

    console.log("\n[Ergebnis] Erkannte Änderungen:");
    console.log(JSON.stringify(extracted, null, 2));  
    console.log("\n[Info] Später wird hier JSON einen Ausführungsplan erzeugen und Tools orchestrieren.");
  }


  async askLlm(question) {
    console.log("\n[host] Frage wird verarbeitet...");
    const prompt = `Beantworte die folgende Frage präzise und in maximal 10 Sätzen:\n\nFrage: ${question}`;
    const res = await chat(this.llmModel, prompt);
    console.log("\n[Antwort]");
    console.log(res);
  }

  // Noch zu ergänzen: connectToServices, Embeddings, plan, toolCalling
}
