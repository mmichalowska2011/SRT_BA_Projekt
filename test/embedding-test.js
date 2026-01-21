// Importiert den offiziellen Ollama-JavaScript-Client
// Dieser Client kapselt die HTTP-Kommunikation zum lokalen Ollama-Daemon
// Das ist später die LLM-Adapter-Schicht des MCP Hosts
import ollama from 'ollama'

// hier wird nicht Chat, sondern Embed aufgerufen
// Das Modell erzeugt numerische Vektoren aus Text
// Jeder Text ist ein hochdimensionaler Zahlenvektor
// input ist ein Array. Ollama verarbeitet das als Batch. Reihenfolge bleibt erhalten.
// Hier wird Sprache zu Mathematik transformiert
const Batch = await ollama.embed({   //The /api/embed endpoint returns L2‑normalized (unit‑length) vectors
  model: 'embeddinggemma',
    input: [
    'The quick brown fox jumps over the lazy dog.',
    'The five boxing wizards jump quickly.',
    'Jackdaws love my big sphinx of quartz.',
  ],
})
// console.log(Batch.embeddings[0].length) // vector length
console.log(`Successfully generated ${Batch.embeddings.length} vector embeddings.`)
console.log(Batch) // Optional: View the first embedding vector