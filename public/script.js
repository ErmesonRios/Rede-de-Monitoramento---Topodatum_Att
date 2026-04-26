// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  TUNNEL CLOUDFLARE — troque esta URL toda vez que o tunnel reiniciar       ║
// ╚═════════════════════════════════════════════════════════════════════════════╝
const CLOUDFLARE_TUNNEL_URL = "https://scowling-aviator-shrapnel.ngrok-free.dev"; // ← ALTERE AQUI

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  SITE_CONFIG — demais configurações gerais do sistema                      ║
// ║  Todas as informações visíveis na página e no PDF vêm daqui.               ║
// ╚═════════════════════════════════════════════════════════════════════════════╝
const SITE_CONFIG = {

  // ── EMPRESA ──────────────────────────────────────────────────────────────────
  empresa: {
    nome:      "TOPODATUM",
    subtitulo: "Topografia & Geotecnologias",
    logo:      "assets/logo.png",   // deixe "" para exibir só o texto
    cnpj:      "",                  // ex: "00.000.000/0001-00"
    site:      "",                  // ex: "www.topodatum.com.br"
  },

  // ── REDE DE MONITORAMENTO ─────────────────────────────────────────────────────
  rede: {
    sigla:  "RPMC",
    titulo: "Rede Particular de Monitoramento Contínuo",
  },

  // ── RESPONSÁVEL TÉCNICO (assinatura do PDF) ───────────────────────────────────
  responsavel: {
    nome:        "Alexandre Magnum Leorne Pontes",
    habilitacao: "Geógrafo",
    crea:        "CREA-CE 000000-D",
    local:       "Marco — CE",
  },

  // ── DESENVOLVEDOR (rodapé) ────────────────────────────────────────────────────
  dev: {
    nome: "Ermeson Braga",
  },

  // ── API — URL do tunnel Cloudflare (constante no topo do arquivo) ────────────
  api: {
    url: CLOUDFLARE_TUNNEL_URL,
  },

  // ── MAPA PRINCIPAL ────────────────────────────────────────────────────────────
  mapa: {
    lat:  -5.5,
    lng:  -39.5,
    zoom: 7,
  },

  // ── CARDS DA PÁGINA PRINCIPAL ─────────────────────────────────────────────────
  // Define o que aparece como imagem em cada card da rede.
  //   "foto"      → foto do monumento cadastrada no admin (fallback: satellite)
  //   "satellite" → imagem padrão satellite.png
  //   "nenhuma"   → sem imagem no card
  cards: {
    imagem: "foto",
  },

  // ── RELATÓRIO PDF ─────────────────────────────────────────────────────────────
  pdf: {
    mapaZoom: 15,
    timeout:  5000,
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const COORDINATES = [
  {
    radius: "AR01",
    east: "375149.194",
    sigmaX: "0.001",
    north: "9202663.837",
    sigmaY: "0.002",
    height: "596.15",
    SigmaZ: "0.002",
    municipality: "Araripe",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "MC01",
    east: "372299.794",
    sigmaX: "0.001",
    north: "9655814.194",
    sigmaY: "0.002",
    height: "17.81",
    SigmaZ: "0.003",
    municipality: "Marco",
    location: "Sede Topodatum",
    antennaHeight: "8.65m",
  },
  {
    radius: "CA01",
    east: "582305.905",
    sigmaX: "0.001",
    north: "9542727.665",
    sigmaY: "0.004",
    height: "37.28",
    SigmaZ: "0.005",
    municipality: "Cascavel",
    location: "Sede de Cascavel",
    antennaHeight: "1.75m",
  },
  {
    radius: "JN01",
    east: "466842.442",
    sigmaX: "0.001",
    north: "9199233.036",
    sigmaY: "0.002",
    height: "440.32",
    SigmaZ: "0.003",
    municipality: "Juazeiro do Norte",
    location: "Parque de Vaquejada",
    antennaHeight: "1.75m",
  },
  {
    radius: "PO01",
    east: "487024.502",
    sigmaX: "0.007",
    north: "9167365.980",
    sigmaY: "0.002",
    height: "502.40",
    SigmaZ: "0.008",
    municipality: "Porteiras",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "PO02",
    east: "486986.107",
    sigmaX: "0.000",
    north: "9167457.756",
    sigmaY: "0.001",
    height: "505.51",
    SigmaZ: "0.002",
    municipality: "Porteiras",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "MV01",
    east: "484610.226",
    sigmaX: "0.001",
    north: "9198290.741",
    sigmaY: "0.001",
    height: "365.47",
    SigmaZ: "0.003",
    municipality: "Missão Velha",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "CT01",
    east: "402487.016",
    sigmaX: "0.005",
    north: "9321888.794",
    sigmaY: "0.013",
    height: "593.72",
    SigmaZ: "0.031",
    municipality: "Catarina",
    location: "Centro",
    antennaHeight: "1.75m",
  },
];

// =============================================================================
// FOTOS DOS MONUMENTOS — populado automaticamente via /api/photos.
// NÃO edite manualmente: faça upload pela página admin (/admin?pass=99).
// A URL é sempre construída a partir de SITE_CONFIG.api.url, então funciona
// mesmo quando o tunnel Cloudflare reiniciar — basta trocar CLOUDFLARE_TUNNEL_URL.
// =============================================================================
const MONUMENT_PHOTOS = {};

const loadMonumentPhotos = async () => {
  try {
    const res = await fetch(`${API_URL}/api/photos`);
    if (!res.ok) return;
    const files = await res.json();
    files.forEach(f => {
      const code = f.filename.split(".")[0].toUpperCase();
      MONUMENT_PHOTOS[code] = `${API_URL}${f.url}`;
    });
  } catch (_) { /* offline — sem fotos */ }
};

// =============================================================================
// CONVERSÃO UTM (Zona 24S / SIRGAS 2000) → WGS-84
// Usado automaticamente para plotar cada base no mapa.
// =============================================================================
const _utmCache = new Map();
const utmToLatLng = (east, north) => {
  const key = `${east},${north}`;
  if (_utmCache.has(key)) return _utmCache.get(key);
  const k0 = 0.9996, a = 6378137.0, es = 0.00669438;
  const e1 = (1 - Math.sqrt(1 - es)) / (1 + Math.sqrt(1 - es));
  const x  = east - 500000;
  const y  = north - 10000000;
  const lon0 = (24 * 6 - 183) * (Math.PI / 180);
  const ep2 = es / (1 - es);
  const mu  = (y / k0) / (a * (1 - es/4 - 3*es**2/64 - 5*es**3/256));
  const p1  = mu
    + (3*e1/2    - 27*e1**3/32)  * Math.sin(2*mu)
    + (21*e1**2/16 - 55*e1**4/32) * Math.sin(4*mu)
    + (151*e1**3/96)              * Math.sin(6*mu);
  const N1 = a / Math.sqrt(1 - es * Math.sin(p1)**2);
  const T1 = Math.tan(p1)**2;
  const C1 = ep2 * Math.cos(p1)**2;
  const R1 = a * (1 - es) / (1 - es * Math.sin(p1)**2)**1.5;
  const D  = x / (N1 * k0);
  const lat = p1
    - (N1 * Math.tan(p1) / R1)
      * (D**2/2
        - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*ep2) * D**4/24
        + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*ep2 - 3*C1**2) * D**6/720);
  const lon = (D
    - (1 + 2*T1 + C1) * D**3/6
    + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*ep2 + 24*T1**2) * D**5/120)
    / Math.cos(p1);
  const result = { lat: lat * (180/Math.PI), lng: (lon0 + lon) * (180/Math.PI) };
  _utmCache.set(key, result);
  return result;
};

// Coordenadas aproximadas para bases sem medição real ainda
const GEO_FALLBACK = {
  "Quixeramobim": { lat: -5.20, lng: -39.29 },
  "Maranguape":   { lat: -3.90, lng: -38.68 },
};

const getCardGeo = (card) => {

  // 1. Usa coordenada da API (CORRETO)
  if (Array.isArray(card.coordinates) && card.coordinates.length) {
    const c = card.coordinates[0];

    const e = parseFloat(c.east);
    const n = parseFloat(c.north);

    if (!isNaN(e) && !isNaN(n) && e > 1000 && n > 1000) {
      return utmToLatLng(e, n);
    }
  }

  // 2. fallback por código
  const coordByCode = COORDINATES.find(c => c.radius === card.code);
  if (coordByCode) {
    const e = parseFloat(coordByCode.east);
    const n = parseFloat(coordByCode.north);
    if (e > 1000 && n > 1000) return utmToLatLng(e, n);
  }

  // 3. fallback por município
  const coordByCity = COORDINATES.find(c => c.municipality === card.municipality);
  if (coordByCity) {
    const e = parseFloat(coordByCity.east);
    const n = parseFloat(coordByCity.north);
    if (e > 1000 && n > 1000) return utmToLatLng(e, n);
  }

  return GEO_FALLBACK[card.municipality] ?? null;
};

const API_URL = SITE_CONFIG.api.url; // ← configurado em SITE_CONFIG.api.url (topo do arquivo)

// =============================================================================
// PATCH TUNNEL — adiciona header para bypass de aviso do ngrok/cloudflare
// Sem precisar alterar os fetch() existentes no código.
// =============================================================================
(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (resource, options = {}) => {
    const url = typeof resource === "string"
      ? resource
      : resource?.url || "";

    const isApiRequest = url.startsWith(API_URL);

    if (!isApiRequest) {
      return originalFetch(resource, options);
    }

    const headers = new Headers(options.headers || {});
    headers.set("ngrok-skip-browser-warning", "true");

    return originalFetch(resource, {
      ...options,
      headers,
    });
  };
})();

// =============================================================================
// PASSO 1 — RÓTULOS DOS CAMPOS
// Para criar um novo campo: adicione "chave": "Rótulo" aqui,
// depois use a chave nos dados do CARDS e em alguma seção do MODAL_TABS.
// =============================================================================
const FIELD_LABELS = {
  code:             "Código",
  municipality:     "Município",
  state:            "Estado",
  location:         "Localidade",
  installDate:      "Implantação",
  finishedDate:     "Data de Encerramento",
  responsible:      "Responsável",
  receiver:         "Receptor",
  antenna:          "Antena",
  antennaHeight:    "Altura da Antena",
  situacao:         "Status",
  ultimaAtualizacao:"Última Atualização",
  // ↓ novos campos aqui
};

// =============================================================================
// PASSO 2 — ABAS E SEÇÕES DO MODAL
// Para uma nova aba: adicione um objeto { id, label, sections } no array.
// Para uma nova seção: adicione em sections[] de uma aba existente.
//
// Tipos de seção:
//   "grid"        → campos em grade (cols: 2 ou 3)
//   "text"        → campo único como bloco de parágrafo (field: "chave")
//   "coordinates" → tabela UTM automática (sem config extra)
// =============================================================================
const MODAL_TABS = [
  {
    id: "monograph",
    label: "MONOGRAFIA",
    sections: [
      {
        title: "Identificação da Base",
        type: "grid",
        cols: 3,
        fields: ["code", "municipality", "state", "location", "installDate", "finishedDate", "responsible"],
      },
      {
        title: "Localização",
        type: "map",
      },
      {
        title: "Foto do Monumento",
        type: "photo",
      },
      {
        title: "Equipamento",
        type: "grid",
        cols: 2,
        fields: ["receiver", "antenna", "antennaHeight"],
      },
      {
        title: "Descrição de Acesso",
        type: "text",
        field: "access",
      },
      {
        title: "Status de Operação",
        type: "grid",
        cols: 2,
        fields: ["situacao", "ultimaAtualizacao"],
      },
      {
        title: "Notas de Operação",
        type: "text",
        field: "operationStatus",
      },
      {
        title: "Coordenadas",
        type: "coordinates-archive",
      },
    ],
  },
  // ─── Exemplo de nova aba ────────────────────────────────────────────────
  // {
  //   id: "observations",
  //   label: "OBSERVAÇÕES",
  //   sections: [
  //     { title: "Notas Técnicas", type: "text", field: "notes" },
  //     { title: "Histórico", type: "grid", cols: 2, fields: ["lastMaint", "nextMaint"] },
  //   ],
  // },
];

// =============================================================================
// PASSO 3 — DADOS DAS BASES
// Edite backend/cards-data.js e rode: node upload-cards.js
// Os dados são carregados do backend em tempo de execução.
// =============================================================================
let CARDS = [];
// =============================================================================
// Motor de renderização — não precisa editar abaixo desta linha
// =============================================================================

const pageSections = Array.from(document.querySelectorAll("section"));
const navButtons   = Array.from(document.querySelectorAll("nav button"));
const cardsContainer = document.querySelector("#cards-container");

const drawCard = () => {
  CARDS.forEach((card) => {
    const div = document.createElement("div");
    const h2  = document.createElement("h2");
    const p   = document.createElement("p");

    h2.textContent = card.title;
    p.textContent  = card.finished ? "● FINALIZADA" : (card.mac ? "Consultando..." : "Saiba mais");
    p.className    = "card-status-text";
    div.style.position = "relative";

    // Imagem do card — controlada por SITE_CONFIG.cards.imagem
    const modoImagem = SITE_CONFIG.cards?.imagem ?? "satellite";
    if (modoImagem !== "nenhuma") {
      const img = document.createElement("img");

      if (modoImagem === "foto" && MONUMENT_PHOTOS[card.code]) {
        img.src = MONUMENT_PHOTOS[card.code];
        img.style.objectFit = "cover";
      } else {
        // fallback para satellite quando não há foto ou modo = "satellite"
        img.src = "assets/satellite.png";
      }

      div.appendChild(img);
    }

    if (card.finished) {
      div.classList.add("card-finished");
      const badge = document.createElement("span");
      badge.className = "card-status-dot finished";
      badge.title     = "Base Finalizada";
      div.appendChild(badge);
    } else if (card.mac) {
      div.dataset.mac = card.mac;
      const badge = document.createElement("span");
      badge.className = "card-status-dot loading";
      badge.title     = "Consultando status...";
      div.appendChild(badge);
    }

    div.appendChild(h2);
    div.appendChild(p);

    const btn = document.createElement("button");
    btn.textContent = card.finished ? "Base Finalizada" : "Acessar";
    btn.className   = card.finished ? "btn-acessar btn-finished" : "btn-acessar";
    btn.addEventListener("click", () => openModal(card));
    div.appendChild(btn);

    cardsContainer.appendChild(div);
  });
};

// ── Modal ────────────────────────────────────────────────────────────────────

const modalOverlay  = document.getElementById("modal-overlay");
const modalTitle    = document.getElementById("modal-title");
const modalCode     = document.getElementById("modal-code");
const modalLink     = document.getElementById("modal-link");
const modalClose    = document.getElementById("modal-close");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalTabsEl   = document.getElementById("modal-tabs");
const modalBodyEl   = document.getElementById("modal-body");

// Gera botões de aba e painéis a partir de MODAL_TABS
MODAL_TABS.forEach((tab, i) => {
  const btn = document.createElement("button");
  btn.type      = "button";
  btn.className = "modal-tab" + (i === 0 ? " active" : "");
  btn.setAttribute("data-tab", tab.id);
  btn.textContent = tab.label;
  modalTabsEl.appendChild(btn);

  const pane = document.createElement("div");
  pane.id        = `tab-${tab.id}`;
  pane.className = "modal-tab-content" + (i === 0 ? " active" : "");
  modalBodyEl.appendChild(pane);
});

const infoField = (label, value) => {
  let display;
  if (value === "SIM")
    display = `<span class="status-pill active">● ATIVA</span>`;
  else if (value === "NÃO")
    display = `<span class="status-pill inactive">● INATIVA</span>`;
  else if (value === "FINALIZADO")
    display = `<span class="status-pill finished">● FINALIZADO</span>`;
  else
    display = value ?? "—";

  return `<div class="info-field">
    <span class="info-label">${label}</span>
    <span class="info-value">${display}</span>
  </div>`;
};

const renderCoordinatesPane = (municipality) => {
  const bases = municipality ? COORDINATES.filter((c) => c.municipality === municipality) : [];
  if (!bases.length) return `<p class="empty-msg">Sem coordenadas cadastradas para esta base.</p>`;

  const rows = bases.map(({ radius, east, sigmaX, north, sigmaY, height, SigmaZ, location, antennaHeight }) => `
    <tr>
      <td data-header="Raio:">${radius}</td>
      <td data-header="Este:">${east}</td>
      <td data-header="Sigma X:">${sigmaX}</td>
      <td data-header="Norte:">${north}</td>
      <td data-header="Sigma Y:">${sigmaY}</td>
      <td data-header="Altura:">${height}</td>
      <td data-header="Sigma Z:">${SigmaZ}</td>
      <td data-header="Localidade:">${location}</td>
      <td data-header="Altura Antena:">${antennaHeight}</td>
    </tr>`).join("");

  return `<table>
    <thead><tr>
      <th>Raio</th><th>Este</th><th>Sigma X</th><th>Norte</th>
      <th>Sigma Y</th><th>Altura</th><th>Sigma Z</th>
      <th>Localidade</th><th>Altura Antena</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const renderArchivedCoordinates = (coords) => {
  if (!coords || !coords.length)
    return `<p class="empty-msg">Nenhuma coordenada arquivada.</p>`;

  const rows = coords.map(({ radius, east, sigmaX, north, sigmaY, height, SigmaZ, location, antennaHeight }) => `
    <tr>
      <td data-header="Raio:">${radius}</td>
      <td data-header="Este:">${east}</td>
      <td data-header="Sigma X:">${sigmaX ?? "—"}</td>
      <td data-header="Norte:">${north}</td>
      <td data-header="Sigma Y:">${sigmaY ?? "—"}</td>
      <td data-header="Altura:">${height}</td>
      <td data-header="Sigma Z:">${SigmaZ ?? "—"}</td>
      <td data-header="Localidade:">${location ?? "—"}</td>
      <td data-header="Altura Antena:">${antennaHeight ?? "—"}</td>
    </tr>`).join("");

  return `<table>
    <thead><tr>
      <th>Raio</th><th>Este</th><th>Sigma X</th><th>Norte</th>
      <th>Sigma Y</th><th>Altura</th><th>Sigma Z</th>
      <th>Localidade</th><th>Altura Antena</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const renderSection = (section, card) => {
  if (section.type === "photo") {
    const src = MONUMENT_PHOTOS[card.code];
    if (!src) return "";
    const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";
    return `<div class="mono-section">${header}<div class="monument-photo-wrapper"><img src="${src}" alt="Monumento ${card.code}" class="monument-photo" loading="lazy" /></div></div>`;
  }
  if (section.type === "map") {
    const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";
    return `<div class="mono-section">${header}<div id="modal-map" class="modal-map-container"></div></div>`;
  }
  if (section.type === "coordinates")         return renderCoordinatesPane(card.municipality);
  if (section.type === "coordinates-archive") {
    const archived = card.coordinates ?? [];
    const global = COORDINATES.filter((c) => c.municipality === card.municipality);
    const combined = [...global];
    archived.forEach((a) => {
      if (!combined.some((c) => c.radius === a.radius)) combined.push(a);
    });
    if (!combined.length) return "";
    const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";
    return `<div class="mono-section">${header}${renderArchivedCoordinates(combined)}</div>`;
  }

  const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";

  if (section.type === "text") {
    const val = card[section.field];
    if (!val) return "";
    return `<div class="mono-section">${header}<p class="access-text">${val}</p></div>`;
  }

  const colsClass = section.cols === 2 ? "cols-2" : "";
  const fields = (section.fields || [])
    .map((key) => infoField(FIELD_LABELS[key] || key, card[key]))
    .join("");
  return `<div class="mono-section">${header}<div class="info-grid ${colsClass}">${fields}</div></div>`;
};

const activateModalTab = (id) => {
  modalTabsEl.querySelectorAll(".modal-tab").forEach((t) => t.classList.remove("active"));
  modalBodyEl.querySelectorAll(".modal-tab-content").forEach((t) => t.classList.remove("active"));
  modalTabsEl.querySelector(`[data-tab="${id}"]`).classList.add("active");
  document.getElementById(`tab-${id}`).classList.add("active");
};

let modalMap         = null;
let currentModalCard = null;

const openModal = (card) => {
  // Destruir mapa anterior ANTES de resetar o innerHTML (container ainda anexado)
  if (modalMap) {
    try { modalMap.remove(); } catch (_) {}
    modalMap = null;
  }

  const liveData = card.finished
    ? { situacao: "FINALIZADO" }
    : (card.mac ? (baseStatusMap[card.mac] || {}) : {});
  const fullCard = { ...card, ...liveData };

  currentModalCard = fullCard;

  modalTitle.textContent  = fullCard.title;
  modalCode.textContent   = fullCard.code ? `BASE ${fullCard.code}` : "";
  modalLink.href          = fullCard.link || "#";
  modalLink.style.display = fullCard.finished ? "none" : "";
  document.getElementById("modal").classList.toggle("modal-finished", !!fullCard.finished);

  MODAL_TABS.forEach((tab) => {
    document.getElementById(`tab-${tab.id}`).innerHTML =
      tab.sections.map((s) => renderSection(s, fullCard)).join("");
  });

  activateModalTab(MODAL_TABS[0].id);
  modalOverlay.classList.remove("hidden");

  // Inicializa mapa depois que o DOM está visível e dimensionado
  requestAnimationFrame(() => {
    const mapEl = document.getElementById("modal-map");
    const geo   = getCardGeo(card);
    if (!mapEl || !geo) return;

    modalMap = L.map("modal-map", {
      center:             [geo.lat, geo.lng],
      zoom:               14,
      zoomControl:        true,
      attributionControl: false,
      scrollWheelZoom:    false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18, subdomains: "abcd",
    }).addTo(modalMap);

    const live   = baseStatusMap[card.mac];
    const status = card.finished       ? "finished"
      : live?.situacao === "SIM" ? "active"
      : live                     ? "inactive"
      : card.mac                 ? "loading"
      : "no-mac";

    L.marker([geo.lat, geo.lng], { icon: markerIcon(status) }).addTo(modalMap);

    // Força recálculo de dimensões após o modal ter terminado de renderizar
    setTimeout(() => { if (modalMap) modalMap.invalidateSize(); }, 150);
  });
};

const closeModal = () => {
  modalOverlay.classList.add("hidden");
  if (modalMap) {
    try { modalMap.remove(); } catch (_) {}
    modalMap = null;
  }
};

modalTabsEl.addEventListener("click", (e) => {
  const tab = e.target.closest(".modal-tab");
  if (tab) activateModalTab(tab.getAttribute("data-tab"));
});

modalClose.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.getElementById("modal-pdf-btn").addEventListener("click", () => {
  if (currentModalCard) generatePDF(currentModalCard);
});

const changeSection = (e) => {
  const target = e.target;
  const attr   = target.getAttribute("data-key");
  navButtons.forEach((it) => it.classList.remove("active"));
  target.classList.add("active");
  if (attr) {
    pageSections.forEach((it) => {
      if (it.getAttribute("id") === attr) it.classList.add("tab-active");
      else it.classList.remove("tab-active");
    });
  }
};

navButtons.forEach((it) => it.addEventListener("click", changeSection));


// =============================================================================
// INICIALIZAÇÃO — tenta carregar bases do backend, usa local como fallback
// =============================================================================

const init = async () => {
  // Carrega cards e fotos em paralelo
  await Promise.all([
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/cards`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length) CARDS = data;
        }
      } catch { /* backend indisponível */ }
    })(),
    loadMonumentPhotos(),
  ]);
  CARDS.sort((a, b) => (a.finished === b.finished ? 0 : a.finished ? 1 : -1));
  drawCard();
  initMap();
};

// ── Status ao vivo (banco de dados) ──────────────────────────────────────────

let baseStatusMap = {};
let cardMarkers   = {};

const updateCardDots = () => {
  // Bases com finished:true têm dot próprio — não atualizar pelo banco
  document.querySelectorAll("[data-mac]").forEach((cardEl) => {
    const data = baseStatusMap[cardEl.dataset.mac];
    const dot  = cardEl.querySelector(".card-status-dot");
    if (!dot || !data) return;
    const ativa = data.situacao === "SIM";
    dot.className = `card-status-dot ${ativa ? "active" : "inactive"}`;
    dot.title     = ativa ? "Base Ativa" : "Base Inativa";
    const statusP = cardEl.querySelector(".card-status-text");
    if (statusP) statusP.textContent = ativa ? "● ATIVA" : "● INATIVA";
    (cardMarkers[cardEl.dataset.mac] ?? []).forEach((m) => {
      const el = m.getElement()?.querySelector(".map-marker");
      if (el) el.className = `map-marker ${ativa ? "active" : "inactive"}`;
    });
  });
};

const markerIcon = (status) => L.divIcon({
  html: `<div class="map-marker ${status}">
           <div class="marker-ring"></div>
           <div class="marker-ring delay"></div>
           <div class="marker-dot"></div>
         </div>`,
  className:   "",
  iconSize:    [28, 28],
  iconAnchor:  [14, 14],
  tooltipAnchor: [0, -14],
});

const initMap = () => {
  const map = L.map("map-canvas", {
    center: [SITE_CONFIG.mapa.lat, SITE_CONFIG.mapa.lng],
    zoom:   SITE_CONFIG.mapa.zoom,
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    subdomains: "abcd",
  }).addTo(map);

  CARDS.forEach((card) => {
    const geo = getCardGeo(card);
    if (!geo) return;

    const status = card.finished ? "finished" : (card.mac ? "loading" : "no-mac");
    const marker = L.marker([geo.lat, geo.lng], { icon: markerIcon(status) }).addTo(map);

    marker.bindTooltip(card.title, {
      permanent:  false,
      direction:  "top",
      className:  "map-tooltip",
      offset:     [0, -4],
    });

    marker.on("click", () => openModal(card));
    if (card.mac) {
      if (!cardMarkers[card.mac]) cardMarkers[card.mac] = [];
      cardMarkers[card.mac].push(marker);
    }
  });

  let _resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => map.invalidateSize(), 150);
  });
};

init();

const fetchBaseStatuses = async () => {
  try {
    const res  = await fetch(`${API_URL}/api/bases`);
    const rows = await res.json();
    rows.forEach(({ maquina, situacao, ultima_atualizacao }) => {
      baseStatusMap[maquina] = {
        situacao,
        ultimaAtualizacao: ultima_atualizacao
          ? new Date(ultima_atualizacao).toLocaleString("pt-BR")
          : "—",
      };
    });
    updateCardDots();
  } catch {
    console.warn("API de status indisponível — operando sem dados ao vivo.");
  }
};

fetchBaseStatuses();

// Popula toda a UI estática a partir de SITE_CONFIG
(function applyConfig() {
  const $ = (id) => document.getElementById(id);

  // Título da aba do navegador
  document.title = `${SITE_CONFIG.rede.sigla} — ${SITE_CONFIG.empresa.nome}`;

  // Header do site
  $("site-brand-name").textContent = SITE_CONFIG.empresa.nome;
  $("site-brand-sub").textContent  = SITE_CONFIG.empresa.subtitulo;

  // Footer
  $("footer-logo").textContent    = SITE_CONFIG.empresa.nome;
  $("footer-tagline").textContent = SITE_CONFIG.empresa.subtitulo;
  $("footer-center").querySelector("span").textContent =
    `${SITE_CONFIG.rede.sigla} — ${SITE_CONFIG.rede.titulo}`;
  $("footer-dev").innerHTML =
    `Desenvolvido por <strong>${SITE_CONFIG.dev.nome}</strong>`;
  $("footer-year").textContent = new Date().getFullYear();

  // Título da seção principal
  const h1 = document.querySelector("section#rpmc h1");
  if (h1) h1.textContent = SITE_CONFIG.rede.titulo;

  // Logo no header e footer (só exibe se o caminho estiver configurado)
  if (SITE_CONFIG.empresa.logo) {
    const applyLogo = (id) => {
      const el = $(id);
      if (!el) return;
      el.src = SITE_CONFIG.empresa.logo;
      el.alt = SITE_CONFIG.empresa.nome;
      el.style.display = "block";
    };
    applyLogo("site-logo");
    applyLogo("footer-logo-img");
  }
}());

// PDF usa SITE_CONFIG diretamente — veja o bloco no topo do arquivo.

const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
  const s = document.createElement("script");
  s.onload = resolve;
  s.onerror = reject;
  s.src = src;
  document.head.appendChild(s);
});

// Busca imagem satélite via ESRI REST export API (sem html2canvas, sem Leaflet)
// O ESRI retorna um JPEG diretamente — limpo, sem interferência do CSS da página.
const captureSatelliteMap = (geo) => new Promise((resolve) => {
  const W = 800, H = 380, zoom = SITE_CONFIG.pdf.mapaZoom;

  // Calcula bbox geográfica (WGS84) centrada no ponto, proporcional ao zoom
  const scale = 360 / (256 * Math.pow(2, zoom));
  const dLng  = (W / 2) * scale;
  const dLat  = (H / 2) * scale * Math.cos(geo.lat * Math.PI / 180);
  const bbox  = `${geo.lng - dLng},${geo.lat - dLat},${geo.lng + dLng},${geo.lat + dLat}`;

  const esriUrl =
    "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${W},${H}&format=jpg&transparent=false&f=image`;

  let done = false;
  const finish = (result) => { if (!done) { done = true; resolve(result); } };

  setTimeout(() => finish(null), SITE_CONFIG.pdf.timeout);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);

      // Marcador verde da base no centro exato do mapa
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#14db67";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Ponto interno
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      finish(canvas.toDataURL("image/jpeg", 0.92));
    } catch (_) { finish(null); }
  };
  img.onerror = () => finish(null);
  img.src = esriUrl;
});

// Carrega imagem e retorna { data (base64), w, h } ou null.
// Usa fetch + FileReader para evitar o "tainted canvas" em imagens cross-origin
// (ex: Firebase → ngrok). O patch do fetch já adiciona o header ngrok automaticamente.
const loadImg = async (src) => {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Obtém dimensões sem canvas (cria Image a partir do dataUrl — mesma origem)
    const { w, h } = await new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 100, h: 100 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w, h };
  } catch (_) { return null; }
};

// =============================================================================
// GERADOR DE PDF — layout compacto e melhor aproveitamento da página
// =============================================================================
const generatePDF = async (card) => {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const { jsPDF } = window.jspdf;
  const btn = document.getElementById("modal-pdf-btn");
  const origLabel = btn.textContent;

  btn.textContent = "⏳ Gerando...";
  btn.disabled = true;

  const logoImg = await loadImg(SITE_CONFIG.empresa.logo);

  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pW = 210;
    const pH = 297;

    // margem menor para aproveitar mais a página
    const mg = 12;
    const cW = pW - mg * 2;

    let y = 0;

    // Paleta
    const G  = [10, 170, 58];
    const DG = [3, 60, 20];
    const BK = [20, 20, 20];
    const LB = [100, 100, 100];
    const MT = [150, 150, 150];
    const LN = [210, 210, 210];
    const TH = [240, 240, 240];

    const FOOTER_H = 8;
    const BOTTOM = pH - FOOTER_H - 7;

    const col2 = (cW - 2) / 2;
    const col3 = (cW - 4) / 3;

    const S = {
      fill: (...c) => doc.setFillColor(...c),
      draw: (...c) => doc.setDrawColor(...c),
      text: (...c) => doc.setTextColor(...c),
      font: (n, s) => doc.setFont(n, s),
      size: (s) => doc.setFontSize(s),
      line: (w) => doc.setLineWidth(w),
    };

    const safe = (v) => {
      const t = String(v ?? "").trim();
      return t || "—";
    };

    const imgFormat = (data) => {
      const s = String(data || "").toLowerCase();
      if (s.includes("image/png")) return "PNG";
      return "JPEG";
    };

    const addPage = () => {
      doc.addPage();

      S.fill(255, 255, 255);
      doc.rect(0, 0, pW, pH, "F");

      // mini cabeçalho de continuação
      S.draw(...G);
      S.line(0.5);
      doc.line(0, 10, pW, 10);

      S.font("helvetica", "bold");
      S.size(6.5);
      S.text(...DG);
      doc.text(SITE_CONFIG.empresa.nome, mg, 6.8);

      S.font("helvetica", "normal");
      S.text(...LB);
      doc.text(`BASE ${safe(card.code)} — ${safe(card.municipality)}/${safe(card.state)}`, pW / 2, 6.8, { align: "center" });
      doc.text("MONOGRAFIA DA BASE GEODÉSICA", pW - mg, 6.8, { align: "right" });

      y = 16;
    };

    const checkPage = (need) => {
      if (y + need > BOTTOM) addPage();
    };

    const sectionTitle = (title, needAfter = 0) => {
      checkPage(10 + needAfter);

      S.fill(...G);
      doc.rect(mg, y, 3, 7.5, "F");

      S.draw(...LN);
      S.line(0.2);
      doc.line(mg + 3, y + 7.5, pW - mg, y + 7.5);

      S.font("helvetica", "bold");
      S.size(8);
      S.text(...DG);
      doc.text(title, mg + 7, y + 5.3);

      y += 10;
    };

    const localTitle = (title, x, ly, w) => {
      S.fill(...G);
      doc.rect(x, ly, 2.6, 7.2, "F");

      S.draw(...LN);
      S.line(0.2);
      doc.line(x + 2.6, ly + 7.2, x + w, ly + 7.2);

      S.font("helvetica", "bold");
      S.size(7.5);
      S.text(...DG);
      doc.text(title, x + 6, ly + 5.1);
    };

    const field = (label, value, x, fy, w, h = 12) => {
      S.fill(255, 255, 255);
      S.draw(...LN);
      S.line(0.22);
      doc.rect(x, fy, w, h, "FD");

      S.font("helvetica", "normal");
      S.size(5.4);
      S.text(...LB);
      doc.text(String(label).toUpperCase(), x + 2.5, fy + 4.3);

      S.font("helvetica", "bold");
      S.size(7.2);
      S.text(...BK);

      const txt = doc.splitTextToSize(safe(value), w - 5)[0];
      doc.text(txt, x + 2.5, fy + 9.2);
    };

    // Fundo branco
    S.fill(255, 255, 255);
    doc.rect(0, 0, pW, pH, "F");

    // ════════════════════════════════════════════════════════════════════════
    // CABEÇALHO COMPACTO HORIZONTAL
    // ════════════════════════════════════════════════════════════════════════
    let hb = 5;

    if (logoImg) {
      const LOGO_H = 16;
      const LOGO_W = Math.min(LOGO_H * (logoImg.w / logoImg.h), 38);

      doc.addImage(
        logoImg.data,
        imgFormat(logoImg.data),
        mg,
        hb,
        LOGO_W,
        LOGO_H
      );

      S.font("helvetica", "bold");
      S.size(9);
      S.text(...DG);
      doc.text(SITE_CONFIG.empresa.nome, mg + LOGO_W + 5, hb + 6);

      S.font("helvetica", "normal");
      S.size(5.5);
      S.text(...LB);
      doc.text(SITE_CONFIG.empresa.subtitulo.toUpperCase(), mg + LOGO_W + 5, hb + 11);
    } else {
      S.font("helvetica", "bold");
      S.size(10);
      S.text(...DG);
      doc.text(SITE_CONFIG.empresa.nome, mg, hb + 7);

      S.font("helvetica", "normal");
      S.size(5.5);
      S.text(...LB);
      doc.text(SITE_CONFIG.empresa.subtitulo.toUpperCase(), mg, hb + 12);
    }

    // título central
    S.font("helvetica", "bold");
    S.size(11);
    S.text(...BK);
    doc.text("MONOGRAFIA DA BASE GEODÉSICA", pW / 2, hb + 6, { align: "center" });

    S.font("helvetica", "normal");
    S.size(7);
    S.text(70, 70, 70);
    doc.text(safe(card.title), pW / 2, hb + 11.5, { align: "center" });

    // badge
    S.fill(...G);
    doc.roundedRect(pW - mg - 22, hb + 2, 22, 11, 2, 2, "F");

    S.font("helvetica", "bold");
    S.size(8);
    S.text(255, 255, 255);
    doc.text(safe(card.code), pW - mg - 11, hb + 9, { align: "center" });

    hb += 20;

    S.draw(...G);
    S.line(0.7);
    doc.line(0, hb, pW, hb);

    y = hb + 7;

    // ════════════════════════════════════════════════════════════════════════
    // 1. IDENTIFICAÇÃO DA BASE
    // ════════════════════════════════════════════════════════════════════════
    sectionTitle("1. IDENTIFICAÇÃO DA BASE", 27);

    field("Código", card.code, mg, y, col3);
    field("Município", card.municipality, mg + col3 + 2, y, col3);
    field("Estado", card.state, mg + (col3 + 2) * 2, y, col3);

    y += 13;

    field("Localidade", card.location, mg, y, col3);
    field("Data de Implantação", card.installDate || "—", mg + col3 + 2, y, col3);
    field("Responsável", card.responsible, mg + (col3 + 2) * 2, y, col3);

    y += 15;

    if (card.finished && card.finishedDate && card.finishedDate !== "—") {
      checkPage(14);
      field("Data de Encerramento", card.finishedDate, mg, y, col2);
      y += 14;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. LOCALIZAÇÃO
    // ════════════════════════════════════════════════════════════════════════
    const MAP_H = 58;

    sectionTitle("2. LOCALIZAÇÃO", MAP_H + 6);

    const geo = getCardGeo(card);
    const satImgData = geo ? await captureSatelliteMap(geo) : null;

    if (satImgData) {
      doc.addImage(satImgData, "JPEG", mg, y, cW, MAP_H);

      S.draw(...LN);
      S.line(0.25);
      doc.rect(mg, y, cW, MAP_H, "D");
    } else {
      S.fill(240, 240, 240);
      doc.rect(mg, y, cW, MAP_H, "F");

      S.draw(...LN);
      S.line(0.25);
      doc.rect(mg, y, cW, MAP_H, "D");

      S.font("helvetica", "normal");
      S.size(8);
      S.text(...MT);
      doc.text("Mapa não disponível", pW / 2, y + MAP_H / 2, { align: "center" });
    }

    if (geo) {
      S.fill(20, 20, 20);
      doc.rect(mg, y + MAP_H - 7, cW, 7, "F");

      S.font("helvetica", "bold");
      S.size(5.8);
      S.text(...G);
      doc.text(
        `Lat: ${geo.lat.toFixed(7)}°   |   Long: ${geo.lng.toFixed(7)}°   |   Zona UTM 24S — SIRGAS 2000`,
        pW / 2,
        y + MAP_H - 2.7,
        { align: "center" }
      );
    }

    y += MAP_H + 7;

    // ════════════════════════════════════════════════════════════════════════
    // 3. FOTO + 4. EQUIPAMENTO + 5. STATUS — lado a lado
    // ════════════════════════════════════════════════════════════════════════
    checkPage(88);

    const gap = 5;
    const leftW = 72;
    const rightW = cW - leftW - gap;

    const leftX = mg;
    const rightX = mg + leftW + gap;

    const rowTop = y;

    localTitle("3. FOTO DO MONUMENTO", leftX, rowTop, leftW);
    localTitle("4. EQUIPAMENTO", rightX, rowTop, rightW);

    const contentTop = rowTop + 10;

    // Foto do monumento
    const photoSrc = MONUMENT_PHOTOS[card.code];
    const photoObj = photoSrc ? await loadImg(photoSrc) : null;

    const PHOTO_BOX_H = 68;

    if (photoObj) {
      const maxPhotoW = leftW;
      const maxPhotoH = PHOTO_BOX_H;

      let photoW = maxPhotoW;
      let photoH = photoW * (photoObj.h / photoObj.w);

      if (photoH > maxPhotoH) {
        photoH = maxPhotoH;
        photoW = photoH * (photoObj.w / photoObj.h);
      }

      const photoX = leftX + (leftW - photoW) / 2;
      const photoY = contentTop;

      doc.addImage(
        photoObj.data,
        imgFormat(photoObj.data),
        photoX,
        photoY,
        photoW,
        photoH
      );

      S.draw(...LN);
      S.line(0.25);
      doc.rect(photoX, photoY, photoW, photoH, "D");
    } else {
      S.fill(248, 248, 248);
      S.draw(...LN);
      S.line(0.25);
      doc.rect(leftX, contentTop, leftW, 30, "FD");

      S.font("helvetica", "normal");
      S.size(7);
      S.text(...MT);
      doc.text("Foto não cadastrada", leftX + leftW / 2, contentTop + 17, { align: "center" });
    }

    // Equipamento
    let ry = contentTop;

    field("Receptor GNSS", card.receiver, rightX, ry, rightW);
    ry += 13;

    field("Antena", card.antenna, rightX, ry, rightW);
    ry += 13;

    field("Altura da Antena", card.antennaHeight, rightX, ry, rightW);
    ry += 17;

    // Status dentro do mesmo bloco
    localTitle("5. STATUS DE OPERAÇÃO", rightX, ry, rightW);
    ry += 10;

    const liveData = card.finished
      ? { situacao: "FINALIZADO", ultimaAtualizacao: card.finishedDate || "—" }
      : card.mac
        ? baseStatusMap[card.mac] || {}
        : {};

    const statusLabel = card.finished
      ? "FINALIZADO"
      : liveData.situacao === "SIM"
        ? "ATIVA"
        : liveData.situacao === "NÃO"
          ? "INATIVA"
          : "NÃO CONSULTADO";

    const statusCol = (rightW - 2) / 2;

    field("Situação", statusLabel, rightX, ry, statusCol);
    field("Última Atualização", liveData.ultimaAtualizacao || "—", rightX + statusCol + 2, ry, statusCol);

    ry += 15;

    y = Math.max(contentTop + PHOTO_BOX_H, ry) + 6;

    // ════════════════════════════════════════════════════════════════════════
    // 6. DESCRIÇÃO DE ACESSO — se existir
    // ════════════════════════════════════════════════════════════════════════
    const hasAccess = Boolean(String(card.access || "").trim());

    if (hasAccess) {
      const lines = doc.splitTextToSize(card.access, cW - 8);
      const bH = Math.min(lines.length * 4.5 + 8, 42);

      sectionTitle("6. DESCRIÇÃO DE ACESSO", bH + 4);

      S.fill(255, 255, 255);
      S.draw(...LN);
      S.line(0.22);
      doc.rect(mg, y, cW, bH, "FD");

      S.fill(...G);
      doc.rect(mg, y, 2.4, bH, "F");

      S.font("helvetica", "normal");
      S.size(7.5);
      S.text(...BK);
      doc.text(lines.slice(0, 7), mg + 6, y + 6);

      y += bH + 6;
    }

    // ════════════════════════════════════════════════════════════════════════
    // COORDENADAS
    // ════════════════════════════════════════════════════════════════════════
    const coordsGlobal = COORDINATES.filter(c => c.municipality === card.municipality);
    const coordsArchived = card.coordinates ?? [];
    const allCoords = [...coordsGlobal];

    coordsArchived.forEach(a => {
      if (!allCoords.some(c => c.radius === a.radius)) allCoords.push(a);
    });

    if (allCoords.length) {
      const coordTitleNumber = hasAccess ? "7" : "6";
      sectionTitle(`${coordTitleNumber}. COORDENADAS — ZONA UTM 24S / SIRGAS 2000`, 20);

      const headers = ["Raio", "Este (m)", "Sx", "Norte (m)", "Sy", "Altitude", "Sz"];
      const colW = [22, 31, 14, 31, 14, 29, 14];
      const tableW = colW.reduce((s, v) => s + v, 0);
      const tx = mg + (cW - tableW) / 2;
      const rowH = 7.5;

      checkPage(rowH * (allCoords.length + 1) + 12);

      let cx = tx;

      headers.forEach((h, i) => {
        S.fill(...TH);
        S.draw(...MT);
        S.line(0.18);
        doc.rect(cx, y, colW[i], rowH, "FD");

        S.font("helvetica", "bold");
        S.size(6);
        S.text(...BK);
        doc.text(h, cx + colW[i] / 2, y + 5, { align: "center" });

        cx += colW[i];
      });

      y += rowH;

      allCoords.forEach((coord, idx) => {
        checkPage(rowH + 5);

        const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 248];

        const vals = [
          coord.radius || "—",
          coord.east || "—",
          coord.sigmaX || "—",
          coord.north || "—",
          coord.sigmaY || "—",
          coord.height || "—",
          coord.SigmaZ || coord.sigmaZ || "—",
        ];

        let cx2 = tx;

        vals.forEach((v, i) => {
          S.fill(...rowBg);
          S.draw(...LN);
          S.line(0.18);
          doc.rect(cx2, y, colW[i], rowH, "FD");

          S.font("helvetica", i === 0 ? "bold" : "normal");
          S.size(6);
          S.text(...BK);
          doc.text(String(v), cx2 + colW[i] / 2, y + 5, { align: "center" });

          cx2 += colW[i];
        });

        y += rowH;
      });

      y += 4;

      checkPage(8);

      S.font("helvetica", "italic");
      S.size(6);
      S.text(...MT);
      doc.text("* Sistema de Referência SIRGAS 2000 (EPSG:31984) — Fuso UTM 24S.", mg, y);

      y += 8;
    }

    // ════════════════════════════════════════════════════════════════════════
    // RESPONSABILIDADE TÉCNICA
    // ════════════════════════════════════════════════════════════════════════
    checkPage(48);

    sectionTitle("RESPONSABILIDADE TÉCNICA", 34);

    const sigX = pW / 2 - 42;
    const sigW = 84;

    const fullDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    S.draw(...MT);
    S.line(0.45);
    doc.line(sigX, y + 20, sigX + sigW, y + 20);

    let ty = y + 26;

    if (SITE_CONFIG.responsavel.nome) {
      S.font("helvetica", "bold");
      S.size(8);
      S.text(...BK);
      doc.text(SITE_CONFIG.responsavel.nome, pW / 2, ty, { align: "center" });
      ty += 5;
    }

    S.font("helvetica", "bold");
    S.size(7.5);
    S.text(...BK);
    doc.text(SITE_CONFIG.responsavel.habilitacao, pW / 2, ty, { align: "center" });

    S.font("helvetica", "normal");
    S.size(7);
    S.text(...LB);
    doc.text(SITE_CONFIG.responsavel.crea, pW / 2, ty + 5, { align: "center" });

    S.size(6.5);
    doc.text(`${SITE_CONFIG.responsavel.local}, ${fullDate}`, pW / 2, ty + 10, { align: "center" });

    y += 42;

    // ════════════════════════════════════════════════════════════════════════
    // RODAPÉ
    // ════════════════════════════════════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();

    const shortDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timeStr = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      const fy = pH - FOOTER_H;

      S.fill(255, 255, 255);
      doc.rect(0, fy, pW, FOOTER_H, "F");

      S.draw(...G);
      S.line(0.5);
      doc.line(0, fy, pW, fy);

      S.font("helvetica", "bold");
      S.size(6);
      S.text(...DG);
      doc.text(SITE_CONFIG.empresa.nome, mg, fy + 5.2);

      S.font("helvetica", "normal");
      S.text(...MT);
      doc.text(`BASE ${safe(card.code)}  |  ${safe(card.municipality)}/${safe(card.state)}`, pW / 2, fy + 5.2, { align: "center" });
      doc.text(`Pág. ${p}/${totalPages}  |  ${shortDate} ${timeStr}`, pW - mg, fy + 5.2, { align: "right" });
    }

    const fileMunicipio = safe(card.municipality).replace(/\s+/g, "_");
    doc.save(`Monografia_${safe(card.code)}_${fileMunicipio}.pdf`);

  } finally {
    btn.textContent = origLabel;
    btn.disabled = false;
  }
};

// =============================================================================
// 🟢 EASTER EGG — OMNITRIX  ·  Konami Code: ↑↑↓↓←→←→BA
// =============================================================================
(() => {
  const ALIENS = [
    { name:"HEATBLAST",   species:"Pyronita",              symbol:"🔥", color:"#ff5500", glow:"rgba(255,85,0,.6)"    },
    { name:"WILDMUTT",    species:"Vulpimancer",           symbol:"🐺", color:"#cc7700", glow:"rgba(204,119,0,.6)"   },
    { name:"DIAMONDHEAD", species:"Petrosapiano",          symbol:"💎", color:"#00ccbb", glow:"rgba(0,204,187,.6)"   },
    { name:"XLR8",        species:"Kinecelerano",          symbol:"⚡", color:"#2255ff", glow:"rgba(34,85,255,.6)"   },
    { name:"GREY MATTER", species:"Galvano",               symbol:"🧠", color:"#6688cc", glow:"rgba(102,136,204,.6)" },
    { name:"FOUR ARMS",   species:"Tetramando",            symbol:"💪", color:"#cc2222", glow:"rgba(204,34,34,.6)"   },
    { name:"STINKFLY",    species:"Lepidopterrano",        symbol:"🦋", color:"#88cc00", glow:"rgba(136,204,0,.6)"   },
    { name:"RIPJAWS",     species:"Piscciss Volann",       symbol:"🦈", color:"#0077cc", glow:"rgba(0,119,204,.6)"   },
    { name:"UPGRADE",     species:"Mechamorfo Galvânico",  symbol:"⚙️", color:"#00aa44", glow:"rgba(0,170,68,.6)"    },
    { name:"GHOSTFREAK",  species:"Ectonurita",            symbol:"👻", color:"#7733bb", glow:"rgba(119,51,187,.6)"  },
  ];

  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown",
                  "ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let kIdx = 0, current = 0, slideDir = "right";

  // Ativação alternativa: clicar na marca do header 10 vezes (Ben *10*)
  let brandClicks = 0, brandTimer = null;
  const brandEl = document.getElementById("site-brand") || document.getElementById("site-brand-name");
  if (brandEl) {
    brandEl.addEventListener("click", () => {
      brandClicks++;
      clearTimeout(brandTimer);
      if (brandClicks >= 10) {
        brandClicks = 0;
        openOmnitrix();
        return;
      }
      brandTimer = setTimeout(() => { brandClicks = 0; }, 4000);
    });
  }

  // ── Construção do DOM ──────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "omnitrix-overlay";
  overlay.innerHTML = `
    <div id="omnitrix-device">
      <div id="omnitrix-header">
        <span id="omnitrix-title">⬡ OMNITRIX</span>
        <button id="omnitrix-close" title="Fechar (ESC)">✕</button>
      </div>

      <div style="position:relative;display:flex;align-items:center;justify-content:center">
        <div id="omnitrix-dial"></div>
        <div id="omnitrix-screen">
          <div id="omnitrix-alien-symbol">🔥</div>
          <div id="omnitrix-alien-name">HEATBLAST</div>
          <div id="omnitrix-alien-species">Pyronita</div>
        </div>
      </div>

      <div id="omnitrix-nav">
        <button class="omni-nav-btn" id="omni-prev">◀</button>
        <div id="omnitrix-dots"></div>
        <button class="omni-nav-btn" id="omni-next">▶</button>
      </div>

      <button id="omnitrix-transform-btn">⬡ &nbsp; TRANSFORMAR</button>
      <div id="omnitrix-hint">Clique na logo 10× &nbsp;|&nbsp; Konami Code ↑↑↓↓←→←→BA</div>
    </div>`;

  const flash = document.createElement("div");
  flash.id = "omnitrix-transform-flash";
  flash.innerHTML = `<div id="omnitrix-transform-flash-text"></div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(flash);

  // Cria os 10 dots
  const dotsEl = overlay.querySelector("#omnitrix-dots");
  ALIENS.forEach((_, i) => {
    const d = document.createElement("span");
    d.className = "omni-dot" + (i === 0 ? " active" : "");
    d.addEventListener("click", () => goTo(i));
    dotsEl.appendChild(d);
  });

  // ── Renderização ───────────────────────────────────────────────────────────
  const screen   = overlay.querySelector("#omnitrix-screen");
  const symEl    = overlay.querySelector("#omnitrix-alien-symbol");
  const nameEl   = overlay.querySelector("#omnitrix-alien-name");
  const specEl   = overlay.querySelector("#omnitrix-alien-species");
  const dialEl   = overlay.querySelector("#omnitrix-dial");
  const transBtn = overlay.querySelector("#omnitrix-transform-btn");

  function render(anim = true) {
    const a = ALIENS[current];

    // cores dinâmicas
    screen.style.setProperty("--omni-glow", a.glow);
    screen.style.borderColor = a.color;

    // animação de entrada
    if (anim) {
      symEl.style.animation = "none";
      void symEl.offsetWidth;
      symEl.style.animation = slideDir === "right"
        ? "omni-slide-in-right .3s ease"
        : "omni-slide-in-left .3s ease";
    }

    symEl.textContent  = a.symbol;
    nameEl.textContent = a.name;
    specEl.textContent = a.species;
    symEl.style.filter = `drop-shadow(0 0 14px ${a.color})`;
    nameEl.style.textShadow = `0 0 12px ${a.color}`;

    // dots
    dotsEl.querySelectorAll(".omni-dot").forEach((d, i) => {
      d.classList.toggle("active", i === current);
      d.style.setProperty("--omni-glow", a.glow);
      d.style.background = i === current ? a.color : "";
      d.style.boxShadow  = i === current ? `0 0 6px ${a.color}` : "";
    });

    // rotação do dial
    dialEl.style.transform = `rotate(${current * 36}deg)`;
  }

  function goTo(idx) {
    slideDir = idx > current ? "right" : "left";
    current  = (idx + ALIENS.length) % ALIENS.length;
    render();
  }

  // ── Controles ──────────────────────────────────────────────────────────────
  overlay.querySelector("#omni-prev").addEventListener("click", () => goTo(current - 1));
  overlay.querySelector("#omni-next").addEventListener("click", () => goTo(current + 1));

  transBtn.addEventListener("click", () => {
    const a = ALIENS[current];
    transBtn.disabled = true;

    // flash colorido
    flash.style.background = a.color;
    flash.querySelector("#omnitrix-transform-flash-text").textContent =
      `⬡ TRANSFORMANDO EM ${a.name}! ⬡`;
    flash.querySelector("#omnitrix-transform-flash-text").style.textShadow =
      `0 0 40px ${a.color}`;
    flash.classList.add("omni-flashing");

    setTimeout(() => {
      flash.classList.remove("omni-flashing");
      transBtn.disabled = false;
    }, 950);
  });

  function openOmnitrix() {
    current = 0; slideDir = "right";
    render(false);
    overlay.classList.add("omni-open");
  }

  function closeOmnitrix() {
    overlay.classList.remove("omni-open");
  }

  overlay.querySelector("#omnitrix-close").addEventListener("click", closeOmnitrix);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOmnitrix(); });

  // ── Teclado ────────────────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    // Konami Code
    if (e.key === KONAMI[kIdx]) {
      kIdx++;
      if (kIdx === KONAMI.length) { kIdx = 0; openOmnitrix(); }
    } else {
      kIdx = e.key === KONAMI[0] ? 1 : 0;
    }

    if (!overlay.classList.contains("omni-open")) return;
    if (e.key === "Escape")     closeOmnitrix();
    if (e.key === "ArrowLeft")  goTo(current - 1);
    if (e.key === "ArrowRight") goTo(current + 1);
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); transBtn.click(); }
  });
})();