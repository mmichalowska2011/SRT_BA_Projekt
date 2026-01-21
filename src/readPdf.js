import fs from "node:fs/promises";
import pdf from "pdf-parse";

export async function readPdfText(filePath) {
  const data = await fs.readFile(filePath);
  const result = await pdf(data);
  return result.text;
}
