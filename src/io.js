import fs from "node:fs/promises";

export async function readTextFile(filePath) {
  return await fs.readFile(filePath, "utf8");
}
