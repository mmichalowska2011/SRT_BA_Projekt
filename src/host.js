import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ollama from "ollama";

import { MCPClientHandle } from "./mcpClient.js";
import { runCli } from "./ui-cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfade zu deinen lokalen Mock-Servern (für den echten Service später austauschbar)
const validateServerPath = path.join(__dirname, "servers", "validate-server.js");
const changeServerPath = path.join(__dirname, "servers", "change-server.js");

// Prompt-Template + Output-Pfade
const PROMPT_TEMPLATE_PATH = path.join(process.cwd(), "prompts", "plan_prompt.txt");
const OUT_DIR = path.join(process.cwd(), "out");
const OUT_PLAN_PATH = path.join(OUT_DIR, "plan.json");

// Registry: Host verwaltet mehrere Clients (1:1 zu Servern)
const registry = [
  { id: "validate", command: "node", args: [validateServerPath] },
  { id: "change", command: "node", args: [changeServerPath] },
];

// Hilfsfunktion: Prompt-Template laden und Platzhalter ersetzen
async function buildPromptFromTemplate(documentText) {
  const template = await fs.readFile(PROMPT_TEMPLATE_PATH, "utf8");
  return template.replace("{{DOCUMENT_TEXT}}", documentText);
}

// Hilfsfunktion: versucht JSON aus einer LLM-Antwort zu extrahieren
function extractJson(text) {
  const trimmed = text.trim();

  // Fall 1: Antwort ist schon reines JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  // Fall 2: Antwort enthält Codefence ```json ... ```
  const fenceMatch = trimmed.match(/```json([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();

  // Fall 3: best-effort: erstes { bis letztes }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) return trimmed.slice(first, last + 1);

  throw new Error("Konnte kein JSON in der LLM-Antwort finden.");
}

async function main() {
  const clients = new Map();

  try {
    // 1) Clients verbinden
    for (const s of registry) {
      const handle = new MCPClientHandle(s);
      await handle.connect();
      clients.set(s.id, handle);
      console.log(`[host] connected: ${s.id}`);
    }

    const validate = clients.get("validate");
    const change = clients.get("change");

    // 2) Tool-Discovery (für Demo/Debug)
    for (const [id, client] of clients.entries()) {
      const tools = await client.listTools();
      console.log(`\n[host] tools on ${id}:`);
      for (const t of tools) console.log(` - ${t.name}`);
    }

    // 3) Actions für das CLI bereitstellen
    const actions = {
      // --- MCP / Demo Actions ---
      async getVersions() {
        const res = await validate.callTool("get_current_versions", {});
        console.log(JSON.stringify(res, null, 2));
      },

      async checkExists({ objectType, name }) {
        const res = await validate.callTool("check_object_exists", { objectType, name });
        console.log(JSON.stringify(res, null, 2));
      },

      async copyStructure({ sourceStructure, targetStructure }) {
        const res = await change.callTool("copy_structure_with_suffix", {
          sourceStructure,
          targetStructure,
        });
        console.log(JSON.stringify(res, null, 2));
      },

      async addField({ structure, fieldName, dataElement, positionAfter }) {
        const args = { structure, fieldName, dataElement };
        if (positionAfter) args.positionAfter = positionAfter;

        const res = await change.callTool("add_field_to_structure", args);
        console.log(JSON.stringify(res, null, 2));
      },

     
    
      async generatePlan({ filePath, model = "qwen3" }) {
      
        await fs.mkdir(OUT_DIR, { recursive: true });


        const documentText = await fs.readFile(filePath, "utf8");

        
        const prompt = await buildPromptFromTemplate(documentText);

        console.log("\n[host] Sende Prompt an Ollama...");
        const res = await ollama.chat({
          model,
          messages: [{ role: "user", content: prompt }],
        });

        const raw = res?.message?.content ?? "";
        let planJsonText;
        let planObj;

        try {
          planJsonText = extractJson(raw);
          planObj = JSON.parse(planJsonText);
        } catch (e) {
          console.error("\n[host] Konnte JSON nicht parsen. Raw-Antwort:");
          console.error(raw);
          throw e;
        }

        // Speichern
        await fs.writeFile(OUT_PLAN_PATH, JSON.stringify(planObj, null, 2), "utf8");

        console.log(`\n[host] Plan gespeichert: ${OUT_PLAN_PATH}`);
        console.log(JSON.stringify(planObj, null, 2));
      },

    

      
      async runDemoWorkflow() {
        console.log("\n[host] demo workflow: check -> copy -> addField");

        const existsRes = await validate.callTool("check_object_exists", {
          objectType: "DTEL",
          name: "/ABC/EBS_LNAME",
        });
        console.log("\n[host] check_object_exists:");
        console.log(JSON.stringify(existsRes, null, 2));

        const copyRes = await change.callTool("copy_structure_with_suffix", {
          sourceStructure: "/ABC/SBS_TAB1",
          targetStructure: "/ABC/SBS_TAB1_1",
        });
        console.log("\n[host] copy_structure_with_suffix:");
        console.log(JSON.stringify(copyRes, null, 2));

        const addRes = await change.callTool("add_field_to_structure", {
          structure: "/ABC/SBS_TAB1",
          fieldName: "LNAME",
          dataElement: "/ABC/EBS_LNAME",
          positionAfter: "VNAME",
        });
        console.log("\n[host] add_field_to_structure:");
        console.log(JSON.stringify(addRes, null, 2));

        console.log("\n[host] demo workflow done.");
      },
    };

    // 4) CLI starten (deine ui-cli.js ruft actions.* auf)
    await runCli(actions);
  } catch (err) {
    console.error("[host] error:", err);
    process.exitCode = 1;
  } finally {
    // 5) Clean shutdown
    for (const client of clients.values()) {
      await client.close().catch(() => {});
    }
  }
}

main();
