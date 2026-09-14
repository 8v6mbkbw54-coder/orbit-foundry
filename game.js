(() => {
  "use strict";

  const SAVE_KEY = "orbit-foundry-save-v1";
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

  const ELEMENTS = [
    { z: 1, symbol: "H",  en: "Hydrogen",  ko: "수소",   config: "1s¹",         orbital: "1s", multiplier: 1.00, requirement: 250 },
    { z: 2, symbol: "He", en: "Helium",    ko: "헬륨",   config: "1s²",         orbital: "1s", multiplier: 1.40, requirement: 1500 },
    { z: 3, symbol: "Li", en: "Lithium",   ko: "리튬",   config: "1s² 2s¹",     orbital: "2s", multiplier: 1.90, requirement: 7000 },
    { z: 4, symbol: "Be", en: "Beryllium", ko: "베릴륨", config: "1s² 2s²",     orbital: "2s", multiplier: 2.60, requirement: 30000 },
    { z: 5, symbol: "B",  en: "Boron",     ko: "붕소",   config: "1s² 2s² 2p¹", orbital: "2p", multiplier: 3.60, requirement: 120000 },
    { z: 6, symbol: "C",  en: "Carbon",    ko: "탄소",   config: "1s² 2s² 2p²", orbital: "2p", multiplier: 5.00, requirement: null }
  ];

  const SPACE_ORBITS = [
    { short: "LEO", multiplier: 1 },
    { short: "MEO", multiplier: 2 },
    { short: "GEO", multiplier: 5 },
    { short: "LUNAR", multiplier: 12 }
  ];

  const defaultState = () => ({
    energy: 0,
    totalEarned: 0,
    atomEarned: 0,
    atomIndex: 0,
    spaceOrbitIndex: 0,
    tapPower: 1,
    tapUpgradeLevel: 0,
    generatorCount: 0,
    generatorUpgradeLevel: 0,
    lastSavedAt: Date.now(),
    discovered2s: false,
    discovered2p: false,
    version: 4
  });

  let state = defaultState();
  let lastTick = performance.now();
  let lastRenderedFrame = -1;
  let statusTimer = 0;
  let activeTab = "atom";

  const el = {
    energyValue: document.getElementById("energyValue"),
    perSecondValue: document.getElementById("perSecondValue"),
    elementSymbol: document.getElementById("elementSymbol"),
    atomicNumberValue: document.getElementById("atomicNumberValue"),
    elementName: document.getElementById("elementName"),
    reactorButton: document.getElementById("reactorButton"),
    reactorSymbol: document.getElementById("reactorSymbol"),
    electronConfig: document.getElementById("electronConfig"),
    orbitalFamily: document.getElementById("orbitalFamily"),
    tapValue: document.getElementById("tapValue"),
    floatingLayer: document.getElementById("floatingLayer"),
    ribbonElement: document.getElementById("ribbonElement"),
    ribbonOrbital: document.getElementById("ribbonOrbital"),
    ribbonMultiplier: document.getElementById("ribbonMultiplier"),
    sectionTabs: Array.from(document.querySelectorAll(".section-tab")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
    atomTabBadge: document.getElementById("atomTabBadge"),
    facilityTabBadge: document.getElementById("facilityTabBadge"),
    orbitTabBadge: document.getElementById("orbitTabBadge"),
    atomicMultiplier: document.getElementById("atomicMultiplier"),
    configurationDetail: document.getElementById("configurationDetail"),
    activeOrbital: document.getElementById("activeOrbital"),
    elementCells: Array.from(document.querySelectorAll(".element-cell")),
    nextElementName: document.getElementById("nextElementName"),
    synthesisRequirementText: document.getElementById("synthesisRequirementText"),
    synthesisProgressBar: document.getElementById("synthesisProgressBar"),
    synthesizeButton: document.getElementById("synthesizeButton"),
    synthesisButtonHint: document.getElementById("synthesisButtonHint"),
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
    macroPanel: document.getElementById("macroPanel"),
    spaceOrbitBadge: document.getElementById("spaceOrbitBadge"),
    spaceOrbitStatus: document.getElementById("spaceOrbitStatus"),
    spaceOrbitRequirement: document.getElementById("spaceOrbitRequirement"),
    saveButton: document.getElementById("saveButton"),
    statusText: document.getElementById("statusText"),
    offlineModal: document.getElementById("offlineModal"),
    offlineText: document.getElementById("offlineText"),
    offlineClose: document.getElementById("offlineClose"),
    synthesisModal: document.getElementById("synthesisModal"),
    synthesisModalText: document.getElementById("synthesisModalText"),
    synthesisFrom: document.getElementById("synthesisFrom"),
    synthesisTo: document.getElementById("synthesisTo"),
    synthesisBonusText: document.getElementById("synthesisBonusText"),
    synthesisCancel: document.getElementById("synthesisCancel"),
    synthesisConfirm: document.getElementById("synthesisConfirm"),
    discoveryModal: document.getElementById("discoveryModal"),
    discoveryGlyph: document.getElementById("discoveryGlyph"),
    discoveryTitle: document.getElementById("discoveryTitle"),
    discoveryText: document.getElementById("discoveryText"),
    discoveryClose: document.getElementById("discoveryClose")
  };

  function finiteOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(finiteOr(value, min))));
  }

  function sanitizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    const legacyTotal = Math.max(0, finiteOr(raw.totalEarned, 0));
    const atomIndex = clampInt(raw.atomIndex, 0, ELEMENTS.length - 1);
    const legacyOrbitIndex = raw.spaceOrbitIndex ?? raw.orbitIndex ?? 0;
    const spaceOrbitIndex = clampInt(legacyOrbitIndex, 0, SPACE_ORBITS.length - 1);
    const migratedAtomEarned = raw.version >= 3
      ? finiteOr(raw.atomEarned, 0)
      : finiteOr(raw.orbitEarned, legacyTotal);

    return {
      energy: Math.max(0, finiteOr(raw.energy, 0)),
      totalEarned: legacyTotal,
      atomEarned: Math.max(0, migratedAtomEarned),
      atomIndex,
      spaceOrbitIndex,
      tapPower: Math.max(1, finiteOr(raw.tapPower, 1)),
      tapUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.tapUpgradeLevel, 0))),
      generatorCount: Math.max(0, Math.floor(finiteOr(raw.generatorCount, 0))),
      generatorUpgradeLevel: Math.max(0, Math.floor(finiteOr(raw.generatorUpgradeLevel, 0))),
      lastSavedAt: Math.max(0, finiteOr(raw.lastSavedAt, Date.now())),
      discovered2s: Boolean(raw.discovered2s) || atomIndex >= 2,
      discovered2p: Boolean(raw.discovered2p) || atomIndex >= 4,
      version: 4
    };
  }

  function currentElement() {
    return ELEMENTS[state.atomIndex];
  }

  function nextElement() {
    return ELEMENTS[state.atomIndex + 1] || null;
  }

  function currentSpaceOrbit() {
    return SPACE_ORBITS[state.spaceOrbitIndex] || SPACE_ORBITS[0];
  }

  function orbitLayerReady() {
    return state.atomIndex >= ELEMENTS.length - 1;
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
        const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        return `${scaled.toFixed(digits)}${suffix}`;
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

  function permanentMultiplier() {
    return currentElement().multiplier * currentSpaceOrbit().multiplier;
  }

  function effectiveTapPower() {
    return state.tapPower * permanentMultiplier();
  }

  function generatorUnitPower() {
    return automationMultiplier() * permanentMultiplier();
  }

  function energyPerSecond() {
    return state.generatorCount * generatorUnitPower();
  }

  function addEnergy(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.energy += amount;
    state.totalEarned += amount;
    state.atomEarned += amount;
  }

  function spendEnergy(amount) {
    if (state.energy + 1e-9 < amount) return false;
    state.energy -= amount;
    if (state.energy < 0) state.energy = 0;
    return true;
  }

  function canSynthesize() {
    const element = currentElement();
    return element.requirement !== null && state.atomEarned >= element.requirement && state.atomIndex < ELEMENTS.length - 1;
  }

  function switchTab(tabName) {
    if (!el.tabPanels.some((panel) => panel.dataset.panel === tabName)) return;
    activeTab = tabName;

    el.sectionTabs.forEach((button) => {
      const selected = button.dataset.tab === tabName;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });

    el.tabPanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.panel !== tabName);
    });
  }

  function renderNavigation() {
    const element = currentElement();
    const space = currentSpaceOrbit();
    const ready = orbitLayerReady();

    document.body.dataset.orbitReady = ready ? "true" : "false";
    el.ribbonElement.textContent = `${element.symbol} · Z${element.z}`;
    el.ribbonOrbital.textContent = element.orbital;
    el.ribbonMultiplier.textContent = `x${permanentMultiplier().toFixed(2)}`;
    el.atomTabBadge.textContent = element.symbol;
    el.facilityTabBadge.textContent = String(state.generatorCount);
    el.orbitTabBadge.textContent = ready ? space.short : "LOCK";

    el.spaceOrbitBadge.textContent = `${space.short} · x${space.multiplier}`;
    if (ready) {
      el.spaceOrbitStatus.textContent = "Carbon · Z6 도달 완료";
      el.spaceOrbitRequirement.textContent = "상위 프레스티지 계층 해금 조건 완료";
    } else {
      const remaining = ELEMENTS.length - 1 - state.atomIndex;
      el.spaceOrbitStatus.textContent = "Carbon · Z6 도달";
      el.spaceOrbitRequirement.textContent = `현재 ${element.symbol} · 앞으로 ${remaining}개 원소`;
    }
  }

  function renderElement() {
    const element = currentElement();
    const next = nextElement();

    document.body.dataset.atomic = String(element.z);
    document.body.dataset.orbital = element.orbital;

    el.elementSymbol.textContent = element.symbol;
    el.atomicNumberValue.textContent = String(element.z);
    el.elementName.textContent = `${element.en} · ${element.ko}`;
    el.reactorSymbol.textContent = element.symbol;
    el.electronConfig.textContent = element.config;
    el.orbitalFamily.textContent = `${element.orbital.endsWith("p") ? "p" : "s"} ORBITAL`;
    el.atomicMultiplier.textContent = `원소 x${element.multiplier.toFixed(2)}`;
    el.configurationDetail.textContent = element.config;
    el.activeOrbital.textContent = element.orbital;

    el.elementCells.forEach((cell, index) => {
      cell.classList.toggle("active", index === state.atomIndex);
      cell.classList.toggle("complete", index < state.atomIndex);
    });

    if (!next || element.requirement === null) {
      el.nextElementName.textContent = "C · Carbon — 현재 테스트 최종 원소";
      el.synthesisRequirementText.textContent = `${formatNumber(state.atomEarned)} ENERGY 생산`;
      el.synthesisProgressBar.style.width = "100%";
      el.synthesizeButton.disabled = true;
      el.synthesisButtonHint.textContent = "상위 계층 확인";
      renderNavigation();
      return;
    }

    const progress = Math.max(0, Math.min(1, state.atomEarned / element.requirement));
    el.nextElementName.textContent = `${next.symbol} · ${next.en}`;
    el.synthesisRequirementText.textContent = `${formatNumber(state.atomEarned)} / ${formatNumber(element.requirement)} ENERGY`;
    el.synthesisProgressBar.style.width = `${progress * 100}%`;
    el.synthesizeButton.disabled = !canSynthesize();
    el.synthesisButtonHint.textContent = canSynthesize()
      ? `Z=${next.z} 합성 가능`
      : `${formatNumber(Math.max(0, element.requirement - state.atomEarned))} 필요`;

    renderNavigation();
  }

  function render(force = false) {
    const frame = Math.floor(performance.now() / 250);
    if (!force && frame === lastRenderedFrame) return;
    lastRenderedFrame = frame;

    const eps = energyPerSecond();
    const genCost = generatorCost();
    const tapCost = tapUpgradeCost();
    const autoCost = generatorUpgradeCost();
    const nextTapIncrease = Math.max(1, Math.floor(state.tapPower * 0.75));

    el.energyValue.textContent = formatNumber(state.energy);
    el.perSecondValue.textContent = `+${formatNumber(eps)} / sec`;
    el.tapValue.textContent = `탭당 +${formatNumber(effectiveTapPower())}`;

    el.generatorCount.textContent = `${state.generatorCount} units`;
    el.generatorPower.textContent = `+${formatNumber(generatorUnitPower())}/s`;
    el.generatorCost.textContent = formatNumber(genCost);
    el.buyGenerator.disabled = state.energy < genCost;

    el.tapUpgradePower.textContent = `+${formatNumber(nextTapIncrease * permanentMultiplier())} tap`;
    el.tapUpgradeCost.textContent = formatNumber(tapCost);
    el.buyTapUpgrade.disabled = state.energy < tapCost;

    const autoMult = automationMultiplier();
    el.generatorMultiplier.textContent = `x${autoMult.toFixed(autoMult < 10 ? 2 : 1)}`;
    el.generatorUpgradeCost.textContent = formatNumber(autoCost);
    el.buyGeneratorUpgrade.disabled = state.energy < autoCost;

    renderElement();
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
    setStatus("입자 수집기 배치 완료");
    render(true);
  }

  function buyTapUpgrade() {
    const cost = tapUpgradeCost();
    if (!spendEnergy(cost)) return;
    state.tapUpgradeLevel += 1;
    state.tapPower += Math.max(1, Math.floor(state.tapPower * 0.75));
    setStatus("핵 압축 업그레이드 완료");
    render(true);
  }

  function buyGeneratorUpgrade() {
    const cost = generatorUpgradeCost();
    if (!spendEnergy(cost)) return;
    state.generatorUpgradeLevel += 1;
    setStatus("오비탈 자동화 갱신 완료");
    render(true);
  }

  function openSynthesisModal() {
    if (!canSynthesize()) return;
    const from = currentElement();
    const to = nextElement();
    if (!to) return;

    el.synthesisModalText.textContent = "원자번호 승급 시 현재 에너지, 입자 수집기, 핵 압축, 오비탈 자동화가 초기화됩니다. 합성한 원소와 상위 우주 궤도 기록은 영구적으로 유지됩니다.";
    el.synthesisFrom.textContent = `${from.symbol} · ${from.z}`;
    el.synthesisTo.textContent = `${to.symbol} · ${to.z}`;
    el.synthesisBonusText.textContent = `새 원소 영구 생산 배율 x${to.multiplier.toFixed(2)} · ${to.config}`;
    el.synthesisModal.classList.remove("hidden");
  }

  function closeSynthesisModal() {
    el.synthesisModal.classList.add("hidden");
  }

  function showOrbitalDiscovery(orbital) {
    if (orbital === "2s") {
      el.discoveryGlyph.textContent = "2s";
      el.discoveryTitle.textContent = "2s 오비탈 발견";
      el.discoveryText.textContent = "두 번째 전자껍질이 열렸습니다. 원자 주변에 더 넓은 s 오비탈 확률 구름이 형성됩니다.";
    } else {
      el.discoveryGlyph.textContent = "2p";
      el.discoveryTitle.textContent = "p 오비탈 발견";
      el.discoveryText.textContent = "구형 s 오비탈을 넘어 방향성을 가진 p 오비탈이 열렸습니다. 원자의 외형과 성장 단계가 크게 확장됩니다.";
    }
    el.discoveryModal.classList.remove("hidden");
  }

  function confirmSynthesis() {
    if (!canSynthesize()) {
      closeSynthesisModal();
      return;
    }

    const destination = nextElement();
    if (!destination) return;

    state.atomIndex += 1;
    state.energy = 0;
    state.atomEarned = 0;
    state.tapPower = 1;
    state.tapUpgradeLevel = 0;
    state.generatorCount = 0;
    state.generatorUpgradeLevel = 0;
    state.lastSavedAt = Date.now();

    const discovered2sNow = destination.orbital === "2s" && !state.discovered2s;
    const discovered2pNow = destination.orbital === "2p" && !state.discovered2p;
    if (discovered2sNow) state.discovered2s = true;
    if (discovered2pNow) state.discovered2p = true;

    closeSynthesisModal();
    switchTab("atom");
    saveGame(false);
    setStatus(`${destination.symbol} 합성 완료 · 원자번호 ${destination.z}`);
    render(true);

    if (discovered2sNow) window.setTimeout(() => showOrbitalDiscovery("2s"), 180);
    if (discovered2pNow) window.setTimeout(() => showOrbitalDiscovery("2p"), 180);
  }

  function setStatus(message) {
    el.statusText.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      el.statusText.textContent = "시스템 정상";
    }, 1900);
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

  function formatDuration(seconds) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    if (minutes > 0) return `${minutes}분`;
    return `${Math.floor(seconds)}초`;
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

  function tick(now) {
    const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    const passive = energyPerSecond() * dt;
    if (passive > 0) addEnergy(passive);
    render(false);
    requestAnimationFrame(tick);
  }

  el.sectionTabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  el.reactorButton.addEventListener("click", tapReactor);
  el.reactorButton.addEventListener("pointerdown", () => el.reactorButton.classList.add("pressed"));
  window.addEventListener("pointerup", () => el.reactorButton.classList.remove("pressed"));
  window.addEventListener("pointercancel", () => el.reactorButton.classList.remove("pressed"));

  el.buyGenerator.addEventListener("click", buyGenerator);
  el.buyTapUpgrade.addEventListener("click", buyTapUpgrade);
  el.buyGeneratorUpgrade.addEventListener("click", buyGeneratorUpgrade);
  el.synthesizeButton.addEventListener("click", openSynthesisModal);
  el.synthesisCancel.addEventListener("click", closeSynthesisModal);
  el.synthesisConfirm.addEventListener("click", confirmSynthesis);
  el.discoveryClose.addEventListener("click", () => el.discoveryModal.classList.add("hidden"));
  el.saveButton.addEventListener("click", () => saveGame(true));
  el.offlineClose.addEventListener("click", () => el.offlineModal.classList.add("hidden"));

  el.synthesisModal.addEventListener("click", (event) => {
    if (event.target === el.synthesisModal) closeSynthesisModal();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
    else lastTick = performance.now();
  });
  window.addEventListener("pagehide", () => saveGame(false));
  window.setInterval(() => saveGame(false), 5000);

  loadGame();
  switchTab(activeTab);
  render(true);
  requestAnimationFrame((now) => {
    lastTick = now;
    requestAnimationFrame(tick);
  });
})();
