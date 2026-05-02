// Meal Plan Data — Stand April 2026
// Quelle: Mealplan_Nils.pdf (4-Wochen-Rotation, Muskelaufbau)

const APP_DATA = {
  // Anker: Mo der ersten Rotationswoche
  anchor: '2026-05-04',

  weeks: {
    1: { color: '#C66E3A', name: 'Terracotta', powerMeal: 'huehnchen-reis-brokkoli', abendessen: 'bolognese' },
    2: { color: '#8C2A2D', name: 'Bordeaux',   powerMeal: 'putenhack-suesskartoffel', abendessen: 'linsen-curry' },
    3: { color: '#6B8E5A', name: 'Salbei',     powerMeal: 'lachs-ofen',              abendessen: 'chili-con-carne' },
    4: { color: '#C99A2E', name: 'Senfgelb',   powerMeal: 'kichererbsen-bulgur',     abendessen: 'haehnchen-geschnetzelt' }
  },

  // Master-Liste aller Zutaten
  // baseTarget = Grundbestand (jede Woche gebraucht, z.B. Frühstück/Snack/Vorrat)
  // Rezept-spezifische Mengen kommen on-top, je nach Rotationswoche.
  ingredients: {
    // === FRISCHE (Donnerstag) ===
    eier:            { name: 'Eier',                     unit: 'Stk',    category: 'frische',    baseTarget: 10,   day: 'Do' },
    magerquark:      { name: 'Magerquark',               unit: 'g',      category: 'frische',    baseTarget: 1000, day: 'Do' },
    skyr:            { name: 'Skyr',                     unit: 'g',      category: 'frische',    baseTarget: 500,  day: 'Do' },
    vollkornbrot:    { name: 'Vollkornbrot',             unit: 'Sch',    category: 'frische',    baseTarget: 14,   day: 'Do' },
    bananen:         { name: 'Bananen',                  unit: 'Stk',    category: 'frische',    baseTarget: 12,   day: 'Do' },
    aepfel:          { name: 'Äpfel',                    unit: 'Stk',    category: 'frische',    baseTarget: 5,    day: 'Do' },
    avocado:         { name: 'Avocado',                  unit: 'Stk',    category: 'frische',    baseTarget: 2,    day: 'Do' },
    salatgurke:      { name: 'Salatgurke',               unit: 'Stk',    category: 'frische',    baseTarget: 1,    day: 'Do' },
    tomaten_frisch:  { name: 'Tomaten (frisch)',         unit: 'Stk',    category: 'frische',    baseTarget: 4,    day: 'Do' },
    zwiebeln:        { name: 'Zwiebeln',                 unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    knoblauch:       { name: 'Knoblauch',                unit: 'Zehe',   category: 'frische',    baseTarget: 0,    day: 'Do' },
    ingwer:          { name: 'Ingwer',                   unit: 'cm',     category: 'frische',    baseTarget: 0,    day: 'Do' },
    zitrone:         { name: 'Zitrone',                  unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    limette:         { name: 'Limette',                  unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    petersilie:      { name: 'Petersilie',               unit: 'Bund',   category: 'frische',    baseTarget: 0,    day: 'Do' },
    brokkoli:        { name: 'Brokkoli',                 unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    karotten:        { name: 'Karotten',                 unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    paprika:         { name: 'Paprika',                  unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    sellerie:        { name: 'Sellerie/Lauch',           unit: 'Stange', category: 'frische',    baseTarget: 0,    day: 'Do' },
    suesskartoffeln: { name: 'Süßkartoffeln',            unit: 'g',      category: 'frische',    baseTarget: 0,    day: 'Do' },
    kartoffeln:      { name: 'Kartoffeln (festkochend)', unit: 'g',      category: 'frische',    baseTarget: 0,    day: 'Do' },
    zucchini:        { name: 'Zucchini',                 unit: 'Stk',    category: 'frische',    baseTarget: 0,    day: 'Do' },
    champignons:     { name: 'Champignons',              unit: 'g',      category: 'frische',    baseTarget: 0,    day: 'Do' },
    sahne:           { name: 'Sahne (oder Hafercreme)',  unit: 'ml',     category: 'frische',    baseTarget: 0,    day: 'Do' },
    frischkaese:     { name: 'Frischkäse',               unit: 'g',      category: 'frische',    baseTarget: 100,  day: 'Do' },

    // === PROTEIN (Samstag) ===
    haehnchenbrust:  { name: 'Hähnchenbrust',            unit: 'g',      category: 'protein',    baseTarget: 0,    day: 'Sa' },
    rinderhack:      { name: 'Rinderhack',               unit: 'g',      category: 'protein',    baseTarget: 0,    day: 'Sa' },
    putenhack:       { name: 'Putenhack',                unit: 'g',      category: 'protein',    baseTarget: 0,    day: 'Sa' },
    lammhack:        { name: 'Rinder-/Lammhack',         unit: 'g',      category: 'protein',    baseTarget: 0,    day: 'Sa' },

    // === TROCKEN (Samstag) ===
    haferflocken:    { name: 'Haferflocken',             unit: 'g',      category: 'trocken',    baseTarget: 1000, day: 'Sa' },
    reis_basmati:    { name: 'Reis (Basmati/Vollkorn)',  unit: 'g',      category: 'trocken',    baseTarget: 1000, day: 'Sa' },
    bulgur:          { name: 'Bulgur',                   unit: 'g',      category: 'trocken',    baseTarget: 0,    day: 'Sa' },
    linsen_rot:      { name: 'Rote Linsen',              unit: 'g',      category: 'trocken',    baseTarget: 0,    day: 'Sa' },
    vollkornpasta:   { name: 'Vollkornpasta',            unit: 'g',      category: 'trocken',    baseTarget: 500,  day: 'Sa' },
    mandeln:         { name: 'Mandeln',                  unit: 'g',      category: 'trocken',    baseTarget: 200,  day: 'Sa' },
    walnuesse:       { name: 'Walnüsse',                 unit: 'g',      category: 'trocken',    baseTarget: 200,  day: 'Sa' },
    mehl:            { name: 'Mehl',                     unit: 'g',      category: 'trocken',    baseTarget: 500,  day: 'Sa' },
    sesam:           { name: 'Sesam',                    unit: 'g',      category: 'trocken',    baseTarget: 50,   day: 'Sa' },

    // === KONSERVEN (Samstag) ===
    tomaten_pass:    { name: 'Tomaten passiert',         unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    tomaten_gehackt: { name: 'Tomaten gehackt',          unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    tomatenmark:     { name: 'Tomatenmark',              unit: 'g',      category: 'konserve',   baseTarget: 200,  day: 'Sa' },
    kokosmilch:      { name: 'Kokosmilch',               unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    kidneybohnen:    { name: 'Kidneybohnen',             unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    schwarze_bohnen: { name: 'Schwarze Bohnen',          unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    mais:            { name: 'Mais',                     unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },
    kichererbsen:    { name: 'Kichererbsen',             unit: 'Dose',   category: 'konserve',   baseTarget: 0,    day: 'Sa' },

    // === TK ===
    lachs_tk:        { name: 'TK-Lachs (Filet)',         unit: 'g',      category: 'tk',         baseTarget: 0,    day: 'Sa' },
    tk_mix_gemuese:  { name: 'TK-Mix-Gemüse',            unit: 'g',      category: 'tk',         baseTarget: 1000, day: 'Sa' },
    tk_spinat:       { name: 'TK-Spinat',                unit: 'g',      category: 'tk',         baseTarget: 0,    day: 'Sa' },
    tk_beeren:       { name: 'TK-Beeren',                unit: 'g',      category: 'tk',         baseTarget: 300,  day: 'Do' },

    // === GEWÜRZE / VORRAT (Samstag, langlebig) ===
    olivenoel:       { name: 'Olivenöl',                 unit: 'ml',     category: 'gewuerz',    baseTarget: 500,  day: 'Sa' },
    sesamoel:        { name: 'Sesamöl',                  unit: 'ml',     category: 'gewuerz',    baseTarget: 100,  day: 'Sa' },
    sojasauce:       { name: 'Sojasauce',                unit: 'ml',     category: 'gewuerz',    baseTarget: 200,  day: 'Sa' },
    honig:           { name: 'Honig',                    unit: 'g',      category: 'gewuerz',    baseTarget: 250,  day: 'Sa' },
    currypaste:      { name: 'Currypaste',               unit: 'g',      category: 'gewuerz',    baseTarget: 0,    day: 'Sa' },
    senf:            { name: 'Senf',                     unit: 'g',      category: 'gewuerz',    baseTarget: 100,  day: 'Sa' },
    bruehe:          { name: 'Brühe',                    unit: 'ml',     category: 'gewuerz',    baseTarget: 500,  day: 'Sa' },
    rotwein:         { name: 'Rotwein (oder Brühe)',     unit: 'ml',     category: 'gewuerz',    baseTarget: 0,    day: 'Sa' },

    // === SUPPLEMENTS ===
    whey:            { name: 'Whey Protein',             unit: 'g',      category: 'supplement', baseTarget: 1000, day: 'Sa' },
    kreatin:         { name: 'Kreatin Monohydrat',       unit: 'g',      category: 'supplement', baseTarget: 300,  day: 'Sa' },
    vit_d_k:         { name: 'Vit D3+K2',                unit: 'Tab',    category: 'supplement', baseTarget: 30,   day: 'Sa' },
    omega3:          { name: 'Omega-3',                  unit: 'Kap',    category: 'supplement', baseTarget: 60,   day: 'Sa' }
  },

  // Tagesziel — Muskelaufbau-Bulk, Studentenalltag mit Kraftsport
  daily_targets: { kcal: 3000, p: 170, kh: 350, f: 90 },

  // Mensa-Mittag — geschätzte Macros (siehe Plan: ~800–900 kcal · 40–50g P)
  mensa: {
    name: 'Mensa Mittag',
    macros: '~850 kcal · 45g P · 100g KH · 25g F',
    macroValues: { kcal: 850, p: 45, kh: 100, f: 25 },
    items: [],
    note: 'Mo–Fr · proteinreichstes Hauptgericht wählen'
  },

  // Frühstück: 3 Varianten (frei wählbar)
  breakfast: {
    A: {
      name: 'Overnight Oats',
      macros: '~700 kcal · 45g P · 90g KH · 18g F',
      macroValues: { kcal: 700, p: 45, kh: 90, f: 18 },
      items: [
        { id: 'haferflocken', qty: 80 },
        { id: 'skyr',         qty: 200 },
        { id: 'bananen',      qty: 1 },
        { id: 'mandeln',      qty: 30 },
        { id: 'honig',        qty: 20 },
        { id: 'tk_beeren',    qty: 40 }
      ]
    },
    B: {
      name: 'Rührei + Brot',
      macros: '~600 kcal · 32g P · 35g KH · 35g F',
      macroValues: { kcal: 600, p: 32, kh: 35, f: 35 },
      items: [
        { id: 'eier',         qty: 4 },
        { id: 'vollkornbrot', qty: 2 },
        { id: 'avocado',      qty: 0.5 }
      ]
    },
    C: {
      name: 'Quark-Bowl',
      macros: '~650 kcal · 50g P · 70g KH · 15g F',
      macroValues: { kcal: 650, p: 50, kh: 70, f: 15 },
      items: [
        { id: 'magerquark',   qty: 250 },
        { id: 'haferflocken', qty: 60 },
        { id: 'walnuesse',    qty: 30 },
        { id: 'tk_beeren',    qty: 40 },
        { id: 'honig',        qty: 20 }
      ]
    }
  },

  snack1: {
    name: 'Snack 1 (Atelier)',
    macros: '~500 kcal · 32g P · 50g KH · 18g F',
    macroValues: { kcal: 500, p: 32, kh: 50, f: 18 },
    items: [
      { id: 'whey',      qty: 30 },
      { id: 'bananen',   qty: 1 },
      { id: 'mandeln',   qty: 20 },
      { id: 'walnuesse', qty: 20 }
    ]
  },

  // Tägliche Supplements (Kreatin + D3+K2 + Omega-3)
  supplements_daily: [
    { id: 'kreatin', qty: 5 },
    { id: 'vit_d_k', qty: 1 },
    { id: 'omega3',  qty: 2 }
  ],

  // Rezepte (1 Batch = 5 Portionen)
  recipes: {
    'huehnchen-reis-brokkoli': {
      name: 'Hähnchen-Reis-Brokkoli-Bowl',
      type: 'power', portions: 5, week: 1,
      tag: 'Asia Honig-Soja',
      macros: '~620 kcal · 45g P · 75g KH · 12g F',
      macroValues: { kcal: 620, p: 45, kh: 75, f: 12 },
      time: '~45 Min',
      items: [
        { id: 'haehnchenbrust', qty: 600 },
        { id: 'reis_basmati',   qty: 400 },
        { id: 'brokkoli',       qty: 1 },
        { id: 'karotten',       qty: 2 },
        { id: 'sojasauce',      qty: 60 },
        { id: 'honig',          qty: 40 },
        { id: 'sesamoel',       qty: 15 },
        { id: 'knoblauch',      qty: 2 },
        { id: 'ingwer',         qty: 3 },
        { id: 'sesam',          qty: 5 }
      ],
      steps: [
        'Reis in 800 ml Wasser mit Salz aufsetzen, 12 Min köcheln, ziehen lassen.',
        'Hähnchenbrust in Streifen schneiden, mit Salz/Pfeffer würzen.',
        'Brokkoli in Röschen, Karotten in Stifte. Beides 5 Min in kochendem Wasser blanchieren.',
        'Knoblauch + Ingwer fein hacken. In Pfanne mit Sesamöl 30 Sek anbraten.',
        'Hähnchen scharf anbraten (5–6 Min).',
        'Sojasauce + Honig dazugeben, kurz karamellisieren lassen.',
        'Reis, Hähnchen, Gemüse in 5 Boxen aufteilen. Mit Sesam bestreuen.'
      ]
    },
    'bolognese': {
      name: 'Bolognese mit Vollkornpasta',
      type: 'abendessen', portions: 5, week: 1,
      tag: 'Klassisch italienisch',
      macros: '~700 kcal · 42g P · 75g KH · 22g F',
      macroValues: { kcal: 700, p: 42, kh: 75, f: 22 },
      time: '~50 Min',
      items: [
        { id: 'rinderhack',     qty: 500 },
        { id: 'tomaten_pass',   qty: 2 },
        { id: 'zwiebeln',       qty: 2 },
        { id: 'knoblauch',      qty: 3 },
        { id: 'karotten',       qty: 2 },
        { id: 'sellerie',       qty: 2 },
        { id: 'tomatenmark',    qty: 45 },
        { id: 'rotwein',        qty: 200 },
        { id: 'vollkornpasta',  qty: 500 }
      ],
      steps: [
        'Zwiebeln, Knoblauch, Karotten, Sellerie fein hacken.',
        'Mit Olivenöl 5 Min anschwitzen.',
        'Hack zugeben, krümelig anbraten (8 Min).',
        'Tomatenmark einrühren, 1 Min anrösten.',
        'Mit Rotwein ablöschen.',
        'Passierte Tomaten zugeben. 30 Min köcheln, würzen.',
        'In 5 Portionen aufteilen, kalt stellen. Pasta jeweils frisch kochen.'
      ]
    },
    'putenhack-suesskartoffel': {
      name: 'Putenhack-Süßkartoffel-Paprika',
      type: 'power', portions: 5, week: 2,
      tag: 'Mediterran-pikant',
      macros: '~580 kcal · 42g P · 65g KH · 14g F',
      macroValues: { kcal: 580, p: 42, kh: 65, f: 14 },
      time: '~50 Min',
      items: [
        { id: 'putenhack',       qty: 600 },
        { id: 'suesskartoffeln', qty: 1200 },
        { id: 'paprika',         qty: 3 },
        { id: 'zwiebeln',        qty: 2 },
        { id: 'knoblauch',       qty: 2 }
      ],
      steps: [
        'Süßkartoffeln schälen, in 2 cm Würfel. Mit Olivenöl + Gewürzen mischen.',
        'Auf Blech bei 200 °C ~30 Min im Ofen rösten (1× wenden).',
        'Zwiebeln + Knoblauch hacken, in Pfanne anbraten.',
        'Putenhack zugeben, krümelig braten (5 Min).',
        'Paprika in Streifen, dazugeben, 5 Min mitbraten.',
        'Mit Paprikapulver, Kreuzkümmel würzen.',
        'Süßkartoffeln + Hack-Mix in Boxen aufteilen.'
      ]
    },
    'linsen-curry': {
      name: 'Linsen-Kokos-Curry mit Reis',
      type: 'abendessen', portions: 5, week: 2,
      tag: 'Vegetarisch, sättigend',
      macros: '~650 kcal · 28g P · 90g KH · 18g F',
      macroValues: { kcal: 650, p: 28, kh: 90, f: 18 },
      time: '~35 Min',
      items: [
        { id: 'linsen_rot',   qty: 400 },
        { id: 'kokosmilch',   qty: 2 },
        { id: 'tomaten_pass', qty: 1 },
        { id: 'zwiebeln',     qty: 2 },
        { id: 'knoblauch',    qty: 3 },
        { id: 'ingwer',       qty: 3 },
        { id: 'currypaste',   qty: 30 },
        { id: 'tk_spinat',    qty: 250 },
        { id: 'limette',      qty: 1 },
        { id: 'reis_basmati', qty: 400 }
      ],
      steps: [
        'Reis kochen (12 Min).',
        'Zwiebeln, Knoblauch, Ingwer hacken. In Topf mit Öl anbraten.',
        'Currypaste + Kurkuma zugeben, 1 Min rösten.',
        'Linsen + 600 ml Wasser + Tomaten + Kokosmilch zugeben.',
        '20 Min köcheln, bis Linsen weich.',
        'Spinat unterrühren, kurz mitziehen.',
        'Mit Limette und Salz abschmecken. In 5 Portionen aufteilen.'
      ]
    },
    'lachs-ofen': {
      name: 'Lachs mit Kartoffeln & Ofengemüse',
      type: 'power', portions: 5, week: 3,
      tag: 'Omega-3-Boost',
      macros: '~680 kcal · 38g P · 65g KH · 28g F',
      macroValues: { kcal: 680, p: 38, kh: 65, f: 28 },
      time: '~45 Min',
      items: [
        { id: 'lachs_tk',   qty: 600 },
        { id: 'kartoffeln', qty: 1200 },
        { id: 'zucchini',   qty: 1 },
        { id: 'karotten',   qty: 2 },
        { id: 'paprika',    qty: 1 },
        { id: 'brokkoli',   qty: 1 },
        { id: 'knoblauch',  qty: 2 },
        { id: 'zitrone',    qty: 1 }
      ],
      steps: [
        'Kartoffeln schälen, in Würfel. Mit Olivenöl, Rosmarin, Salz mischen.',
        'Auf Blech 1 bei 200 °C 30 Min rösten.',
        'Restliches Gemüse in Stücke, mit Olivenöl und Knoblauch mischen.',
        'Auf Blech 2, ebenfalls 25 Min rösten.',
        'Lachs würzen, mit Zitrone beträufeln. Auf Blech 3 bei 180 °C 15 Min.',
        'Alles in 5 Boxen schichten.'
      ]
    },
    'chili-con-carne': {
      name: 'Chili con Carne mit Bohnen',
      type: 'abendessen', portions: 5, week: 3,
      tag: 'Wärmt von innen',
      macros: '~620 kcal · 40g P · 70g KH · 16g F',
      macroValues: { kcal: 620, p: 40, kh: 70, f: 16 },
      time: '~50 Min',
      items: [
        { id: 'rinderhack',      qty: 500 },
        { id: 'kidneybohnen',    qty: 1 },
        { id: 'schwarze_bohnen', qty: 1 },
        { id: 'tomaten_gehackt', qty: 2 },
        { id: 'mais',            qty: 1 },
        { id: 'zwiebeln',        qty: 2 },
        { id: 'knoblauch',       qty: 3 },
        { id: 'paprika',         qty: 2 },
        { id: 'tomatenmark',     qty: 15 }
      ],
      steps: [
        'Zwiebeln + Knoblauch hacken, anbraten.',
        'Hack zugeben, krümelig braten.',
        'Paprika klein schneiden, mitbraten.',
        'Tomatenmark einrühren, 1 Min rösten.',
        'Bohnen abspülen, mit Mais und Tomaten zugeben.',
        'Gewürze rein. 30 Min sanft köcheln.',
        'In 5 Portionen aufteilen. Mit Vollkornbrot oder Reis servieren.'
      ]
    },
    'kichererbsen-bulgur': {
      name: 'Kichererbsen-Hackfleisch-Bulgur',
      type: 'power', portions: 5, week: 4,
      tag: 'Orientalisch-würzig',
      macros: '~640 kcal · 42g P · 80g KH · 14g F',
      macroValues: { kcal: 640, p: 42, kh: 80, f: 14 },
      time: '~40 Min',
      items: [
        { id: 'lammhack',     qty: 500 },
        { id: 'kichererbsen', qty: 2 },
        { id: 'bulgur',       qty: 400 },
        { id: 'zwiebeln',     qty: 2 },
        { id: 'knoblauch',    qty: 3 },
        { id: 'tomatenmark',  qty: 30 },
        { id: 'petersilie',   qty: 1 },
        { id: 'zitrone',      qty: 1 }
      ],
      steps: [
        'Bulgur in 800 ml kochendem Salzwasser quellen lassen (15 Min, vom Herd).',
        'Zwiebeln + Knoblauch hacken, in Olivenöl anbraten.',
        'Hack zugeben, krümelig braten.',
        'Tomatenmark + Gewürze 1 Min mitrösten.',
        'Kichererbsen abspülen, zugeben, 10 Min mitziehen.',
        'Mit Zitrone abschmecken, Petersilie unterrühren.',
        'Mit Bulgur in Boxen aufteilen.'
      ]
    },
    'haehnchen-geschnetzelt': {
      name: 'Hähnchengeschnetzeltes mit Reis',
      type: 'abendessen', portions: 5, week: 4,
      tag: 'Cremig & schnell',
      macros: '~700 kcal · 50g P · 75g KH · 18g F',
      macroValues: { kcal: 700, p: 50, kh: 75, f: 18 },
      time: '~30 Min',
      items: [
        { id: 'haehnchenbrust', qty: 600 },
        { id: 'reis_basmati',   qty: 400 },
        { id: 'zwiebeln',       qty: 2 },
        { id: 'champignons',    qty: 200 },
        { id: 'paprika',        qty: 2 },
        { id: 'sahne',          qty: 200 },
        { id: 'bruehe',         qty: 200 },
        { id: 'mehl',           qty: 30 },
        { id: 'senf',           qty: 15 }
      ],
      steps: [
        'Reis kochen (12 Min).',
        'Hähnchen in Streifen, in Mehl wenden. Anbraten, herausnehmen.',
        'Zwiebeln + Pilze + Paprika in Pfanne anbraten.',
        'Mit Brühe ablöschen, Sahne + Senf zugeben.',
        'Hähnchen zurück in die Sauce, 5 Min ziehen lassen.',
        'Würzen, Petersilie drauf. Mit Reis in 5 Portionen.'
      ]
    }
  },

  categoryLabels: {
    frische:    'Frische',
    protein:    'Protein',
    trocken:    'Trocken',
    konserve:   'Konserven',
    tk:         'Tiefkühl',
    gewuerz:    'Gewürze & Vorrat',
    supplement: 'Supplements'
  },

  categoryOrder: ['frische', 'protein', 'tk', 'konserve', 'trocken', 'gewuerz', 'supplement']
};
