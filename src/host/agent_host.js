import { createPlan } from './ollama_planer.js';
//import fs from 'fs'

//// starten - eingabe lesen 
//const inputTetx = fs.readFileSync(
//    '.src/baisInout.txt',
//    'utf-8'
//)

//const plan = await createPlan(inputTetx);

//console.log("Generierter Plan");
//console.log(JSON.stringify(plan, null, 2));






//   MCP CLIENTS (Mock)

const SAP_DDIC_Client = {
  async delete_field(params) {
    console.log('SAP_DDIC: Feld löschen', params);
  },
  async adjust_structure(params) {
    console.log('SAP_DDIC: Struktur anpassen', params);
  }
};

const SAP_Transport_Client = {
  async add_to_transport(params) {
    console.log('SAP_TRANSPORT: Objekt transportieren', params);
  }
};

const Office_Client = {
  async update_excel_mapping(params) {
    console.log('OFFICE: Excel Mapping aktualisieren', params);
  }
};

const Confluence_Client = {
  async update_confluence_page(params) {
    console.log('CONFLUENCE: Seite aktualisieren', params);
  }
};


//   TOOL ROUTING

const TOOL_REGISTRY = {
  'SAP_DDIC.delete_field': SAP_DDIC_Client.delete_field,
  'SAP_DDIC.adjust_structure': SAP_DDIC_Client.adjust_structure,
  'SAP_Transport.add_to_transport': SAP_Transport_Client.add_to_transport,
  'Office.update_excel_mapping': Office_Client.update_excel_mapping,
  'Confluence.update_confluence_page': Confluence_Client.update_confluence_page,
};

//   HOST Logik

async function executePlan(plan) {
  console.log('\nAusführungsplan gestartet:', plan.useCase);

  for (const task of plan.tasks) {
    console.log(`\nStep ${task.step}: ${task.tool}`);

    const toolFn = TOOL_REGISTRY[task.tool];

    if (!toolFn) {
      throw new Error(`Unbekanntes Tool: ${task.tool}`);
    }

    await toolFn(task.params);
  }

  console.log('\nAlle Schritte erfolgreich ausgeführt');
}


//   Start

async function main() {
  // MOCK: extrahierter Text aus PDF
  const specificationText = `
Feld BAIS_STATUS soll aus der Struktur ZSRT_MSG_HEAD entfernt werden.
Die Änderung muss transportiert werden.
Excel Mapping und Confluence Dokumentation müssen angepasst werden.
`;

  console.log('Spezifikation empfangen');

  const plan = await createPlan(specificationText);

  console.log('\nGenerierter Plan:\n', JSON.stringify(plan, null, 2));

  await executePlan(plan);
}

main().catch(console.error);
