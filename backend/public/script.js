// =============================================================================
// CONFIGURAÇÃO — URL da API detectada automaticamente pela origem da página
// =============================================================================
const API_BASE  = window.location.origin;
const ADMIN_PASS = new URLSearchParams(location.search).get("pass") || "";

document.getElementById("api-url-label").textContent = `API: ${API_BASE}`;

// =============================================================================
// ── UTILIDADES ────────────────────────────────────────────────────────────────
// =============================================================================
const uid = () => Math.random().toString(36).slice(2, 10);

const escHtml = (str = "") =>
  String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function setStatus(id, msg, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "status" + (type ? " " + type : "");
  el.textContent = msg;
}

function setLoading(btn, on, label = "Aguarde…") {
  if (on) { btn.dataset.orig = btn.textContent; btn.textContent = label; btn.disabled = true; }
  else     { btn.textContent = btn.dataset.orig ?? btn.textContent; btn.disabled = false; }
}

// =============================================================================
// ── TABS ──────────────────────────────────────────────────────────────────────
// =============================================================================
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("pane-" + btn.dataset.tab)?.classList.add("active");
  });
});

// =============================================================================
// ══ ABA: BASES ════════════════════════════════════════════════════════════════
// =============================================================================

let bases         = [];
let selectedIndex = -1;
let searchQuery   = "";

// ── DOM refs ─────────────────────────────────────────────────────────────────
const sendServerBtn   = document.getElementById("sendServerBtn");
const reloadBtn       = document.getElementById("reloadBtn");
const addCoordBtn     = document.getElementById("addCoordBtn");
const saveBtn         = document.getElementById("saveBtn");
const newBtn          = document.getElementById("newBtn");
const deleteBtn       = document.getElementById("deleteBtn");
const basesList       = document.getElementById("basesList");
const coordsList      = document.getElementById("coordsList");
const searchInput     = document.getElementById("searchInput");
const finishedCheck   = document.getElementById("finished");
const finishedField   = document.getElementById("finishedDateField");
const formHeading     = document.getElementById("form-heading");
const basesCount      = document.getElementById("bases-count");

// ── Modelo de dados ───────────────────────────────────────────────────────────
function defaultCoord() {
  return { _id: uid(), radius: "", east: "", sigmaX: "", north: "", sigmaY: "", height: "", SigmaZ: "", location: "", antennaHeight: "" };
}

function defaultBase() {
  return {
    title: "", finished: false, mac: "", code: "", link: "", finishedDate: "",
    municipality: "", state: "CE", location: "", receiver: "u-blox F9P",
    antenna: "", antennaHeight: "", installDate: "", access: "",
    responsible: "Topodatum Topografia", coordinates: [defaultCoord()],
  };
}

function cleanBase(b) {
  const finished = !!b.finished;
  return {
    title:         String(b.title        || ""),
    finished,
    mac:           String(b.mac          || ""),
    code:          String(b.code         || ""),
    link:          String(b.link         || ""),
    finishedDate:  finished ? String(b.finishedDate || "") : "",
    municipality:  String(b.municipality || ""),
    state:         String(b.state        || ""),
    location:      String(b.location     || ""),
    receiver:      String(b.receiver     || ""),
    antenna:       String(b.antenna      || ""),
    antennaHeight: String(b.antennaHeight|| ""),
    installDate:   String(b.installDate  || ""),
    access:        String(b.access       || ""),
    responsible:   String(b.responsible  || ""),
    coordinates: (Array.isArray(b.coordinates) ? b.coordinates : []).map(c => ({
      radius: String(c.radius || ""),  east:  String(c.east  || ""), sigmaX: String(c.sigmaX || ""),
      north:  String(c.north  || ""),  sigmaY:String(c.sigmaY|| ""), height: String(c.height || ""),
      SigmaZ: String(c.SigmaZ || ""),  location: String(c.location || ""),
      antennaHeight: String(c.antennaHeight || ""),
    })),
  };
}

function validateBase(b) {
  const e = [];
  if (!b.title.trim())        e.push("Título é obrigatório.");
  if (!b.code.trim())         e.push("Código é obrigatório.");
  if (!b.municipality.trim()) e.push("Município é obrigatório.");
  if (!b.state.trim())        e.push("Estado é obrigatório.");
  if (!b.location.trim())     e.push("Localização é obrigatória.");
  if (!b.receiver.trim())     e.push("Receptor é obrigatório.");
  if (!b.responsible.trim())  e.push("Responsável é obrigatório.");
  if (!b.coordinates?.length) e.push("Adicione pelo menos uma coordenada.");
  else b.coordinates.forEach((c, i) => {
    if (!String(c.radius   || "").trim()) e.push(`Medição ${i+1}: Raio obrigatório.`);
    if (!String(c.location || "").trim()) e.push(`Medição ${i+1}: Localidade obrigatória.`);
  });
  const dup = bases.some((x, i) =>
    i !== selectedIndex &&
    String(x.code || "").trim().toUpperCase() === String(b.code || "").trim().toUpperCase()
  );
  if (dup) e.push("Código duplicado.");
  return e;
}

// ── Visibilidade do campo finishedDate ────────────────────────────────────────
function syncFinished() {
  finishedField.style.display = finishedCheck.checked ? "" : "none";
}
finishedCheck.addEventListener("change", syncFinished);
syncFinished();

// ── Preencher / ler formulário ─────────────────────────────────────────────────
function fillForm(b) {
  const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ""; };
  f("title", b.title); f("mac", b.mac); f("code", b.code); f("link", b.link);
  f("municipality", b.municipality); f("state", b.state); f("location", b.location);
  f("receiver", b.receiver); f("antenna", b.antenna); f("antennaHeight", b.antennaHeight);
  f("installDate", b.installDate); f("finishedDate", b.finishedDate);
  f("access", b.access); f("responsible", b.responsible);
  finishedCheck.checked = !!b.finished;
  syncFinished();
  renderCoords((b.coordinates || []).map(c => ({ ...defaultCoord(), ...c, _id: uid() })));
  formHeading.textContent = b.code ? `Editando — ${b.code}` : "Nova base";
}

function readForm() {
  const coords = [...document.querySelectorAll(".coord-item")].map(box => ({
    radius:       box.querySelector('[data-k="radius"]').value.trim(),
    east:         box.querySelector('[data-k="east"]').value.trim(),
    sigmaX:       box.querySelector('[data-k="sigmaX"]').value.trim(),
    north:        box.querySelector('[data-k="north"]').value.trim(),
    sigmaY:       box.querySelector('[data-k="sigmaY"]').value.trim(),
    height:       box.querySelector('[data-k="height"]').value.trim(),
    SigmaZ:       box.querySelector('[data-k="SigmaZ"]').value.trim(),
    location:     box.querySelector('[data-k="location"]').value.trim(),
    antennaHeight:box.querySelector('[data-k="antennaHeight"]').value.trim(),
  }));
  const g = (id) => document.getElementById(id)?.value.trim() ?? "";
  return {
    title: g("title"), finished: finishedCheck.checked, mac: g("mac"),
    code: g("code"), link: g("link"), finishedDate: g("finishedDate"),
    municipality: g("municipality"), state: g("state"), location: g("location"),
    receiver: g("receiver"), antenna: g("antenna"), antennaHeight: g("antennaHeight"),
    installDate: g("installDate"), access: g("access"), responsible: g("responsible"),
    coordinates: coords,
  };
}

// ── Render coordenadas ────────────────────────────────────────────────────────
function renderCoords(coords) {
  coordsList.innerHTML = "";
  coords.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "coord-item";
    div.innerHTML = `
      <div class="coord-head">
        <strong>Medição ${i + 1}</strong>
        <button class="mini btn-danger remove-coord-btn" type="button">Remover</button>
      </div>
      <div class="coord-grid">
        <div class="field"><label>Raio / ID</label>        <input data-k="radius"        value="${escHtml(c.radius)}"></div>
        <div class="field"><label>Este (m)</label>         <input data-k="east"          value="${escHtml(c.east)}"></div>
        <div class="field"><label>Sigma X (m)</label>      <input data-k="sigmaX"        value="${escHtml(c.sigmaX)}"></div>
        <div class="field"><label>Norte (m)</label>        <input data-k="north"         value="${escHtml(c.north)}"></div>
        <div class="field"><label>Sigma Y (m)</label>      <input data-k="sigmaY"        value="${escHtml(c.sigmaY)}"></div>
        <div class="field"><label>Altitude (m)</label>     <input data-k="height"        value="${escHtml(c.height)}"></div>
        <div class="field"><label>Sigma Z (m)</label>      <input data-k="SigmaZ"        value="${escHtml(c.SigmaZ)}"></div>
        <div class="field"><label>Localidade</label>       <input data-k="location"      value="${escHtml(c.location)}"></div>
        <div class="field"><label>Altura antena</label>    <input data-k="antennaHeight" value="${escHtml(c.antennaHeight)}"></div>
      </div>`;
    coordsList.appendChild(div);
  });
}

// ── Render lista ──────────────────────────────────────────────────────────────
function renderList() {
  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? bases.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)  ||
        (b.municipality || "").toLowerCase().includes(q))
    : bases;

  basesCount.textContent = `${bases.length} bases · ${filtered.length} visível${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    basesList.innerHTML = `<div class="item"><div>
      <strong>${bases.length ? `Nenhuma base com "${escHtml(q)}"` : "Nenhuma base cadastrada"}</strong>
      <div class="item-meta">${bases.length ? "Tente outro termo." : "Cadastre a primeira base."}</div>
    </div></div>`;
    return;
  }

  basesList.innerHTML = filtered.map(b => {
    const ri = bases.indexOf(b);
    return `<div class="item ${ri === selectedIndex ? "selected" : ""}" data-index="${ri}">
      <div>
        <strong>${escHtml(b.title || "(sem título)")}
          <span class="badge ${b.finished ? "warn" : "ok"}">${b.finished ? "FINALIZADA" : "ATIVA"}</span>
        </strong>
        <div class="item-meta">
          ${escHtml(b.code)} | ${escHtml(b.municipality)}/${escHtml(b.state)}<br>
          ${escHtml(b.location || "—")} | MAC: ${escHtml(b.mac || "—")}
        </div>
      </div>
      <div class="item-actions">
        <button class="mini btn-secondary edit-base-btn" data-index="${ri}">Editar</button>
      </div>
    </div>`;
  }).join("");
}

function selectBase(i) {
  if (i < 0 || i >= bases.length) return;
  selectedIndex = i;
  fillForm(bases[i]);
  loadPhotoForCode(bases[i].code);
  setStatus("status-bases", `Editando ${bases[i].code} — ${bases[i].title}.`, "ok");
  renderList();
  if (window.innerWidth < 1100)
    document.querySelector(".card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Eventos: lista ────────────────────────────────────────────────────────────
basesList.addEventListener("click", e => {
  const el = e.target.closest(".edit-base-btn, .item");
  if (el) selectBase(Number(el.dataset.index));
});

coordsList.addEventListener("click", e => {
  const btn = e.target.closest(".remove-coord-btn");
  if (!btn) return;
  if (document.querySelectorAll(".coord-item").length === 1) {
    setStatus("status-bases", "A base precisa de pelo menos uma medição.", "err"); return;
  }
  btn.closest(".coord-item")?.remove();
});

addCoordBtn.addEventListener("click", () => {
  const cur = [...document.querySelectorAll(".coord-item")].map(box => ({
    radius: box.querySelector('[data-k="radius"]').value,
    east:   box.querySelector('[data-k="east"]').value,
    sigmaX: box.querySelector('[data-k="sigmaX"]').value,
    north:  box.querySelector('[data-k="north"]').value,
    sigmaY: box.querySelector('[data-k="sigmaY"]').value,
    height: box.querySelector('[data-k="height"]').value,
    SigmaZ: box.querySelector('[data-k="SigmaZ"]').value,
    location: box.querySelector('[data-k="location"]').value,
    antennaHeight: box.querySelector('[data-k="antennaHeight"]').value,
  }));
  cur.push(defaultCoord());
  renderCoords(cur);
  coordsList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// ── Salvar ────────────────────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const b = cleanBase(readForm());
  const errs = validateBase(b);
  if (errs.length) { setStatus("status-bases", "⚠ " + errs.join("  |  "), "err"); return; }
  if (selectedIndex >= 0) {
    bases[selectedIndex] = b;
    setStatus("status-bases", `✔ Base ${b.code} atualizada.`, "ok");
  } else {
    bases.push(b);
    selectedIndex = bases.length - 1;
    setStatus("status-bases", `✔ Base ${b.code} cadastrada.`, "ok");
  }
  formHeading.textContent = `Editando — ${b.code}`;
  renderList();
});

newBtn.addEventListener("click", () => {
  selectedIndex = -1; fillForm(defaultBase());
  setPhotoPanel(null, null);
  formHeading.textContent = "Nova base";
  setStatus("status-bases", "Nova base pronta para cadastro.", "ok");
  renderList();
});

deleteBtn.addEventListener("click", () => {
  if (selectedIndex < 0) { setStatus("status-bases", "Selecione uma base para excluir.", "err"); return; }
  const code = bases[selectedIndex]?.code || "";
  if (!confirm(`Excluir a base ${code} da lista local?\n\nEnvie ao servidor após para confirmar.`)) return;
  bases.splice(selectedIndex, 1);
  selectedIndex = -1; renderList(); fillForm(defaultBase());
  formHeading.textContent = "Nova base";
  setStatus("status-bases", `Base ${code} excluída localmente. Envie ao servidor.`, "ok");
});

// ── Enviar ao servidor ────────────────────────────────────────────────────────
sendServerBtn.addEventListener("click", async () => {
  if (selectedIndex >= 0) {
    const b = cleanBase(readForm());
    const errs = validateBase(b);
    if (errs.length) { setStatus("status-bases", "Corrija antes de enviar: " + errs.join(" | "), "err"); return; }
    bases[selectedIndex] = b;
    renderList();
  }
  if (!bases.length) { setStatus("status-bases", "Nenhuma base para enviar.", "err"); return; }
  if (!confirm(`Enviar ${bases.length} base(s) ao servidor?\nIsso substituirá todos os registros.`)) return;

  setLoading(sendServerBtn, true, "⬆ Enviando…");
  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bases),
    });
    if (res.ok) setStatus("status-bases", `✔ ${bases.length} base(s) enviada(s) com sucesso.`, "ok");
    else        setStatus("status-bases", `Erro do servidor: ${await res.text().catch(() => res.status)}`, "err");
  } catch (err) {
    setStatus("status-bases", "Falha de conexão: " + err.message, "err");
  } finally {
    setLoading(sendServerBtn, false);
  }
});

// =============================================================================
// ── FOTO DO MONUMENTO ─────────────────────────────────────────────────────────
// =============================================================================
let currentPhotoUrl      = null; // URL da foto já salva no servidor para a base atual
let currentPhotoFilename = null;

const photoInput      = document.getElementById("photo-input");
const photoUploadBtn  = document.getElementById("photo-upload-btn");
const photoDeleteBtn  = document.getElementById("photo-delete-btn");
const photoPreviewWrap= document.getElementById("photo-preview-wrap");
const photoPreview    = document.getElementById("photo-preview");
const photoFilename   = document.getElementById("photo-filename");
const photoEmpty      = document.getElementById("photo-empty");
const statusPhoto     = document.getElementById("status-photo");

function showPhotoStatus(msg, type = "") {
  statusPhoto.style.display = "";
  statusPhoto.className     = "status" + (type ? " " + type : "");
  statusPhoto.textContent   = msg;
}

// Atualiza o painel de foto com uma URL existente (ou null para "sem foto")
function setPhotoPanel(url, filename) {
  currentPhotoUrl      = url;
  currentPhotoFilename = filename;

  if (url) {
    photoPreview.src           = url;
    photoFilename.textContent  = filename || "";
    photoPreviewWrap.style.display = "";
    photoEmpty.style.display       = "none";
    photoDeleteBtn.style.display   = "";
  } else {
    photoPreviewWrap.style.display = "none";
    photoEmpty.style.display       = "";
    photoDeleteBtn.style.display   = "none";
  }
  photoUploadBtn.style.display = "none";
  photoInput.value             = "";
  statusPhoto.style.display    = "none";
}

// Quando o usuário seleciona um arquivo — mostra preview local e botão de envio
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.src               = e.target.result;
    photoPreviewWrap.style.display = "";
    photoFilename.textContent      = `Arquivo selecionado: ${file.name}`;
    photoEmpty.style.display       = "none";
    photoUploadBtn.style.display   = "";
  };
  reader.readAsDataURL(file);
});

// Enviar foto ao servidor
photoUploadBtn.addEventListener("click", async () => {
  const file = photoInput.files[0];
  if (!file) { showPhotoStatus("Selecione um arquivo primeiro.", "err"); return; }

  const code = document.getElementById("code").value.trim();
  if (!code) { showPhotoStatus("Preencha o Código da base antes de enviar a foto.", "err"); return; }

  setLoading(photoUploadBtn, true, "⬆ Enviando…");
  try {
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch(`${API_BASE}/api/photo/${encodeURIComponent(code)}?pass=${encodeURIComponent(ADMIN_PASS)}`, {
      method: "POST", body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || res.status);
    // Reload com a URL definitiva do servidor
    setPhotoPanel(`${API_BASE}${json.url}`, json.filename);
    showPhotoStatus(`✔ Foto enviada: ${json.filename}`, "ok");
  } catch (err) {
    showPhotoStatus("Erro ao enviar: " + err.message, "err");
  } finally {
    setLoading(photoUploadBtn, false);
  }
});

// Remover foto do servidor
photoDeleteBtn.addEventListener("click", async () => {
  if (!currentPhotoFilename) return;
  if (!confirm(`Remover a foto "${currentPhotoFilename}"?`)) return;
  setLoading(photoDeleteBtn, true, "🗑 Removendo…");
  try {
    const res = await fetch(`${API_BASE}/api/photo/${encodeURIComponent(currentPhotoFilename)}?pass=${encodeURIComponent(ADMIN_PASS)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || res.status);
    setPhotoPanel(null, null);
    showPhotoStatus("Foto removida com sucesso.", "ok");
  } catch (err) {
    showPhotoStatus("Erro ao remover: " + err.message, "err");
  } finally {
    setLoading(photoDeleteBtn, false);
  }
});

// Busca a foto de uma base pelo código (verifica lista de fotos do servidor)
let serverPhotos = []; // cache para evitar múltiplas requisições

async function loadPhotosCache() {
  try {
    const res = await fetch(`${API_BASE}/api/photos`);
    if (res.ok) serverPhotos = await res.json();
  } catch { serverPhotos = []; }
}

function loadPhotoForCode(code) {
  if (!code) { setPhotoPanel(null, null); return; }
  // Procura no cache por arquivos que começam com o código (CA01.jpg, CA01.png, etc.)
  const match = serverPhotos.find(f =>
    f.filename.split(".")[0].toLowerCase() === code.toLowerCase()
  );
  if (match) setPhotoPanel(`${API_BASE}${match.url}`, match.filename);
  else        setPhotoPanel(null, null);
}

// ── Recarregar ────────────────────────────────────────────────────────────────
async function loadCards() {
  setLoading(reloadBtn, true, "↺ Carregando…");
  setStatus("status-bases", "Carregando bases da API…");
  try {
    // Carrega fotos e cards em paralelo
    const [res] = await Promise.all([
      fetch(`${API_BASE}/api/getCards`),
      loadPhotosCache(),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Resposta inesperada da API.");
    bases = data.map(cleanBase);
    selectedIndex = bases.length ? 0 : -1;
    renderList();
    const first = selectedIndex >= 0 ? bases[0] : defaultBase();
    fillForm(first);
    loadPhotoForCode(first.code);
    formHeading.textContent = selectedIndex >= 0 ? `Editando — ${bases[0].code}` : "Nova base";
    setStatus("status-bases", `✔ ${bases.length} base(s) carregada(s).`, "ok");
  } catch (err) {
    bases = []; selectedIndex = -1; renderList(); fillForm(defaultBase());
    setStatus("status-bases", "Falha ao carregar: " + err.message, "err");
  } finally {
    setLoading(reloadBtn, false);
  }
}

reloadBtn.addEventListener("click", loadCards);

searchInput.addEventListener("input", () => { searchQuery = searchInput.value; renderList(); });

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveBtn.click(); }
});

// =============================================================================
// ══ ABA: MONITORAMENTO ════════════════════════════════════════════════════════
// =============================================================================
let autoRefreshTimer = null;
const tbody            = document.getElementById("monitor-tbody");
const refreshMonitorBtn= document.getElementById("refreshMonitorBtn");
const autoToggle       = document.getElementById("autoRefreshToggle");

function statusDot(sit) {
  if (sit === "SIM") return `<span class="dot on"></span>Ativa`;
  if (sit === "NÃO") return `<span class="dot off"></span>Inativa`;
  return `<span class="dot unk"></span>${escHtml(sit || "—")}`;
}

function boolDot(v) {
  if (v === true  || v === "true"  || v === 1) return `<span class="dot on"></span>Sim`;
  if (v === false || v === "false" || v === 0) return `<span class="dot off"></span>Não`;
  return `<span class="dot unk"></span>—`;
}

async function loadMonitor() {
  setStatus("status-monitor", "Carregando dados do banco…");
  setLoading(refreshMonitorBtn, true, "↺ …");
  try {
    // Fetch bases vivas + cards para cruzar código/título
    const [resStatus, resCards] = await Promise.all([
      fetch(`${API_BASE}/api/bases`),
      fetch(`${API_BASE}/api/getCards`),
    ]);
    const rows  = resStatus.ok ? await resStatus.json() : [];
    const cards = resCards.ok  ? await resCards.json()  : [];

    const macToCard = {};
    cards.forEach(c => { if (c.mac) macToCard[c.mac] = c; });

    // Summary
    const on  = rows.filter(r => r.situacao === "SIM").length;
    const off = rows.filter(r => r.situacao === "NÃO").length;
    const unk = rows.length - on - off;
    document.getElementById("m-total").textContent = rows.length;
    document.getElementById("m-on").textContent    = on;
    document.getElementById("m-off").textContent   = off;
    document.getElementById("m-unk").textContent   = unk;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Nenhum registro no banco.</td></tr>`;
      setStatus("status-monitor", "Banco não retornou registros.", "err");
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const card = macToCard[r.maquina];
      const label = card
        ? `<strong>${escHtml(card.code)}</strong> — ${escHtml(card.title)}`
        : `<span style="color:var(--yellow)">${escHtml(r.nome_base || "—")}</span>
           <span style="font-size:10px;color:var(--muted);margin-left:6px">⚠ não cadastrada</span>`;
      const upd  = r.ultima_atualizacao
        ? new Date(r.ultima_atualizacao).toLocaleString("pt-BR")
        : "—";
      return `<tr>
        <td>${label}</td>
        <td style="font-size:11px;color:var(--muted)">${escHtml(r.maquina || "—")}</td>
        <td>${statusDot(r.situacao)}</td>
        <td>${boolDot(r.internet)}</td>
        <td>${boolDot(r.online)}</td>
        <td style="color:var(--muted);font-size:11px">${escHtml(r.situacao2 || "—")}</td>
        <td style="color:var(--muted);font-size:11px;white-space:nowrap">${upd}</td>
      </tr>`;
    }).join("");

    setStatus("status-monitor",
      `✔ ${rows.length} registros · ${on} ativa(s) · ${off} inativa(s) — ${new Date().toLocaleTimeString("pt-BR")}`,
      "ok"
    );
  } catch (err) {
    tbody.innerHTML = "";
    setStatus("status-monitor", "Erro: " + err.message, "err");
  } finally {
    setLoading(refreshMonitorBtn, false);
  }
}

refreshMonitorBtn.addEventListener("click", loadMonitor);

autoToggle.addEventListener("change", () => {
  clearInterval(autoRefreshTimer);
  if (autoToggle.checked) {
    loadMonitor();
    autoRefreshTimer = setInterval(loadMonitor, 30_000);
  }
});

// Carrega monitoramento quando a aba for clicada
document.querySelector('[data-tab="monitor"]').addEventListener("click", loadMonitor);

// =============================================================================
// ══ ABA: CONFIGURAÇÕES ════════════════════════════════════════════════════════
// =============================================================================
const saveConfigBtn   = document.getElementById("saveConfigBtn");
const reloadConfigBtn = document.getElementById("reloadConfigBtn");

const CFG_FIELDS = {
  "cfg-empresa-nome":      ["empresa", "nome"],
  "cfg-empresa-subtitulo": ["empresa", "subtitulo"],
  "cfg-empresa-logo":      ["empresa", "logo"],
  "cfg-empresa-cnpj":      ["empresa", "cnpj"],
  "cfg-empresa-site":      ["empresa", "site"],
  "cfg-rede-sigla":        ["rede",    "sigla"],
  "cfg-rede-titulo":       ["rede",    "titulo"],
  "cfg-resp-nome":         ["responsavel", "nome"],
  "cfg-resp-habilitacao":  ["responsavel", "habilitacao"],
  "cfg-resp-crea":         ["responsavel", "crea"],
  "cfg-resp-local":        ["responsavel", "local"],
  "cfg-dev-nome":          ["dev",  "nome"],
  "cfg-api-url":           ["api",  "url"],
  "cfg-mapa-lat":          ["mapa", "lat"],
  "cfg-mapa-lng":          ["mapa", "lng"],
  "cfg-mapa-zoom":         ["mapa", "zoom"],
  "cfg-pdf-zoom":          ["pdf",  "mapaZoom"],
  "cfg-pdf-timeout":       ["pdf",  "timeout"],
};

const NUMERIC = new Set(["cfg-mapa-lat","cfg-mapa-lng","cfg-mapa-zoom","cfg-pdf-zoom","cfg-pdf-timeout"]);

function fillConfig(cfg) {
  for (const [id, [group, key]] of Object.entries(CFG_FIELDS)) {
    const el = document.getElementById(id);
    if (el) el.value = cfg?.[group]?.[key] ?? "";
  }
}

function readConfig() {
  const cfg = {};
  for (const [id, [group, key]] of Object.entries(CFG_FIELDS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (!cfg[group]) cfg[group] = {};
    cfg[group][key] = NUMERIC.has(id) ? Number(el.value) || 0 : el.value.trim();
  }
  return cfg;
}

async function loadConfig() {
  setStatus("status-config", "Carregando configurações…");
  try {
    const res = await fetch(`${API_BASE}/api/siteconfig`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();
    fillConfig(cfg);
    setStatus("status-config", "✔ Configurações carregadas.", "ok");
  } catch (err) {
    setStatus("status-config", "Erro ao carregar: " + err.message, "err");
  }
}

saveConfigBtn.addEventListener("click", async () => {
  const cfg = readConfig();
  setLoading(saveConfigBtn, true, "💾 Salvando…");
  try {
    const res = await fetch(`${API_BASE}/api/siteconfig?pass=${encodeURIComponent(ADMIN_PASS)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
    });
    if (res.ok) setStatus("status-config", "✔ Configurações salvas com sucesso.", "ok");
    else        setStatus("status-config", `Erro: ${await res.text().catch(() => res.status)}`, "err");
  } catch (err) {
    setStatus("status-config", "Falha de conexão: " + err.message, "err");
  } finally {
    setLoading(saveConfigBtn, false);
  }
});

reloadConfigBtn.addEventListener("click", loadConfig);

// Carrega configurações quando a aba for clicada
document.querySelector('[data-tab="config"]').addEventListener("click", loadConfig);

// =============================================================================
// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
// =============================================================================
loadCards();
loadConfig();
