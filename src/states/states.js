

export const STATES = {
  INITIAL: "INITIAL",
  ANALYZED: "ANALYZED",
  VALID: "VALID",
};


function getCount(lastChanges) {
  return Array.isArray(lastChanges) ? lastChanges.length : 0;
}

export function getStateText({ state, lastChanges, lastSourceFile }) {
  const count = getCount(lastChanges);
  const fileInfo = lastSourceFile ? ` (Quelle: ${lastSourceFile})` : "";

  if (state === STATES.INITIAL) {
    return "Ich befinde mich im Status 'INITIAL'. Es wurde noch kein Dokument analysiert. Wähle Option 2, um eine .txt Datei zu analysieren.";
  }

  if (state === STATES.ANALYZED) {
    return `Ich befinde mich im Status 'ANALYZED'.${fileInfo} Ich habe ${count} Änderung(en) erkannt, aber keine neuen Datenelemente.`;
  }

  if (state === STATES.VALID) {
    return `Ich befinde mich im Status 'VALID'.${fileInfo} Es wurden ${count} Änderung(en) erkannt und neue Datenelemente sind verfügbar (Option 3).`;
  }

  return `Ich befinde mich im Status '${state}'.`;
}
