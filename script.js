/* --- AUDIO ENGINE --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === "click") {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "tada") {
    // Major Chord Arpeggio
    const notes = [523.25, 659.25, 783.99]; // C Major
    notes.forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0, now + 0.5 + i * 0.1);
      o.start(now);
      o.stop(now + 0.8);
    });
  } else if (type === "boom") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === "whoosh") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.2);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === "tick") {
    // Realistic wheel tick - double click with snap
    const freq1 = 400 + Math.random() * 100; // Vary frequency
    const freq2 = 300 + Math.random() * 80;

    // First tick
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq1, now);
    osc.frequency.exponentialRampToValueAtTime(freq1 * 0.7, now + 0.015);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.025);
    osc.start(now);
    osc.stop(now + 0.025);

    // Second tick (ratchet sound)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq2, now + 0.012);
    osc2.frequency.exponentialRampToValueAtTime(freq2 * 0.6, now + 0.025);
    gain2.gain.setValueAtTime(0.2, now + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
    osc2.start(now + 0.012);
    osc2.stop(now + 0.035);
  } else if (type === "wrong") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

/* --- GLOBAL STATE --- */
let isLightMode = false;
let teamCount = 2;
let teams = [];
let diceCount = 1;

/* --- INIT --- */
window.onload = () => {
  if (localStorage.getItem("luckCenter_lightMode") === "true") {
    isLightMode = true;
    document.body.classList.add("light-mode");
    const sun = document.getElementById("sunIcon");
    const moon = document.getElementById("moonIcon");
    if (sun) sun.classList.remove("hidden");
    if (moon) moon.classList.add("hidden");
  }

  // Initialize current page tools
  renderTeamInputs(2);
  renderDice();
  initBombGame();
  setupBingo();
  setupStraws(4);
  loadWheelNames();
  drawWheel();

  if (window.lucide) lucide.createIcons();

  // Highlight active nav item based on URL
  highlightActiveNav();
};

/* --- NAVIGATION --- */
function highlightActiveNav() {
  const path = window.location.pathname;
  const page = path.split("/").pop() || "index.html";

  const map = {
    "index.html": "team",
    "team-generetor.html": "team", // Fallback for existing links
    "wheel.html": "wheel",
    "bomb.html": "bomb",
    "dice.html": "dice",
    "coin.html": "coin",
    "bracket.html": "bracket",
    "straws.html": "straws",
    "bingo.html": "bingo",
    "reaction.html": "reaction",
    "sounds.html": "sounds",
    "number.html": "number",
    "rps.html": "rps",
    "card.html": "card",
  };

  const activeKey = map[page] || "team";

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    // Check if this nav item corresponds to the active key
    // We can check the href of the child 'a' tag or the onclick attribute if we kept it (we will replace onclick with hrefs)
    const link = el.querySelector("a");
    if (
      link &&
      link.getAttribute("href") &&
      link.getAttribute("href").includes(activeKey)
    ) {
      el.classList.add("active");
    }
  });

  document.getElementById("moreDropdown").classList.remove("show");
}

function toggleDropdown() {
  document.getElementById("moreDropdown").classList.toggle("show");
}
window.onclick = function (e) {
  if (!e.target.closest(".dropdown-menu") && !e.target.closest(".nav-item"))
    document.getElementById("moreDropdown").classList.remove("show");
};

function toggleTheme() {
  isLightMode = !isLightMode;
  document.body.classList.toggle("light-mode", isLightMode);
  document.getElementById("sunIcon").classList.toggle("hidden", !isLightMode);
  document.getElementById("moonIcon").classList.toggle("hidden", isLightMode);
  localStorage.setItem("luckCenter_lightMode", isLightMode);
  drawWheel();
}

/* --- TEAM GENERATOR --- */
function setTeamCount(n) {
  teamCount = n;
  renderTeamInputs(n);
  updateTeamUI();
}
function renderTeamInputs(n) {
  const container = document.getElementById("teamNamesContainer");
  if (!container) return;
  container.innerHTML = Array(n)
    .fill(0)
    .map(
      (_, i) =>
        `<input class="team-name-input glass-input w-full p-2 rounded text-sm" placeholder="Takım ${
          i + 1
        }">`
    )
    .join("");
}
function updateTeamUI() {
  const input = document.getElementById("playerInput");
  if (!input) return;

  const val = input.value;
  const count = val.split("\n").filter((s) => s.trim()).length;

  const badge = document.getElementById("playerCountBadge");
  if (badge) badge.innerText = count + " Kişi";

  const btn = document.getElementById("btnGenerate");
  if (btn) {
    if (count < teamCount) {
      btn.disabled = true;
      btn.classList.add("bg-slate-800");
    } else {
      btn.disabled = false;
      btn.classList.remove("bg-slate-800");
      btn.classList.add("bg-indigo-600");
    }
  }
}
const playerInput = document.getElementById("playerInput");
if (playerInput) playerInput.addEventListener("input", updateTeamUI);

function fillSample() {
  const input = document.getElementById("playerInput");
  if (!input) return;
  input.value = "Ali\nVeli\nCan\nCem\nEfe\nEge";
  updateTeamUI();
}
function clearInput() {
  const input = document.getElementById("playerInput");
  if (!input) return;
  if (confirm("Temizle?")) {
    input.value = "";
    updateTeamUI();
  }
}

async function generateTeams() {
  playSound("whoosh");
  const input = document.getElementById("playerInput");
  if (!input) return;

  const players = input.value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s);
  const teamNames = Array.from(
    document.querySelectorAll(".team-name-input")
  ).map((inp, i) => inp.value.trim() || `Takım ${i + 1}`);
  teams = Array.from({ length: teamCount }, (_, i) => ({
    name: teamNames[i],
    members: [],
  }));

  const shuffled = players.sort(() => Math.random() - 0.5);
  // Animation logic
  const startRect = input.getBoundingClientRect();

  for (let i = 0; i < shuffled.length; i++) {
    const player = shuffled[i];
    const teamIdx = i % teamCount;
    const targetList = document.querySelectorAll(".team-list-ul")[teamIdx];

    // If we are on the page, these elements should exist.
    // Note: The logic below relies on DOM elements being present effectively.

    const card = document.createElement("div");
    card.className = "flying-card";
    card.innerHTML = `<i data-lucide="user" class="w-4 h-4"></i> ${player}`;
    document.body.appendChild(card);
    card.style.left = `${startRect.left + startRect.width / 2}px`;
    card.style.top = `${startRect.top + startRect.height / 2}px`;
    lucide.createIcons();
    await new Promise((r) => requestAnimationFrame(r));

    const emptyState = document.getElementById("emptyState");
    const resultsContainer = document.getElementById("resultsContainer");
    if (emptyState) emptyState.classList.add("hidden");
    if (resultsContainer) resultsContainer.classList.remove("hidden");

    if (i === 0) renderTeamsHTML();

    const panels = document.querySelectorAll(".glass-panel");
    // We need to find the correct panel logic.
    // In the split file, the layout is constant.
    // The first panel is the input, subsequent panels are team generators?
    // NO, in the HTML structure: input is one panel, buttons another.
    // renderTeamsHTML creates panels dynamically.
    // Let's rely on renderTeamsHTML to have created the elements.

    const targetPanel = document.querySelectorAll("#teamsList .glass-panel")[
      teamIdx
    ];

    if (targetPanel) {
      const targetRect = targetPanel.getBoundingClientRect();
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + 50;

      card.style.transform = `translate(${
        endX - parseFloat(card.style.left)
      }px, ${endY - parseFloat(card.style.top)}px) rotate(${
        Math.random() * 20 - 10
      }deg) scale(0.9)`;
      card.style.opacity = 0;
    }

    await new Promise((r) => setTimeout(r, 300));
    teams[teamIdx].members.push(player);
    renderTeamsHTML(); // Re-render with new member
    card.remove();

    await new Promise((r) => setTimeout(r, 50));
  }
}

function renderTeamsHTML() {
  const container = document.getElementById("teamsList");
  if (!container) return;
  container.innerHTML = "";
  teams.forEach((t, i) => {
    const colors = [
      "from-blue-500/20 border-blue-500/30 text-blue-300",
      "from-rose-500/20 border-rose-500/30 text-rose-300",
      "from-amber-500/20 border-amber-500/30 text-amber-300",
      "from-emerald-500/20 border-emerald-500/30 text-emerald-300",
    ];
    const style = colors[i % colors.length];

    let listItems = t.members
      .map(
        (m, idx) => `
            <li class="draggable-item flex items-center gap-2 p-2 rounded-lg bg-white/5 group" draggable="true" ondragstart="drag(event)" data-team="${i}" data-idx="${idx}">
                <span class="w-6 h-6 rounded-full bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-400">${
                  idx + 1
                }</span>
                <span class="font-medium truncate flex-1 text-sm">${m}</span>
                <button onclick="removeMember(${i},${idx})" class="text-slate-600 hover:text-red-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </li>
        `
      )
      .join("");

    container.innerHTML += `
            <div class="glass-panel rounded-2xl overflow-hidden shadow-lg border ${
              style.split(" ")[1]
            } flex flex-col h-full" ondragover="allowDrop(event)" ondrop="drop(event, ${i})">
                <div class="p-3 bg-gradient-to-r ${
                  style.split(" ")[0]
                } border-b ${
      style.split(" ")[1]
    } flex justify-between items-center">
                    <h3 class="font-bold ${style.split(" ")[2]} truncate">${
      t.name
    }</h3>
                    <span class="text-xs bg-slate-900/20 px-2 py-1 rounded">${
                      t.members.length
                    }</span>
                </div>
                <div class="p-3 bg-slate-900/10 flex-1">
                    <ul class="team-list-ul space-y-1 min-h-[50px]">${listItems}</ul>
                </div>
            </div>
        `;
  });
}

function removeMember(tIdx, mIdx) {
  teams[tIdx].members.splice(mIdx, 1);
  renderTeamsHTML();
}

/* --- DRAG DROP --- */
let draggedItem = null;
function drag(ev) {
  draggedItem = { t: ev.target.dataset.team, i: ev.target.dataset.idx };
}
function allowDrop(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add("bg-white/5");
}
function drop(ev, targetTeamIdx) {
  ev.preventDefault();
  ev.currentTarget.classList.remove("bg-white/5");
  if (!draggedItem) return;
  const player = teams[draggedItem.t].members[draggedItem.i];
  teams[draggedItem.t].members.splice(draggedItem.i, 1);
  teams[targetTeamIdx].members.push(player);
  renderTeamsHTML();
  draggedItem = null;
}

/* --- BOMB --- */
let bombIdx = -1;
function initBombGame() {
  const grid = document.getElementById("bombGrid");
  if (!grid) return;
  grid.innerHTML = "";
  bombIdx = Math.floor(Math.random() * 25);
  const status = document.getElementById("bombStatus");
  if (status) status.innerText = "Sıra kimde?";

  for (let i = 0; i < 25; i++) {
    const d = document.createElement("div");
    d.className = "bomb-cell";
    d.onclick = function () {
      if (this.classList.contains("safe") || this.classList.contains("boom"))
        return;
      if (i === bombIdx) {
        this.classList.add("boom");
        this.innerText = "💣";
        if (status) status.innerText = "BOOM!";
        playSound("boom");
        // Reveal all
        document.querySelectorAll(".bomb-cell").forEach((c, idx) => {
          if (idx !== bombIdx) c.classList.add("disabled");
        });
      } else {
        this.classList.add("safe");
        this.innerText = "💎";
        playSound("click");
      }
    };
    grid.appendChild(d);
  }
}

/* --- WHEEL --- */
let isSpinning = false;
let wheelNames = [];

// Load names from localStorage
function loadWheelNames() {
  const stored = localStorage.getItem("wheelNames");
  if (stored) {
    wheelNames = JSON.parse(stored);
    renderWheelNames();
    drawWheel();
  }
}

// Save to localStorage
function saveWheelNames() {
  localStorage.setItem("wheelNames", JSON.stringify(wheelNames));
}

// Add name
function addWheelName() {
  const input = document.getElementById("wheelNameInput");
  if (!input) return;
  const name = input.value.trim();
  if (name && !wheelNames.includes(name)) {
    wheelNames.push(name);
    input.value = "";
    renderWheelNames();
    drawWheel();
    saveWheelNames();
  }
}

// Remove name
function removeWheelName(index) {
  wheelNames.splice(index, 1);
  renderWheelNames();
  drawWheel();
  saveWheelNames();
}

// Render list
function renderWheelNames() {
  const list = document.getElementById("wheelNameList");
  const badge = document.getElementById("wheelCountBadge");
  if (!list) return;
  if (badge) badge.innerText = `${wheelNames.length} İsim`;
  if (wheelNames.length === 0) {
    list.innerHTML =
      '<p class="text-slate-500 text-sm text-center py-4">Henüz isim eklenmedi</p>';
    return;
  }
  list.innerHTML = wheelNames
    .map(
      (name, index) => `
    <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors group">
      <span class="w-7 h-7 rounded-full bg-slate-700/80 border border-slate-600/50 text-slate-300 text-xs flex items-center justify-center font-semibold flex-shrink-0">${
        index + 1
      }</span>
      <span class="flex-1 text-slate-200 font-medium truncate">${name}</span>
      <button onclick="removeWheelName(${index})" class="text-slate-500 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
      <i data-lucide="grip-vertical" class="w-4 h-4 text-slate-600 flex-shrink-0"></i>
    </div>
  `
    )
    .join("");
  if (window.lucide) lucide.createIcons();
}

// Fill sample
function fillWheelSample() {
  wheelNames = ["Pizza", "Burger", "Sushi", "Kebap", "Lahmacun", "Döner"];
  renderWheelNames();
  drawWheel();
  saveWheelNames();
}

// Clear all
function clearWheelNames() {
  if (confirm("Tüm isimleri temizle?")) {
    wheelNames = [];
    renderWheelNames();
    drawWheel();
    saveWheelNames();
  }
}

// Get items
function getWheelItems() {
  return wheelNames.filter((s) => s.trim());
}

// Enter key support
const wheelNameInput = document.getElementById("wheelNameInput");
if (wheelNameInput) {
  wheelNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addWheelName();
  });
}

function drawWheel() {
  const canvas = document.getElementById("wheelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const items = getWheelItems();
  const w = canvas.width,
    h = canvas.height,
    cx = w / 2,
    cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  const len = items.length || 1;
  const step = (2 * Math.PI) / len;
  const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  for (let i = 0; i < len; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, w / 2 - 10, i * step, (i + 1) * step);
    ctx.lineTo(cx, cy);
    ctx.fillStyle = items.length
      ? colors[i % colors.length]
      : isLightMode
      ? "#e2e8f0"
      : "#1e293b";
    ctx.fill();
    ctx.stroke();
    if (items.length) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * step + step / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Inter";
      ctx.fillText(items[i], w / 2 - 30, 5);
      ctx.restore();
    }
  }
}
function spinWheel() {
  if (isSpinning) return;
  const items = getWheelItems();
  if (!items.length) return;
  isSpinning = true;
  const canvas = document.getElementById("wheelCanvas");

  // Reset rotation to 0 before starting new spin
  canvas.style.transition = "none";
  canvas.style.transform = "rotate(0deg)";

  // Force reflow to apply the reset
  canvas.offsetHeight;

  // Now apply the spin animation
  const rot = 1440 + Math.random() * 360;
  canvas.style.transition = "transform 4s cubic-bezier(0.2,0.8,0.2,1)";
  canvas.style.transform = `rotate(${rot}deg)`;

  let ticks = 0;
  const tickInt = setInterval(() => {
    if (ticks++ < 15) playSound("tick");
    else clearInterval(tickInt);
  }, 200);

  setTimeout(() => {
    isSpinning = false;
    const deg = rot % 360;
    const seg = 360 / items.length;
    // 0 is right, arrow is top (270). Rotation is clockwise.
    const winIdx = Math.floor(((270 - deg + 360) % 360) / seg);
    document.getElementById("wheelResult").innerText = `🎉 ${items[winIdx]} 🎉`;
    playSound("tada");
  }, 4000);
}

/* --- DICE LOGIC --- */
function setDiceCount(n) {
  diceCount = n;
  renderDice();
}
function renderDice() {
  const c = document.getElementById("diceContainer");
  if (!c) return;
  c.innerHTML = "";
  for (let i = 0; i < diceCount; i++)
    c.innerHTML += `<div class="dice-scene"><div class="cube" id="die-${i}"><div class="cube__face cube__face--1 face-1"><div class="dot"></div></div><div class="cube__face cube__face--2 face-2"><div class="dot"></div><div class="dot"></div></div><div class="cube__face cube__face--3 face-3"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="cube__face cube__face--4 face-4"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="cube__face cube__face--5 face-5"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="cube__face cube__face--6 face-6"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div></div>`;
}
function rollDice() {
  playSound("whoosh");
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    const res = Math.floor(Math.random() * 6) + 1;
    total += res;
    const x = [0, 0, 0, 0, 0, -90, 90][res];
    const y = [0, 0, -90, 180, 90, 0, 0][res];
    const rx = Math.floor(Math.random() * 4) * 360;
    const ry = Math.floor(Math.random() * 4) * 360;
    document.getElementById(`die-${i}`).style.transform = `rotateX(${
      x + rx
    }deg) rotateY(${y + ry}deg)`;
  }
  setTimeout(
    () => (document.getElementById("diceTotal").innerText = "Toplam: " + total),
    1000
  );
}

/* --- COIN LOGIC --- */
function flipCoin() {
  playSound("whoosh");
  const coin = document.getElementById("theCoin");
  if (!coin) return;
  const isHeads = Math.random() < 0.5;
  const rot = 1800 + (isHeads ? 0 : 180);
  coin.style.transform = `rotateY(${rot}deg)`;
  setTimeout(() => {
    document.getElementById("coinResult").innerText = isHeads ? "YAZI" : "TURA";
    playSound("tada");
  }, 3000);
}

/* --- BRACKET LOGIC --- */
function setupBracket(n) {
  const input = document.getElementById("bracketInput");
  if (input)
    input.value = Array(n)
      .fill("")
      .map((_, i) => `Takım ${i + 1}`)
      .join("\n");
}
function generateBracket() {
  playSound("click");
  const input = document.getElementById("bracketInput");
  if (!input) return;
  const teams = input.value.split("\n").filter((s) => s.trim());
  const display = document.getElementById("bracketDisplay");
  // Simple render for bracket
  let html = '<div class="round-column">';
  for (let i = 0; i < teams.length; i += 2) {
    html += `<div class="matchup"><div class="matchup-team">${
      teams[i] || "-"
    }</div><div class="matchup-team">${teams[i + 1] || "-"}</div></div>`;
  }
  html += "</div>";
  if (teams.length > 2) {
    html += '<div class="round-column">';
    for (let i = 0; i < teams.length / 2; i += 2)
      html += `<div class="matchup"><div class="matchup-team">?</div><div class="matchup-team">?</div></div>`;
    html += "</div>";
  }
  html +=
    '<div class="round-column"><div class="matchup"><div class="matchup-team winner">🏆</div></div></div>';
  display.innerHTML = html;
}

/* --- STRAWS --- */
function setupStraws(n) {
  const c = document.getElementById("strawsContainer");
  if (!c) return;
  c.innerHTML =
    '<div class="absolute bottom-0 w-full h-12 bg-slate-700 rounded-b-xl z-20 flex items-center justify-center text-xs text-white/50">ÇEK</div>';
  const short = Math.floor(Math.random() * n);
  const res = document.getElementById("strawResult");
  if (res) res.innerText = "";

  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className =
      "w-3 bg-amber-300 rounded-t cursor-pointer transition-transform duration-500 relative z-10 hover:-translate-y-2";
    s.style.height = "150px";
    s.onclick = function () {
      if (this.classList.contains("pulled")) return;
      this.classList.add("pulled");
      this.style.transform = "translateY(-50px)";
      if (i === short) {
        this.style.height = "80px";
        this.style.backgroundColor = "#f43f5e";
        if (res) res.innerText = "KISA ÇÖP!";
        playSound("wrong");
      } else {
        playSound("whoosh");
      }
    };
    c.appendChild(s);
  }
}

/* --- BINGO --- */
let bingoNums = [];
function setupBingo() {
  const g = document.getElementById("bingoGrid");
  if (!g) return;
  g.innerHTML = "";
  for (let i = 1; i <= 90; i++) {
    const d = document.createElement("div");
    d.className =
      "aspect-square flex items-center justify-center bg-white/5 rounded text-slate-500";
    d.id = `bingo-${i}`;
    d.innerText = i;
    g.appendChild(d);
  }
}
function drawBingoNum() {
  if (bingoNums.length >= 90) return;
  let n;
  do {
    n = Math.floor(Math.random() * 90) + 1;
  } while (bingoNums.includes(n));
  bingoNums.push(n);
  const display = document.getElementById("bingoDisplay");
  if (display) display.innerText = n;

  const cell = document.getElementById(`bingo-${n}`);
  if (cell) {
    cell.classList.remove("bg-white/5", "text-slate-500");
    cell.classList.add("bg-indigo-600", "text-white", "font-bold");
  }
  playSound("tada");
}
function resetBingo() {
  bingoNums = [];
  const display = document.getElementById("bingoDisplay");
  if (display) display.innerText = "--";
  setupBingo();
}

/* --- REACTION --- */
let reactState = "wait",
  rTimer,
  rStart;
function handleReactionClick() {
  const b = document.getElementById("reactionBox");
  if (!b) return;

  if (reactState === "wait") {
    reactState = "ready";
    b.className =
      "w-full h-64 bg-amber-500 rounded-3xl flex items-center justify-center cursor-pointer font-bold text-3xl shadow-lg text-white";
    b.innerText = "Bekle...";
    rTimer = setTimeout(() => {
      reactState = "go";
      b.className =
        "w-full h-64 bg-emerald-500 rounded-3xl flex items-center justify-center cursor-pointer font-bold text-3xl shadow-lg text-white";
      b.innerText = "TIKLA!";
      rStart = Date.now();
    }, 2000 + Math.random() * 3000);
  } else if (reactState === "ready") {
    clearTimeout(rTimer);
    reactState = "wait";
    b.className =
      "w-full h-64 bg-rose-500 rounded-3xl flex items-center justify-center cursor-pointer font-bold text-3xl shadow-lg text-white";
    b.innerText = "Erken! Tekrar.";
    playSound("wrong");
  } else if (reactState === "go") {
    const t = Date.now() - rStart;
    reactState = "wait";
    b.className =
      "w-full h-64 bg-blue-500 rounded-3xl flex items-center justify-center cursor-pointer font-bold text-3xl shadow-lg text-white";
    b.innerText = `${t} ms\nTekrar`;
    playSound("tada");
  }
}

/* --- NUMBER --- */
function generateNumber() {
  const minInput = document.getElementById("numMin");
  const maxInput = document.getElementById("numMax");
  if (!minInput || !maxInput) return;

  const min = parseInt(minInput.value);
  const max = parseInt(maxInput.value);
  const disp = document.getElementById("numberDisplay");
  let c = 0;
  const i = setInterval(() => {
    disp.innerText = Math.floor(Math.random() * (max - min + 1)) + min;
    if (c++ > 15) {
      clearInterval(i);
      playSound("tada");
    }
  }, 50);
}

/* --- RPS --- */
function playRPS(u) {
  const icons = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const moves = ["rock", "paper", "scissors"];
  const c = moves[Math.floor(Math.random() * 3)];

  const userDisplay = document.getElementById("userMoveDisplay");
  const compDisplay = document.getElementById("compMoveDisplay");
  if (!userDisplay || !compDisplay) return;

  userDisplay.innerText = icons[u];
  compDisplay.innerText = icons[c];
  let res = "";
  if (u === c) res = "Berabere";
  else if (
    (u === "rock" && c === "scissors") ||
    (u === "paper" && c === "rock") ||
    (u === "scissors" && c === "paper")
  ) {
    res = "Kazandın!";
    playSound("tada");
  } else {
    res = "Kaybettin";
    playSound("wrong");
  }
  document.getElementById("rpsResult").innerText = res;
}

/* --- CARD --- */
function drawCard() {
  const f = document.getElementById("cardFront");
  if (!f) return;

  const vals = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  const suits = ["♠", "♥", "♣", "♦"];
  const v = vals[Math.floor(Math.random() * 13)];
  const s = suits[Math.floor(Math.random() * 4)];
  const col = s === "♥" || s === "♦" ? "text-rose-500" : "text-slate-900";
  document.getElementById("theCard").classList.toggle("flipped");
  setTimeout(() => {
    f.innerHTML = `<div class="absolute top-2 left-2 ${col}">${v}</div><div class="text-6xl ${col}">${s}</div><div class="absolute bottom-2 right-2 rotate-180 ${col}">${v}</div>`;
    playSound("whoosh");
  }, 200);
}
