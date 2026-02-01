import ollama from "ollama";

try {
  const res = await ollama.chat({
    model: "qwen3",
    messages: [{ role: "user", content: "ping" }],
    stream: false,
    options: { temperature: 0 },
  });

  console.log("OK. Antwort vom Modell:");
  console.log(res.message.content);
} catch (e) {
  console.error("FEHLER beim Ping:");
  console.error(e);
}

