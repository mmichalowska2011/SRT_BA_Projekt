import fs from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config();

async function main() {

    const url = process.env.TARGET_URL;
    const user = process.env.SYSTEM_USER;
    const pass = process.env.SYSTEM_PASS;
    const cookie = process.env.SYSTEM_COOKIE;

    if (!url) throw new Error("TARGET_URL fehlt in .env");
    if (!user || !pass) throw new Error("SYSTEM_USER oder SYSTEM_PASS fehlt in .env");
    if (!cookie) console.warn("[Warn] SYSTEM_COOKIE fehlt in .env (falls erforderlich, ergänzen)");

    const auth = "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

    const raw = await fs.readFile("src/test_payload.json", "utf8");
    const payload = JSON.parse(raw);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": auth,
            "Cookie": cookie,
        },
        body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
        console.error("Fehlgeschlagen:", response.status, text);
        process.exitCode = 1;
        return;
    }

    console.log("Erfolgreich:", response.status);
    console.log("Antwort:", text);
}

main().catch((e) => {
    console.error("Unerwarteter Fehler:", e);
    process.exitCode = 1;
});
