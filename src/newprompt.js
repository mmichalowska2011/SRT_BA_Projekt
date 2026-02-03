export function buildExtractPrompt(tableText) {
  return `
Du bekommst eine Tabelle mit 3 Spalten:
1) Schnittstelle
2) Feld
3) Art der Anpassung

In "Art der Anpassung" kommen genau diese Kategorien vor:
- "Neues Feld"
- "Vornamen"
- "Felder die aus der Schnittstelle entfernt werden"

Aufgabe:
Extrahiere pro Kategorie ein Feld (den ersten passenden Eintrag).
Bei "Schnittstelle" können 1 bis 3 Tabellen/Objekte betroffen sein. Wenn im Text keine konkreten Objekte stehen, nutze [].

Gib NUR JSON zurück im Format:
{
  "new_fields": [
    { "schnittstelle": "...", "feld": "...", "betroffene_objekte": ["..."] }
  ],
  "field_changes": [
    { "schnittstelle": "...", "feld": "...", "betroffene_objekte": ["..."], "hinweis": "..." }
  ],
  "removed_fields": [
    { "schnittstelle": "...", "feld": "...", "betroffene_objekte": ["..."] }
  ]
}

Text:
<<<
${tableText}
>>>
`;
}
