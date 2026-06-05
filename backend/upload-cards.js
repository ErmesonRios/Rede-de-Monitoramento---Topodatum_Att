// =============================================================================
// UPLOAD DE BASES → node upload-cards.js
// Converte cards-data.js para XML e envia ao backend.
// =============================================================================
require("dotenv").config();
const http  = require("http");
const CARDS = require("./cards-data");

const API_HOST = "localhost";
const API_PORT = Number(process.env.API_PORT) || 3001;

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toXml = (cards) => {
  const bases = cards.map((c) => {
    const pts = (c.coordinates ?? []).map((p) => `
      <point>
        <radius>${esc(p.radius)}</radius>
        <east>${esc(p.east)}</east>
        <sigmaX>${esc(p.sigmaX)}</sigmaX>
        <north>${esc(p.north)}</north>
        <sigmaY>${esc(p.sigmaY)}</sigmaY>
        <height>${esc(p.height)}</height>
        <sigmaZ>${esc(p.SigmaZ)}</sigmaZ>
        <location>${esc(p.location)}</location>
        <antennaHeight>${esc(p.antennaHeight)}</antennaHeight>
      </point>`).join("");

    return `  <base>
    <title>${esc(c.title)}</title>
    <finished>${c.finished ?? false}</finished>
    <mac>${esc(c.mac)}</mac>
    <code>${esc(c.code)}</code>
    <link>${esc(c.link)}</link>
    <finishedDate>${esc(c.finishedDate)}</finishedDate>
    <municipality>${esc(c.municipality)}</municipality>
    <state>${esc(c.state)}</state>
    <location>${esc(c.location)}</location>
    <receiver>${esc(c.receiver)}</receiver>
    <antenna>${esc(c.antenna)}</antenna>
    <antennaHeight>${esc(c.antennaHeight)}</antennaHeight>
    <installDate>${esc(c.installDate)}</installDate>
    <access>${esc(c.access)}</access>
    <responsible>${esc(c.responsible)}</responsible>
    <coordinates>${pts}
    </coordinates>
  </base>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<bases>\n${bases}\n</bases>`;
};

const execute = async (cards) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(cards) || cards.length === 0) {
        return reject("Nenhuma base informada.");
      }

      const xml  = toXml(cards);
      const body = Buffer.from(xml, "utf8");

      if (!process.env.UPLOAD_KEY || process.env.UPLOAD_KEY === "troque-por-uma-chave-secreta-aqui") {
        return reject("Defina UPLOAD_KEY no arquivo .env antes de usar.");
      }

      const req = http.request(
        {
          hostname: API_HOST,
          port: API_PORT,
          path: "/api/cards",
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Content-Length": body.length,
            "x-api-key": process.env.UPLOAD_KEY
          }
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => (data += chunk));

          res.on("end", () => {
            try {
              const json = JSON.parse(data);

              if (json.ok) {
                console.log(`✔ ${json.total} bases enviadas com sucesso.`);
                resolve(json);
              } else {
                reject(json.error || "Erro desconhecido no servidor.");
              }
            } catch (err) {
              reject("Erro ao interpretar resposta do servidor.");
            }
          });
        }
      );

      req.on("error", (e) => reject(e.message));
      req.write(body);
      req.end();

    } catch (err) {
      reject(err.message);
    }
  });
};

module.exports = {
  execute
}