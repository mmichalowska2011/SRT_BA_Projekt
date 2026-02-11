# SRT_MCP_Host
Bachelorarbeit-Prototyp: Autonomer KI-Agent (MCP Host) zur automatisierten Wartung heterogener Meldewesen-Schnittstellen

## Voraussetzungen
- **Node.js** (empfohlen: v20.x)
- **npm**
- **Ollama Cloud API Key** (für die Requests an https://ollama.com)

## Installation
1) Repository klonen und in den Ordner wechseln.

2) Dependencies installieren:
```bash
npm install
````

## Ollama Cloud API Key einrichten

Dieses Projekt nutzt **Ollama Cloud** (API Requests an [https://ollama.com](https://ollama.com)). Dafür wird ein persönlicher API Key benötigt.

### API Key erhalten

1. Bei Ollama anmelden (Web)
2. In den Account-/API-Bereich wechseln
3. Einen neuen API Key erstellen/kopieren

> Der Key ist geheim und darf nicht im Repository landen.

## `.env.example` vs. `.env`

* Die Datei `.env.example` ist **nur eine Vorlage** und darf ins Repository committed werden.
* Du musst lokal eine **eigene** Datei `.env` anlegen (oder `.env.example` kopieren und umbenennen).

### `.env` erstellen

Danach in `.env` den Key eintragen:

```env
APIKEY=DEIN_OLLAMA_API_KEY
```

> Wichtig: `.env` ist in `.gitignore` und wird nicht committed.

### Zusätzliche Zugangsdaten für das Zielsystem (Username/Passwort/Cookies)

Für die Verbindung zu den Systemen werden zusätzlich Zugangsdaten benötigt.  
Diese dürfen **nicht** im Repository stehen und werden deshalb ebenfalls lokal in der `.env` hinterlegt.

Ergänze in deiner `.env` (je nach Systemvorgaben) z. B.:

```env
TARGET_URL=https://<DEIN_ENDPOINT>
SYSTEM_USER=DEIN_USERNAME
SYSTEM_PASS=DEIN_PASSWORT
SYSTEM_COOKIE=DEINE_COOKIES
```


## Verbindung zu den Systemen testen (Connectivity Check)

Um zu prüfen, ob die Verbindung zum Zielsystem funktioniert (POST Request inkl. Authentication + Cookies), kann das Script `connectivity_check.js` ausgeführt werden.

### Voraussetzungen
- In der `.env` müssen folgende Variablen gesetzt sein:
  - `TARGET_URL`
  - `SYSTEM_USER`
  - `SYSTEM_PASS`
  - `SYSTEM_COOKIE` (falls vom System benötigt)

### Payload-Datei
Das Script liest ein JSON-Payload aus der Datei:

- `src/test_payload.json`

(Die Datei muss lokal vorhanden sein und ein gültiges JSON enthalten.)

### Ausführen
```bash
npm run connect
```

## Start

```bash
npm run start
```


## CLI Menü (Bedienung)

Im Terminal erscheint ein Menü mit folgenden Optionen:

- **1) Aktuelle Version im System abfragen (Platzhalter)**  
  Diese Funktion ist aktuell nur ein Platzhalter und noch nicht implementiert.

- **2) Dokument laden und auf Änderungen prüfen**  
  Das ist die Option zum **Testen der Extraktion** (unstrukturierter Text → JSON).  
  Nach Auswahl wirst du nach einem Dateinamen gefragt. Du kannst z. B. verwenden:
  - `test.txt` (kleines, strukturiertes Beispiel)
  - `testpdf.txt` (unstrukturierter Text aus dem MSG Dokument)

- **3) Datenelemente ausgeben**  
  Diese Option gibt eine Liste mit den aktuellen Datenelementen aus die hinzugefügt werden sollen lt. dem letzten bearbeiteten Dokument.
  
- **4) Eine Frage stellen**  
  Direkter Chat mit Ollama:
  - allgemeine Fragen, 
  - Freitext, 
  - Abfrage des aktuellen Zustands.

- **0) Exit**  
  Beendet das Programm.

