import ollama from "ollama";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const Mini = z.object({
  "Table": z.string(),
  "Change Type": z.literal("Added"),
});

try {
  const res = await ollama.chat({
    model: "qwen3",
    messages: [
      {
        role: "user",
        content: `Extrahiere aus dem Text die Tabelle und gib "Change Type" immer als "Added" aus.

Text:
Tabelle: TAB1`,
      },
    ],
    format: zodToJsonSchema(Mini),
    stream: false,
    options: { temperature: 0 },
  });

  console.log("Raw JSON:", res.message.content);
  const parsed = Mini.parse(JSON.parse(res.message.content));
  console.log("Parsed:", parsed);
} catch (e) {
  console.error("FEHLER Structured Ping:");
  console.error(e);
}
