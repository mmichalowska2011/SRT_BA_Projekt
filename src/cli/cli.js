import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs/promises";
import chalk from 'chalk';

export async function runCli(host) {
  // Initialisiert die CLI und verarbeitet Nutzereingaben im Menü
  const rl = createInterface({ input, output });

  try {
    while (true) {
      console.log(chalk.blueBright.bold("\n   SRT Wartungs-Host. Wähle:"));
      console.log(chalk.blue("1) Aktuelle Version im System abfragen."));
      console.log(chalk.blue("2) Dokument laden und auf Änderungen prüfen."));
      console.log(chalk.blue("3) Datenelemente auflisten."));
      console.log(chalk.blue("4) Zustand abfragen."));
      console.log(chalk.blue("5) Eine Frage stellen."));
      console.log(chalk.blue("0) Exit."));

      // const choice = (await rl.question("\nAuswahl: ")).trim();
      const choice = (await rl.question(chalk.yellow("\nAuswahl: "))).trim();

      switch (choice) {
        case "1":
          await host.showVersion();
          break;

        case "2": {
          // const filePath = (await rl.question("Dateiname eintragen (txt): ")).trim();
          // await host.checkDocumentForChanges(filePath);
          // break;

          while (true) {
            const filePath = (await rl.question("\nDateiname eintragen oder '0' zur Rückkehr zum Menü: ")).trim();

            if (filePath === "0") {
              console.log(chalk.yellow("\nAbgebrochen. Zurück zum Menü."));
              break;
            }

            if (!filePath.toLowerCase().endsWith(".txt")) {
              // console.log(chalk.red("Ungültiges Dateiformat. Bitte eine .txt Datei angeben."));
              console.log(chalk.redBright("\nUngültiges Dateiformat. Bitte eine .txt Datei angeben."));
              continue;
            }

            try {
              await fs.access(filePath);
            } catch {
              // console.log(chalk.red("Datei nicht gefunden. Bitte erneut eingeben."));
              console.log(chalk.redBright("\nDatei nicht gefunden. Bitte erneut eingeben."));
              continue;
            }

            try {
              await host.checkDocumentForChanges(filePath);
              break;
            } catch (e) {
              // console.log(chalk.red(`Analyse fehlgeschlagen: ${e?.message ?? String(e)}`));
              console.log(chalk.redBright(`Analyse fehlgeschlagen: ${e?.message ?? String(e)}`));
              console.log(chalk.yellow("\nBitte Dateiname prüfen und erneut versuchen."));
            }
          }
          break;
        }

        case "3": {
          /* 
          / --------------------------------------------------------------------------------------------------------
          /-------------------------- TO DO Fehlermeldung einbauen -------------------------------------------------
          /-------------------------- wenn falschen Datenformat übergeben ------------------------------------------
          / --------------------------------------------------------------------------------------------------------
          */
          await host.showDataElementsList();
          // host.showDataElementsList();
          break;
        }
        case "4": {
          await host.showState();
          break;
        }

        case "5": {
          const question = (await rl.question(chalk.yellow("Frage: "))).trim();
          await host.askLlm(question);
          break;
        }

        case "0":
          await host.shutdown?.();
          // console.log(chalk.redBright("Vorgang beendet"));
          console.log(chalk.green("Vorgang beendet"));
          return;

        default:
          // console.log(chalk.red("Ungültige Auswahl."));
          console.log(chalk.redBright("Ungültige Auswahl."));
        // ------ Apassen: zurück zur Menüauswahl -------
      }
    }
  } finally {
    rl.close();
  }
}
