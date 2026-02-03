import { Ollama } from "ollama";
import dotenv from "dotenv";

dotenv.config();

const ollama = new Ollama({
  host: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.APIKEY,
  },
});


export async function chat(model, prompt) {
  const res = await ollama.chat({
    model: 'qwen3-vl:235b',
    messages: [{ role: "user", content: prompt }],
  });

  return (res?.message?.content ?? "").trim();
}

export function extractJson(text) {
  const trimmed = text.trim();

  // Reines JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);

  // JSON code fence
  const fence = trimmed.match(/```json([\s\S]*?)```/i);
  if (fence?.[1]) return JSON.parse(fence[1].trim());
  
  // Best-effort: erstes { bis letztes }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }

  throw new Error("Kein JSON gefunden.");
}