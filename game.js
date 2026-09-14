(() => {
  "use strict";

  const SAVE_KEY = "orbit-foundry-save-v1";
  const SAVE_VERSION = 6;
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const BASE_CREDIT_PER_MEV = 0.04;
  const PERMANENT_GRADE_CAP = 8;

  const ELEMENTS = [
    { z: 1, symbol: "H",  en: "Hydrogen",  ko: "수소",   config: "1s¹",         orbital: "1s", multiplier: 1.00, requirement: 250,      costScale: 1 },
    { z: 2, symbol: "He", en: "Helium",    ko: "헬륨",   config: "1s²",         orbital: "1s", multiplier: 1.25, requirement: 1800,     costScale: 1.5 },
    { z: 3, symbol: "Li", en: "Lithium",   ko: "리튬",   config: "1s² 2s¹",     orbital: "2s", multiplier: 1.65, requirement: 18000,    costScale: 3 },
    { z: 4, symbol: "Be", en: "Beryllium", ko: "베릴륨", config: "1s² 2s²",     orbital: "2s", multiplier: 2.20, requirement: 180000,   costScale: 8 },
    { z: 5, symbol: "B",  en: "Boron",     ko: "붕소",   config: "1s² 2s² 2p¹", orbital: "2p", multiplier: 3.00, requirement: 2000000,  costScale: 20 },
    { z: 6, symbol: "C",  en: "Carbon",    ko: "탄소",   config: "1s² 2s² 2p²", orbital: "2p", multiplier: 4.20, requirement: null,     costScale: 60 }
  ];

  const defaultState = () => ({
    energy: 0,
    credits: 0,
    totalProduced: 0,
    totalCredits: 0,
    atomIndex: 0,
    sellRatio: 0,
    tapPower: 1,
    tapUpgradeLevel: 0,
    generatorCount: 0,
    generatorUpgradeLevel: 0,
    reactorGrade: 0,
    collectorGrade: 0,
    converterGrade: 0,
    lastSavedAt: Date.now(),
    discovered2s: false,
    discovered2p: false,
    discoveredMarket: false,
    version: SAVE_VERSION
  });

  let state = defaultState();
  let lastTick = performance.now();
  let lastRenderedFrame = -1;
  let statusTimer = 0;
  let activeTab = "atom";
  let discoveryQueue = [];
  let didRepairEconomy = false;

  const el = {
    energyValue: document.getElementById("energyValue"),
    perSecondValue: document.getElementById("perSecondValue"),
    creditsTop: document.getElementById("creditsTop"),
    creditsBalance: document.getElementById("creditsBalance"),
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
    ribbonEquipment: document.getElementById("ribbonEquipment"),
    sectionTabs: Array.from(document.querySelectorAll(".section-tab")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
    atomTabBadge: document.getElementById("atomTabBadge"),
    facilityTabBadge: document.getElementById("facilityTabBadge"),
    atomicMultiplier: document.getElementById("atomicMultiplier"),
    configurationDetail: document.getElementById("configurationDetail"),
    activeOrbital: document.getElementById("activeOrbital"),
    elementCells: Array.from(document.querySelectorAll(".element-cell")),
    nextElementName: document.getElementById("nextElementName"),
    synthesisRequirementText: document.getElementById("synthesisRequirementText"),
    synthesisProgressBar: document.getElementById("synthesisProgressBar"),
    synthesizeButton: document.getElementById("synthesizeButton"),
    synthesisButtonHint: document.getElementById("synthesisButtonHint"),
    marketLocked: document.getElementById("marketLocked"),
    marketControls: document.getElementById("marketControls"),
    sellRatio: document.getElementById("sellRatio"),
    researchShare: document.getElementById("researchShare"),
    gridShare: document.getElementById("gridShare"),
    sellShareLabel: document.getElementById("sellShareLabel"),
    keptPerSecond: document.getElementById("keptPerSecond"),
    soldPerSecond: document.getElementById("soldPerSecond"),
    creditsPerSecond: document.getElementById("creditsPerSecond"),
    reactorGradeLevel: document.getElementById("reactorGradeLevel"),
    reactorGradeBonus: document.getElementById("reactorGradeBonus"),
    reactorGradeCost: document.getElementById("reactorGradeCost"),
    buyReactorGrade: document.getElementById("buyReactorGrade"),
    collectorGradeLevel: document.getElementById("collectorGradeLevel"),
    collectorGradeBonus: document.getElementById("collectorGradeBonus"),
    collectorGradeCost: document.getElementById("collectorGradeCost"),
    buyCollectorGrade: document.getElementById("buyCollectorGrade"),
    converterGradeLevel: document.getElementById("converterGradeLevel"),
    converterGradeBonus: document.getElementById("converterGradeBonus"),
    converterGradeCost: document.getElementById("converterGradeCost"),
    buyConverterGrade: document.getElementById("buyConverterGrade"),
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

    const atomIndex = clampInt(raw.atomIndex, 0, ELEMENTS.length - 1);
    const current = ELEMENTS[atomIndex];
    const legacyEnergy = Math.max(0, finiteOr(raw.energy, 0));
    const legacyCredits = Math.max(0, finiteOr(raw.credits, 0));
    const legacyReactor = Math.max(0, Math.floor(finiteOr(raw.reactorGrade, 0)));
    const legacyCollector = Math.max(0, Math.floor(finiteOr(raw.collectorGrade, 0)));
    const legacyConverter = Math.max(0, Math.floor(finiteOr(raw.converterGrade, 0)));

    const brokenLegacyEconomy = Number(raw.version) === 5 && (
      legacyEnergy > 1e10 ||
      legacyCredits > 1e9 ||
      legacyReactor > 12 ||
      legacyCollector > 12 ||
      legacyConverter > 12 ||
      finiteOr(raw.generatorCount, 0) > 200 ||
      finiteOr(raw.tapUpgradeLevel, 0) > 30 ||
      finiteOr(raw.generatorUpgradeLevel, 0) > 20
    );

    if (brokenLegacyEconomy) didRepairEconomy = true;

    const energyCap = current.requirement === null ? 500000 : current.requirement * 0.10;
    const migratedEnergy = brokenLegacyEconomy ? Math.min(legacyEnergy, energyCap) : legacyEnergy;
    const migratedCredits = brokenLegacyEconomy
      ? Math.min(legacyCredits, Math.max(3000, atomIndex * 3000))
      : legacyCredits;

    return {
      energy: migratedEnergy,
      credits: migratedCredits,
      totalProduced: Math.max(0, finiteOr(raw.totalProduced, finiteOr(raw.totalEarned, 0))),
      totalCredits: Math.max(0, finiteOr(raw.totalCredits, 0)),
      atomIndex,
      sellRatio: atomIndex >= 2 ? Math.max(0, Math.min(.8, finiteOr(raw.sellRatio, 0))) : 0,
      tapPower: brokenLegacyEconomy ? 1 : Math.max(1, finiteOr(raw.tapPower, 1)),
      tapUpgradeLevel: brokenLegacyEconomy ? 0 : clampInt(raw.tapUpgradeLevel, 0, 40),
      generatorCount: brokenLegacyEconomy ? 0 : clampInt(raw.generatorCount, 0, 120),
      generatorUpgradeLevel: brokenLegacyEconomy ? 0 : clampInt(raw.generatorUpgradeLevel, 0, 24),
      reactorGrade: brokenLegacyEconomy ? Math.min(legacyReactor, 1) : Math.min(legacyReactor, PERMANENT_GRADE_CAP),
      collectorGrade: brokenLegacyEconomy ? Math.min(legacyCollector, 1) : Math.min(legacyCollector, PERMANENT_GRADE_CAP),
      converterGrade: brokenLegacyEconomy ? Math.min(legacyConverter, 1) : Math.min(legacyConverter, PERMANENT_GRADE_CAP),
      lastSavedAt: Math.max(0, finiteOr(raw.lastSavedAt, Date.now())),
      discovered2s: Boolean(raw.discovered2s) || atomIndex >= 2,
      discovered2p: Boolean(raw.discovered2p) || atomIndex >= 4,
      discoveredMarket: Boolean(raw.discoveredMarket) || atomIndex >= 2,
      version: SAVE_VERSION
    };
  }

  function currentElement() {
    return ELEMENTS[state.atomIndex];
  }

  function nextElement() {
    return ELEMENTS[state.atomIndex + 1] || null;
  }

  function marketUnlocked() {
    return state.atomIndex >= 2;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    const abs = Math.abs(value);
    if (abs >= 1e24) return value.toExponential(2);
    if (abs < 1000) {
      if (abs < 10 && value % 1 !== 0) return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      return Math.floor(value).toLocaleString("ko-KR");
    }
    const units = [[1e21,"Sx"],[1e18,"Qi"],[1e15,"Qa"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
    for (const [size, suffix] of units) {
      if (abs >= size) {
        const scaled = value / size;
        const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
        return `${scaled.toFixed(digits)}${suffix}`;
      }
    }
    return Math.floor(value).toLocaleString("ko-KR");
  }

  function formatEnergy(mev) {
    if (!Number.isFinite(mev)) return "0 MeV";
    const abs = Math.abs(mev);
    if (abs >= 1e18) return `${(mev / 1e18).toExponential(2)} ZeV`;
    if (abs >= 1e12) return `${formatNumber(mev / 1e12)} EeV`;
    if (abs >= 1e9) return `${formatNumber(mev / 1e9)} PeV`;
    if (abs >= 1e6) return `${formatNumber(mev / 1e6)} TeV`;
    if (abs >= 1000) return `${formatNumber(mev / 1000)} GeV`;
    return `${formatNumber(mev)} MeV`;
  }

  function formatEnergyRate(mevPerSecond) {
    return `${formatEnergy(mevPerSecond)}/s`;
  }

  function formatCredits(value) {
    return `₡ ${formatNumber(value)}`;
  }

  function generatorCost() {
    return Math.floor(45 * currentElement().costScale * Math.pow(1.21, state.generatorCount));
  }

  function tapUpgradeCost() {
    return Math.floor(30 * currentElement().costScale * Math.pow(1.90, state.tapUpgradeLevel));
  }

  function generatorUpgradeCost() {
    return Math.floor(250 * currentElement().costScale * Math.pow(2.90, state.generatorUpgradeLevel));
  }

  function reactorGradeCost() {
    return Math.ceil(3000 * Math.pow(15, state.reactorGrade));
  }

  function collectorGradeCost() {
    return Math.ceil(6000 * Math.pow(18, state.collectorGrade));
  }

  function converterGradeCost() {
    return Math.ceil(12000 * Math.pow(22, state.converterGrade));
  }

  function automationMultiplier() {
    return Math.pow(1.75, state.generatorUpgradeLevel);
  }

  function reactorGradeMultiplier() {
    return Math.pow(1.18, state.reactorGrade);
  }

  function collectorGradeMultiplier() {
    return Math.pow(1.22, state.collectorGrade);
  }

  function converterGradeMultiplier() {
    return Math.pow(1.30, state.converterGrade);
  }

  function baseProductionMultiplier() {
    return currentElement().multiplier * reactorGradeMultiplier();
  }

  function effectiveTapPowerGross() {
    return state.tapPower * baseProductionMultiplier();
  }

  function generatorUnitPowerGross() {
    return currentElement().multiplier * reactorGradeMultiplier() * collectorGradeMultiplier() * automationMultiplier();
  }

  function grossEnergyPerSecond() {
    return state.generatorCount * generatorUnitPowerGross();
  }

  function effectiveSellRatio() {
    return marketUnlocked() ? state.sellRatio : 0;
  }

  function creditPerMeV() {
    return BASE_CREDIT_PER_MEV * converterGradeMultiplier();
  }

  function routeGenerated(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return { kept: 0, sold: 0, credits: 0 };
    const ratio = effectiveSellRatio();
    const sold = amount * ratio;
    const kept = amount - sold;
    const creditGain = sold * creditPerMeV();

    state.energy += kept;
    state.credits += creditGain;
    state.totalProduced += amount;
    state.totalCredits += creditGain;

    return { kept, sold, credits: creditGain };
  }

  function spendEnergy(amount) {
    if (state.energy + 1e-9 < amount) return false;
    state.energy = Math.max(0, state.energy - amount);
    return true;
  }

  function spendCredits(amount) {
    if (state.credits + 1e-9 < amount) return false;
    state.credits = Math.max(0, state.credits - amount);
    return true;
  }

  function canRemodel() {
    const element = currentElement();
    return element.requirement !== null && state.energy >= element.requirement && state.atomIndex < ELEMENTS.length - 1;
  }

  function switchTab(tabName) {
    if (!el.tabPanels.some((panel) => panel.dataset.panel === tabName)) return;
    activeTab = tabName;
    el.sectionTabs.forEach((button) => {
      const selected = button.dataset.tab === tabName;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    el.tabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tabName));
  }

  function renderEquipmentVisuals() {
    document.body.classList.toggle("has-reactor-grade", state.reactorGrade > 0);
    document.body.classList.toggle("has-collector-grade", state.collectorGrade > 0);
    document.body.classList.toggle("has-converter-grade", state.converterGrade > 0);
    document.body.classList.toggle("grade-high", state.reactorGrade + state.collectorGrade + state.converterGrade >= 6);
  }

  function renderNavigation() {
    const element = currentElement();
    el.ribbonElement.textContent = `${element.symbol} · Z${element.z}`;
    el.ribbonOrbital.textContent = element.orbital;
    el.ribbonEquipment.textContent = `R${state.reactorGrade} · C${state.collectorGrade} · X${state.converterGrade}`;
    el.atomTabBadge.textContent = element.symbol;
    el.facilityTabBadge.textContent = `₡${formatNumber(state.credits)}`;
  }

  function renderMarket() {
    const unlocked = marketUnlocked();
    document.body.dataset.market = unlocked ? "unlocked" : "locked";
    el.marketLocked.classList.toggle("hidden", unlocked);
    el.marketControls.classList.toggle("hidden", !unlocked);

    if (!unlocked) state.sellRatio = 0;
    const ratio = effectiveSellRatio();
    const gross = grossEnergyPerSecond();
    const sold = gross * ratio;
    const kept = gross - sold;
    const cps = sold * creditPerMeV();

    el.sellRatio.value = String(Math.round(ratio * 100));
    el.researchShare.textContent = `${Math.round((1 - ratio) * 100)}%`;
    el.gridShare.textContent = `${Math.round(ratio * 100)}%`;
    el.sellShareLabel.textContent = `${Math.round(ratio * 100)}% SALE`;
    el.keptPerSecond.textContent = formatEnergyRate(kept);
    el.soldPerSecond.textContent = formatEnergyRate(sold);
    el.creditsPerSecond.textContent = `${formatCredits(cps)}/s`;
  }

  function renderPermanentEquipment() {
    const locked = !marketUnlocked();
    const rMax = state.reactorGrade >= PERMANENT_GRADE_CAP;
    const cMax = state.collectorGrade >= PERMANENT_GRADE_CAP;
    const xMax = state.converterGrade >= PERMANENT_GRADE_CAP;
    const rCost = rMax ? Infinity : reactorGradeCost();
    const cCost = cMax ? Infinity : collectorGradeCost();
    const xCost = xMax ? Infinity : converterGradeCost();

    el.reactorGradeLevel.textContent = `G${state.reactorGrade}`;
    el.reactorGradeBonus.textContent = `x${reactorGradeMultiplier().toFixed(2)}`;
    el.reactorGradeCost.textContent = rMax ? "MAX" : formatCredits(rCost);
    el.buyReactorGrade.disabled = locked || rMax || state.credits < rCost;

    el.collectorGradeLevel.textContent = `G${state.collectorGrade}`;
    el.collectorGradeBonus.textContent = `x${collectorGradeMultiplier().toFixed(2)}`;
    el.collectorGradeCost.textContent = cMax ? "MAX" : formatCredits(cCost);
    el.buyCollectorGrade.disabled = locked || cMax || state.credits < cCost;

    el.converterGradeLevel.textContent = `G${state.converterGrade}`;
    el.converterGradeBonus.textContent = `x${converterGradeMultiplier().toFixed(2)}`;
    el.converterGradeCost.textContent = xMax ? "MAX" : formatCredits(xCost);
    el.buyConverterGrade.disabled = locked || xMax || state.credits < xCost;

    renderEquipmentVisuals();
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
      el.nextElementName.textContent = "C · Carbon — 현재 빌드 최종 시설";
      el.synthesisRequirementText.textContent = `${formatEnergy(state.energy)} 보유`;
      el.synthesisProgressBar.style.width = "100%";
      el.synthesizeButton.disabled = true;
      el.synthesisButtonHint.textContent = "다음 원소 준비 중";
      return;
    }

    const progress = Math.max(0, Math.min(1, state.energy / element.requirement));
    el.nextElementName.textContent = `${next.symbol} · ${next.en}`;
    el.synthesisRequirementText.textContent = `${formatEnergy(state.energy)} / ${formatEnergy(element.requirement)}`;
    el.synthesisProgressBar.style.width = `${progress * 100}%`;
    el.synthesizeButton.disabled = !canRemodel();
    el.synthesisButtonHint.textContent = canRemodel()
      ? `${next.symbol} 시설 리모델링 가능`
      : `${formatEnergy(Math.max(0, element.requirement - state.energy))} 필요`;
  }

  function render(force = false) {
    const frame = Math.floor(performance.now() / 200);
    if (!force && frame === lastRenderedFrame) return;
    lastRenderedFrame = frame;

    const grossEps = grossEnergyPerSecond();
    const ratio = effectiveSellRatio();
    const keptEps = grossEps * (1 - ratio);
    const cps = grossEps * ratio * creditPerMeV();
    const genCost = generatorCost();
    const tapCost = tapUpgradeCost();
    const autoCost = generatorUpgradeCost();
    const nextTapIncrease = Math.max(1, Math.floor(state.tapPower * .7));

    el.energyValue.textContent = formatEnergy(state.energy);
    el.perSecondValue.textContent = cps > 0
      ? `+${formatEnergyRate(keptEps)} · ${formatCredits(cps)}/s`
      : `+${formatEnergyRate(keptEps)}`;
    el.creditsTop.textContent = formatCredits(state.credits).replace("₡ ", "₡");
    el.creditsBalance.textContent = formatCredits(state.credits);
    el.tapValue.textContent = `탭당 ${formatEnergy(effectiveTapPowerGross())}`;

    el.generatorCount.textContent = `${state.generatorCount} units`;
    el.generatorPower.textContent = `+${formatEnergyRate(generatorUnitPowerGross())}`;
    el.generatorCost.textContent = formatEnergy(genCost);
    el.buyGenerator.disabled = state.energy < genCost;

    el.tapUpgradePower.textContent = `+${formatEnergy(nextTapIncrease * baseProductionMultiplier())}`;
    el.tapUpgradeCost.textContent = formatEnergy(tapCost);
    el.buyTapUpgrade.disabled = state.energy < tapCost;

    const autoMult = automationMultiplier();
    el.generatorMultiplier.textContent = `x${autoMult.toFixed(autoMult < 10 ? 2 : 1)}`;
    el.generatorUpgradeCost.textContent = formatEnergy(autoCost);
    el.buyGeneratorUpgrade.disabled = state.energy < autoCost;

    renderElement();
    renderMarket();
    renderPermanentEquipment();
    renderNavigation();
  }

  function showFloatingNumber(clientX, clientY, routed) {
    const rect = el.floatingLayer.getBoundingClientRect();
    const x = Number.isFinite(clientX) ? clientX - rect.left : rect.width / 2;
    const y = Number.isFinite(clientY) ? clientY - rect.top : rect.height / 2;
    const item = document.createElement("span");
    item.className = "float-number";
    item.textContent = routed.credits > 0
      ? `+${formatEnergy(routed.kept)} · ${formatCredits(routed.credits)}`
      : `+${formatEnergy(routed.kept)}`;
    item.style.left = `${Math.max(30, Math.min(rect.width - 30, x))}px`;
    item.style.top = `${Math.max(44, Math.min(rect.height - 30, y))}px`;
    el.floatingLayer.appendChild(item);
    item.addEventListener("animationend", () => item.remove(), { once: true });
    window.setTimeout(() => item.remove(), 900);
  }

  function tapReactor(event) {
    const routed = routeGenerated(effectiveTapPowerGross());
    showFloatingNumber(event.clientX, event.clientY, routed);
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
    state.tapPower += Math.max(1, Math.floor(state.tapPower * .7));
    setStatus("반응 펄스 조정 완료");
    render(true);
  }

  function buyGeneratorUpgrade() {
    const cost = generatorUpgradeCost();
    if (!spendEnergy(cost)) return;
    state.generatorUpgradeLevel += 1;
    setStatus("자동 운전 제어 갱신 완료");
    render(true);
  }

  function buyPermanentGrade(type) {
    if (!marketUnlocked()) return;
    const config = {
      reactor: [reactorGradeCost, "reactorGrade", "Reactor Grade 상승"],
      collector: [collectorGradeCost, "collectorGrade", "Collector Grade 상승"],
      converter: [converterGradeCost, "converterGrade", "Converter Grade 상승"]
    }[type];
    if (!config) return;
    const [costFn, key, message] = config;
    if (state[key] >= PERMANENT_GRADE_CAP) return;
    const cost = costFn();
    if (!spendCredits(cost)) return;
    state[key] += 1;
    saveGame(false);
    setStatus(message);
    render(true);
  }

  function openRemodelModal() {
    if (!canRemodel()) return;
    const from = currentElement();
    const to = nextElement();
    if (!to) return;

    el.synthesisModalText.textContent = "현재 시설을 안전 정지하고 다음 원자에 맞춰 챔버, 제어계, 임시 수집 설비를 재구성합니다. 남은 Reaction Energy와 임시 운전 업그레이드는 초기화되며 Credits와 영구 장비 등급은 유지됩니다.";
    el.synthesisFrom.textContent = `${from.symbol} · Z${from.z}`;
    el.synthesisTo.textContent = `${to.symbol} · Z${to.z}`;
    el.synthesisBonusText.textContent = `${to.config} · 원소 기본 생산 x${to.multiplier.toFixed(2)}`;
    el.synthesisModal.classList.remove("hidden");
  }

  function closeRemodelModal() {
    el.synthesisModal.classList.add("hidden");
  }

  function showNextDiscovery() {
    if (discoveryQueue.length === 0) {
      el.discoveryModal.classList.add("hidden");
      return;
    }
    const type = discoveryQueue.shift();
    if (type === "2s") {
      el.discoveryGlyph.textContent = "2s";
      el.discoveryTitle.textContent = "2s 오비탈 발견";
      el.discoveryText.textContent = "두 번째 전자껍질이 열렸습니다. Li 시설부터 더 넓은 s 오비탈 확률 구름이 원자 비주얼에 추가됩니다.";
    } else if (type === "2p") {
      el.discoveryGlyph.textContent = "2p";
      el.discoveryTitle.textContent = "p 오비탈 발견";
      el.discoveryText.textContent = "방향성을 가진 p 오비탈이 열렸습니다. B 시설부터 아령형 전자 확률 분포가 표시됩니다.";
    } else {
      el.discoveryGlyph.textContent = "₡";
      el.discoveryTitle.textContent = "Energy Market 연결";
      el.discoveryText.textContent = "튜토리얼이 종료되었습니다. 이제 Reaction Energy 일부를 외부 전력망에 판매해 Credits를 벌고 영구 장비 등급을 올릴 수 있습니다.";
    }
    el.discoveryModal.classList.remove("hidden");
  }

  function confirmRemodel() {
    if (!canRemodel()) {
      closeRemodelModal();
      return;
    }
    const destination = nextElement();
    if (!destination) return;

    state.atomIndex += 1;
    state.energy = 0;
    state.tapPower = 1;
    state.tapUpgradeLevel = 0;
    state.generatorCount = 0;
    state.generatorUpgradeLevel = 0;
    state.lastSavedAt = Date.now();

    const discovered2sNow = destination.orbital === "2s" && !state.discovered2s;
    const discovered2pNow = destination.orbital === "2p" && !state.discovered2p;
    const discoveredMarketNow = destination.z === 3 && !state.discoveredMarket;
    if (discovered2sNow) state.discovered2s = true;
    if (discovered2pNow) state.discovered2p = true;
    if (discoveredMarketNow) state.discoveredMarket = true;

    closeRemodelModal();
    switchTab("atom");
    saveGame(false);
    setStatus(`${destination.symbol} 대응 시설 리모델링 완료`);
    render(true);

    if (discovered2sNow) discoveryQueue.push("2s");
    if (discoveredMarketNow) discoveryQueue.push("market");
    if (discovered2pNow) discoveryQueue.push("2p");
    if (discoveryQueue.length) window.setTimeout(showNextDiscovery, 180);
  }

  function setStatus(message) {
    el.statusText.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => { el.statusText.textContent = "시스템 정상"; }, 1900);
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
    const gross = elapsed >= 10 ? grossEnergyPerSecond() * elapsed : 0;
    if (gross > 0) {
      const routed = routeGenerated(gross);
      const parts = [`${formatDuration(elapsed)} 동안 ${formatEnergy(routed.kept)}를 축적했습니다.`];
      if (routed.credits > 0) parts.push(`${formatCredits(routed.credits)} 판매 수익도 확보했습니다.`);
      el.offlineText.textContent = parts.join(" ");
      el.offlineModal.classList.remove("hidden");
    }
    state.lastSavedAt = now;
    saveGame(false);
  }

  function tick(now) {
    const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    const gross = grossEnergyPerSecond() * dt;
    if (gross > 0) routeGenerated(gross);
    render(false);
    requestAnimationFrame(tick);
  }

  el.sectionTabs.forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  el.reactorButton.addEventListener("click", tapReactor);
  el.reactorButton.addEventListener("pointerdown", () => el.reactorButton.classList.add("pressed"));
  window.addEventListener("pointerup", () => el.reactorButton.classList.remove("pressed"));
  window.addEventListener("pointercancel", () => el.reactorButton.classList.remove("pressed"));

  el.buyGenerator.addEventListener("click", buyGenerator);
  el.buyTapUpgrade.addEventListener("click", buyTapUpgrade);
  el.buyGeneratorUpgrade.addEventListener("click", buyGeneratorUpgrade);
  el.buyReactorGrade.addEventListener("click", () => buyPermanentGrade("reactor"));
  el.buyCollectorGrade.addEventListener("click", () => buyPermanentGrade("collector"));
  el.buyConverterGrade.addEventListener("click", () => buyPermanentGrade("converter"));
  el.sellRatio.addEventListener("input", () => {
    if (!marketUnlocked()) return;
    state.sellRatio = Math.max(0, Math.min(.8, Number(el.sellRatio.value) / 100));
    render(true);
  });
  el.sellRatio.addEventListener("change", () => saveGame(false));

  el.synthesizeButton.addEventListener("click", openRemodelModal);
  el.synthesisCancel.addEventListener("click", closeRemodelModal);
  el.synthesisConfirm.addEventListener("click", confirmRemodel);
  el.discoveryClose.addEventListener("click", showNextDiscovery);
  el.saveButton.addEventListener("click", () => saveGame(true));
  el.offlineClose.addEventListener("click", () => el.offlineModal.classList.add("hidden"));
  el.synthesisModal.addEventListener("click", (event) => { if (event.target === el.synthesisModal) closeRemodelModal(); });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
    else lastTick = performance.now();
  });
  window.addEventListener("pagehide", () => saveGame(false));
  window.setInterval(() => saveGame(false), 5000);

  loadGame();
  switchTab(activeTab);
  render(true);
  if (didRepairEconomy) setStatus("폭주한 경제 수치를 정상 범위로 재조정했습니다");
  requestAnimationFrame((now) => {
    lastTick = now;
    requestAnimationFrame(tick);
  });
})();