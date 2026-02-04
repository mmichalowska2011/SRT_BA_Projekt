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
    model,
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });

  return (res?.message?.content ?? "").trim();
}

export function extractJson(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);

  const fence = trimmed.match(/```json([\s\S]*?)```/i);
  if (fence?.[1]) return JSON.parse(fence[1].trim());

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }

  throw new Error("Kein JSON gefunden.");
}
