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


// messages-basierter chat
export async function chatMessages(model, messages, options = {}) {
  const res = await ollama.chat({
    model,
    messages,
    stream: false,
    options: options?.options, // zB { temperature: 0 }
  });
  return res;
}

// // Chat mit Tool Calling
// export async function chatWithTools(model, messages, tools, options = {}) {
//   const res = await ollama.chat({
//     model,
//     messages,
//     tools,
//     stream: false,
//     options: options?.options,
//   });
//   return res;
// }

export async function chatWithTools(model, messages, tools, options = {}) {
  // send as "functions" instead of "tools"
  const functions = (tools ?? []).map(t => t.function);

  const res = await ollama.chat({
    model,
    messages,
    functions,          // <<< statt tools
    stream: false,
    options: options?.options,
  });
  return res;
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
