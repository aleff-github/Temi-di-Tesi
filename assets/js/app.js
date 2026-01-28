const state = {
  lang: "it",
  i18n: {},
  projects: [],
  filtered: [],
  selected: null
};

const $ = (id) => document.getElementById(id);

function dots(difficulty){
  const parts = [];
  for (let i = 1; i <= 5; i++) {
    parts.push(`<span class="dot ${i <= difficulty ? "dot--on" : "dot--off"}" aria-hidden="true"></span>`);
  }
  return `<span class="dots" aria-label="${difficulty}/5">${parts.join("")}</span><span class="dots__text">${difficulty}/5</span>`;
}


function normalize(s){
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function setLang(lang){
  state.lang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;

  const t = state.i18n;

  $("t_siteTitle").textContent = t.siteTitle;
  $("t_siteSubtitle").textContent = t.siteSubtitle;
  $("t_sourceLink").textContent = t.sourceLink;
  $("q").placeholder = t.searchPlaceholder;
  $("clear").textContent = t.reset;
  $("t_back").textContent = t.back;
  $("copyLink").textContent = t.copyLink;
  $("t_goal").textContent = t.goal;
  $("t_tools").textContent = t.tools;
  $("t_about").textContent = t.about;
  $("t_footer").textContent = t.footer;
  $("t_onlyAvailable").textContent = t.onlyAvailable;

  $("langToggle").textContent = (lang === "it") ? "EN" : "IT";

  renderFilters();
  applyFilters();
  renderRoute();
}

function renderFilters(){
  // sections dropdown
  const sectionSel = $("section");
  const current = sectionSel.value || "all";
  const sections = Array.from(new Set(state.projects.map(p => p.section[state.lang]))).sort();

  sectionSel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = state.i18n.allSections;
  sectionSel.appendChild(optAll);

  for(const s of sections){
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sectionSel.appendChild(opt);
  }
  sectionSel.value = sections.includes(current) ? current : "all";

  // difficulty dropdown labels
  const diffSel = $("difficulty");
  const diffCurrent = diffSel.value || "all";
  diffSel.querySelectorAll("option")[0].textContent = state.i18n.allDifficulties;
  diffSel.value = diffCurrent;
}

function applyFilters(){
  const q = normalize($("q").value.trim());
  const section = $("section").value;
  const difficulty = $("difficulty").value;
  const onlyAvailable = $("onlyAvailable").checked;

  state.filtered = state.projects.filter(p => {
    const hay = normalize([
      p.title[state.lang],
      p.goal[state.lang],
      p.about[state.lang],
      (p.tools[state.lang] || []).join(" "),
      p.section[state.lang]
    ].join(" "));

    const matchQ = !q || hay.includes(q);
    const matchSection = (section === "all") || (p.section[state.lang] === section);
    const matchDiff = (difficulty === "all") || (String(p.difficulty) === difficulty);
    const matchAvailable = !onlyAvailable || (p.taken !== true);
  
    return matchQ && matchSection && matchDiff && matchAvailable;

  });

  renderList();
}

function renderList(){
  const root = $("listView");
  root.innerHTML = "";

  for(const p of state.filtered){
    const card = document.createElement("article");
    card.className = "card";
    if (p.taken === true) {
      const badge = document.createElement("span");
      badge.className = "card__badge";
      badge.textContent = state.i18n.statusTaken;
      card.appendChild(badge);
    }

    card.tabIndex = 0;

    const h = document.createElement("h3");
    h.className = "card__title";
    h.textContent = p.title[state.lang];

    const d = document.createElement("p");
    d.className = "card__desc";
    d.innerHTML = p.goal[state.lang].length > 200 ? p.goal[state.lang].slice(0, 200) + "..." : p.goal[state.lang];

    const meta = document.createElement("div");
    meta.className = "card__meta";

    const chipSec = document.createElement("span");
    chipSec.className = "chip";
    chipSec.textContent = `${state.i18n.sectionLabel}: ${p.section[state.lang]}`;

    const chipDiff = document.createElement("span");
    chipDiff.className = "chip";
    chipDiff.innerHTML = `${state.i18n.difficultyLabel}: ${dots(p.difficulty)}`;

    meta.appendChild(chipSec);
    meta.appendChild(chipDiff);

    card.appendChild(h);
    card.appendChild(d);
    card.appendChild(meta);

    const go = () => { location.hash = `#${p.slug}`; };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => { if(e.key === "Enter") go(); });

    root.appendChild(card);
  }
}

function renderDetail(p){
  $("d_title").textContent = p.title[state.lang];
  $("d_section").textContent = `${state.i18n.sectionLabel}: ${p.section[state.lang]}`;
  $("d_difficulty").innerHTML = `${state.i18n.difficultyLabel}: ${dots(p.difficulty)}`;

  $("d_goal").innerHTML = p.goal[state.lang];
  $("d_about").innerHTML = p.about[state.lang].replace(/\n/g, "<br>");


  const ul = $("d_tools");
  ul.innerHTML = "";
  for(const item of (p.tools[state.lang] || [])){
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }

  $("listView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
}

function showList(){
  $("detailView").classList.add("hidden");
  $("listView").classList.remove("hidden");
}

function renderRoute(){
  const slug = (location.hash || "").replace("#", "").trim();
  if(!slug){ showList(); return; }

  const p = state.projects.find(x => x.slug === slug);
  if(!p){ showList(); return; }

  renderDetail(p);
}

async function init(){
  const saved = localStorage.getItem("lang");
  state.lang = saved === "en" ? "en" : "it";

  state.i18n = await loadJSON(`assets/i18n/${state.lang}.json`);
  state.projects = await loadJSON("assets/data/projects.json");

  $("langToggle").addEventListener("click", async () => {
    const next = (state.lang === "it") ? "en" : "it";
    state.i18n = await loadJSON(`assets/i18n/${next}.json`);
    setLang(next);
  });

  $("q").addEventListener("input", applyFilters);
  $("section").addEventListener("change", applyFilters);
  $("difficulty").addEventListener("change", applyFilters);
  $("onlyAvailable").addEventListener("change", applyFilters);

  $("clear").addEventListener("click", () => {
    $("q").value = "";
    $("section").value = "all";
    $("difficulty").value = "all";
    applyFilters();
  });

  $("backLink").addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState("", document.title, window.location.pathname + window.location.search);
    renderRoute();
  });

  $("copyLink").addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(location.href);
      $("copyLink").textContent = "✓";
      setTimeout(() => $("copyLink").textContent = state.i18n.copyLink, 700);
    }catch{
      // fallback: do nothing
    }
  });

  window.addEventListener("hashchange", renderRoute);

  // first paint
  renderFilters();
  applyFilters();
  setLang(state.lang);
  renderRoute();
}

init().catch(err => {
  console.error(err);
  document.body.innerHTML = "<div style='padding:20px;font-family:system-ui'>Errore nel caricamento dei dati. Controlla console e percorsi file.</div>";
});

