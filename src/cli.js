import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function runCli(host) {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      console.log("\n SRT Wartungs-Host. Wähle:");
      console.log("1) Aktuelle Version im System abfragen (Platzhalter).");
      console.log("2) Dokument laden und auf Änderungen prüfen.");
      console.log("3) Eine Frage stellen.");
      console.log("0) Exit.");

      const choice = (await rl.question("\nAuswahl: ")).trim();

      switch (choice) {
        case "1":
          await host.showVersionPlaceholder();
          break;

        case "2": {
          const filePath = (await rl.question("Dateiname eintragen (txt): ")).trim();
          await host.checkDocumentForChanges(filePath);
          break;
        }

        case "3": {
          const question = (await rl.question("Frage: ")).trim();
          await host.askLlm(question);
          break;
        }

        case "0":
          console.log("Vorgang beendet");
          return;

        default:
          console.log("Ungültige Auswahl.");
          // ------ Apassen: zurück zur Menüauswahl -------
      }
    }
  } finally {
    rl.close();
  }
}
