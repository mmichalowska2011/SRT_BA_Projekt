import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs/promises";

export async function readPdfText(filePath) {
  const data = await fs.readFile(filePath);
  const result = await pdf(data);
  return result.text;
}


export async function runCli(actions) {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      console.log("\n=== SRT MCP Host ===");
      console.log("1) Aktuelle Versionen abfragen");
      console.log("2) Objekt-Existenz prüfen");
      // console.log("3) Struktur kopieren (Suffix)");
      console.log("4) Feld zu Struktur hinzufügen");
      console.log("0) Exit");

      const choice = (await rl.question("\nAuswahl: ")).trim();

      if (choice === "0") break;

      switch (choice) {
        case "1":
          await actions.getVersions();
          break;

        case "2": {
          const objectType = (await rl.question("Objekttyp (DTEL/DOMA/STRU/TABL): ")).trim();
          const name = (await rl.question("Name (z.B. /IBS/EBS_VNAME): ")).trim();
          await actions.checkExists({ objectType, name });
          break;
        }

     
        // case "3": {
        // const filePath = (await rl.question("Pfad zur BAIS/SQL Textdatei: ")).trim();
        // await actions.generatePlan({ filePath });
        // break;
        // }


        case "4": {
          const structure = (await rl.question("Struktur: ")).trim();
          const fieldName = (await rl.question("Feldname: ")).trim();
          const dataElement = (await rl.question("Datenelement: ")).trim();
          const positionAfter = (await rl.question("PositionAfter (optional): ")).trim();
          await actions.addField({
            structure,
            fieldName,
            dataElement,
            positionAfter: positionAfter.length ? positionAfter : undefined,
          });
          break;
        }

        default:
          console.log("Ungültige Auswahl.");
      }
    }
  } finally {
    rl.close();
  }
}
