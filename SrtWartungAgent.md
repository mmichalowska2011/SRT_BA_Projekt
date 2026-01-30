# Exposé-Grundlage: Autonomer KI-Agent für SRT-Wartung

**Arbeitstitel:**
Entwicklung eines autonomen KI-Agenten zur Orchestrierung heterogener Systeme am Beispiel der SAP SRT-Schnittstellenwartung

## 1. Motivation und Problemstellung
Das SAP Standard Reporting Tool (SRT) muss regelmäßig gewartet werden, wenn sich die Schnittstellen des externen BAIS-Tools ändern. Ein Entwickler erhält die Änderungen als **unstrukturierte Dokumente** (PDF/SQL-Text) und muss manuell einen komplexen Prozess über *mehrere Systeme* hinweg anstoßen: DDIC-Objekte im SAP anlegen, Transporte packen und die Änderungen parallel in Excel-Listen sowie Confluence dokumentieren.

Dieser Prozess ist hochgradig repetitiv, fehleranfällig (durch Medienbrüche) und bindet wertvolle Entwicklerressourcen.

## 2. Zielsetzung der Arbeit
Ziel dieser Arbeit ist die Entwicklung eines **autonomen KI-Agenten** (MCP Host), der den gesamten SRT-Wartungsprozess (End-to-End) automatisiert.

Der Agent soll die unstrukturierten Spezifikationen als Input nehmen, die erforderlichen Änderungen analysieren und einen detaillierten **Ausführungsplan** erstellen. Anschließend soll er diesen Plan **autonom abarbeiten**, indem er eine **Kette von Tools über mehrere, heterogene MCP Server hinweg** orchestriert.

## 3. Methodisches Vorgehen und Architektur
Die Lösung wird als Prototyp auf Basis der offiziellen **Model-Context-Protocol (MCP)** Architektur entwickelt, die explizit für die Komposition mehrerer Systeme ausgelegt ist.

### A. MCP Host (Der "Wartungs-Agent")
Dies ist die Hauptanwendung. Sie beinhaltet das LLM (z.B. via Ollama) und übernimmt zwei Kernaufgaben:
1.  **Planung:** Umwandlung der unstrukturierten Spezifikation (Kontext) in einen strukturierten JSON-Ausführungsplan (Taskliste).
2.  **Orchestrierung:** Autonome Abarbeitung des Plans durch Verwaltung paralleler Verbindungen zu mehreren MCP Servern.

### B. MCP Server (Die "System-Konnektoren")
Der Host verbindet sich mit mehreren spezialisierten Servern:
* **`SAP_DDIC_Server`:** Tools wie `create_domain`, `create_data_element`.
* **`SAP_Transport_Server`:** Tool `add_to_transport`.
* **`Office_Server`:** Tool `update_excel_mapping`.
* **`Confluence_Server`:** Tool `update_confluence_page`.

### C. Protokoll (Der "Autonome Workflow")
1.  Der **MCP Host** startet und verbindet sich mit allen MCP Servern.
2.  Der Host empfängt die Spezifikation (Text) vom User.
3.  **Planung:** Der Host generiert mittels LLM einen strukturierten Plan.
4.  **Ausführung:** Der Host arbeitet den Plan Task für Task autonom ab.
    * *Beispiel Task "Feld anlegen":* Der Host ruft nacheinander Tools auf dem `SAP_DDIC_Server`, dem `SAP_Transport_Server` und dem `Office_Server` auf.
5.  Der Host meldet den erfolgreichen Abschluss.

## 4. Erwartete Ergebnisse und Abgrenzung
Das Ergebnis ist ein funktionaler MCP Host, der demonstriert, wie unstrukturierter Text in einen Plan umgewandelt wird und dieser durch die autonome Orchestrierung *mehrerer verschiedener* MCP Server (Multi-Step & Multi-Server Tool-Use) ausgeführt wird.

* **Im Scope:** Kernlogik des Hosts, Prompt Engineering zur Plan-Erstellung, Implementierung der MCP Server-Adapter.
* **Out of Scope:** Entwicklung der eigentlichen SAP- oder Doku-APIs (diese existieren bereits).
