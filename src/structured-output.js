import ollama from 'ollama'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import fs from "node:fs/promises";


const ChangeType = z.literal("Added");

const ChangeObject = z.object({
  "Table": z.string().min(1),
  "Field Name": z.string().min(1),
  "Change Type": ChangeType,
  "Field Type": z.string().min(1),
  "Default": z.null(), 
  "Null": z.literal("NOT NULL"),
  "Description": z.string().min(1),
  "Documentation": z.string().min(1),
  "Documentation_Default": z.null(),
  "Field Label Short": z.string().min(1),
  "Field Label Middle": z.string().min(1),
  "Field Label Long": z.string().min(1),
  "Field Label Header": z.string().min(1),
});

const ChangeList = z.array(ChangeObject).min(1);

function buildPrompt(tableText) {
  return `
Erzeuge ein JSON-ARRAY. Pro Zeile im Input genau EIN Objekt.
Gib NUR JSON aus.

Input-Format je Zeile:
Table | Field Name | Field Type | Change Type | Description | Documentation(optional)

Regeln:
- Übernimm Table, Field Name, Field Type aus dem Input.
- Default: null
- Null: "NOT NULL"
- Documentation: wenn im Input vorhanden, dann übernehmen, sonst = Description
- Documentation_Default: null

Labels, sinnvoll aus Description (sonst Field Name) bilden:
- Ohne Leerzeichen, Sonderzeichen entfernen.
- Umlaute ersetzen: ä->ae, ö->oe, ü->ue, ß->ss.
- Wörter zuerst vollständig verwenden; erst wenn nötig kürzen:
  - Baue ein kompaktes CamelCase-Label aus den Wörtern der Basis.
  - Wenn zu lang: entferne ganze Wörter von hinten, bis es passt.
  - Wenn dann immer noch zu lang (ein Wort ist zu lang): kürze am Ende.
- Längenlimits:
  - Field Label Short: max 10
  - Field Label Middle: max 20
  - Field Label Long: max 40
  - Field Label Header: identisch zu Short

Output Keys exakt:
"Table","Field Name","Change Type","Field Type","Default","Null",
"Description","Documentation","Documentation_Default",
"Field Label Short","Field Label Middle","Field Label Long","Field Label Header"

Input:
<<<
${tableText}
>>>
`.trim();
}

// Kernfunktion: nimmt tableText, holt structured JSON von Ollama, validiert es.
export async function extractChangesStructured({ tableText, model = "qwen3" }) {
  const prompt = buildPrompt(tableText);

  const response = await ollama.chat({
    model,
    messages: [
      { role: "system", content: "Du gibst ausschließlich gültiges JSON zurück." },
      { role: "user", content: prompt },
    ],
    // Wichtig: JSON erzwingen (Ollama structured-style)
    format: "json",
    options: { temperature: 0 },
  });

  const content = (response?.message?.content ?? "").trim();

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `Ollama hat kein gültiges JSON geliefert.\nRaw:\n${content}`
    );
  }

  // Harte Validierung gegen das erwartete Schema
  const validated = ChangeList.parse(parsed);
  return validated;
}

/**
 * Kleiner Test-Runner:
 * node src/structured-extract.js test.txt
 */
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node src/src/structured-output.js <file.txt>");
    process.exit(1);
  }

    const tableText = await fs.readFile(filePath, "utf8");

  const result = await extractChangesStructured({ tableText, model: "qwen3" });
  console.log(JSON.stringify(result, null, 2));
}

import path from "node:path";
import { pathToFileURL } from "node:url";

// ...

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[ERROR]", err?.message ?? err);
    process.exit(1);
  });
}
































// const Country = z.object({
//   name: z.string(),
//   capital: z.string(),
//   languages: z.array(z.string()),
// })

// const response = await ollama.chat({
//   model: 'gpt-oss',
//   messages: [{ role: 'user', content: 'Tell me about Canada.' }],
//   format: zodToJsonSchema(Country),
// })

// const country = Country.parse(JSON.parse(response.message.content))
// console.log(country)