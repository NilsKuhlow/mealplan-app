// === Mealplan App · Logic ===
(() => {
  const { ingredients, recipes, weeks, breakfast, snack1, mensa, supplements_daily,
          daily_targets, categoryLabels, categoryOrder, anchor } = APP_DATA;

  const STORAGE_KEY = 'mealplan_v1';

  // ---------- State ----------
  const defaultStock = () => {
    const s = {};
    for (const id of Object.keys(ingredients)) s[id] = 0;
    return s;
  };

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const defaultToday = () => {
    // Mo–Fr: Mensa standardmäßig vorausgewählt — typischer Studienalltag.
    // Sa/So: aus, weil Mensa zu.
    const dow = new Date().getDay(); // 0=So … 6=Sa
    const isWeekday = dow >= 1 && dow <= 5;
    return {
      date: todayISO(),
      consumed: {
        breakfast: null,   // 'A' | 'B' | 'C' | null
        snack1: false,
        mensa: isWeekday,
        powerMeal: false,
        abendessen: false,
        supplements: false
      },
      extras: []  // [{ id, name, kcal, p, kh, f }]
    };
  };

  const defaultSettings = () => ({
    reminderEnabled: false,
    reminderHour: 20,
    reminderMinute: 0
  });

  // Sums macros for a given today snapshot. Used both for live "consumedMacros"
  // and for archiving previous days when the date rolls over.
  const sumMacrosForSnapshot = (snapshot) => {
    if (!snapshot) return { kcal: 0, p: 0, kh: 0, f: 0 };
    const c = snapshot.consumed || {};
    const total = { kcal: 0, p: 0, kh: 0, f: 0 };
    const add = (m) => { if (!m) return; total.kcal += m.kcal; total.p += m.p; total.kh += m.kh; total.f += m.f; };
    if (c.breakfast)  add(breakfast[c.breakfast]?.macroValues);
    if (c.snack1)     add(snack1.macroValues);
    if (c.mensa)      add(mensa.macroValues);
    // Archived powerMeal/abendessen: use the recipe matching THAT week, not today's.
    // For simplicity we re-derive via week of snapshot.date.
    if (c.powerMeal || c.abendessen) {
      const weekNum = weekOfDate(snapshot.date);
      if (weekNum) {
        if (c.powerMeal)  add(recipes[weeks[weekNum].powerMeal]?.macroValues);
        if (c.abendessen) add(recipes[weeks[weekNum].abendessen]?.macroValues);
      }
    }
    for (const e of (snapshot.extras || [])) add(e);
    return total;
  };

  const weekOfDate = (dateStr) => {
    if (!dateStr) return null;
    const d = parseDate(dateStr);
    const monday = startOfWeekMonday(d);
    const anchorDate = parseDate(anchor);
    const diffDays = Math.round((monday - anchorDate) / 86400000);
    if (diffDays < 0) return null;
    return Math.floor(diffDays / 7) % 4 + 1;
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {
        stock: defaultStock(),
        activeTab: 'shopping',
        today: defaultToday(),
        history: {},
        settings: defaultSettings(),
        recentExtras: []
      };
      const parsed = JSON.parse(raw);
      const stock = defaultStock();
      Object.assign(stock, parsed.stock || {});
      const history = (parsed.history && typeof parsed.history === 'object') ? { ...parsed.history } : {};
      const settings = { ...defaultSettings(), ...(parsed.settings || {}) };
      const recentExtras = Array.isArray(parsed.recentExtras) ? parsed.recentExtras : [];

      let today = parsed.today;
      if (!today) {
        today = defaultToday();
      } else if (today.date !== todayISO()) {
        // Archive the old day's totals, then reset
        const totals = sumMacrosForSnapshot(today);
        if (totals.kcal > 0 || totals.p > 0 || totals.kh > 0 || totals.f > 0) {
          history[today.date] = totals;
        }
        today = defaultToday();
      }
      // Migration: ensure all keys present
      today.consumed = { ...defaultToday().consumed, ...(today.consumed || {}) };
      today.extras = Array.isArray(today.extras) ? today.extras : [];
      return { stock, activeTab: parsed.activeTab || 'shopping', today, history, settings, recentExtras };
    } catch {
      return {
        stock: defaultStock(),
        activeTab: 'shopping',
        today: defaultToday(),
        history: {},
        settings: defaultSettings(),
        recentExtras: []
      };
    }
  };

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const state = loadState();

  // ---------- Date / Week ----------
  const parseDate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const startOfWeekMonday = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay(); // 0=Sun, 1=Mon, ...
    const diff = (day + 6) % 7; // days back to Monday
    x.setDate(x.getDate() - diff);
    return x;
  };

  // Liefert die Rotationswoche (1-4), oder null wenn vor Anker.
  const currentRotationWeek = () => {
    const today = new Date();
    const todayMonday = startOfWeekMonday(today);
    const anchorDate = parseDate(anchor);
    const diffDays = Math.round((todayMonday - anchorDate) / 86400000);
    if (diffDays < 0) return null; // vor Anker
    const weekNum = Math.floor(diffDays / 7) % 4 + 1;
    return weekNum;
  };

  // Welche Woche soll für Einkauf/Vorrat als Soll dienen?
  // Vor Anker → Woche 1 (für Sonntag-Session). Sonst aktuelle.
  const planningWeek = () => currentRotationWeek() ?? 1;

  // ---------- Soll-Bestand berechnen ----------
  // baseTarget + Mengen aus den Rezepten der Planungswoche
  const targetFor = (weekNum) => {
    const target = {};
    for (const [id, ing] of Object.entries(ingredients)) {
      target[id] = ing.baseTarget || 0;
    }
    const w = weeks[weekNum];
    if (!w) return target;
    for (const recipeKey of [w.powerMeal, w.abendessen]) {
      const recipe = recipes[recipeKey];
      for (const item of recipe.items) {
        target[item.id] = (target[item.id] || 0) + item.qty;
      }
    }
    return target;
  };

  // ---------- Helpers ----------
  const formatQty = (qty, unit) => {
    if (qty === 0) return `0 ${unit}`;
    if (Number.isInteger(qty)) return `${qty} ${unit}`;
    return `${qty.toFixed(1).replace('.', ',')} ${unit}`;
  };

  // Schritt für + / − Buttons (sinnvolle Stufen je nach Einheit)
  const stepFor = (ing) => {
    const u = ing.unit;
    if (u === 'g')   return 100;
    if (u === 'ml')  return 100;
    if (u === 'cm')  return 1;
    return 1; // Stk, Dose, Sch, Tab, Kap, etc.
  };

  const showToast = (msg) => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 1500);
  };

  // ---------- Wochen-Anzeige (kein chrome-coloring; Woche ist Daten, nicht Marke) ----------
  const applyWeekTheme = () => {
    const w = planningWeek();
    const color = weeks[w].color;
    document.documentElement.style.setProperty('--week-color', color);
    const label = document.getElementById('week-label');
    const cur = currentRotationWeek();
    if (cur === null) {
      label.textContent = 'WOCHE 1 · AB 04.05.';
    } else {
      label.textContent = `WOCHE ${cur} · ${weeks[w].name.toUpperCase()}`;
    }
  };

  // ---------- Renderer ----------
  const $content = document.getElementById('content');

  const renderShopping = () => {
    const tpl = document.getElementById('tpl-shopping').content.cloneNode(true);
    const list = tpl.getElementById('shopping-list');
    const hint = tpl.getElementById('shopping-hint');

    const w = planningWeek();
    const target = targetFor(w);
    const cur = currentRotationWeek();

    const rotInfo = cur === null
      ? `Erste Rotationswoche startet <strong>Mo 04.05.</strong> — Einkauf basiert auf <strong>Woche 1</strong>.`
      : `Aktuelle Rotation — <strong>Woche ${w}</strong> · ${weeks[w].name}`;
    hint.innerHTML = rotInfo;

    // Build needs by category
    const needs = {};
    let total = 0;
    for (const id of Object.keys(ingredients)) {
      const need = Math.max(0, target[id] - (state.stock[id] || 0));
      if (need > 0) {
        const cat = ingredients[id].category;
        (needs[cat] = needs[cat] || []).push({ id, need });
        total++;
      }
    }

    if (total === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = '<div class="big">✓</div><div>Vorrat komplett. Nichts einzukaufen.</div>';
      list.appendChild(empty);
      $content.replaceChildren(tpl);
      return;
    }

    for (const cat of categoryOrder) {
      if (!needs[cat]) continue;
      // Day-Gruppen innerhalb Kategorie
      const items = needs[cat].sort((a, b) => ingredients[a.id].name.localeCompare(ingredients[b.id].name));
      const group = document.createElement('div');
      group.className = 'cat-group';
      const labelEl = document.createElement('div');
      labelEl.className = 'cat-label';
      const day = items.length && ingredients[items[0].id].day;
      labelEl.innerHTML = `<span>${categoryLabels[cat]}</span><span class="cat-day">${day === 'Do' ? 'Donnerstag' : 'Samstag'}</span>`;
      group.appendChild(labelEl);

      for (const { id, need } of items) {
        const ing = ingredients[id];
        const row = document.createElement('div');
        row.className = 'row shopping';
        row.dataset.id = id;
        row.innerHTML = `
          <div class="check" role="checkbox" aria-checked="false" tabindex="0"></div>
          <div class="row-name">
            <div class="name">${ing.name}</div>
            <div class="meta">Vorrat: ${formatQty(state.stock[id] || 0, ing.unit)} · Soll: ${formatQty(target[id], ing.unit)}</div>
          </div>
          <div class="need-amount">${formatQty(need, ing.unit)}</div>
        `;
        const check = row.querySelector('.check');
        const onBuy = () => {
          if (row.classList.contains('done')) {
            // Undo: nicht zurückrechnen, nur Markierung weg
            row.classList.remove('done');
            check.classList.remove('done');
            check.setAttribute('aria-checked', 'false');
            return;
          }
          state.stock[id] = (state.stock[id] || 0) + need;
          saveState();
          row.classList.add('done');
          check.classList.add('done');
          check.setAttribute('aria-checked', 'true');
          showToast(`${ing.name} +${formatQty(need, ing.unit)}`);
          // Erst nach kurzem Delay neu rendern, damit der Tick sichtbar bleibt
          setTimeout(() => { if (state.activeTab === 'shopping') render(); }, 600);
        };
        check.addEventListener('click', onBuy);
        check.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onBuy(); } });
        group.appendChild(row);
      }
      list.appendChild(group);
    }

    $content.replaceChildren(tpl);
  };

  const renderStock = () => {
    const tpl = document.getElementById('tpl-stock').content.cloneNode(true);
    const list = tpl.getElementById('stock-list');
    const target = targetFor(planningWeek());

    const byCat = {};
    for (const [id, ing] of Object.entries(ingredients)) {
      // Skip entries with 0 target AND 0 stock (irrelevant for current week)
      if ((target[id] || 0) === 0 && (state.stock[id] || 0) === 0) continue;
      (byCat[ing.category] = byCat[ing.category] || []).push(id);
    }

    for (const cat of categoryOrder) {
      const ids = byCat[cat];
      if (!ids || !ids.length) continue;
      ids.sort((a, b) => ingredients[a].name.localeCompare(ingredients[b].name));
      const group = document.createElement('div');
      group.className = 'cat-group';
      const labelEl = document.createElement('div');
      labelEl.className = 'cat-label';
      labelEl.innerHTML = `<span>${categoryLabels[cat]}</span>`;
      group.appendChild(labelEl);

      for (const id of ids) {
        const ing = ingredients[id];
        const stock = state.stock[id] || 0;
        const tgt = target[id] || 0;
        const need = Math.max(0, tgt - stock);
        const step = stepFor(ing);

        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <div class="row-name">
            <div class="name">${ing.name}</div>
            <div class="meta">
              Soll: ${formatQty(tgt, ing.unit)}
              ${need > 0 ? ` · <span class="need">−${formatQty(need, ing.unit)}</span>` : ''}
            </div>
          </div>
          <div class="row-controls">
            <button class="qty-btn minus" data-act="minus" aria-label="weniger">−</button>
            <div class="qty-display"><span class="qty-num">${formatQty(stock, '').trim()}</span><span class="unit">${ing.unit}</span></div>
            <button class="qty-btn plus" data-act="plus" aria-label="mehr">+</button>
          </div>
        `;
        const minusBtn = row.querySelector('[data-act="minus"]');
        const plusBtn  = row.querySelector('[data-act="plus"]');
        const numEl    = row.querySelector('.qty-num');
        const metaEl   = row.querySelector('.meta');

        const update = (delta) => {
          state.stock[id] = Math.max(0, (state.stock[id] || 0) + delta);
          saveState();
          const newStock = state.stock[id];
          numEl.textContent = formatQty(newStock, '').trim();
          const newNeed = Math.max(0, tgt - newStock);
          metaEl.innerHTML = `Soll: ${formatQty(tgt, ing.unit)}${newNeed > 0 ? ` · <span class="need">−${formatQty(newNeed, ing.unit)}</span>` : ''}`;
        };
        minusBtn.addEventListener('click', () => update(-step));
        plusBtn.addEventListener('click', () => update(step));

        // Long-press → 0
        let pressTimer = null;
        const startPress = () => {
          pressTimer = setTimeout(() => {
            state.stock[id] = 0;
            saveState();
            numEl.textContent = '0';
            const nn = tgt;
            metaEl.innerHTML = `Soll: ${formatQty(tgt, ing.unit)}${nn > 0 ? ` · <span class="need">−${formatQty(nn, ing.unit)}</span>` : ''}`;
            showToast(`${ing.name} auf 0 gesetzt`);
          }, 600);
        };
        const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
        minusBtn.addEventListener('touchstart', startPress, { passive: true });
        minusBtn.addEventListener('touchend', cancelPress);
        minusBtn.addEventListener('touchcancel', cancelPress);
        minusBtn.addEventListener('mousedown', startPress);
        minusBtn.addEventListener('mouseup', cancelPress);
        minusBtn.addEventListener('mouseleave', cancelPress);

        group.appendChild(row);
      }
      list.appendChild(group);
    }

    $content.replaceChildren(tpl);
  };

  const consumeRecipe = (recipeKey, label) => {
    const recipe = recipes[recipeKey];
    for (const item of recipe.items) {
      state.stock[item.id] = Math.max(0, (state.stock[item.id] || 0) - item.qty);
    }
    saveState();
    showToast(`${label} – Zutaten abgezogen`);
    render();
  };

  // ---------- Today / Macros ----------
  const ensureTodayFresh = () => {
    if (state.today.date !== todayISO()) {
      const totals = sumMacrosForSnapshot(state.today);
      if (totals.kcal > 0 || totals.p > 0 || totals.kh > 0 || totals.f > 0) {
        state.history[state.today.date] = totals;
      }
      state.today = defaultToday();
      saveState();
    }
  };

  const adjustStock = (items, sign) => {
    for (const item of items) {
      state.stock[item.id] = Math.max(0, (state.stock[item.id] || 0) + sign * item.qty);
    }
  };

  const itemsForSlot = (slot, val) => {
    if (slot === 'breakfast') return breakfast[val].items;
    if (slot === 'snack1') return snack1.items;
    if (slot === 'supplements') return supplements_daily;
    return []; // mensa, powerMeal, abendessen — bereits gekocht / extern
  };

  const macrosForSlot = (slot, val) => {
    const w = planningWeek();
    if (slot === 'breakfast') return breakfast[val].macroValues;
    if (slot === 'snack1') return snack1.macroValues;
    if (slot === 'mensa') return mensa.macroValues;
    if (slot === 'powerMeal') return recipes[weeks[w].powerMeal].macroValues;
    if (slot === 'abendessen') return recipes[weeks[w].abendessen].macroValues;
    if (slot === 'supplements') return { kcal: 0, p: 0, kh: 0, f: 0 };
    return { kcal: 0, p: 0, kh: 0, f: 0 };
  };

  // Toggle ein Slot. Für breakfast: val A/B/C wählt eine Variante (mutually exclusive).
  const applyConsume = (slot, val) => {
    ensureTodayFresh();
    const c = state.today.consumed;
    if (slot === 'breakfast') {
      const current = c.breakfast;
      if (current === val) {
        adjustStock(breakfast[val].items, +1);
        c.breakfast = null;
      } else {
        if (current) adjustStock(breakfast[current].items, +1);
        adjustStock(breakfast[val].items, -1);
        c.breakfast = val;
      }
    } else {
      if (c[slot]) {
        adjustStock(itemsForSlot(slot), +1);
        c[slot] = false;
      } else {
        adjustStock(itemsForSlot(slot), -1);
        c[slot] = true;
      }
    }
    saveState();
  };

  const consumedMacros = () => {
    ensureTodayFresh();
    return sumMacrosForSnapshot(state.today);
  };

  const RECENT_EXTRAS_LIMIT = 12;

  const addExtra = (name, kcal, p, kh, f) => {
    ensureTodayFresh();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: name || 'Eintrag',
      kcal: Math.max(0, Math.round(kcal || 0)),
      p:    Math.max(0, Math.round(p    || 0)),
      kh:   Math.max(0, Math.round(kh   || 0)),
      f:    Math.max(0, Math.round(f    || 0))
    };
    state.today.extras.push(entry);
    upsertRecentExtra(entry);
    saveState();
    return entry;
  };

  const upsertRecentExtra = (entry) => {
    const key = entry.name.trim().toLowerCase();
    if (!key) return;
    const existing = state.recentExtras.findIndex(e => e.name.trim().toLowerCase() === key);
    const record = {
      name: entry.name,
      kcal: entry.kcal,
      p: entry.p,
      kh: entry.kh,
      f: entry.f,
      lastUsed: Date.now()
    };
    if (existing >= 0) state.recentExtras.splice(existing, 1);
    state.recentExtras.unshift(record);
    if (state.recentExtras.length > RECENT_EXTRAS_LIMIT) {
      state.recentExtras.length = RECENT_EXTRAS_LIMIT;
    }
  };

  const topRecentExtras = (n) => {
    return [...state.recentExtras]
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, n);
  };

  const removeExtra = (id) => {
    state.today.extras = state.today.extras.filter(e => e.id !== id);
    saveState();
  };

  const resetToday = () => {
    if (!confirm('Heute zurücksetzen? Alle abgehakten Mahlzeiten werden refundiert (Zutaten zurückgebucht).')) return;
    const c = state.today.consumed;
    if (c.breakfast) adjustStock(breakfast[c.breakfast].items, +1);
    if (c.snack1) adjustStock(snack1.items, +1);
    if (c.supplements) adjustStock(supplements_daily, +1);
    state.today = defaultToday();
    saveState();
    showToast('Heute zurückgesetzt');
    render();
  };

  const renderRecipeCard = (recipeKey, role) => {
    const recipe = recipes[recipeKey];
    const card = document.createElement('div');
    card.className = 'card';

    const ingHtml = recipe.items.map(item => {
      const ing = ingredients[item.id];
      const have = state.stock[item.id] || 0;
      const missing = have < item.qty;
      return `
        <div class="ing-name ${missing ? 'missing' : ''}">${ing.name}</div>
        <div class="ing-qty ${missing ? 'missing' : ''}">${formatQty(item.qty, ing.unit)}${missing ? ` · ${formatQty(have, ing.unit)} da` : ''}</div>
      `;
    }).join('');

    const stepsHtml = recipe.steps.map(s => `<li>${s}</li>`).join('');
    const tagClass = role === 'power' ? 'power' : 'abendessen';
    const tagText = role === 'power' ? 'Power Meal · 5 Boxen' : 'Abendessen · 5 Portionen';

    card.innerHTML = `
      <div class="card-head">
        <div>
          <h3 class="card-title">${recipe.name}</h3>
          <div class="card-sub">${recipe.tag} · ${recipe.time} · ${recipe.macros}</div>
        </div>
        <span class="card-tag ${tagClass}">${tagText}</span>
      </div>
      <div class="ing-list">${ingHtml}</div>
      <div class="btn-row">
        <button class="btn primary" data-act="cook">Kochsession durchgeführt</button>
      </div>
      <details>
        <summary>Zubereitung anzeigen</summary>
        <ol class="recipe-steps">${stepsHtml}</ol>
      </details>
    `;

    card.querySelector('[data-act="cook"]').addEventListener('click', () => {
      consumeRecipe(recipeKey, recipe.name);
    });

    return card;
  };

  const renderDailyCard = (key, def, role) => {
    const card = document.createElement('div');
    card.className = 'card';
    const ingHtml = def.items.map(item => {
      const ing = ingredients[item.id];
      const have = state.stock[item.id] || 0;
      const missing = have < item.qty;
      return `
        <div class="ing-name ${missing ? 'missing' : ''}">${ing.name}</div>
        <div class="ing-qty ${missing ? 'missing' : ''}">${formatQty(item.qty, ing.unit)}</div>
      `;
    }).join('');
    card.innerHTML = `
      <div class="card-head">
        <div>
          <h3 class="card-title">${def.name}</h3>
          <div class="card-sub">${def.macros || ''}</div>
        </div>
        <span class="card-tag">${role}</span>
      </div>
      <div class="ing-list">${ingHtml}</div>
      <div class="btn-row">
        <button class="btn" data-act="eat">Heute gegessen</button>
      </div>
    `;
    card.querySelector('[data-act="eat"]').addEventListener('click', () => {
      // Routes through today-state so macros + ingredient deduction stay in sync
      if (key === 'A' || key === 'B' || key === 'C') {
        applyConsume('breakfast', key);
        showToast(`${def.name} – heute markiert`);
      } else if (key === 'snack1') {
        applyConsume('snack1');
        showToast(state.today.consumed.snack1 ? 'Snack heute markiert' : 'Snack zurückgenommen');
      }
      render();
    });
    return card;
  };

  // ---------- Verlauf / Chart ----------
  const trendUI = { range: 'week', macro: 'kcal' };

  const isoDaysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Build entries [{ key, value, tick? }] for the requested range + macro.
  const buildTrendEntries = (range, macro) => {
    const target = APP_DATA.daily_targets[macro];
    const liveTotals = consumedMacros();
    const todayKey = todayISO();
    const valueFor = (dateKey) => {
      if (dateKey === todayKey) return liveTotals[macro] || 0;
      const h = state.history[dateKey];
      return h ? (h[macro] || 0) : 0;
    };

    if (range === 'week') {
      const dayInitials = ['So','Mo','Di','Mi','Do','Fr','Sa'];
      const entries = [];
      for (let i = 6; i >= 0; i--) {
        const key = isoDaysAgo(i);
        const date = new Date();
        date.setDate(date.getDate() - i);
        entries.push({
          key,
          value: valueFor(key),
          tick: dayInitials[date.getDay()]
        });
      }
      return { entries, target, label: macro };
    }

    if (range === 'month') {
      const entries = [];
      for (let i = 29; i >= 0; i--) {
        const key = isoDaysAgo(i);
        const date = new Date();
        date.setDate(date.getDate() - i);
        const d = date.getDate();
        entries.push({
          key,
          value: valueFor(key),
          tick: (d === 1 || d % 5 === 0) ? String(d) : ''
        });
      }
      return { entries, target, label: macro };
    }

    if (range === 'year') {
      // 12 Monate — Mittelwert über erfasste Tage je Monat
      const monthInitials = ['J','F','M','A','M','J','J','A','S','O','N','D'];
      const entries = [];
      const now = new Date();
      const todaysVal = liveTotals[macro] || 0;
      for (let i = 11; i >= 0; i--) {
        const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yr = cursor.getFullYear();
        const mo = cursor.getMonth();
        let sum = 0, count = 0;
        for (const [dateKey, h] of Object.entries(state.history)) {
          const dd = parseDate(dateKey);
          if (dd.getFullYear() === yr && dd.getMonth() === mo) {
            sum += (h[macro] || 0); count++;
          }
        }
        // Heutigen Wert für aktuellen Monat einbeziehen
        if (yr === now.getFullYear() && mo === now.getMonth() && todaysVal > 0) {
          sum += todaysVal; count++;
        }
        entries.push({
          key: `${yr}-${String(mo + 1).padStart(2, '0')}`,
          value: count > 0 ? Math.round(sum / count) : 0,
          tick: monthInitials[mo]
        });
      }
      return { entries, target, label: macro };
    }

    return { entries: [], target, label: macro };
  };

  const macroUnit = (macro) => macro === 'kcal' ? 'kcal' : 'g';

  const renderChart = (entries, target, macro) => {
    const W = 320, H = 180;
    const PAD = { t: 28, r: 10, b: 28, l: 10 };
    const chartW = W - PAD.l - PAD.r;
    const chartH = H - PAD.t - PAD.b;

    const peak = entries.reduce((m, e) => Math.max(m, e.value), 0);
    const max = Math.max(target * 1.05, peak * 1.05, target || 1);

    const slot = chartW / Math.max(1, entries.length);
    const barW = slot * 0.62;

    const targetY = PAD.t + chartH * (1 - target / max);
    const todayKey = todayISO();

    let bars = '';
    let labels = '';
    entries.forEach((e, i) => {
      const x = PAD.l + slot * i + (slot - barW) / 2;
      const h = e.value <= 0 ? 0 : Math.max(2, chartH * (e.value / max));
      const y = PAD.t + chartH - h;
      const reached = target > 0 && e.value >= target;
      const isToday = e.key === todayKey;
      const fill = reached ? 'var(--accent)' : (e.value > 0 ? 'var(--fg)' : 'var(--hairline)');
      const strokeAttr = isToday ? ' stroke="var(--ink-1)" stroke-width="1.5"' : '';
      // Empty days: tiny tick at baseline
      if (h === 0) {
        bars += `<rect x="${x}" y="${PAD.t + chartH - 1}" width="${barW}" height="1" fill="var(--hairline-strong)"/>`;
      } else {
        bars += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}"${strokeAttr}/>`;
      }
      if (e.tick) {
        const lx = PAD.l + slot * i + slot / 2;
        const ly = H - 8;
        const tickColor = isToday ? 'var(--fg)' : 'var(--fg-subtle)';
        const tickWeight = isToday ? '600' : '400';
        labels += `<text x="${lx.toFixed(2)}" y="${ly}" text-anchor="middle" fill="${tickColor}" font-size="10" font-weight="${tickWeight}" font-family="JetBrains Mono, ui-monospace, monospace">${e.tick}</text>`;
      }
    });

    const targetLine = target > 0 ? `
      <line x1="${PAD.l}" y1="${targetY.toFixed(2)}" x2="${W - PAD.r}" y2="${targetY.toFixed(2)}"
            stroke="var(--hairline-strong)" stroke-width="1" stroke-dasharray="3 3" />
      <text x="${W - PAD.r}" y="${(targetY - 6).toFixed(2)}" text-anchor="end"
            fill="var(--fg-subtle)" font-size="10" font-family="JetBrains Mono, ui-monospace, monospace">Ziel ${target} ${macroUnit(macro)}</text>
    ` : '';

    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Verlauf">
      ${targetLine}
      ${bars}
      ${labels}
    </svg>`;
  };

  const renderTrend = () => {
    const tpl = document.getElementById('tpl-trend').content.cloneNode(true);
    const frame = tpl.getElementById('chart-frame');
    const stats = tpl.getElementById('trend-stats');
    const reminderHost = tpl.getElementById('reminder-row');

    // Selectors — aria-selected reflects state
    tpl.querySelectorAll('#range-seg .seg-btn').forEach(btn => {
      btn.setAttribute('aria-selected', btn.dataset.range === trendUI.range ? 'true' : 'false');
      btn.addEventListener('click', () => { trendUI.range = btn.dataset.range; render(); });
    });
    tpl.querySelectorAll('#macro-seg .seg-btn').forEach(btn => {
      btn.setAttribute('aria-selected', btn.dataset.macro === trendUI.macro ? 'true' : 'false');
      btn.addEventListener('click', () => { trendUI.macro = btn.dataset.macro; render(); });
    });

    const { entries, target, label } = buildTrendEntries(trendUI.range, trendUI.macro);
    frame.innerHTML = renderChart(entries, target, label);

    // Statistik
    const recorded = entries.filter(e => e.value > 0);
    const avg = recorded.length ? Math.round(recorded.reduce((s, e) => s + e.value, 0) / recorded.length) : 0;
    const max = recorded.reduce((m, e) => e.value > m.value ? e : m, { value: 0, key: '' });
    const reachedCount = entries.filter(e => target > 0 && e.value >= target).length;

    const rangeName = trendUI.range === 'week' ? '7 Tage' : trendUI.range === 'month' ? '30 Tage' : '12 Monate';
    const unit = macroUnit(trendUI.macro);
    stats.innerHTML = `
      <div class="trend-stat"><span class="label">Durchschnitt</span><span class="val"><strong>${avg}</strong> ${unit}</span></div>
      <div class="trend-stat"><span class="label">Erfasst</span><span class="val"><strong>${recorded.length}</strong> / ${entries.length}</span></div>
      <div class="trend-stat"><span class="label">Ziel erreicht</span><span class="val"><strong>${reachedCount}</strong> ${trendUI.range === 'year' ? 'Mon.' : 'Tg.'}</span></div>
      <div class="trend-stat"><span class="label">Bestwert</span><span class="val"><strong>${max.value || 0}</strong> ${unit}</span></div>
    `;

    // Reminder UI (siehe renderReminder weiter unten)
    renderReminderRow(reminderHost);

    $content.replaceChildren(tpl);
  };

  const renderToday = () => {
    ensureTodayFresh();
    const tpl = document.getElementById('tpl-today').content.cloneNode(true);
    const dateLabel = tpl.getElementById('today-date');
    const bars = tpl.getElementById('macro-bars');
    const list = tpl.getElementById('today-list');
    const resetBtn = tpl.getElementById('today-reset');

    // Datum
    const days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    const d = new Date();
    dateLabel.textContent = `${days[d.getDay()]} · ${d.getDate()}. ${months[d.getMonth()]}`;

    // Macro-Balken
    const totals = consumedMacros();
    const macroDefs = [
      { key: 'kcal', label: 'kcal',    unit: ''  },
      { key: 'p',    label: 'Protein', unit: 'g' },
      { key: 'kh',   label: 'KH',      unit: 'g' },
      { key: 'f',    label: 'Fett',    unit: 'g' }
    ];
    for (const m of macroDefs) {
      const cur = totals[m.key];
      const tgt = daily_targets[m.key];
      const pct = Math.min(100, Math.round(cur / tgt * 100));
      const reachedTarget = cur >= tgt;
      const bar = document.createElement('div');
      bar.className = 'macro-bar' + (reachedTarget ? ' done' : '');
      bar.innerHTML = `
        <div class="macro-head">
          <span class="macro-label">${m.label}</span>
          <span class="macro-value"><strong>${cur}</strong>${m.unit} <span class="dim">/ ${tgt}${m.unit}</span></span>
        </div>
        <div class="macro-track"><div class="macro-fill" style="width:${pct}%"></div></div>
      `;
      bars.appendChild(bar);
    }

    // Tagesplan-Liste
    const w = planningWeek();
    const c = state.today.consumed;
    const pmRecipe = recipes[weeks[w].powerMeal];
    const abRecipe = recipes[weeks[w].abendessen];

    const macroChip = (m) => `<span class="today-macros">${m.kcal} kcal · ${m.p}g P</span>`;

    const makeRow = (slot, label, sub, isOn, macros, onToggle) => {
      const row = document.createElement('div');
      row.className = 'today-row' + (isOn ? ' on' : '');
      row.innerHTML = `
        <div class="today-info">
          <div class="today-label">${label}</div>
          <div class="today-sub">${sub}</div>
          ${macros ? macroChip(macros) : ''}
        </div>
        <div class="today-toggle ${isOn ? 'on' : ''}" role="checkbox" aria-checked="${isOn}" tabindex="0"></div>
      `;
      const t = row.querySelector('.today-toggle');
      const handler = () => { onToggle(); render(); };
      t.addEventListener('click', handler);
      t.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handler(); } });
      return row;
    };

    // Frühstück (Variante wählen)
    const bfRow = document.createElement('div');
    bfRow.className = 'today-row breakfast' + (c.breakfast ? ' on' : '');
    const bfMacros = c.breakfast ? breakfast[c.breakfast].macroValues : null;
    const bfSub = c.breakfast ? breakfast[c.breakfast].name : 'A · Overnight Oats   B · Rührei   C · Quark-Bowl';
    const variantBtns = ['A','B','C'].map(v =>
      `<button type="button" class="variant-btn${c.breakfast === v ? ' on' : ''}" data-variant="${v}">${v}</button>`
    ).join('');
    bfRow.innerHTML = `
      <div class="today-info">
        <div class="today-label">Frühstück</div>
        <div class="today-sub">${bfSub}</div>
        ${bfMacros ? macroChip(bfMacros) : ''}
      </div>
      <div class="variant-group">${variantBtns}</div>
    `;
    bfRow.querySelectorAll('.variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyConsume('breakfast', btn.dataset.variant);
        render();
      });
    });
    list.appendChild(bfRow);

    list.appendChild(makeRow('snack1',     'Snack 1',      snack1.name,         c.snack1,      snack1.macroValues,    () => applyConsume('snack1')));
    list.appendChild(makeRow('mensa',      'Mensa Mittag', mensa.note,          c.mensa,       mensa.macroValues,     () => applyConsume('mensa')));
    list.appendChild(makeRow('powerMeal',  'Power Meal',   pmRecipe.name,       c.powerMeal,   pmRecipe.macroValues,  () => applyConsume('powerMeal')));
    list.appendChild(makeRow('abendessen', 'Abendessen',   abRecipe.name,       c.abendessen,  abRecipe.macroValues,  () => applyConsume('abendessen')));
    list.appendChild(makeRow('supplements','Supplements',  'Kreatin · D3+K2 · Omega-3', c.supplements, null,            () => applyConsume('supplements')));

    // Eigene Einträge — Section direkt an den Panel-Wrapper hängen
    const panel = list.parentNode;

    const extrasSection = document.createElement('div');
    extrasSection.className = 'section-title';
    extrasSection.textContent = 'Eigene Einträge';

    const extrasList = document.createElement('div');
    extrasList.id = 'extras-list';
    for (const e of state.today.extras) {
      const row = document.createElement('div');
      row.className = 'extra-row';
      row.innerHTML = `
        <div class="extra-info">
          <div class="extra-name">${escapeHtml(e.name)}</div>
          <div class="extra-macros">${e.kcal} kcal · ${e.p}g P · ${e.kh}g KH · ${e.f}g F</div>
        </div>
        <button class="extra-del" type="button" aria-label="Eintrag löschen">×</button>
      `;
      row.querySelector('.extra-del').addEventListener('click', () => {
        removeExtra(e.id);
        render();
      });
      extrasList.appendChild(row);
    }

    // Quick-Add-Chips (zuletzt genutzte Einträge)
    const recents = topRecentExtras(6);
    if (recents.length > 0) {
      const chipsRow = document.createElement('div');
      chipsRow.className = 'extra-chips';
      chipsRow.innerHTML = recents.map(r =>
        `<button type="button" class="chip" data-name="${escapeHtml(r.name)}" data-kcal="${r.kcal}" data-p="${r.p}" data-kh="${r.kh}" data-f="${r.f}">
          <span class="chip-name">${escapeHtml(r.name)}</span>
          <span class="chip-kcal">${r.kcal}</span>
        </button>`
      ).join('');
      chipsRow.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const e = addExtra(
            btn.dataset.name,
            parseInt(btn.dataset.kcal, 10),
            parseInt(btn.dataset.p, 10),
            parseInt(btn.dataset.kh, 10),
            parseInt(btn.dataset.f, 10)
          );
          showToast(`${e.name} +${e.kcal} kcal`);
          render();
        });
      });
      extrasList.appendChild(chipsRow);
    }

    // Add-Form (collapsed by default)
    const addRow = document.createElement('div');
    addRow.className = 'extra-add';
    addRow.innerHTML = `
      <button class="extra-add-btn" type="button" data-act="open-form">+ Eintrag hinzufügen</button>
      <form class="extra-form" hidden novalidate>
        <label class="extra-field"><span class="label">Name</span>
          <input name="name" type="text" autocomplete="off" placeholder="z. B. Pizza Margherita" />
        </label>
        <div class="extra-macro-grid">
          <label class="extra-field"><span class="label">kcal</span>
            <input name="kcal" type="number" inputmode="numeric" min="0" step="1" required />
          </label>
          <label class="extra-field"><span class="label">Protein</span>
            <input name="p" type="number" inputmode="numeric" min="0" step="1" />
          </label>
          <label class="extra-field"><span class="label">KH</span>
            <input name="kh" type="number" inputmode="numeric" min="0" step="1" />
          </label>
          <label class="extra-field"><span class="label">Fett</span>
            <input name="f" type="number" inputmode="numeric" min="0" step="1" />
          </label>
        </div>
        <div class="extra-form-actions">
          <button type="button" class="btn" data-act="cancel">Abbrechen</button>
          <button type="submit" class="btn primary">Hinzufügen</button>
        </div>
      </form>
    `;
    const openBtn = addRow.querySelector('[data-act="open-form"]');
    const form = addRow.querySelector('.extra-form');
    const cancelBtn = addRow.querySelector('[data-act="cancel"]');

    openBtn.addEventListener('click', () => {
      openBtn.hidden = true;
      form.hidden = false;
      form.querySelector('input[name="name"]').focus();
    });
    cancelBtn.addEventListener('click', () => {
      form.reset();
      form.hidden = true;
      openBtn.hidden = false;
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const kcal = parseInt(fd.get('kcal'), 10);
      if (!kcal || kcal <= 0) {
        form.querySelector('input[name="kcal"]').focus();
        return;
      }
      const entry = addExtra(
        (fd.get('name') || '').trim(),
        kcal,
        parseInt(fd.get('p'),  10),
        parseInt(fd.get('kh'), 10),
        parseInt(fd.get('f'),  10)
      );
      showToast(`${entry.name} +${entry.kcal} kcal`);
      render();
    });

    extrasList.appendChild(addRow);

    panel.appendChild(extrasSection);
    panel.appendChild(extrasList);

    resetBtn.addEventListener('click', resetToday);

    $content.replaceChildren(tpl);
  };

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const renderWeek = () => {
    const tpl = document.getElementById('tpl-week').content.cloneNode(true);
    const meals = tpl.getElementById('week-meals');
    const daily = tpl.getElementById('daily-meals');
    const rotEl = tpl.getElementById('rotation-overview');

    const w = planningWeek();
    const wDef = weeks[w];

    meals.appendChild(renderRecipeCard(wDef.powerMeal, 'power'));
    meals.appendChild(renderRecipeCard(wDef.abendessen, 'abendessen'));

    // Tagesbasis: Frühstück A/B/C + Snack 1
    daily.appendChild(renderDailyCard('A', breakfast.A, 'Frühstück A'));
    daily.appendChild(renderDailyCard('B', breakfast.B, 'Frühstück B'));
    daily.appendChild(renderDailyCard('C', breakfast.C, 'Frühstück C'));
    daily.appendChild(renderDailyCard('snack1', snack1, 'Snack 1'));

    // Rotation Overview — Wochenfarbe als kleines Swatch (data, not chrome)
    const grid = document.createElement('div');
    grid.className = 'rotation-grid';
    for (let i = 1; i <= 4; i++) {
      const wd = weeks[i];
      const pm = recipes[wd.powerMeal];
      const ab = recipes[wd.abendessen];
      const row = document.createElement('div');
      row.className = 'rot-row' + (i === w ? ' current' : '');
      row.style.setProperty('--week-tone', wd.color);
      row.innerHTML = `
        <div class="rot-num">${i}</div>
        <div class="rot-meals">
          <div class="pm">${pm.name}</div>
          <div class="ab">${ab.name}</div>
          <div class="small"><span class="week-swatch" style="background:${wd.color}"></span>${wd.name}</div>
        </div>
      `;
      grid.appendChild(row);
    }
    rotEl.appendChild(grid);

    $content.replaceChildren(tpl);
  };

  const render = () => {
    applyWeekTheme();
    if (state.activeTab === 'shopping') renderShopping();
    else if (state.activeTab === 'today') renderToday();
    else if (state.activeTab === 'trend') renderTrend();
    else if (state.activeTab === 'stock') renderStock();
    else if (state.activeTab === 'week') renderWeek();
  };

  // ---------- Reminder (20:00 nightly missing-macros notification) ----------
  const NOTIFICATION_TAG = 'mealplan-evening';
  const hasNotificationAPI = () => 'Notification' in window;
  const hasTimestampTrigger = () => 'TimestampTrigger' in window;
  let foregroundReminderTimer = null;

  const buildReminderBody = () => {
    const totals = sumMacrosForSnapshot(state.today);
    const t = APP_DATA.daily_targets;
    const missing = {
      kcal: Math.max(0, t.kcal - totals.kcal),
      p:    Math.max(0, t.p - totals.p),
      kh:   Math.max(0, t.kh - totals.kh),
      f:    Math.max(0, t.f - totals.f)
    };
    if (missing.kcal === 0 && missing.p === 0 && missing.kh === 0 && missing.f === 0) {
      return 'Tagesziel erreicht. ✓';
    }
    const parts = [];
    if (missing.kcal > 0) parts.push(`${missing.kcal} kcal`);
    if (missing.p > 0)    parts.push(`${missing.p}g Protein`);
    if (missing.kh > 0)   parts.push(`${missing.kh}g KH`);
    if (missing.f > 0)    parts.push(`${missing.f}g Fett`);
    return `Heute fehlen: ${parts.join(' · ')}.`;
  };

  const nextReminderTimestamp = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(state.settings.reminderHour, state.settings.reminderMinute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime();
  };

  const cancelReminder = async () => {
    if (foregroundReminderTimer) {
      clearTimeout(foregroundReminderTimer);
      foregroundReminderTimer = null;
    }
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.getNotifications({ tag: NOTIFICATION_TAG, includeTriggered: true });
      existing.forEach(n => n.close());
    } catch {}
  };

  const scheduleReminder = async () => {
    await cancelReminder();
    if (!state.settings.reminderEnabled) return;
    if (!hasNotificationAPI() || Notification.permission !== 'granted') return;

    const ts = nextReminderTimestamp();

    // Preferred path: schedule via service worker + TimestampTrigger
    // (fires even when the app is closed — Chrome on Android only).
    if (hasTimestampTrigger() && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('Mealplan · Tagesziel', {
          tag: NOTIFICATION_TAG,
          body: buildReminderBody(),
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          showTrigger: new TimestampTrigger(ts),
          data: { url: location.origin + location.pathname }
        });
        return;
      } catch (e) { /* fall through to setTimeout */ }
    }

    // Fallback: foreground-only setTimeout (only fires while app is open).
    foregroundReminderTimer = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('Mealplan · Tagesziel', {
          tag: NOTIFICATION_TAG,
          body: buildReminderBody(),
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          data: { url: location.origin + location.pathname }
        });
      } catch {
        new Notification('Mealplan · Tagesziel', { body: buildReminderBody(), icon: 'icons/icon-192.png' });
      }
      // Re-schedule for next day
      scheduleReminder();
    }, ts - Date.now());
  };

  const enableReminder = async () => {
    if (!hasNotificationAPI()) {
      showToast('Browser unterstützt keine Benachrichtigungen');
      return false;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      try { perm = await Notification.requestPermission(); }
      catch { perm = 'denied'; }
    }
    if (perm !== 'granted') {
      showToast('Erlaubnis abgelehnt');
      return false;
    }
    state.settings.reminderEnabled = true;
    saveState();
    await scheduleReminder();
    showToast('Erinnerung aktiviert · 20:00');
    return true;
  };

  const disableReminder = async () => {
    state.settings.reminderEnabled = false;
    saveState();
    await cancelReminder();
    showToast('Erinnerung deaktiviert');
  };

  const renderReminderRow = (host) => {
    const enabled = state.settings.reminderEnabled;
    const supported = hasNotificationAPI();
    const permGranted = supported && Notification.permission === 'granted';
    const reliable = hasTimestampTrigger();

    const status = !supported
      ? 'Browser unterstützt keine Benachrichtigungen.'
      : !permGranted
        ? 'Tipp den Schalter, um Benachrichtigungen zu erlauben.'
        : reliable
          ? '20:00 · feuert auch bei geschlossener App.'
          : '20:00 · nur während die App geöffnet ist (Browser-Limit).';

    host.innerHTML = `
      <div class="reminder">
        <div class="reminder-info">
          <div class="reminder-title">Abends 20:00 fehlende Macros</div>
          <div class="reminder-status">${status}</div>
        </div>
        <button type="button" class="switch ${enabled ? 'on' : ''}" role="switch" aria-checked="${enabled}" ${supported ? '' : 'disabled'}>
          <span class="switch-thumb"></span>
        </button>
      </div>
      ${enabled && permGranted ? `
        <button type="button" class="link-btn" id="reminder-test">Probe-Benachrichtigung</button>
      ` : ''}
    `;
    const sw = host.querySelector('.switch');
    sw.addEventListener('click', async () => {
      if (sw.disabled) return;
      if (!enabled) {
        const ok = await enableReminder();
        if (ok) render();
      } else {
        await disableReminder();
        render();
      }
    });
    const test = host.querySelector('#reminder-test');
    if (test) {
      test.addEventListener('click', async () => {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification('Mealplan · Tagesziel', {
            tag: NOTIFICATION_TAG + '-test',
            body: buildReminderBody(),
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            data: { url: location.origin + location.pathname }
          });
        } catch {
          new Notification('Mealplan · Tagesziel', { body: buildReminderBody(), icon: 'icons/icon-192.png' });
        }
      });
    }
  };

  // ---------- Tabs ----------
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      state.activeTab = t;
      saveState();
      document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === tab ? 'true' : 'false'));
      render();
    });
  });
  // Initial: aktiven Tab markieren
  document.querySelectorAll('.tab').forEach(x => {
    x.setAttribute('aria-selected', x.dataset.tab === state.activeTab ? 'true' : 'false');
  });

  // ---------- Reset ----------
  document.getElementById('reset-stock').addEventListener('click', () => {
    if (!confirm('Vorrat auf Soll-Bestand der aktuellen Woche setzen? (Großeinkauf erledigt)')) return;
    const target = targetFor(planningWeek());
    state.stock = { ...defaultStock(), ...target };
    saveState();
    showToast('Vorrat auf Soll gesetzt');
    render();
  });

  // ---------- SW Registration + Reminder schedule ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try { await navigator.serviceWorker.register('service-worker.js'); } catch {}
      // Re-arm the reminder on every app open if it was previously enabled.
      if (state.settings.reminderEnabled) scheduleReminder();
    });
  }

  // ---------- First render ----------
  render();
})();
