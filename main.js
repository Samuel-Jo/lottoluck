// ---------- 테마 전환 ----------
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

function setTheme(theme) {
  body.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

const savedTheme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
setTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const currentTheme = body.getAttribute("data-theme");
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

// ---------- 유틸 ----------
function parseNumberList(input) {
  const matches = (input.match(/\d+/g) || []).map(Number);
  const set = new Set();
  for (const n of matches) if (n >= 1 && n <= 45) set.add(n);
  return Array.from(set);
}

function formatSet(nums) {
  return nums.map(n => String(n).padStart(2, "0")).join(", ");
}

function has3Consecutive(sortedNums) {
  let streak = 1;
  for (let i = 1; i < sortedNums.length; i++) {
    if (sortedNums[i] === sortedNums[i - 1] + 1) streak++;
    else streak = 1;
    if (streak >= 3) return true;
  }
  return false;
}

function has3SameLastDigit(nums) {
  const cnt = {};
  for (const n of nums) {
    const d = n % 10;
    cnt[d] = (cnt[d] || 0) + 1;
    if (cnt[d] >= 3) return true;
  }
  return false;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOneSet(fixed, excluded, rules, maxTries = 5000) {
  const fixedSet = new Set(fixed);
  const excludedSet = new Set(excluded);

  for (const n of fixedSet) {
    if (excludedSet.has(n)) {
      throw new Error("고정수 " + n + " 이(가) 제외수에 포함되어 있어요. 제외수에서 빼주세요.");
    }
  }
  if (fixedSet.size > 6) throw new Error("고정수는 최대 6개까지 가능합니다.");

  const pool = [];
  for (let n = 1; n <= 45; n++) {
    if (!excludedSet.has(n) && !fixedSet.has(n)) pool.push(n);
  }

  const need = 6 - fixedSet.size;
  if (pool.length < need) throw new Error("제외수/고정수 조건 때문에 뽑을 수 있는 숫자가 부족해요.");

  const fixedArr = Array.from(fixedSet);

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const chosen = new Set();
    while (chosen.size < need) chosen.add(pickRandom(pool));

    const result = fixedArr.concat(Array.from(chosen)).sort((a, b) => a - b);

    if (rules.no3Consecutive && has3Consecutive(result)) continue;
    if (rules.no3SameLastDigit && has3SameLastDigit(result)) continue;

    return result;
  }
  throw new Error("조건이 조금 빡세서 추천 생성에 실패했어요. 옵션을 완화해 주세요.");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ---------- 상태 ----------
let history = [];
let current = null;
let lastMany = [];

// ---------- DOM ----------
const elFixed = document.getElementById("fixed");
const elExcluded = document.getElementById("excluded");
const elFixedView = document.getElementById("fixedView");
const elExcludedView = document.getElementById("excludedView");
const elOptConsec = document.getElementById("optConsec");
const elOptLastDigit = document.getElementById("optLastDigit");
const elCount = document.getElementById("count");

const elCurrent = document.getElementById("current");
const elHistory = document.getElementById("history");

const elErrorBox = document.getElementById("errorBox");

const btnOne = document.getElementById("btnOne");
const btnMany = document.getElementById("btnMany");
const btnCopyOne = document.getElementById("btnCopyOne");
const btnCopyMany = document.getElementById("btnCopyMany");
const btnCopyAll = document.getElementById("btnCopyAll");
const btnClear = document.getElementById("btnClear");

const manyBox = document.getElementById("manyBox");
const manyText = document.getElementById("manyText");

// ---------- 렌더 ----------
function setError(msg) {
  if (!msg) {
    elErrorBox.style.display = "none";
    elErrorBox.textContent = "";
  } else {
    elErrorBox.style.display = "block";
    elErrorBox.textContent = "⚠️ " + msg;
  }
}

function renderParsedViews() {
  const fixed = parseNumberList(elFixed.value).sort((a,b)=>a-b);
  const excluded = parseNumberList(elExcluded.value).sort((a,b)=>a-b);

  elFixedView.textContent = fixed.length ? fixed.join(", ") : "없음";
  elExcludedView.textContent = excluded.length ? excluded.join(", ") : "없음";
}

function renderHistory() {
  elHistory.innerHTML = "";

  if (history.length === 0) {
    const div = document.createElement("div");
    div.className = "item";
    div.style.opacity = "0.7";
    div.textContent = "아직 기록이 없어요.";
    elHistory.appendChild(div);
  } else {
    history.forEach((set, idx) => {
      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = "<code>" + String(idx + 1).padStart(2,"0") + ". " + formatSet(set) + "</code>";

      const rightBtn = document.createElement("button");
      rightBtn.textContent = "복사";
      rightBtn.onclick = () => copyText(formatSet(set));

      row.appendChild(left);
      row.appendChild(rightBtn);
      elHistory.appendChild(row);
    });
  }

  const hasAny = history.length > 0;
  btnCopyAll.disabled = !hasAny;
  btnClear.disabled = !hasAny;
}

function renderButtons() {
  btnCopyOne.disabled = !current;
  btnCopyMany.disabled = !(lastMany && lastMany.length);
}

function renderCurrent() {
  elCurrent.textContent = current ? formatSet(current) : "아직 없음";
}

function renderMany() {
  if (!lastMany || lastMany.length === 0) {
    manyBox.style.display = "none";
    manyText.textContent = "";
    return;
  }
  manyBox.style.display = "block";
  manyText.textContent = lastMany.map((s, i) => (i+1) + ". " + formatSet(s)).join("\n");
}

function pushHistory(sets) {
  history = sets.concat(history).slice(0, 50);
}

// ---------- 이벤트 ----------
elFixed.addEventListener("input", renderParsedViews);
elExcluded.addEventListener("input", renderParsedViews);

btnOne.addEventListener("click", () => {
  try {
    setError("");
    const fixed = parseNumberList(elFixed.value);
    const excluded = parseNumberList(elExcluded.value);
    const rules = { no3Consecutive: elOptConsec.checked, no3SameLastDigit: elOptLastDigit.checked };

    const one = generateOneSet(fixed, excluded, rules);
    current = one;
    lastMany = [];
    pushHistory([one]);

    renderCurrent();
    renderMany();
    renderHistory();
    renderButtons();
  } catch (e) {
    setError(e.message || "알 수 없는 오류");
  }
});

btnMany.addEventListener("click", () => {
  try {
    setError("");
    const fixed = parseNumberList(elFixed.value);
    const excluded = parseNumberList(elExcluded.value);
    const rules = { no3Consecutive: elOptConsec.checked, no3SameLastDigit: elOptLastDigit.checked };

    let n = Number(elCount.value);
    if (!Number.isFinite(n)) n = 5;
    n = Math.max(1, Math.min(20, n));

    const sets = [];
    for (let i = 0; i < n; i++) sets.push(generateOneSet(fixed, excluded, rules));

    lastMany = sets;
    current = sets[0] || null;
    pushHistory(sets);

    renderCurrent();
    renderMany();
    renderHistory();
    renderButtons();
  } catch (e) {
    setError(e.message || "알 수 없는 오류");
  }
});

btnCopyOne.addEventListener("click", () => {
  if (current) copyText(formatSet(current));
});

btnCopyMany.addEventListener("click", () => {
  if (lastMany && lastMany.length) {
    const text = lastMany.map((s,i)=> (i+1)+". "+formatSet(s)).join("\n");
    copyText(text);
  }
});

btnCopyAll.addEventListener("click", () => {
  if (history.length) {
    const text = history.map((s,i)=> (i+1)+". "+formatSet(s)).join("\n");
    copyText(text);
  }
});

btnClear.addEventListener("click", () => {
  history = [];
  current = null;
  lastMany = [];
  setError("");

  renderCurrent();
  renderMany();
  renderHistory();
  renderButtons();
});

// 최초 렌더
renderParsedViews();
renderCurrent();
renderMany();
renderHistory();
renderButtons();
