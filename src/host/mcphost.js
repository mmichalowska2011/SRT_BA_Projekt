import { readTextFile } from "../io.js";
import { chatStructured } from "../llm/ollama_structured.js";
import { chat } from "../llm/ollama_llm.js";
import { STATES, getStateText } from "../states/states.js";


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
    console.log("\n[Info] Version-Abfrage ist noch nicht implementiert.");
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
      const dataElements = this.listDataElementsToCreate();
      this.state = dataElements.length > 0 ? STATES.VALID : STATES.ANALYZED;


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

  // async checkDocumentForChanges(filePath) {
  //   const text = await readTextFile(filePath);

  //   try {
  //     const extracted = await chatStructured(this.llmModel, text);

  //     // Ergebnis (JSON) wird hier gespeichert
  //     this.lastChanges = extracted;
  //     this.lastSourceFile = filePath;
  //     this.state = "ANALYZED";

  //     const dataElements = this.listDataElementsToCreate();
  //     if (dataElements.length > 0) {
  //       this.state = "VALID";
  //     }

  //     console.log("\n[Ergebnis] Erkannte Änderungen:");
  //     console.log(JSON.stringify(extracted, null, 2));
  //   } catch (e) {
  //     console.log("\n[host] Structured Output Fehler:");
  //     console.log(e);
  //     throw e;
  //   }
  // }

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
      console.log("\n[host] Keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen (Dokument analysieren).");
      return;
    }
    console.log("\nEs gibt folgende zu erstellende Datenelemente: ");
    console.log(JSON.stringify(list, null, 2));
  }



  async askLlm(question) {
    const questions = question.toLowerCase().trim();

    // Statusabfrage 
    if (questions.includes("status") || questions.includes("zustand") || questions.includes("zust")) {
      console.log("\n[Antwort]");
      console.log(
        getStateText({
          state: this.state,
          lastChanges: this.lastChanges,
          lastSourceFile: this.lastSourceFile,
        })
      );
      return;
    }


    // Liste der Datenelemente
    if (questions.includes("liste") && (questions.includes("datenelement") || questions.includes("data element"))) {
      const list = this.listDataElementsToCreate();

      if (list.length === 0) {
        console.log("\n[Antwort]");
        console.log("\nEs sind noch keine Ergebnisse vorhanden. Bitte zuerst Option 2 ausführen (Dokument hochladen und analysieren).");
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
