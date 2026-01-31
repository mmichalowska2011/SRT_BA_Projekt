import { readTextFile } from "./io.js";
import { chat, extractJson } from "./ollama_llm.js";

const BUILD_PAYLOAD_PROMPT = (tableText) => 
  `Du bist ein Assistent für SAP SRT-Schnittstellenwartung. 
Aufgabe: Erzeuge ein JSON-ARRAY. 
Pro Zeile im Input entsteht genau EIN Objekt. 
Gib NUR JSON aus, keinen zusätzlichen Text. 
Das JSON-Objekt MUSS exakt diese Keys haben: 
"Table", "Field Name", "Change Type", "Field Type", "Default", "Null", 
"Description", "Documentation", "Documentation_Default", "Field Label Short", "Field Label Middle", "Field Label Long", "Field Label Header" 

Regeln: - Übernimm Table, Fieldname, Field Type, Change Type, Description direkt aus dem Input. 
- Default: null 
- Null: not null 
- Documentation: wenn im Input vorhanden dann übernehmen, sonst = Description 
- Documentation_Default: null 
- Labels (nie null): 
- Basis ist Description, falls leer dann Field Name 
- Short = Basis max 10 Zeichen 
- Middle = Basis max 20 Zeichen 
- Long = Basis max 40 Zeichen 
- Header = Short 

Input: <<< ${tableText} >>> `;


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

    const prompt = BUILD_PAYLOAD_PROMPT(text);    
    const res = await chat(this.llmModel, prompt);
    const payloadArray = extractJson(res);

    // // DEEEBUUUUUG
    // console.log("[debug] model =", this.llmModel);
    // console.log("[debug] prompt length =", prompt.length);

    let extracted;
    try {
      extracted = extractJson(res);
    } catch (e) {
      console.log("\n[host] Konnte kein gültiges JSON parsen. Raw-Antwort:");
      console.log(res);
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
