// === Mealplan App · Logic ===
(() => {
  const { ingredients, recipes, weeks, breakfast, snack1, supplements_daily,
          categoryLabels, categoryOrder, anchor } = APP_DATA;

  const STORAGE_KEY = 'mealplan_v1';

  // ---------- State ----------
  const defaultStock = () => {
    const s = {};
    for (const id of Object.keys(ingredients)) s[id] = 0;
    return s;
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { stock: defaultStock(), activeTab: 'shopping' };
      const parsed = JSON.parse(raw);
      // Migration: ensure all current ingredients have a slot
      const stock = defaultStock();
      Object.assign(stock, parsed.stock || {});
      return { stock, activeTab: parsed.activeTab || 'shopping' };
    } catch { return { stock: defaultStock(), activeTab: 'shopping' }; }
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

  const consumeMeal = (items, label) => {
    for (const item of items) {
      state.stock[item.id] = Math.max(0, (state.stock[item.id] || 0) - item.qty);
    }
    saveState();
    showToast(`${label} – Zutaten abgezogen`);
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
      consumeMeal(def.items, def.name);
    });
    return card;
  };

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
    else if (state.activeTab === 'stock') renderStock();
    else if (state.activeTab === 'week') renderWeek();
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

  // ---------- SW Registration ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }

  // ---------- First render ----------
  render();
})();
