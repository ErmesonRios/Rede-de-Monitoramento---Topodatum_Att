require("dotenv").config();
const express        = require("express");
const cors           = require("cors");
const helmet         = require("helmet");
const rateLimit      = require("express-rate-limit");
const { Pool }       = require("pg");
const fs             = require("fs");
const path           = require("path");
const multer         = require("multer");
const { execute }    = require("./upload-cards.js");
const { parseString } = require("xml2js");

const CARDS_FILE       = path.join(__dirname, "cards.json");
const PHOTOS_DIR       = path.join(__dirname, "public", "assets", "bases");

// Garante que o diretório de fotos existe
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// Multer — salva como {CODE}.{ext}, aceita apenas imagens
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PHOTOS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
    const code = String(req.params.code || "sem-codigo").replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${code}${ext}`);
  },
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowed.includes(ext) ? null : new Error("Somente imagens JPG, PNG ou WEBP."), allowed.includes(ext));
  },
});
const SITE_CONFIG_FILE = path.join(__dirname, "site-config.json");

const SITE_CONFIG_DEFAULT = {
  empresa:    { nome: "TOPODATUM", subtitulo: "Topografia & Geotecnologias", logo: "assets/logo.png", cnpj: "", site: "" },
  rede:       { sigla: "RPMC", titulo: "Rede Particular de Monitoramento Contínuo" },
  responsavel:{ nome: "", habilitacao: "Engenheiro Agrimensor / Cartógrafo", crea: "CREA-CE 000000-D", local: "Cascavel — CE" },
  dev:        { nome: "Ermeson Braga" },
  mapa:       { lat: -5.5, lng: -39.5, zoom: 7 },
  pdf:        { mapaZoom: 15, timeout: 5000 },
};

// =============================================================================
// BANCO DE DADOS
// =============================================================================
const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || "topodatum",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// =============================================================================
// CAMPOS DO BANCO
// =============================================================================
const BASE_FIELDS = `
  maquina,
  nome_base,
  situacao,
  ultima_atualizacao,
  internet,
  online,
  situacao2
`;

// =============================================================================
// SEGURANÇA
// =============================================================================
const app  = express();
const PORT = process.env.API_PORT || 3001;

// Arquivos estáticos com CORS explícito nas imagens (necessário para loadImg via fetch)
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filePath)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  },
}));

// 1. Headers de segurança (XSS, clickjacking, MIME sniff, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// 2. CORS — restringe origens permitidas
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // permite requisições sem origin (file://, Postman, upload-cards.js)
    if (!origin) return cb(null, true);
    // se ALLOWED_ORIGINS não configurado, bloqueia tudo que não é localhost
    if (ALLOWED_ORIGINS.length === 0) {
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      return cb(isLocal ? null : new Error("CORS bloqueado"), isLocal);
    }
    const ok = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
    cb(ok ? null : new Error("CORS bloqueado"), ok);
  },
}));

// 3. Rate limit geral — 150 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." },
}));

// 4. Rate limit restrito para escrita — 10 req / hora por IP
const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de uploads atingido. Tente novamente em 1 hora." },
});

// 5. Chave de API para endpoints de escrita
const requireApiKey = (req, res, next) => {
  const key    = req.headers["x-api-key"];
  const secret = process.env.UPLOAD_KEY;
  if (!secret) return res.status(500).json({ error: "UPLOAD_KEY não configurada no servidor." });
  if (!key || key !== secret) return res.status(401).json({ error: "Não autorizado." });
  next();
};

// 6. Validação de MAC address
const MAC_RE = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;
const validateMac = (req, res, next) => {
  if (!MAC_RE.test(req.params.mac))
    return res.status(400).json({ error: "Endereço MAC inválido." });
  next();
};



app.use(express.json({ limit: "100kb" }));

// =============================================================================
// FOTOS DOS MONUMENTOS
// =============================================================================

// GET /api/photos — lista todas as fotos em assets/bases/
app.get("/api/photos", (_req, res) => {
  try {
    const files = fs.readdirSync(PHOTOS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => ({ filename: f, url: `/assets/bases/${f}` }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos/:filename — retorna a imagem pelo nome
app.get("/api/photos/:filename", (req, res) => {
  try {
    const filename = req.params.filename;

    // 🛡️ proteção básica contra path traversal
    if (filename.includes("..")) {
      return res.status(400).json({ error: "Nome de arquivo inválido" });
    }

    const filePath = path.join(PHOTOS_DIR, filename);

    // verifica se existe
    if (!fs.existsSync(filePath)) {
      const fallback = path.join(__dirname, "public", "assets", "sem-foto.png");
      return res.sendFile(fallback);
    }

    return res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/photo/:code — faz upload de uma foto para a base (substitui se existir)
app.post("/api/photo/:code", (req, res) => {
  const pass = req.query.pass || req.headers["x-admin-pass"];
  if (!pass || pass !== "99") return res.status(401).json({ error: "Não autorizado." });

  uploadPhoto.single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    res.json({ ok: true, url: `/assets/bases/${req.file.filename}`, filename: req.file.filename });
  });
});

// DELETE /api/photo/:filename — remove uma foto
app.delete("/api/photo/:filename", (req, res) => {
  const pass = req.query.pass || req.headers["x-admin-pass"];
  if (!pass || pass !== "99") return res.status(401).json({ error: "Não autorizado." });

  const name = path.basename(req.params.filename); // evita path traversal
  const file = path.join(PHOTOS_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Arquivo não encontrado." });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

// =============================================================================
// SITE CONFIG — leitura e escrita de site-config.json
// =============================================================================
app.get("/api/siteconfig", (_req, res) => {
  try {
    const data = fs.existsSync(SITE_CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, "utf8"))
      : SITE_CONFIG_DEFAULT;
    res.json(data);
  } catch { res.json(SITE_CONFIG_DEFAULT); }
});

app.post("/api/siteconfig", (req, res) => {
  try {
    const pass = req.query.pass || req.headers["x-admin-pass"];
    if (!pass || pass !== "99") return res.status(401).json({ error: "Não autorizado." });
    fs.writeFileSync(SITE_CONFIG_FILE, JSON.stringify(req.body, null, 2), "utf8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin", (req, res) => {
  try {
    const { pass } = req.query;

    if(!pass.trim() || pass.trim() !== "99") return res.sendStatus(401);

    res.sendFile(path.join(__dirname, "public", "cadastro.html"));
  } catch {
    res.sendStatus(401);
  }
})

app.get("/api/getCards", async (_req, res) => {
  try {
    const bases = await fs.promises.readFile(path.resolve("cards.json"), "utf8");

    res.json(JSON.parse(bases))
    
  } catch (err) {
    console.error(err);
    res.sendStatus(401);
  }
});

app.post("/api/upload", async (req, res) => {
  try {
    await execute(req.body); // 👈 agora recebe do frontend
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(401);
  }
});
// =============================================================================
// CARDS — dados das bases
// =============================================================================

// POST /api/cards → requer chave de API + rate limit restrito
app.post("/api/cards", uploadLimit, requireApiKey,
  express.text({ type: "*/*", limit: "2mb" }),
  (req, res) => {
    parseString(req.body, { explicitArray: false, trim: true }, (err, result) => {
      if (err) return res.status(400).json({ error: "XML inválido." });

      const raw   = result?.bases?.base ?? [];
      const bases = Array.isArray(raw) ? raw : [raw];

      const cards = bases.map((b) => ({
        title:         b.title         ?? "",
        finished:      b.finished === "true",
        mac:           b.mac           ?? "",
        code:          b.code          ?? "",
        link:          b.link          ?? "",
        finishedDate:  b.finishedDate  ?? "",
        municipality:  b.municipality  ?? "",
        state:         b.state         ?? "",
        location:      b.location      ?? "",
        receiver:      b.receiver      ?? "",
        antenna:       b.antenna       ?? "",
        antennaHeight: b.antennaHeight ?? "",
        installDate:   b.installDate   ?? "",
        access:        b.access        ?? "",
        responsible:   b.responsible   ?? "",
        coordinates: b.coordinates?.point
          ? [].concat(b.coordinates.point).map((p) => ({
              radius:        p.radius        ?? "",
              east:          p.east          ?? "",
              sigmaX:        p.sigmaX        ?? "",
              north:         p.north         ?? "",
              sigmaY:        p.sigmaY        ?? "",
              height:        p.height        ?? "",
              SigmaZ:        p.sigmaZ        ?? "",
              location:      p.location      ?? "",
              antennaHeight: p.antennaHeight ?? "",
            }))
          : [],
      }));

      fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf8");
      res.json({ ok: true, total: cards.length });
    });
  }
);

// GET /api/cards → público (leitura)
app.get("/api/cards", (_req, res) => {
  if (!fs.existsSync(CARDS_FILE))
    return res.status(404).json({ error: "Nenhuma base importada ainda." });
  res.json(JSON.parse(fs.readFileSync(CARDS_FILE, "utf8")));
});

// =============================================================================
// BASES (banco de dados)
// =============================================================================

// GET /api/bases → todas as bases
app.get("/api/bases", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${BASE_FIELDS} FROM idace.bases`);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao consultar o banco de dados." });
  }
});

// GET /api/base/:mac → base pelo MAC (valida formato antes de consultar)
app.get("/api/base/:mac", validateMac, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${BASE_FIELDS} FROM idace.bases WHERE maquina = $1`,
      [req.params.mac]
    );
    if (!rows.length) return res.status(404).json({ error: "Base não encontrada." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao consultar o banco de dados." });
  }
});

// 404 catch-all
app.use((_req, res) => res.sendStatus(403));

const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`API Topodatum rodando em todas as interfaces na porta ${PORT}`);
  console.log(`Acesse pela rede: http://IP_DO_PI:${PORT}`);
});
