const state = {
  lang: "it",
  i18n: {},
  projects: [],
  filtered: []
};

const $ = (id) => document.getElementById(id);

function dots(difficulty){
  const parts = [];
  for(let i = 1; i <= 5; i++){
    parts.push(`<span class="dot ${i <= difficulty ? "dot--on" : "dot--off"}" aria-hidden="true"></span>`);
  }
  return `<span class="dots" aria-label="${difficulty}/5">${parts.join("")}</span><span class="dots__text">${difficulty}/5</span>`;
}

function normalize(value){
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function plainText(html){
  const box = document.createElement("div");
  box.innerHTML = html || "";
  return (box.textContent || box.innerText || "").replace(/\s+/g, " ").trim();
}

function truncate(value, max = 225){
  const text = plainText(value);
  if(text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function setText(id, value){
  const node = $(id);
  if(node) node.textContent = value;
}

function setLang(lang){
  state.lang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;

  const t = state.i18n;

  setText("t_siteTitle", t.siteTitle);
  setText("t_siteSubtitle", t.siteSubtitle);
  setText("t_sourceLink", t.sourceLink);
  setText("t_heroEyebrow", t.heroEyebrow);
  setText("t_heroTitle", t.heroTitle);
  setText("t_projectsStat", t.projectsStat);
  setText("t_availableStat", t.availableStat);
  setText("t_areasStat", t.areasStat);
  setText("t_filtersLabel", t.filtersLabel);
  setText("t_onlyAvailable", t.onlyAvailable);
  setText("t_catalogEyebrow", t.catalogEyebrow);
  setText("t_catalogTitle", t.catalogTitle);
  setText("clear", t.reset);
  setText("t_back", t.back);
  setText("copyLink", t.copyLink);
  setText("t_goal", t.goal);
  setText("t_tools", t.tools);
  setText("t_about", t.about);
  setText("t_summary", t.summary);
  setText("t_sectionShort", t.sectionShort);
  setText("t_statusLabel", t.statusLabel);
  setText("t_difficultySummary", t.difficultyLabel);
  setText("t_footer", t.footer);

  $("q").placeholder = t.searchPlaceholder;
  $("langToggle").textContent = lang === "it" ? "EN" : "IT";
  document.title = t.siteTitle;

  renderStats();
  renderFilters();
  applyFilters();
  renderRoute();
}

function renderStats(){
  const sections = new Set(state.projects.map(p => p.section[state.lang]));
  const available = state.projects.filter(p => p.taken !== true).length;

  setText("s_total", state.projects.length);
  setText("s_available", available);
  setText("s_areas", sections.size);
}

function renderFilters(){
  const sectionSel = $("section");
  const previous = sectionSel.dataset.selectedSlug || sectionSel.value || "all";
  const sections = Array.from(new Set(state.projects.map(p => p.section[state.lang]))).sort((a, b) => a.localeCompare(b, state.lang));

  sectionSel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = state.i18n.allSections;
  sectionSel.appendChild(optAll);

  for(const section of sections){
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionSel.appendChild(option);
  }

  sectionSel.value = sections.includes(previous) ? previous : "all";

  const diffSel = $("difficulty");
  diffSel.querySelector('option[value="all"]').textContent = state.i18n.allDifficulties;
}

function applyFilters(){
  const q = normalize($("q").value.trim());
  const section = $("section").value;
  const difficulty = $("difficulty").value;
  const onlyAvailable = $("onlyAvailable").checked;

  state.filtered = state.projects.filter(p => {
    const haystack = normalize([
      p.title[state.lang],
      p.goal[state.lang],
      p.about[state.lang],
      ...(p.tools[state.lang] || []),
      p.section[state.lang]
    ].join(" "));

    const matchQ = !q || haystack.includes(q);
    const matchSection = section === "all" || p.section[state.lang] === section;
    const matchDifficulty = difficulty === "all" || String(p.difficulty) === difficulty;
    const matchAvailability = !onlyAvailable || p.taken !== true;

    return matchQ && matchSection && matchDifficulty && matchAvailability;
  });

  renderList();
  renderResultsSummary();
}

function renderResultsSummary(){
  $("resultsSummary").textContent = `${state.filtered.length} ${state.i18n.resultsFound}`;
}

function makeStatus(taken){
  const status = document.createElement("span");
  status.className = `status-pill${taken ? " status-pill--taken" : ""}`;
  status.textContent = taken ? state.i18n.statusTaken : state.i18n.statusAvailable;
  return status;
}

function renderList(){
  const root = $("listView");
  root.innerHTML = "";

  if(state.filtered.length === 0){
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div>
        <div class="empty-state__icon" aria-hidden="true">⌕</div>
        <h3>${state.i18n.noResultsTitle}</h3>
        <p>${state.i18n.noResultsText}</p>
      </div>
    `;
    root.appendChild(empty);
    return;
  }

  for(const p of state.filtered){
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", p.title[state.lang]);

    const top = document.createElement("div");
    top.className = "card__top";

    const section = document.createElement("p");
    section.className = "card__section";
    section.textContent = p.section[state.lang];

    top.appendChild(section);
    top.appendChild(makeStatus(p.taken === true));

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = p.title[state.lang];

    const description = document.createElement("p");
    description.className = "card__desc";
    description.textContent = truncate(p.goal[state.lang]);

    const tags = document.createElement("div");
    tags.className = "card__tags";
    for(const item of (p.tools[state.lang] || []).slice(0, 3)){
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = item;
      tag.title = item;
      tags.appendChild(tag);
    }

    const footer = document.createElement("div");
    footer.className = "card__footer";

    const difficulty = document.createElement("div");
    difficulty.className = "card__difficulty";
    difficulty.innerHTML = dots(p.difficulty);

    const cta = document.createElement("span");
    cta.className = "card__cta";
    cta.innerHTML = `${state.i18n.details} <span aria-hidden="true">→</span>`;

    footer.appendChild(difficulty);
    footer.appendChild(cta);

    card.appendChild(top);
    card.appendChild(title);
    card.appendChild(description);
    if(tags.children.length) card.appendChild(tags);
    card.appendChild(footer);

    const go = () => {
      location.hash = `#${p.slug}`;
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", e => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        go();
      }
    });

    root.appendChild(card);
  }
}

function renderDetail(p){
  const taken = p.taken === true;
  const statusText = taken ? state.i18n.statusTaken : state.i18n.statusAvailable;

  setText("d_title", p.title[state.lang]);
  setText("d_section", p.section[state.lang]);
  setText("d_status", statusText);
  setText("d_summarySection", p.section[state.lang]);
  setText("d_summaryStatus", statusText);

  $("d_status").classList.toggle("status-pill--taken", taken);
  $("d_summaryDifficulty").innerHTML = dots(p.difficulty);
  $("d_difficulty").innerHTML = `<span>${state.i18n.difficultyLabel}</span> ${dots(p.difficulty)}`;

  $("d_goal").innerHTML = p.goal[state.lang];
  $("d_about").innerHTML = p.about[state.lang].replace(/\n/g, "<br>");

  const tools = $("d_tools");
  tools.innerHTML = "";
  for(const item of (p.tools[state.lang] || [])){
    const li = document.createElement("li");
    li.textContent = item;
    tools.appendChild(li);
  }

  $("browseView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showList(){
  $("detailView").classList.add("hidden");
  $("browseView").classList.remove("hidden");
}

function renderRoute(){
  const slug = (location.hash || "").replace("#", "").trim();

  if(!slug){
    showList();
    return;
  }

  const project = state.projects.find(p => p.slug === slug);
  if(!project){
    showList();
    return;
  }

  renderDetail(project);
}

function clearRoute(){
  history.pushState("", document.title, window.location.pathname + window.location.search);
  renderRoute();
}

async function init(){
  const saved = localStorage.getItem("lang");
  state.lang = saved === "en" ? "en" : "it";

  state.i18n = await loadJSON(`assets/i18n/${state.lang}.json`);
  state.projects = await loadJSON("assets/data/projects.json");

  $("langToggle").addEventListener("click", async () => {
    const next = state.lang === "it" ? "en" : "it";
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
    $("onlyAvailable").checked = false;
    applyFilters();
    $("q").focus();
  });

  $("backLink").addEventListener("click", event => {
    event.preventDefault();
    clearRoute();
  });

  $("homeLink").addEventListener("click", event => {
    event.preventDefault();
    clearRoute();
  });

  $("copyLink").addEventListener("click", async () => {
    const button = $("copyLink");
    try{
      await navigator.clipboard.writeText(location.href);
      button.textContent = "✓";
      setTimeout(() => {
        button.textContent = state.i18n.copyLink;
      }, 800);
    }catch{
      button.textContent = state.i18n.copyLink;
    }
  });

  window.addEventListener("hashchange", renderRoute);

  setLang(state.lang);
}

init().catch(err => {
  console.error(err);
  document.body.innerHTML = "<div style='padding:28px;font-family:system-ui;color:#191a1e'>Errore nel caricamento dei dati. Controlla console e percorsi file.</div>";
});
