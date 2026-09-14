(() => {
  "use strict";

  const SAVE_KEY = "orbit-foundry-save-v1";
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const TICK_MS = 100;

  const defaultState = () => ({
    energy: 0,
    totalEarned: 0,
    tapPower: 1,
    tapUpgradeLevel: 0,
    generatorCount: 0,
    generatorUpgradeLevel: 0,
    lastSavedAt: Date.now(),
    version: 1
  });

  let state = defaultState();
  let lastTick = performance.now();
  let lastRenderedSecond = -1;

  const el = {
    energyValue: document.getElementById("energyValue"),
    perSecondValue: document.getElementById("perSecondValue"),
    coreLevelValue: document.getElementById("coreLevelValue"),
    reactorButton: document.getElementById("reactorButton"),
    tapValue: document.getElementById("tapValue"),
    floatingLayer: document.getElementById("floatingLayer"),
    generatorCount: document.getElementById("generatorCount"),
    generatorPower: document.getElementById("generatorPower"),
    generatorCost: document.getElementById("generatorCost"),
    buyGenerator: document.getElementById("buyGenerator"),
    tapUpgradePower: document.getElementById("tapUpgradePower"),
    tapUpgradeCost: document.getElementById("tapUpgradeCost"),
    buyTapUpgrade: document.getElementById("buyTapUpgrade"),
    generatorMultiplier: document.getElementById("generatorMultiplier"),
    generatorUpgradeCost: document.getElementById("generatorUpgradeCost"),
    buyGeneratorUpgrade: document.getElementById("buyGeneratorUpgrade"),
    saveButton: document.getElementById("saveButton"),
    statusText: document.getElementById("statusText"),
    offlineModal: document.getElementById("offlineModal"),
    offlineText: document.getElementById("offlineText"),
    offlineClose: document.getElementById("offlineClose")
  };

  function finiteOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function sanitizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    return {
      energy: Math.max(0, finiteOr(raw.energy, base.energy)),
      totalEarned: Math.max(0, finiteOr(raw.totalEarned, base.totalEarned)),
      tapPower: Math.max(1, finiteOr(raw.tapPower, base.tapPower)),
      tapUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.tapUpgradeLevel, base.tapUpgradeLevel))),
      generatorCount: Math.max(0, Math.floor(finiteOr(raw.generatorCount, base.generatorCount))),
      generatorUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.generatorUpgradeLevel, base.generatorUpgradeLevel))),
      lastSavedAt: Math.max(0, finiteOr(raw.lastSavedAt, Date.now())),
      version: 1
    };
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    if (value < 1000) {
      if (value < 10 && value % 1 !== 0) return value.toFixed(1);
      return Math.floor(value).toLocaleString("ko-KR");
    }

    const units = [
      [1e15, "Qa"],
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"]
    ];

    for (const [size, suffix] of units) {
      if (value >= size) {
        const scaled = value / size;
        return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${suffix}`;
      }
    }
    return Math.floor(value).toLocaleString("ko-KR");
  }

  function generatorCost() {
    return Math.floor(25 * Math.pow(1.16, state.generatorCount));
  }

  function tapUpgradeCost() {
    return Math.floor(15 * Math.pow(1.72, state.tapUpgradeLevel));
  }

  function generatorUpgradeCost() {
    return Math.floor(100 * Math.pow(2.35, state.generatorUpgradeLevel));
  }

  function generatorMultiplier() {
    return Math.pow(1.8, state.generatorUpgradeLevel);
  }

  function energyPerSecond() {
    return state.generatorCount * generatorMultiplier();
  }

  function coreLevel() {
    if (state.totalEarned <= 0) return 1;
    return Math.max(1, Math.floor(Math.log10(state.totalEarned + 1) * 3) + 1);
  }

  function addEnergy(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.energy += amount;
    state.totalEarned += amount;
  }

  function spendEnergy(amount) {
    if (state.energy + 1e-9 < amount) return false;
    state.energy -= amount;
    if (state.energy < 0) state.energy = 0;
    return true;
  }

  function render(force = false) {
    const second = Math.floor(performance.now() / 250);
    if (!force && second === lastRenderedSecond) return;
    lastRenderedSecond = second;

    const eps = energyPerSecond();
    const genCost = generatorCost();
    const tapCost = tapUpgradeCost();
    const autoCost = generatorUpgradeCost();
    const multiplier = generatorMultiplier();

    el.energyValue.textContent = formatNumber(state.energy);
    el.perSecondValue.textContent = `+${formatNumber(eps)} / sec`;
    el.coreLevelValue.textContent = formatNumber(coreLevel());
    el.tapValue.textContent = `탭당 +${formatNumber(state.tapPower)}`;

    el.generatorCount.textContent = `${state.generatorCount} units`;
    el.generatorPower.textContent = `+${formatNumber(multiplier)}/s`;
    el.generatorCost.textContent = formatNumber(genCost);
    el.buyGenerator.disabled = state.energy < genCost;

    el.tapUpgradePower.textContent = `+${formatNumber(Math.max(1, Math.floor(state.tapPower * 0.75)))} tap`;
    el.tapUpgradeCost.textContent = formatNumber(tapCost);
    el.buyTapUpgrade.disabled = state.energy < tapCost;

    el.generatorMultiplier.textContent = `x${multiplier.toFixed(multiplier < 10 ? 2 : 1)}`;
    el.generatorUpgradeCost.textContent = formatNumber(autoCost);
    el.buyGeneratorUpgrade.disabled = state.energy < autoCost;
  }

  function showFloatingNumber(clientX, clientY, amount) {
    const rect = el.floatingLayer.getBoundingClientRect();
    const x = Number.isFinite(clientX) ? clientX - rect.left : rect.width / 2;
    const y = Number.isFinite(clientY) ? clientY - rect.top : rect.height / 2;

    const item = document.createElement("span");
    item.className = "float-number";
    item.textContent = `+${formatNumber(amount)}`;
    item.style.left = `${Math.max(26, Math.min(rect.width - 26, x))}px`;
    item.style.top = `${Math.max(44, Math.min(rect.height - 30, y))}px`;
    el.floatingLayer.appendChild(item);
    item.addEventListener("animationend", () => item.remove(), { once: true });
    window.setTimeout(() => item.remove(), 900);
  }

  function tapReactor(event) {
    addEnergy(state.tapPower);
    showFloatingNumber(event.clientX, event.clientY, state.tapPower);
    render(true);
  }

  function buyGenerator() {
    const cost = generatorCost();
    if (!spendEnergy(cost)) return;
    state.generatorCount += 1;
    setStatus("궤도 발전기 배치 완료");
    render(true);
  }

  function buyTapUpgrade() {
    const cost = tapUpgradeCost();
    if (!spendEnergy(cost)) return;
    state.tapUpgradeLevel += 1;
    state.tapPower += Math.max(1, Math.floor(state.tapPower * 0.75));
    setStatus("자기장 압축 업그레이드 완료");
    render(true);
  }

  function buyGeneratorUpgrade() {
    const cost = generatorUpgradeCost();
    if (!spendEnergy(cost)) return;
    state.generatorUpgradeLevel += 1;
    setStatus("자동화 프로토콜 갱신 완료");
    render(true);
  }

  let statusTimer = 0;
  function setStatus(message) {
    el.statusText.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      el.statusText.textContent = "시스템 정상";
    }, 1800);
  }

  function saveGame(showFeedback = false) {
    state.lastSavedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (showFeedback) setStatus("저장 완료");
    } catch (error) {
      console.error("Save failed", error);
      setStatus("저장 실패");
    }
  }

  function loadGame() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Save data could not be read", error);
    }

    state = sanitizeState(parsed);

    const now = Date.now();
    const elapsed = Math.max(0, Math.min(MAX_OFFLINE_SECONDS, (now - state.lastSavedAt) / 1000));
    const eps = energyPerSecond();
    const offlineGain = elapsed >= 10 ? eps * elapsed : 0;

    if (offlineGain > 0) {
      addEnergy(offlineGain);
      el.offlineText.textContent = `${formatDuration(elapsed)} 동안 ${formatNumber(offlineGain)} 에너지를 생산했습니다.`;
      el.offlineModal.classList.remove("hidden");
    }

    state.lastSavedAt = now;
    saveGame(false);
  }

  function formatDuration(seconds) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    if (minutes > 0) return `${minutes}분`;
    return `${Math.floor(seconds)}초`;
  }

  function tick(now) {
    const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;

    const passive = energyPerSecond() * dt;
    if (passive > 0) addEnergy(passive);

    render(false);
    requestAnimationFrame(tick);
  }

  el.reactorButton.addEventListener("click", tapReactor);
  el.reactorButton.addEventListener("pointerdown", () => el.reactorButton.classList.add("pressed"));
  window.addEventListener("pointerup", () => el.reactorButton.classList.remove("pressed"));
  window.addEventListener("pointercancel", () => el.reactorButton.classList.remove("pressed"));

  el.buyGenerator.addEventListener("click", buyGenerator);
  el.buyTapUpgrade.addEventListener("click", buyTapUpgrade);
  el.buyGeneratorUpgrade.addEventListener("click", buyGeneratorUpgrade);
  el.saveButton.addEventListener("click", () => saveGame(true));
  el.offlineClose.addEventListener("click", () => el.offlineModal.classList.add("hidden"));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
    else lastTick = performance.now();
  });

  window.addEventListener("pagehide", () => saveGame(false));
  window.setInterval(() => saveGame(false), 5000);

  loadGame();
  render(true);
  requestAnimationFrame((now) => {
    lastTick = now;
    requestAnimationFrame(tick);
  });
})();
