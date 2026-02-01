import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const Mydocument = z.object({
    "Table": z.string(),
    "Field Name": z.string(), 
    "Change Type": z.literal("Added"),
    "Field Type": z.string(),
    "Default": z.null(),
    "Null": z.literal("not null"),
    "Description": z.string(),
    "Documentation": z.string(),
    "Documentation_Default": z.null(),
    "Field Label Short": z.string(),
    "Field Label Middle": z.string(),
    "Field Label Long": z.string(),
    "Field Label Header": z.string(),
});

const MyArraySchema = z.array(Mydocument);

function buildPrompt(tableText) {
  return `Du bist ein Assistent für SAP SRT-Schnittstellenwartung. 
Aufgabe: Erzeuge ein JSON-ARRAY. 
Erzeuge pro betroffener Tabelle EIN Objekt.
Gib NUR JSON aus, keinen zusätzlichen Text. 
Das JSON-Objekt MUSS exakt diese Keys haben: 
"Table", "Field Name", "Change Type", "Field Type", "Default", "Null", 
"Description", "Documentation", "Documentation_Default", "Field Label Short", "Field Label Middle", "Field Label Long", "Field Label Header" 

Regeln: 
- Wenn im Input ‘Neues Feld’ erkannt wird, setze ‘Change Type’ auf ‘Added’.
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

Input:
<<<
${tableText}
>>>`;
}

export async function chatStructured(model, tableText) {
  const prompt = buildPrompt(tableText);

  const response = await ollama.chat({
    model,
    messages: [{ role: "user", content: prompt }],
    format: zodToJsonSchema(MyArraySchema),
    stream: false,
    options: { temperature: 0 },
  });

  const json = JSON.parse(response.message.content);
  return MyArraySchema.parse(json);
}


// const response = await ollama.chat({
//     model: 'qwen3',
//     messages: [{ role: 'user', content: prompt }],
//     format: zodToJsonSchema(MyArraySchema),
// });

// const parsed = MyArraySchema.parse(JSON.parse(response.message.content));
// console.log(parsed);