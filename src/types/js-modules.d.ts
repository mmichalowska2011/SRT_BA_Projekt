declare module "#root/io.js" {
    export function readTextFile(filePath: string): Promise<string>;
}

declare module "#root/llm/ollama_structured.js" {
    export function chatStructured(model: string, tableText: string): Promise<unknown[]>;
}