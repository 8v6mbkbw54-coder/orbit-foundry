(() => {
  "use strict";

  const SAVE_KEY = "orbit-foundry-save-v1";
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

  const ORBITS = [
    {
      short: "LEO",
      name: "저궤도 · LEO",
      multiplier: 1,
      requirement: 5000,
      description: "지구 가까이에서 시작하는 첫 산업 궤도입니다. 빠른 건설과 짧은 물류 주기로 기반을 만듭니다."
    },
    {
      short: "MEO",
      name: "중궤도 · MEO",
      multiplier: 2,
      requirement: 100000,
      description: "더 넓은 운영 반경을 확보한 중궤도입니다. 모든 에너지 생산량이 영구적으로 두 배가 됩니다."
    },
    {
      short: "GEO",
      name: "정지궤도 · GEO",
      multiplier: 5,
      requirement: 2000000,
      description: "지구와 동기화된 대형 산업 궤도입니다. 안정적인 자동화로 생산 규모가 크게 확장됩니다."
    },
    {
      short: "LUNAR",
      name: "달 궤도 · LUNAR",
      multiplier: 12,
      requirement: null,
      description: "지구권을 벗어나 달 산업권에 진입했습니다. 현재 빌드에서 도달할 수 있는 최종 궤도입니다."
    }
  ];

  const defaultState = () => ({
    energy: 0,
    totalEarned: 0,
    orbitEarned: 0,
    orbitIndex: 0,
    tapPower: 1,
    tapUpgradeLevel: 0,
    generatorCount: 0,
    generatorUpgradeLevel: 0,
    lastSavedAt: Date.now(),
    version: 2
  });

  let state = defaultState();
  let lastTick = performance.now();
  let lastRenderedFrame = -1;
  let statusTimer = 0;

  const el = {
    energyValue: document.getElementById("energyValue"),
    perSecondValue: document.getElementById("perSecondValue"),
    orbitShortName: document.getElementById("orbitShortName"),
    orbitMultiplierTop: document.getElementById("orbitMultiplierTop"),
    reactorButton: document.getElementById("reactorButton"),
    tapValue: document.getElementById("tapValue"),
    floatingLayer: document.getElementById("floatingLayer"),
    orbitName: document.getElementById("orbitName"),
    orbitMultiplier: document.getElementById("orbitMultiplier"),
    orbitDescription: document.getElementById("orbitDescription"),
    nextOrbitName: document.getElementById("nextOrbitName"),
    transferRequirementText: document.getElementById("transferRequirementText"),
    transferProgressBar: document.getElementById("transferProgressBar"),
    transferOrbitButton: document.getElementById("transferOrbitButton"),
    transferButtonHint: document.getElementById("transferButtonHint"),
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
    offlineClose: document.getElementById("offlineClose"),
    transferModal: document.getElementById("transferModal"),
    transferModalText: document.getElementById("transferModalText"),
    transferFromOrbit: document.getElementById("transferFromOrbit"),
    transferToOrbit: document.getElementById("transferToOrbit"),
    transferBonusText: document.getElementById("transferBonusText"),
    transferCancel: document.getElementById("transferCancel"),
    transferConfirm: document.getElementById("transferConfirm"),
    routeNodes: Array.from(document.querySelectorAll(".route-node"))
  };

  function finiteOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function sanitizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    const orbitIndex = Math.max(0, Math.min(ORBITS.length - 1, Math.floor(finiteOr(raw.orbitIndex, 0))));
    const legacyTotal = Math.max(0, finiteOr(raw.totalEarned, 0));

    return {
      energy: Math.max(0, finiteOr(raw.energy, base.energy)),
      totalEarned: legacyTotal,
      orbitEarned: Math.max(0, finiteOr(raw.orbitEarned, raw.version >= 2 ? 0 : legacyTotal)),
      orbitIndex,
      tapPower: Math.max(1, finiteOr(raw.tapPower, base.tapPower)),
      tapUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.tapUpgradeLevel, base.tapUpgradeLevel))),
      generatorCount: Math.max(0, Math.floor(finiteOr(raw.generatorCount, base.generatorCount))),
      generatorUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.generatorUpgradeLevel, base.generatorUpgradeLevel))),
      lastSavedAt: Math.max(0, finiteOr(raw.lastSavedAt, Date.now())),
      version: 2
    };
  }

  function currentOrbit() {
    return ORBITS[state.orbitIndex];
  }

  function nextOrbit() {
    return ORBITS[state.orbitIndex + 1] || null;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    if (value < 1000) {
      if (value < 10 && value % 1 !== 0) return value.toFixed(1);
      return Math.floor(value).toLocaleString("ko-KR");
    }

    const units = [[1e18, "Qi"], [1e15, "Qa"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
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

  function automationMultiplier() {
    return Math.pow(1.8, state.generatorUpgradeLevel);
  }

  function orbitMultiplier() {
    return currentOrbit().multiplier;
  }

  function effectiveTapPower() {
    return state.tapPower * orbitMultiplier();
  }

  function generatorUnitPower() {
    return automationMultiplier() * orbitMultiplier();
  }

  function energyPerSecond() {
    return state.generatorCount * generatorUnitPower();
  }

  function addEnergy(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.energy += amount;
    state.totalEarned += amount;
    state.orbitEarned += amount;
  }

  function spendEnergy(amount) {
    if (state.energy + 1e-9 < amount) return false;
    state.energy -= amount;
    if (state.energy < 0) state.energy = 0;
    return true;
  }

  function canTransferOrbit() {
    const orbit = currentOrbit();
    return orbit.requirement !== null && state.orbitEarned >= orbit.requirement && state.orbitIndex < ORBITS.length - 1;
  }

  function renderOrbit() {
    const orbit = currentOrbit();
    const next = nextOrbit();
    document.body.dataset.orbit = String(state.orbitIndex);

    el.orbitShortName.textContent = orbit.short;
    el.orbitMultiplierTop.textContent = `x${orbit.multiplier.toFixed(2)} output`;
    el.orbitName.textContent = orbit.name;
    el.orbitMultiplier.textContent = `생산 x${orbit.multiplier.toFixed(2)}`;
    el.orbitDescription.textContent = orbit.description;

    el.routeNodes.forEach((node, index) => {
      node.classList.toggle("active", index === state.orbitIndex);
      node.classList.toggle("complete", index < state.orbitIndex);
    });

    if (!next || orbit.requirement === null) {
      el.nextOrbitName.textContent = "현재 공개된 최종 궤도";
      el.transferRequirementText.textContent = `${formatNumber(state.orbitEarned)} ENERGY 생산`;
      el.transferProgressBar.style.width = "100%";
      el.transferOrbitButton.disabled = true;
      el.transferButtonHint.textContent = "다음 경로 준비 중";
      return;
    }

    const progress = Math.max(0, Math.min(1, state.orbitEarned / orbit.requirement));
    el.nextOrbitName.textContent = next.name;
    el.transferRequirementText.textContent = `${formatNumber(state.orbitEarned)} / ${formatNumber(orbit.requirement)} ENERGY`;
    el.transferProgressBar.style.width = `${progress * 100}%`;
    el.transferOrbitButton.disabled = !canTransferOrbit();
    el.transferButtonHint.textContent = canTransferOrbit() ? `${next.short} 진입 가능` : `${formatNumber(Math.max(0, orbit.requirement - state.orbitEarned))} 필요`;
  }

  function render(force = false) {
    const frame = Math.floor(performance.now() / 250);
    if (!force && frame === lastRenderedFrame) return;
    lastRenderedFrame = frame;

    const eps = energyPerSecond();
    const genCost = generatorCost();
    const tapCost = tapUpgradeCost();
    const autoCost = generatorUpgradeCost();
    const autoMult = automationMultiplier();
    const nextTapIncrease = Math.max(1, Math.floor(state.tapPower * 0.75));

    el.energyValue.textContent = formatNumber(state.energy);
    el.perSecondValue.textContent = `+${formatNumber(eps)} / sec`;
    el.tapValue.textContent = `탭당 +${formatNumber(effectiveTapPower())}`;

    el.generatorCount.textContent = `${state.generatorCount} units`;
    el.generatorPower.textContent = `+${formatNumber(generatorUnitPower())}/s`;
    el.generatorCost.textContent = formatNumber(genCost);
    el.buyGenerator.disabled = state.energy < genCost;

    el.tapUpgradePower.textContent = `+${formatNumber(nextTapIncrease * orbitMultiplier())} tap`;
    el.tapUpgradeCost.textContent = formatNumber(tapCost);
    el.buyTapUpgrade.disabled = state.energy < tapCost;

    el.generatorMultiplier.textContent = `x${autoMult.toFixed(autoMult < 10 ? 2 : 1)}`;
    el.generatorUpgradeCost.textContent = formatNumber(autoCost);
    el.buyGeneratorUpgrade.disabled = state.energy < autoCost;

    renderOrbit();
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
    const gain = effectiveTapPower();
    addEnergy(gain);
    showFloatingNumber(event.clientX, event.clientY, gain);
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

  function openTransferModal() {
    if (!canTransferOrbit()) return;
    const from = currentOrbit();
    const to = nextOrbit();
    if (!to) return;

    el.transferModalText.textContent = "궤도 이전 시 현재 에너지, 발전기, 자기장 압축, 자동화 업그레이드가 초기화됩니다. 누적 생산 기록과 도달한 궤도는 유지됩니다.";
    el.transferFromOrbit.textContent = from.short;
    el.transferToOrbit.textContent = to.short;
    el.transferBonusText.textContent = `새 궤도 영구 생산 배율 x${to.multiplier.toFixed(2)}`;
    el.transferModal.classList.remove("hidden");
  }

  function closeTransferModal() {
    el.transferModal.classList.add("hidden");
  }

  function confirmTransfer() {
    if (!canTransferOrbit()) {
      closeTransferModal();
      return;
    }

    const destination = nextOrbit();
    state.orbitIndex += 1;
    state.energy = 0;
    state.orbitEarned = 0;
    state.tapPower = 1;
    state.tapUpgradeLevel = 0;
    state.generatorCount = 0;
    state.generatorUpgradeLevel = 0;
    state.lastSavedAt = Date.now();

    closeTransferModal();
    saveGame(false);
    setStatus(`${destination.short} 궤도 진입 완료`);
    render(true);
  }

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
    const offlineGain = elapsed >= 10 ? energyPerSecond() * elapsed : 0;

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
  el.transferOrbitButton.addEventListener("click", openTransferModal);
  el.transferCancel.addEventListener("click", closeTransferModal);
  el.transferConfirm.addEventListener("click", confirmTransfer);
  el.saveButton.addEventListener("click", () => saveGame(true));
  el.offlineClose.addEventListener("click", () => el.offlineModal.classList.add("hidden"));

  el.transferModal.addEventListener("click", (event) => {
    if (event.target === el.transferModal) closeTransferModal();
  });

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
