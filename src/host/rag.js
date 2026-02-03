import path from 'node:path';
import ollama from 'ollama';
import * as math from 'mathjs';

const LLM_MODEL = 'qwen3';        

let EMBEDDING_MODEL = '';

if ( LLM_MODEL == 'qwen3' ) {
  EMBEDDING_MODEL = 'qwen3-embedding';
  } else {
  EMBEDDING_MODEL = LLM_MODEL;
  };


const knowledgeBase = [
    {
        id: 1,
        human_text: "Das SRT ist das Standart reporting tool von Accenture. Es ist als ABAP Classic entwickling implementiert und nutzt parallele Verarbeitung ein framework von der SAP für massendaten verarbeitung im BATCH.",
        embedding: null 
    },
    {
        id: 2,
        human_text: "Wenn Festwerte definiert sind, muss vor dem Datenelement eine Domain angelegt werden.",
        embedding: null 
    },
    {
        id: 3,
        human_text: "Bei Tabellenänderungen im SRT dürfen Originalstrukturen nicht verändert werden. Es wird eine Kopie mit Versionssuffix angelegt.",
        embedding: null
    },
        {
        id: 4,
        human_text: "Das SRT ist als ABAP Classic Anwendung implementiert und nutzt Batch-Jobs zur Massenverarbeitung.",
        embedding: null
    }
];
console.log(knowledgeBase);


const embedding = await ollama.embed({
  model: EMBEDDING_MODEL,
  input: knowledgeBase.map( entry => entry.human_text )
});
console.log(embedding);


knowledgeBase.forEach((entry, index) => {
    entry.embedding = embedding.embeddings[index];
});
console.log(knowledgeBase);


const userQuestion = { id: 1,
                       human_text : "Ist das SRT als ABAP Classic oder RAP implementiert?",
                       embedding : null };
// call the ollama embedding API to create the embedding vector for teh user question
const embeddingUserQuestion = await ollama.embed({
  model: EMBEDDING_MODEL,
  input: userQuestion.human_text
});


userQuestion.embedding = embeddingUserQuestion.embeddings[0];
console.log(userQuestion);



const cosineSimilarity = [];

knowledgeBase.forEach((entry, index) => {
  const dotProduct = math.dot(userQuestion.embedding, entry.embedding);
  const normQuestion = math.norm(userQuestion.embedding);
  const normKnowledgeBase = math.norm(entry.embedding);
  const similarity = dotProduct / (normQuestion * normKnowledgeBase);

  cosineSimilarity.push({ similarity: similarity,
                          id : entry.id,
                          human_text : entry.human_text });
});
cosineSimilarity.sort((a, b) => b.similarity - a.similarity);
console.log(cosineSimilarity);


console.log("\nGeneriere Antwort mit Ollama (Top 2 Contexts)"); 

const topMatches = cosineSimilarity.slice(0, 2);


const contextText = topMatches
    .map(match => match.human_text)
    .join("\n\n-- neuer Kontext --\n\n");

console.log("Verwendeter Kontext:\n", contextText); 


const prompt = `
Du bist ein hilfreicher Assistent.
Beantworte die Frage des Nutzers ausschließlich basierend auf den folgenden Kontext-Informationen. Die verschidenen Kontextblöcke sind durch spezielle zeichenfolge '-- neuer Kontext --' getrennt. Die Reihenfolge der Kontextblöcke ist , der beste ist ganz oben.
Wenn die Antwort nicht im Kontext enthalten ist, sage, dass du es nicht weißt.

Kontext-Informationen:
-- neuer Kontext ---
${contextText}

Frage des Nutzers:
"${userQuestion.human_text}"
`;

const response = await ollama.chat({
  model: LLM_MODEL, 
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});


process.stdout.write(`\nKI Antwort von ${LLM_MODEL}: `);
for await (const part of response) {
  process.stdout.write(part.message.content);
}
console.log("\n\n--- Fertig ---");


