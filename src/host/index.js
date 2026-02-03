import { answerWithRAG } from './rag.js';
import { createMcpServer } from '@modelcontextprotocol/sdk';

const server = createMcpServer({
  name: 'srt-host',
  tools: {
    analyzeSRTChange: async ({ text }) => {
      const result = await answerWithRAG(text);
      return { result };
    }
  }
});

server.start();
