// src/toolcall_smoketest.js
import { Ollama } from "ollama";
import dotenv from "dotenv";

dotenv.config();

// // Nutzt exakt deine Cloud-Konfiguration (wie in ollama_llm.js)
// const ollama = new Ollama({
//   host: "https://ollama.com",
//   headers: {
//     Authorization: "Bearer " + process.env.APIKEY,
//   },
// });
const ollama = new Ollama({
  host: "http://localhost:11434",
});

// Modell wählen, das bei dir nachweislich existiert (aus deiner Debug-Ausgabe)
const MODEL = "qwen3:latest";

function getHostState() {
  return {
    state: "INITIAL",
    changesCount: 0,
    lastSourceFile: null,
    hasDataElements: false,
  };
}

// Tool-Schema 1:1 wie im Ollama-Tool-Calling-Beispiel (tools + tool_calls)
const tools = [
  {
    type: "function",
    function: {
      name: "get_host_state",
      description: "Get the current internal host state and metadata.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

async function main() {
  const messages = [{ role: "user", content: "Wie ist der Status des Hosts?" }];

  console.log("Question:", messages[0].content);

  // 1) erster Call: Modell darf Tool Calls vorschlagen
  const response = await ollama.chat({
    model: MODEL,
    messages,
    tools,
    stream: false,
  });

  console.log("\nFIRST MESSAGE:");
  console.log(JSON.stringify(response.message, null, 2));

  // Assistant message in History übernehmen
  messages.push(response.message);

  // 2) Tool Calls ausführen, falls vorhanden
  if (response.message.tool_calls?.length) {
    for (const call of response.message.tool_calls) {
      if (call.function?.name !== "get_host_state") continue;

      const result = getHostState();

      // Tool result message exakt im Format aus den Ollama-Beispielen
      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: JSON.stringify(result),
      });
    }

    // 3) finaler Call: Modell formuliert menschliche Antwort basierend auf Tool Result
    const final = await ollama.chat({
      model: MODEL,
      messages,
      tools,
      stream: false,
    });

    console.log("\nFINAL ANSWER:");
    console.log(final.message.content);
  } else {
    console.log("\nNo tool_calls returned.");
  }
}

main().catch((e) => {
  console.error("\nERROR:");
  console.error(e);
  process.exitCode = 1;
});