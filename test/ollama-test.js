import ollama from './src/node_modules/ollama/ollama'

const response = await ollama.chat({
  model: 'gemma3',
  messages: [{ role: 'user', content: 'Why is the sky blue?' }],
})
console.log(response.message.content)

