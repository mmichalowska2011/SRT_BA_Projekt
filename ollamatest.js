import ollama from "ollama";

const res = await ollama.chat({
  model: "qwen3",
  messages: [{ role: "user", content: "Antworte nur mit OK" }],
  stream: false,
  options: { temperature: 0 },
});

console.log(res.message.content);


// node ollamatest.js