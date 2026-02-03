import ollama from 'ollama';

const PLANNER_MODEL = 'qwen3';

/**
 * Erzeugt einen strukturierten Wartungsplan aus unstrukturiertem Text
 */
export async function createPlan(specificationText) {
  const prompt = `
Du bist ein autonomer Wartungs-Agent für SAP SRT.

Analysiere die folgende Spezifikation und erstelle einen
STRUKTURIERTEN AUSFÜHRUNGSPLAN im JSON-Format.

REGELN:
- Antworte AUSSCHLIESSLICH mit gültigem JSON
- Keine Erklärungen
- Jeder Schritt muss ein Tool enthalten
- Use Case: FELD LÖSCHEN

Erlaubte Tools:
- SAP_DDIC.delete_field
- SAP_DDIC.adjust_structure
- SAP_Transport.add_to_transport
- Office.update_excel_mapping
- Confluence.update_confluence_page

JSON-Format:
{
  "useCase": "FELD_LOESCHEN",
  "tasks": [
    {
      "step": 1,
      "tool": "SAP_DDIC.delete_field",
      "params": { }
    }
  ]
}

SPEZIFIKATION:
"""
${specificationText}
"""
`;

  const response = await ollama.chat({
    model: PLANNER_MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    return JSON.parse(response.message.content);
  } catch (err) {
    throw new Error('Planner konnte kein gültiges JSON erzeugen');
  }
}
