/* =====================================================================
   КАЛЕНДАРНА СІТКА — конструктор для Adobe InDesign
   ---------------------------------------------------------------------
   Три шаблони в одному скрипті + діалог налаштувань при запуску:

     1. «Міні під сіткою»  — сітка на всю ширину, міні-календарі
                             попереднього/наступного місяця під нею праворуч;
     2. «Міні поруч»       — сітка ~65 % ширини, обидва міні-календарі
                             праворуч від неї в один ряд;
     3. «Міні стовпчиком»  — сітка ~73 % ширини, міні один під одним.

   Створює документ, по одному місяцю на сторінку, зі стилями абзаців
   у групі «CAL» і плашкою «CAL Red».

   Запуск:  покласти файл у папку Scripts Panel > User
            (Window > Utilities > Scripts, ПКМ на User > Reveal in Explorer)
            і двічі клацнути по ньому в панелі Scripts.

   Налаштування зберігаються між запусками; кнопка «Скинути параметри
   шаблону» повертає заводські значення обраного шаблону.

   Структура файлу:
     1  заводські пресети шаблонів і межі значень
     2  стан + збереження між запусками
     3  дати (ISO-8601)
     4  розрахунок геометрії — єдине джерело координат
     5  перевірка налаштувань
     6  шрифти
     7  стилі абзаців і відмальовування
     8  діалог
     9  запуск
   ===================================================================== */

#target "indesign"

(function () {

/* =====================================================================
   1. ЗАВОДСЬКІ ПРЕСЕТИ І МЕЖІ ЗНАЧЕНЬ
   ===================================================================== */

var TEMPLATES = ["below", "side", "stack"];

var TEMPLATE_LABELS = {
  below: "Міні під сіткою — сітка на всю ширину",
  side : "Міні поруч — сітка 65 % ширини, два міні в ряд праворуч",
  stack: "Міні стовпчиком — сітка 73 % ширини, міні один під одним"
};

/* Множники висоти текстових фреймів відносно кегля. Винесені сюди,
   щоб розрахунок, відмальовування і схема користувались тими самими
   числами. */
var FRAME = {
  title    : 1.3,   // фрейм назви місяця
  head     : 1.5,   // фрейм заголовків днів (укр і англ)
  miniTitle: 1.4,   // фрейм заголовка міні-календаря
  miniHead : 1.5    // фрейм заголовків днів у міні
};

/* Кожен пресет містить УСІ ключі, навіть ті, що цим шаблоном не
   використовуються — так перемикання між шаблонами не лишає дірок. */
var PRESETS = {

  below: {
    layout: {
      blockTop      : 282,
      mainRatio     : 1.00,   // не використовується цим шаблоном
      mainMiniGap   : 0,
      titleSize     : 34,  titleGap      : 16,
      headUaSize    : 12,  headUaGap     : 6,
      cellH         : 25,  daySize       : 52,
      headEnGap     : 5,   headEnSize    : 10,
      weekNoSize    : 11,  weekNoW       : 10,  weekNoGap     : 3.5,
      miniGapTop    : 20,  miniW         : 105, miniGap       : 20,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 12,  miniTitleGap  : 3.5,
      miniHeadSize  : 9,   miniDaySize   : 11,  miniCellH     : 6.2,
      miniWeekNoW   : 6,   miniWeekNoGap : 2,   miniWeekNoSize: 8,
      miniRuleWeight: 0.5
    },
    options: {
      showAdjacentDays: true, fixedSixRows: false,
      showMiniCalendars: true, blockAnchor: "top"
    }
  },

  side: {
    layout: {
      blockTop      : 395,
      mainRatio     : 0.65,
      mainMiniGap   : 16,
      titleSize     : 30,  titleGap      : 12,
      headUaSize    : 9,   headUaGap     : 5,
      cellH         : 17.5, daySize      : 34,
      headEnGap     : 4,   headEnSize    : 8,
      weekNoSize    : 8,   weekNoW       : 7,   weekNoGap     : 3,
      miniGapTop    : 20,  miniW         : 51.75, miniGap     : 10,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 8.5, miniTitleGap  : 2.5,
      miniHeadSize  : 6.5, miniDaySize   : 8,   miniCellH     : 4.6,
      miniWeekNoW   : 4.5, miniWeekNoGap : 1.5, miniWeekNoSize: 6,
      miniRuleWeight: 0.4
    },
    options: {
      showAdjacentDays: true, fixedSixRows: false,
      showMiniCalendars: true, blockAnchor: "top"
    }
  },

  stack: {
    layout: {
      blockTop      : 385,
      mainRatio     : 0.73,
      mainMiniGap   : 16,
      titleSize     : 32,  titleGap      : 13,
      headUaSize    : 10,  headUaGap     : 5,
      cellH         : 19.7, daySize      : 38,
      headEnGap     : 4,   headEnSize    : 9,
      weekNoSize    : 9,   weekNoW       : 8,   weekNoGap     : 3,
      miniGapTop    : 20,  miniW         : 83.9, miniGap      : 10,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 11,  miniTitleGap  : 3,
      miniHeadSize  : 8.5, miniDaySize   : 12,  miniCellH     : 6.4,
      miniWeekNoW   : 6,   miniWeekNoGap : 2,   miniWeekNoSize: 8,
      miniRuleWeight: 0.5
    },
    options: {
      showAdjacentDays: true,
      fixedSixRows: true,   // інакше в лютого пара міні звисає нижче сітки
      showMiniCalendars: true, blockAnchor: "top"
    }
  }
};

/* Спільне для всіх шаблонів */
var COMMON = {
  year: 2027,
  doc: {
    pageWidth: 420, pageHeight: 594,      // A2 книжна
    marginTop: 25, marginLeft: 25, marginRight: 25, marginBottom: 25
  },
  font: { family: "", regular: "", bold: "" },   // "" = автовибір
  colors: { redC: 0, redM: 100, redY: 100, redK: 0, grey: 45, redTint: 35 }
};

/* Межі значень [мін, макс]. Введене поза межами затискається: від'ємний
   кегль або нульова ширина валять InDesign уже під час створення фреймів.
   5486 мм і 1296 pt — максимуми самого InDesign. */
var LIMITS = {
  year    : [1600, 3000],
  pageSide: [10, 5486],
  margin  : [0, 1000],
  ratioPct: [20, 100],
  offset  : [0, 5486],
  gap     : [0, 1000],
  cellH   : [0.5, 1000],
  fontSize: [1, 1296],
  miniW   : [5, 2000],
  percent : [0, 100]
};

var PAGE_PRESETS = [
  { name: "A2 книжна  420 × 594",  w: 420, h: 594 },
  { name: "A2 альбомна 594 × 420", w: 594, h: 420 },
  { name: "A3 книжна  297 × 420",  w: 297, h: 420 },
  { name: "A3 альбомна 420 × 297", w: 420, h: 297 },
  { name: "A4 книжна  210 × 297",  w: 210, h: 297 },
  { name: "A4 альбомна 297 × 210", w: 297, h: 210 },
  { name: "Власний розмір",        w: 0,   h: 0   }
];

/* Автопідбір: коефіцієнти виведені з трьох затверджених розкладок —
   для висоти рядка і кегля чисел вони збігаються з точністю до 1 %. */
var AUTOFIT = { cellH: 0.51, daySize: 0.984 };

/* Аркуш, під який рахувалися всі три пресети. Підгонка під інший формат
   міряється саме від нього, тому на A2 книжній вона нічого не змінює. */
var BASE = { pageW: 420, pageH: 594, margin: 25, innerW: 370, minSide: 420 };

/* Ключі, що масштабуються лінійно разом зі смугою набору.
   Поза списком свідомо лишились: mainRatio і miniVAlign (безрозмірні),
   miniRuleWeight (товщина лінійки не залежить від формату),
   blockTop (рахується окремо, від висоти аркуша). */
var SCALABLE = ["titleSize", "titleGap", "headUaSize", "headUaGap",
                "cellH", "daySize", "headEnGap", "headEnSize",
                "weekNoSize", "weekNoW", "weekNoGap", "mainMiniGap",
                "miniGapTop", "miniW", "miniGap",
                "miniTitleSize", "miniTitleGap", "miniHeadSize",
                "miniDaySize", "miniCellH", "miniWeekNoW", "miniWeekNoGap",
                "miniWeekNoSize", "miniVGapMin", "miniVGapMax"];

/* Те, що впливає на висоту блоку: стискається додатково, якщо після
   масштабування за шириною блок не влазить в аркуш (типово для
   альбомних форматів — широких і низьких). */
var VERTICAL = ["titleSize", "titleGap", "headUaSize", "headUaGap",
                "cellH", "daySize", "headEnGap", "headEnSize", "weekNoSize",
                "miniGapTop", "miniTitleSize", "miniTitleGap",
                "miniHeadSize", "miniDaySize", "miniCellH",
                "miniVGapMin", "miniVGapMax"];

var LOC = {
  monthsUa: ["Січень","Лютий","Березень","Квітень","Травень","Червень",
             "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"],
  monthsEn: ["January","February","March","April","May","June",
             "July","August","September","October","November","December"],
  daysUa  : ["Понеділок","Вівторок","Середа","Четвер","П’ятниця","Субота","Неділя"],
  daysEn  : ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
  daysUaS : ["П","В","С","Ч","П","С","Н"],
  daysEnS : ["M","T","W","R","F","S","U"],
  titleSep: " / "
};

/* =====================================================================
   2. СТАН + ЗБЕРЕЖЕННЯ МІЖ ЗАПУСКАМИ
   ===================================================================== */

var PREFS_FILE = File(Folder.userData + "/CalendarGridBuilder.txt");

function clone(o) {
  var r = {}, k;
  for (k in o) {
    if (!o.hasOwnProperty(k)) continue;
    r[k] = (typeof o[k] === "object" && o[k] !== null) ? clone(o[k]) : o[k];
  }
  return r;
}

function factoryState(tpl) {
  return {
    template: tpl,
    year    : COMMON.year,
    doc     : clone(COMMON.doc),
    font    : clone(COMMON.font),
    colors  : clone(COMMON.colors),
    layout  : clone(PRESETS[tpl].layout),
    options : clone(PRESETS[tpl].options)
  };
}

var state = factoryState("stack");

function flatten(obj, prefix, out) {
  var k, v;
  for (k in obj) {
    if (!obj.hasOwnProperty(k)) continue;
    v = obj[k];
    if (typeof v === "object" && v !== null) flatten(v, prefix + k + ".", out);
    else out.push(prefix + k + "\t" + v);
  }
}

function savePrefs() {
  try {
    var lines = [];
    flatten(state, "", lines);
    PREFS_FILE.encoding = "UTF-8";
    if (PREFS_FILE.open("w")) { PREFS_FILE.write(lines.join("\n")); PREFS_FILE.close(); }
  } catch (e) {}
}

function loadPrefs() {
  try {
    if (!PREFS_FILE.exists) return;
    PREFS_FILE.encoding = "UTF-8";
    if (!PREFS_FILE.open("r")) return;
    var txt = PREFS_FILE.read(); PREFS_FILE.close();

    var pairs = txt.split("\n"), i, p, path, val, node, seg, j, num;

    // шаблон читаємо першим — від нього залежить набір заводських значень
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i].split("\t");
      if (p[0] === "template" && PRESETS[p[1]]) { state = factoryState(p[1]); break; }
    }

    for (i = 0; i < pairs.length; i++) {
      p = pairs[i].split("\t");
      if (p.length !== 2) continue;
      path = p[0].split("."); val = p[1];
      if (path[0] === "template") continue;

      node = state;
      for (j = 0; j < path.length - 1; j++) {
        seg = path[j];
        if (node[seg] === undefined) { node = null; break; }
        node = node[seg];
      }
      if (!node) continue;
      seg = path[path.length - 1];
      if (node[seg] === undefined) continue;      // ключ зі старої версії

      if (typeof node[seg] === "number") {
        num = parseFloat(val);
        if (!isNaN(num)) node[seg] = num;         // зіпсований файл не має
      }                                           // рознести NaN по геометрії
      else if (typeof node[seg] === "boolean") node[seg] = (val === "true");
      else node[seg] = val;
    }
  } catch (e) {}
}

/* =====================================================================
   3. ДАТИ (усе в UTC, щоб уникнути зсувів часового поясу)
   ===================================================================== */

var DAY_MS = 86400000;

function dUTC(y, m, d)  { return new Date(Date.UTC(y, m, d)); }
function addDays(dt, n) { return new Date(dt.getTime() + n * DAY_MS); }
function dowMon(dt)     { return (dt.getUTCDay() + 6) % 7; }   // 0 = Пн … 6 = Нд
function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

/* Номер тижня за ISO-8601 */
function isoWeek(dt) {
  var t = dUTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  t = addDays(t, 3 - dowMon(t));                 // четвер цього тижня
  var ft = dUTC(t.getUTCFullYear(), 0, 4);       // 4 січня завжди у 1-му тижні
  ft = addDays(ft, 3 - dowMon(ft));              // четвер 1-го тижня
  return 1 + Math.round((t.getTime() - ft.getTime()) / (7 * DAY_MS));
}

/* Матриці кешуються: за одне оновлення схеми їх треба 75, а різних
   серед них щонайбільше 13. Дати не змінюються, тож кеш не застаріває. */
var MATRIX_CACHE = {};

function monthMatrix(y, m, forceSix) {
  var key = y + "/" + m + "/" + (forceSix ? 6 : 0);
  if (MATRIX_CACHE[key]) return MATRIX_CACHE[key];

  var first = dUTC(y, m, 1);
  var last  = dUTC(y, m, daysInMonth(y, m));
  var cur   = addDays(first, -dowMon(first));
  var end   = addDays(last, 6 - dowMon(last));
  var rows  = [], i, j, days, st, d2;

  while (cur.getTime() <= end.getTime()) {
    days = [];
    for (i = 0; i < 7; i++) days.push(addDays(cur, i));
    rows.push({ week: isoWeek(days[0]), days: days });
    cur = addDays(cur, 7);
  }
  if (forceSix) {
    while (rows.length < 6) {
      st = addDays(rows[rows.length - 1].days[0], 7);
      d2 = [];
      for (j = 0; j < 7; j++) d2.push(addDays(st, j));
      rows.push({ week: isoWeek(d2[0]), days: d2 });
    }
  }
  MATRIX_CACHE[key] = rows;                  // тільки читається, не мутується
  return rows;
}

function pt2mm(v) { return v * 25.4 / 72; }

/* =====================================================================
   4. РОЗРАХУНОК ГЕОМЕТРІЇ
   Єдине джерело координат: ним користуються і відмальовування,
   і схема в діалозі, і перевірка налаштувань.
   ===================================================================== */

function measureMini(year, month) {
  var L = state.layout;
  var rows = monthMatrix(year, month, false).length;
  return pt2mm(L.miniTitleSize) * FRAME.miniTitle + L.miniTitleGap
       + pt2mm(L.miniHeadSize) * FRAME.miniHead
       + rows * L.miniCellH
       + pt2mm(L.miniHeadSize) * FRAME.miniHead;
}

/* Ширина смуги під основну сітку */
function gridWidth() {
  var D = state.doc;
  var innerW = D.pageWidth - D.marginLeft - D.marginRight;
  return (state.template === "below") ? innerW : innerW * state.layout.mainRatio;
}

/* Уся геометрія сторінки місяця — жодного малювання.
   Від'ємні ширини тут не з'являються: вони затискаються, щоб некоректні
   налаштування не доходили до InDesign у вигляді фрейму з x2 < x1.
   Про саму проблему повідомляє validate(). */
function computeMonth(year, month) {
  var L = state.layout, D = state.doc, O = state.options, T = state.template;

  var innerW = Math.max(1, D.pageWidth - D.marginLeft - D.marginRight);
  var gx     = D.marginLeft;
  var gw     = Math.max(7, (T === "below") ? innerW : innerW * L.mainRatio);

  var rows = monthMatrix(year, month, O.fixedSixRows);
  var thH  = pt2mm(L.titleSize)  * FRAME.title;
  var hUa  = pt2mm(L.headUaSize) * FRAME.head;
  var hEn  = pt2mm(L.headEnSize) * FRAME.head;

  var blockH = thH + L.titleGap + hUa + L.headUaGap
             + rows.length * L.cellH + L.headEnGap + hEn;

  var top = (O.blockAnchor === "bottom")
          ? (D.pageHeight - D.marginBottom - blockH)
          : L.blockTop;

  var headUaY = top + thH + L.titleGap;
  var gridTop = headUaY + hUa + L.headUaGap;
  var gridH   = rows.length * L.cellH;
  var gridBot = gridTop + gridH;
  var headEnY = gridBot + L.headEnGap;

  var g = {
    rows: rows, gx: gx, gw: gw, colW: gw / 7,
    thH: thH, hUa: hUa, hEn: hEn,
    titleY: top, headUaY: headUaY,
    gridTop: gridTop, gridBottom: gridBot, gridH: gridH,
    headEnY: headEnY, blockBottom: headEnY + hEn,
    minis: []
  };

  if (!O.showMiniCalendars) return g;

  var pm = month - 1, py = year;  if (pm < 0)  { pm = 11; py = year - 1; }
  var nm = month + 1, ny = year;  if (nm > 11) { nm = 0;  ny = year + 1; }

  var h1 = measureMini(py, pm), h2 = measureMini(ny, nm);
  var zoneX, zoneW, mw, my, maxH, vgap;

  if (T === "below") {
    // під сіткою, обидва в ряд, притиснуті до правого поля
    mw    = Math.max(5, L.miniW);
    zoneX = D.pageWidth - D.marginRight - (mw * 2 + L.miniGap);
    my    = g.blockBottom + L.miniGapTop;
    g.minis.push({ x: zoneX,                  y: my, w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX + mw + L.miniGap, y: my, w: mw, h: h2, year: ny, month: nm });

  } else if (T === "side") {
    // праворуч від сітки, в один ряд
    zoneX = gx + gw + L.mainMiniGap;
    zoneW = innerW - gw - L.mainMiniGap;
    mw    = Math.max(5, (zoneW - L.miniGap) / 2);
    maxH  = Math.max(h1, h2);

    if (L.miniVAlign === "top")         my = gridTop;
    else if (L.miniVAlign === "bottom") my = gridBot - maxH;
    else                                my = gridTop + (gridH - maxH) / 2;

    g.minis.push({ x: zoneX,                  y: my, w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX + mw + L.miniGap, y: my, w: mw, h: h2, year: ny, month: nm });

  } else {
    // stack — праворуч, один під одним; проміжок розтягується так, щоб
    // верх першого і низ другого збіглися з межами сітки чисел
    zoneX = gx + gw + L.mainMiniGap;
    mw    = Math.max(5, innerW - gw - L.mainMiniGap);
    vgap  = gridH - (h1 + h2);
    my    = gridTop;

    if (vgap < L.miniVGapMin) {
      vgap = L.miniVGapMin;                       // не вміщається — звисає вниз
    } else if (vgap > L.miniVGapMax) {
      vgap = L.miniVGapMax;                       // завеликий — центруємо пару
      my   = gridTop + (gridH - (h1 + h2 + vgap)) / 2;
    }

    g.minis.push({ x: zoneX, y: my,             w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX, y: my + h1 + vgap, w: mw, h: h2, year: ny, month: nm });
  }

  return g;
}

/* Найнижча точка блоку за всі 12 місяців + супутні спостереження */
function worstBottom() {
  var r = { y: 0, month: 0, overhang: 0, overMonth: 0, aboveTop: -1 };
  var m, i, g, b, ov;

  for (m = 0; m < 12; m++) {
    g = computeMonth(state.year, m);
    b = g.blockBottom;

    for (i = 0; i < g.minis.length; i++) {
      b = Math.max(b, g.minis[i].y + g.minis[i].h);
      if (state.template !== "below") {
        ov = (g.minis[i].y + g.minis[i].h) - g.gridBottom;
        if (ov > r.overhang) { r.overhang = ov; r.overMonth = m; }
      }
    }
    if (b > r.y) { r.y = b; r.month = m; }
    if (r.aboveTop < 0 && g.titleY < state.doc.marginTop) r.aboveTop = m;
  }
  return r;
}

/* Висота блоку від назви місяця до найнижчої точки, рахована по
   6-рядковому місяцю — найгіршому випадку. Не залежить від blockTop. */
function contentHeight() {
  var L = state.layout, O = state.options;
  var keepTop = L.blockTop, keepAnchor = O.blockAnchor, keepSix = O.fixedSixRows;

  L.blockTop = 0; O.blockAnchor = "top"; O.fixedSixRows = true;
  var h = worstBottom().y;
  L.blockTop = keepTop; O.blockAnchor = keepAnchor; O.fixedSixRows = keepSix;

  return h;
}

/* Підганяє заводські пропорції шаблону під поточний формат аркуша.

   Крок 1: поля — за меншою стороною аркуша.
   Крок 2: усе лінійне множиться на відношення смуг набору. Пропорції,
           перевірені на A2, зберігаються точно.
   Крок 3: якщо блок не влазить у висоту (широкий низький аркуш), вертикаль
           додатково стискається.
   Крок 4: блок притискається так, щоб низ не виходив за нижнє поле.

   На A2 книжній усі коефіцієнти дорівнюють 1 і значення лишаються
   заводськими. */
function applyPageFit() {
  var D = state.doc, L = state.layout;
  var P = PRESETS[state.template].layout;
  var i, key, need, maxH, vk;

  var mk = Math.min(D.pageWidth, D.pageHeight) / BASE.minSide;
  D.marginTop = D.marginBottom = D.marginLeft = D.marginRight =
    Math.round(BASE.margin * mk * 10) / 10;

  var innerW = D.pageWidth - D.marginLeft - D.marginRight;
  var k = innerW / BASE.innerW;

  for (i = 0; i < SCALABLE.length; i++) {
    key = SCALABLE[i];
    L[key] = Math.round(P[key] * k * 100) / 100;
  }
  L.blockTop = P.blockTop * (D.pageHeight / BASE.pageH);

  // 2 % лишаємо запасом: інакше блок сідає в поле впритул і будь-яке
  // округлення виглядає як вихід за межі
  maxH = (D.pageHeight - D.marginTop - D.marginBottom) * 0.98;
  need = contentHeight();
  if (need > maxH && need > 0) {
    vk = maxH / need;
    for (i = 0; i < VERTICAL.length; i++) {
      key = VERTICAL[i];
      L[key] = Math.round(L[key] * vk * 100) / 100;
    }
    need = contentHeight();
  }

  clampLayout();

  L.blockTop = Math.min(L.blockTop, D.pageHeight - D.marginBottom - need);
  if (L.blockTop < D.marginTop) L.blockTop = D.marginTop;
  L.blockTop = Math.round(L.blockTop * 10) / 10;
}

/* Дрібний аркуш може дати кегль менший за припустимий — межі ті самі,
   що й для полів діалогу. */
function clampLayout() {
  var L = state.layout, i, key;
  var sizes = ["titleSize", "headUaSize", "headEnSize", "daySize", "weekNoSize",
               "miniTitleSize", "miniHeadSize", "miniDaySize", "miniWeekNoSize"];

  for (i = 0; i < sizes.length; i++) {
    key = sizes[i];
    if (L[key] < LIMITS.fontSize[0]) L[key] = LIMITS.fontSize[0];
  }
  if (L.cellH < LIMITS.cellH[0])     L.cellH = LIMITS.cellH[0];
  if (L.miniCellH < LIMITS.cellH[0]) L.miniCellH = LIMITS.cellH[0];
  if (L.miniW < LIMITS.miniW[0])     L.miniW = LIMITS.miniW[0];
}

/* =====================================================================
   5. ПЕРЕВІРКА НАЛАШТУВАНЬ
   errors   — те, що зламає створення документа;
   warnings — те, про що варто знати, але вирішує користувач.
   ===================================================================== */

/* precomputed — уже порахований worstBottom(): дає змогу не проходити
   12 місяців двічі за одне оновлення. */
function validate(precomputed) {
  var D = state.doc, L = state.layout, O = state.options;
  var res = { errors: [], warnings: [] };

  var innerW = D.pageWidth - D.marginLeft - D.marginRight;
  if (innerW <= 7) {
    res.errors.push("Поля не лишають місця на аркуші: смуга набору " +
                    innerW.toFixed(1) + " мм.");
    return res;                                   // решту рахувати немає сенсу
  }
  if (D.pageHeight - D.marginTop - D.marginBottom <= 0) {
    res.errors.push("Верхнє і нижнє поля перекривають одне одного.");
    return res;
  }

  var gw = gridWidth(), zoneW, mw, need;

  if (state.template !== "below" && O.showMiniCalendars) {
    zoneW = innerW - gw - L.mainMiniGap;
    mw = (state.template === "side") ? (zoneW - L.miniGap) / 2 : zoneW;
    if (mw < 5) {
      res.errors.push("Для міні-календарів не лишилось місця (" + mw.toFixed(1) +
                      " мм). Зменште частку ширини під сітку або проміжок.");
    } else if (mw < 30) {
      res.warnings.push("Міні-календар завширшки лише " + mw.toFixed(1) +
                        " мм — числа будуть тісні.");
    }
  }

  if (state.template === "below" && O.showMiniCalendars) {
    need = L.miniW * 2 + L.miniGap;
    if (need > innerW) {
      res.warnings.push("Два міні-календарі (" + need.toFixed(0) +
                        " мм) ширші за смугу набору — лівий вийде за поле.");
    }
  }

  if (O.showMiniCalendars && L.miniDaySize < 6) {
    res.warnings.push("Числа в міні-календарях " + L.miniDaySize +
                      " pt — на друку це майже не читається. Спробуйте інший " +
                      "шаблон або більший аркуш.");
  }

  var w = precomputed || worstBottom();
  var limit = D.pageHeight - D.marginBottom;

  if (w.y > limit + 0.2) {          // 0.2 мм — похибка округлення, не привід
    res.warnings.push("Блок виходить за нижнє поле на " + (w.y - limit).toFixed(1) +
                      " мм (" + LOC.monthsUa[w.month] + "). Зменште відступ від " +
                      "верху, висоту рядка або кеглі.");
  }
  if (w.aboveTop >= 0) {
    res.warnings.push("Блок починається вище верхнього поля (" +
                      LOC.monthsUa[w.aboveTop] + ").");
  }
  if (w.overhang > 10) {
    res.warnings.push("Міні-календарі звисають нижче сітки на " +
                      w.overhang.toFixed(1) + " мм (" + LOC.monthsUa[w.overMonth] +
                      "). Допоможе «завжди 6 рядків».");
  }
  return res;
}

/* =====================================================================
   6. ШРИФТИ
   ===================================================================== */

var FONT_CACHE = null;

function collectFonts(fams, stys) {
  var i, j, fam, sty, list, dup;
  for (i = 0; i < fams.length; i++) {
    fam = fams[i]; sty = stys[i];
    if (!fam || !sty) continue;
    if (!FONT_CACHE[fam]) FONT_CACHE[fam] = [];
    list = FONT_CACHE[fam];
    dup = false;                                   // одне накреслення може
    for (j = 0; j < list.length; j++)              // прийти кількома копіями
      if (list[j] === sty) { dup = true; break; }
    if (!dup) list.push(sty);
  }
}

/* Перелік шрифтів — найдорожча операція при відкритті діалогу.
   everyItem() віддає всі назви двома зверненнями до InDesign, тоді як
   поелементний перебір app.fonts[i] коштує три міжпроцесні виклики на
   кожен шрифт: на тисячі встановлених шрифтів це секунди очікування. */
function fontMap() {
  if (FONT_CACHE) return FONT_CACHE;
  FONT_CACHE = {};

  var fams, stys, i, f, empty = true, k;

  try {
    fams = app.fonts.everyItem().fontFamily;
    stys = app.fonts.everyItem().fontStyleName;

    if (!(fams instanceof Array)) { fams = [fams]; stys = [stys]; }
    if (fams.length === stys.length) collectFonts(fams, stys);
  } catch (e) {}

  for (k in FONT_CACHE) { if (FONT_CACHE.hasOwnProperty(k)) { empty = false; break; } }

  if (empty) {                                     // запасний шлях, якщо
    try {                                          // everyItem() не спрацював
      for (i = 0; i < app.fonts.length; i++) {
        f = app.fonts[i];
        collectFonts([f.fontFamily], [f.fontStyleName]);
      }
    } catch (e2) {}
  }
  return FONT_CACHE;
}

function familyList() {
  var map = fontMap(), out = [], k;
  for (k in map) if (map.hasOwnProperty(k)) out.push(k);
  out.sort();
  return out;
}

/* Автовибір, якщо користувач не задав шрифт явно */
var AUTO_FAMILIES = ["Myriad Pro", "Segoe UI", "Roboto", "Arial", "Helvetica"];
var AUTO_REGULAR  = ["Italic", "Regular Italic", "Regular"];
var AUTO_BOLD     = ["Bold Italic", "Semibold Italic", "Bold", "Italic"];

function fontExists(fam, sty) {
  try {
    var f = app.fonts.itemByName(fam + "\t" + sty);
    return f.isValid && f.status === FontStatus.INSTALLED;
  } catch (e) { return false; }
}

/* Обраний користувачем шрифт має пріоритет: якщо потрібного накреслення
   в ньому немає, беремо будь-яке з цієї ж сім'ї і НЕ стрибаємо на іншу —
   інакше вибір користувача мовчки підмінявся б на Arial. */
function resolveFont(which) {
  var fam  = state.font.family;
  var sty  = (which === "bold") ? state.font.bold : state.font.regular;
  var want = (which === "bold") ? AUTO_BOLD : AUTO_REGULAR;
  var i, f, s, styles;

  if (fam && sty && fontExists(fam, sty)) return fam + "\t" + sty;

  if (fam) {
    for (i = 0; i < want.length; i++)
      if (fontExists(fam, want[i])) return fam + "\t" + want[i];

    styles = fontMap()[fam] || [];
    for (i = 0; i < styles.length; i++)
      if (fontExists(fam, styles[i])) return fam + "\t" + styles[i];
  }

  for (f = 0; f < AUTO_FAMILIES.length; f++)
    for (s = 0; s < want.length; s++)
      if (fontExists(AUTO_FAMILIES[f], want[s]))
        return AUTO_FAMILIES[f] + "\t" + want[s];

  return null;                                     // лишиться шрифт документа
}

/* =====================================================================
   7. СТИЛІ АБЗАЦІВ І ВІДМАЛЬОВУВАННЯ
   ===================================================================== */

var STYLES = {};

function makeColor(doc, name, cmyk) {
  var c = doc.colors.itemByName(name);
  if (c.isValid) return c;
  return doc.colors.add({
    name: name, model: ColorModel.PROCESS,
    space: ColorSpace.CMYK, colorValue: cmyk
  });
}

function buildStyles(doc) {
  var L = state.layout, C = state.colors;

  var red   = makeColor(doc, "CAL Red", [C.redC, C.redM, C.redY, C.redK]);
  var black = doc.swatches.itemByName("Black");

  var fReg  = resolveFont("regular");
  var fBold = resolveFont("bold");

  var grp = doc.paragraphStyleGroups.itemByName("CAL");
  if (!grp.isValid) grp = doc.paragraphStyleGroups.add({ name: "CAL" });

  function ps(name, opts) {
    var st = grp.paragraphStyles.itemByName(name);
    if (!st.isValid) st = grp.paragraphStyles.add({ name: name });

    var fnt = opts.bold ? (fBold || fReg) : (fReg || fBold);
    if (fnt) { try { st.appliedFont = fnt; } catch (e) {} }

    st.pointSize     = opts.size;
    st.leading       = opts.size;
    st.justification = opts.align || Justification.RIGHT_ALIGN;
    st.fillColor     = opts.red ? red : black;
    st.fillTint      = (opts.tint === undefined) ? -1 : opts.tint;
    st.hyphenation   = false;
    st.spaceBefore   = 0;
    st.spaceAfter    = 0;

    STYLES[name] = st;
  }

  ps("Month title",      { size: L.titleSize, bold: true,
                           align: Justification.LEFT_ALIGN });
  ps("Weekday UA",       { size: L.headUaSize });
  ps("Weekday UA red",   { size: L.headUaSize, red: true });
  ps("Weekday EN",       { size: L.headEnSize });
  ps("Weekday EN red",   { size: L.headEnSize, red: true });
  ps("Day",              { size: L.daySize });
  ps("Day red",          { size: L.daySize, red: true });
  ps("Day adjacent",     { size: L.daySize, tint: C.grey });
  ps("Day adjacent red", { size: L.daySize, red: true, tint: C.redTint });
  ps("Week no",          { size: L.weekNoSize });
  ps("Mini title",       { size: L.miniTitleSize, align: Justification.LEFT_ALIGN });
  ps("Mini weekday",     { size: L.miniHeadSize });
  ps("Mini weekday red", { size: L.miniHeadSize, red: true });
  ps("Mini day",         { size: L.miniDaySize });
  ps("Mini day red",     { size: L.miniDaySize, red: true });
  ps("Mini week no",     { size: L.miniWeekNoSize, red: true });
}

function addText(page, x1, y1, x2, y2, str, styleName, vjust) {
  var tf = page.textFrames.add();
  tf.geometricBounds = [y1, x1, y2, x2];

  var p = tf.textFramePreferences;
  p.insetSpacing          = [0, 0, 0, 0];
  p.verticalJustification = vjust || VerticalJustification.CENTER_ALIGN;
  p.firstBaselineOffset   = FirstBaseline.LEADING_OFFSET;
  p.ignoreWrap            = true;
  try { p.autoSizingType = AutoSizingTypeEnum.OFF; } catch (e) {}   // немає у CS6

  tf.contents = str;
  tf.parentStory.texts[0].appliedParagraphStyle = STYLES[styleName];
  return tf;
}

function vLine(doc, page, x, y1, y2, weight) {
  var ln = page.graphicLines.add();
  ln.geometricBounds = [y1, x, y2, x];
  ln.strokeWeight = weight;
  ln.strokeColor  = doc.swatches.itemByName("Black");
  ln.strokeTint   = 100;
}

function drawMini(doc, page, x, y, w, year, month) {
  var L = state.layout;

  var wkW  = L.miniWeekNoW, gap = L.miniWeekNoGap;
  var gx   = x + wkW + gap;
  var colW = (w - wkW - gap) / 7;
  if (colW <= 0) return;                     // страховка; validate() це ловить

  var yy = y, i, r, c, k, ry, dt;

  var title = LOC.monthsUa[month] + LOC.titleSep + year +
              LOC.titleSep + LOC.monthsEn[month];
  var th = pt2mm(L.miniTitleSize) * FRAME.miniTitle;
  addText(page, x, yy, x + w, yy + th, title, "Mini title");
  yy += th + L.miniTitleGap;

  var hh = pt2mm(L.miniHeadSize) * FRAME.miniHead;
  for (i = 0; i < 7; i++) {
    addText(page, gx + i * colW, yy, gx + (i + 1) * colW, yy + hh,
            LOC.daysUaS[i], i >= 5 ? "Mini weekday red" : "Mini weekday");
  }
  yy += hh;

  var rows = monthMatrix(year, month, false);
  var gridTop = yy;

  for (r = 0; r < rows.length; r++) {
    ry = gridTop + r * L.miniCellH;
    addText(page, x, ry, x + wkW, ry + L.miniCellH,
            String(rows[r].week), "Mini week no");

    for (c = 0; c < 7; c++) {
      dt = rows[r].days[c];
      if (dt.getUTCMonth() !== month) continue;   // сусідні місяці тут не показуємо
      addText(page, gx + c * colW, ry, gx + (c + 1) * colW, ry + L.miniCellH,
              String(dt.getUTCDate()), c >= 5 ? "Mini day red" : "Mini day");
    }
  }
  var gridBottom = gridTop + rows.length * L.miniCellH;

  vLine(doc, page, x + wkW + gap / 2, gridTop, gridBottom, L.miniRuleWeight);

  for (k = 0; k < 7; k++) {
    addText(page, gx + k * colW, gridBottom, gx + (k + 1) * colW, gridBottom + hh,
            LOC.daysEnS[k], k >= 5 ? "Mini weekday red" : "Mini weekday");
  }
}

function drawMonth(doc, page, year, month) {
  var L = state.layout, O = state.options;
  var g = computeMonth(year, month);
  var i, r, c, k, mi, ry, dt, own, stName, mn;

  // назва місяця
  addText(page, g.gx, g.titleY, g.gx + g.gw, g.titleY + g.thH,
          LOC.monthsUa[month] + LOC.titleSep + LOC.monthsEn[month],
          "Month title", VerticalJustification.BOTTOM_ALIGN);

  // українські назви днів
  for (i = 0; i < 7; i++) {
    addText(page, g.gx + i * g.colW, g.headUaY,
            g.gx + (i + 1) * g.colW, g.headUaY + g.hUa,
            LOC.daysUa[i], i >= 5 ? "Weekday UA red" : "Weekday UA");
  }

  // сітка чисел
  for (r = 0; r < g.rows.length; r++) {
    ry = g.gridTop + r * L.cellH;

    // номер тижня — ліворуч від сітки, у полі
    addText(page, g.gx - L.weekNoGap - L.weekNoW, ry,
            g.gx - L.weekNoGap, ry + L.cellH,
            String(g.rows[r].week), "Week no");

    for (c = 0; c < 7; c++) {
      dt  = g.rows[r].days[c];
      own = (dt.getUTCMonth() === month);
      if (!own && !O.showAdjacentDays) continue;

      if (own) stName = (c >= 5) ? "Day red" : "Day";
      else     stName = (c >= 5) ? "Day adjacent red" : "Day adjacent";

      addText(page, g.gx + c * g.colW, ry, g.gx + (c + 1) * g.colW, ry + L.cellH,
              String(dt.getUTCDate()), stName);
    }
  }

  // англійські назви днів
  for (k = 0; k < 7; k++) {
    addText(page, g.gx + k * g.colW, g.headEnY,
            g.gx + (k + 1) * g.colW, g.headEnY + g.hEn,
            LOC.daysEn[k], k >= 5 ? "Weekday EN red" : "Weekday EN");
  }

  // міні-календарі
  for (mi = 0; mi < g.minis.length; mi++) {
    mn = g.minis[mi];
    drawMini(doc, page, mn.x, mn.y, mn.w, mn.year, mn.month);
  }
}

/* Повертає null або текст помилки. Недобудований документ закривається,
   щоб не лишати користувачеві половину календаря. */
function build() {
  var D = state.doc, doc = null, m;

  try {
    doc = app.documents.add();

    var vp = doc.viewPreferences;
    vp.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
    vp.verticalMeasurementUnits   = MeasurementUnits.MILLIMETERS;
    vp.textSizeMeasurementUnits   = MeasurementUnits.POINTS;
    vp.strokeMeasurementUnits     = MeasurementUnits.POINTS;
    vp.rulerOrigin                = RulerOrigin.PAGE_ORIGIN;

    var dp = doc.documentPreferences;
    dp.facingPages = false;
    dp.pageWidth   = D.pageWidth;
    dp.pageHeight  = D.pageHeight;

    doc.marginPreferences.properties = {
      top: D.marginTop, left: D.marginLeft,
      right: D.marginRight, bottom: D.marginBottom, columnCount: 1
    };

    dp.pagesPerDocument = 12;

    buildStyles(doc);
    for (m = 0; m < 12; m++) drawMonth(doc, doc.pages[m], state.year, m);

    try {
      doc.pages[0].select();
      app.activeWindow.zoomPercentage = 40;
    } catch (e) {}

    return null;

  } catch (err) {
    if (doc !== null) { try { doc.close(SaveOptions.NO); } catch (e2) {} }
    return err.message + (err.line ? "  (рядок " + err.line + ")" : "");
  }
}

/* =====================================================================
   8. ДІАЛОГ
   ===================================================================== */

/* Читає число з поля і затискає в межі: поза ними InDesign або не створить
   об'єкт, або створить нечитабельний. */
function numOf(field, fallback, lim) {
  var v = parseFloat(String(field.text).replace(",", "."));
  if (isNaN(v)) return fallback;
  if (lim) {
    if (v < lim[0]) v = lim[0];
    if (v > lim[1]) v = lim[1];
  }
  return v;
}

function showDialog() {

  var win = new Window("dialog", "Календарна сітка — конструктор");
  win.orientation = "column";
  win.alignChildren = "fill";
  win.spacing = 10;
  win.margins = 14;

  var PREV_W = 360, PREV_H = 520;   // розмір полотна схеми, px
  var LABEL_W = 168;                // ширина підписів у полях

  /* ---------- каркас: ліворуч налаштування, праворуч велика схема ---------- */
  var main = win.add("group");
  main.orientation = "row";
  main.alignChildren = "top";
  main.spacing = 12;

  var leftCol = main.add("group");
  leftCol.orientation = "column";
  leftCol.alignChildren = "fill";
  leftCol.spacing = 10;

  /* ---------- шаблон ---------- */
  var pT = leftCol.add("panel", undefined, "Шаблон");
  pT.orientation = "column"; pT.alignChildren = "left";
  pT.margins = 12; pT.spacing = 6;

  var radios = {}, ti;
  for (ti = 0; ti < TEMPLATES.length; ti++) {
    radios[TEMPLATES[ti]] = pT.add("radiobutton", undefined,
                                   TEMPLATE_LABELS[TEMPLATES[ti]]);
  }
  var hintT = pT.add("statictext", undefined,
    "Зміна шаблону повертає всі його заводські значення.");
  try {
    hintT.graphics.font = ScriptUI.newFont(hintT.graphics.font.name, "italic",
                                            hintT.graphics.font.size - 1);
  } catch (e) {}

  /* ---------- два стовпці налаштувань ---------- */
  var cols = leftCol.add("group");
  cols.orientation = "row"; cols.alignChildren = "fill"; cols.spacing = 10;

  var colA = cols.add("group"); colA.orientation = "column"; colA.alignChildren = "fill";
  var colB = cols.add("group"); colB.orientation = "column"; colB.alignChildren = "fill";

  /* ---------- схема сторінки праворуч ---------- */
  var pPrev = main.add("panel", undefined, "Схема сторінки");
  pPrev.orientation = "column"; pPrev.alignChildren = "left";
  pPrev.margins = 12; pPrev.spacing = 6;

  var gPrevTop = pPrev.add("group");
  gPrevTop.orientation = "row";
  gPrevTop.add("statictext", undefined, "Показати місяць:");
  var ddPrevMonth = gPrevTop.add("dropdownlist", undefined, LOC.monthsUa);
  ddPrevMonth.preferredSize.width = 150;

  // group, а не panel: у panel системна рамка перекриває onDraw і
  // перемальовування за подією не спрацьовує
  var prev = pPrev.add("group");
  prev.preferredSize = [PREV_W, PREV_H];
  prev.minimumSize   = [PREV_W, PREV_H];

  var stMetrics = pPrev.add("statictext", undefined, "", { multiline: true });
  stMetrics.preferredSize = [PREV_W, 52];

  /* ---------- конструктори полів ---------- */

  function panelIn(parent, title) {
    var p = parent.add("panel", undefined, title);
    p.orientation = "column"; p.alignChildren = "left";
    p.margins = 12; p.spacing = 6;
    return p;
  }
  function field(parent, label, w) {
    var g = parent.add("group");
    g.orientation = "row";
    var s = g.add("statictext", undefined, label);
    s.preferredSize.width = LABEL_W;
    var e = g.add("edittext", undefined, "");
    e.preferredSize.width = w || 58;
    e.labelText = s;                 // щоб міняти підпис залежно від шаблону
    return e;
  }
  function fieldPair(parent, label, sep) {
    var g = parent.add("group");
    g.orientation = "row";
    var s = g.add("statictext", undefined, label);
    s.preferredSize.width = LABEL_W;
    var e1 = g.add("edittext", undefined, ""); e1.preferredSize.width = 58;
    g.add("statictext", undefined, sep);
    var e2 = g.add("edittext", undefined, ""); e2.preferredSize.width = 58;
    return [e1, e2];
  }
  function dropdown(parent, label, items, w) {
    var g = parent.add("group");
    g.orientation = "row";
    var s = g.add("statictext", undefined, label);
    s.preferredSize.width = LABEL_W;
    var dd = g.add("dropdownlist", undefined, items);
    dd.preferredSize.width = w || 190;
    return dd;
  }

  /* --- документ --- */
  var pD = panelIn(colA, "Документ");
  var eYear = field(pD, "Рік", 70);
  var ddFmt = dropdown(pD, "Формат аркуша", []);
  var pf;
  for (pf = 0; pf < PAGE_PRESETS.length; pf++) ddFmt.add("item", PAGE_PRESETS[pf].name);

  var ePage = fieldPair(pD, "Ширина / висота, мм", "×");
  var eMar1 = fieldPair(pD, "Поля: верх / низ, мм", "/");
  var eMar2 = fieldPair(pD, "Поля: ліворуч / праворуч", "/");

  var bFit = pD.add("button", undefined, "Підігнати шаблон під аркуш");
  bFit.helpTip = "Перераховує поля, кеглі, висоту рядка і відступ згори під " +
                 "поточний формат. Викликається автоматично, коли ви обираєте " +
                 "формат зі списку.";

  /* --- розкладка --- */
  var pL = panelIn(colA, "Розкладка");
  var eRatio = field(pL, "Частка ширини під сітку, %");
  var eTop   = field(pL, "Відступ від верху аркуша, мм");
  var ddAnc  = dropdown(pL, "Прив'язка блоку",
                        ["до верху (назва місяця на одній висоті)",
                         "до низу (низ блоку на одній висоті)"]);
  var eGapMM = field(pL, "Проміжок сітка → міні, мм");
  var cbSix  = pL.add("checkbox", undefined, "Завжди 6 рядків у сітці");
  var cbAdj  = pL.add("checkbox", undefined, "Показувати числа сусідніх місяців");
  var cbMini = pL.add("checkbox", undefined, "Малювати міні-календарі");

  /* --- типографіка --- */
  var pF = panelIn(colB, "Типографіка");
  // масив одразу в конструктор: ddFam.add("item", …) у циклі на тисячу
  // шрифтів помітно повільніше
  var ddFam = dropdown(pF, "Шрифт", ["— автовибір —"].concat(familyList()));

  var gSty = pF.add("group"); gSty.orientation = "row";
  var sSty = gSty.add("statictext", undefined, "Накреслення: осн. / жирне");
  sSty.preferredSize.width = LABEL_W;
  var ddReg  = gSty.add("dropdownlist", undefined, []); ddReg.preferredSize.width = 92;
  var ddBold = gSty.add("dropdownlist", undefined, []); ddBold.preferredSize.width = 92;

  var eTitle  = field(pF, "Кегль назви місяця, pt");
  var eDay    = field(pF, "Кегль чисел, pt");
  var eCellH  = field(pF, "Висота рядка сітки, мм");
  var eHeadUa = field(pF, "Кегль заголовків днів (укр), pt");
  var eHeadEn = field(pF, "Кегль заголовків днів (англ), pt");
  var eWeekNo = field(pF, "Кегль номерів тижнів, pt");
  var cbAuto  = pF.add("checkbox", undefined,
    "Підібрати висоту рядка і кегль чисел за шириною колонки");

  /* --- міні-календарі --- */
  var pM = panelIn(colB, "Міні-календарі");
  var eMTitle = field(pM, "Кегль заголовка, pt");
  var eMDay   = field(pM, "Кегль чисел, pt");
  var eMCellH = field(pM, "Висота рядка, мм");
  var eMHead  = field(pM, "Кегль П В С Ч П С Н, pt");
  var eMGap   = field(pM, "Проміжок між двома міні, мм");
  var eMW     = field(pM, "Ширина міні, мм");

  /* --- кольори --- */
  var pC = panelIn(colB, "Кольори");
  var gRed = pC.add("group"); gRed.orientation = "row";
  var sRed = gRed.add("statictext", undefined, "Червоний CMYK");
  sRed.preferredSize.width = LABEL_W;
  var eC = gRed.add("edittext", undefined, ""); eC.preferredSize.width = 42;
  var eM = gRed.add("edittext", undefined, ""); eM.preferredSize.width = 42;
  var eY = gRed.add("edittext", undefined, ""); eY.preferredSize.width = 42;
  var eK = gRed.add("edittext", undefined, ""); eK.preferredSize.width = 42;

  var eGrey  = field(pC, "Сірий сусідніх місяців, %");
  var eRTint = field(pC, "Тінт червоного сусідніх, %");

  /* ---------- кнопки ---------- */
  var gBtn = win.add("group");
  gBtn.orientation = "row";
  gBtn.alignment = "right";
  var bReset = gBtn.add("button", undefined, "Скинути параметри шаблону");
  gBtn.add("button", undefined, "Скасувати", { name: "cancel" });
  var bOk = gBtn.add("button", undefined, "Створити", { name: "ok" });

  /* ---------- заповнення / зчитування ---------- */

  var filling = false;

  function fillStyleDropdowns(fam) {
    ddReg.removeAll(); ddBold.removeAll();
    var styles = fontMap()[fam] || [], i;
    for (i = 0; i < styles.length; i++) {
      ddReg.add("item", styles[i]);
      ddBold.add("item", styles[i]);
    }
    function pick(dd, want, current) {
      var a, b;
      if (current)
        for (a = 0; a < dd.items.length; a++)
          if (dd.items[a].text === current) { dd.selection = a; return; }
      for (b = 0; b < want.length; b++)
        for (a = 0; a < dd.items.length; a++)
          if (dd.items[a].text === want[b]) { dd.selection = a; return; }
      if (dd.items.length) dd.selection = 0;
    }
    pick(ddReg, AUTO_REGULAR, state.font.regular);
    pick(ddBold, AUTO_BOLD, state.font.bold);
  }

  /* Числові поля з state. Викликається і після затискання в межі, щоб у полі
     не лишалось значення, яке насправді не застосоване. */
  function syncNumericFields() {
    var L = state.layout, D = state.doc, C = state.colors;

    eYear.text = state.year;
    ePage[0].text = D.pageWidth;  ePage[1].text = D.pageHeight;
    eMar1[0].text = D.marginTop;  eMar1[1].text = D.marginBottom;
    eMar2[0].text = D.marginLeft; eMar2[1].text = D.marginRight;

    eRatio.text = (L.mainRatio * 100).toFixed(0);
    eTop.text   = L.blockTop;
    eGapMM.text = (state.template === "below") ? L.miniGapTop : L.mainMiniGap;

    eTitle.text  = L.titleSize;   eDay.text    = L.daySize;
    eCellH.text  = L.cellH;       eHeadUa.text = L.headUaSize;
    eHeadEn.text = L.headEnSize;  eWeekNo.text = L.weekNoSize;

    eMTitle.text = L.miniTitleSize; eMDay.text  = L.miniDaySize;
    eMCellH.text = L.miniCellH;     eMHead.text = L.miniHeadSize;
    eMGap.text   = L.miniGap;       eMW.text    = L.miniW;

    eC.text = C.redC; eM.text = C.redM; eY.text = C.redY; eK.text = C.redK;
    eGrey.text = C.grey; eRTint.text = C.redTint;
  }

  function fillFromState() {
    filling = true;
    var D = state.doc, O = state.options, i, k, sel;

    radios[state.template].value = true;
    syncNumericFields();

    var fmt = PAGE_PRESETS.length - 1;
    for (i = 0; i < PAGE_PRESETS.length - 1; i++)
      if (PAGE_PRESETS[i].w === D.pageWidth && PAGE_PRESETS[i].h === D.pageHeight) fmt = i;
    ddFmt.selection = fmt;

    ddAnc.selection = (O.blockAnchor === "bottom") ? 1 : 0;

    cbSix.value  = O.fixedSixRows;
    cbAdj.value  = O.showAdjacentDays;
    cbMini.value = O.showMiniCalendars;

    sel = 0;                                        // список уже наповнений
    if (state.font.family)
      for (k = 0; k < ddFam.items.length; k++)
        if (ddFam.items[k].text === state.font.family) { sel = k; break; }
    ddFam.selection = sel;
    if (sel > 0) fillStyleDropdowns(ddFam.selection.text);
    else { ddReg.removeAll(); ddBold.removeAll(); }

    // травень — шестирядковий місяць, найгірший випадок за висотою
    if (!ddPrevMonth.selection) ddPrevMonth.selection = 4;

    updateEnabled();
    filling = false;
    redrawPreview();
  }

  function updateEnabled() {
    var isBelow = (state.template === "below");
    var minisOn = cbMini.value;

    eRatio.enabled = !isBelow;
    eTop.enabled   = !(ddAnc.selection && ddAnc.selection.index === 1);

    eGapMM.enabled  = minisOn;
    eMTitle.enabled = minisOn;
    eMDay.enabled   = minisOn;
    eMCellH.enabled = minisOn;
    eMHead.enabled  = minisOn;
    eMGap.enabled   = minisOn && (state.template !== "stack");
    eMW.enabled     = minisOn && isBelow;

    // той самий проміжок означає різне в різних шаблонах
    eGapMM.labelText.text = isBelow ? "Проміжок під сіткою, мм"
                                    : "Проміжок сітка → міні, мм";
    eMW.labelText.text    = isBelow ? "Ширина одного міні, мм"
                                    : "Ширина міні (рахується)";
  }

  function readIntoState() {
    var L = state.layout, D = state.doc, O = state.options, C = state.colors;

    state.year = Math.round(numOf(eYear, state.year, LIMITS.year));

    D.pageWidth    = numOf(ePage[0], D.pageWidth,    LIMITS.pageSide);
    D.pageHeight   = numOf(ePage[1], D.pageHeight,   LIMITS.pageSide);
    D.marginTop    = numOf(eMar1[0], D.marginTop,    LIMITS.margin);
    D.marginBottom = numOf(eMar1[1], D.marginBottom, LIMITS.margin);
    D.marginLeft   = numOf(eMar2[0], D.marginLeft,   LIMITS.margin);
    D.marginRight  = numOf(eMar2[1], D.marginRight,  LIMITS.margin);

    L.mainRatio = (state.template === "below")
                ? 1
                : numOf(eRatio, L.mainRatio * 100, LIMITS.ratioPct) / 100;

    L.blockTop    = numOf(eTop, L.blockTop, LIMITS.offset);
    O.blockAnchor = (ddAnc.selection && ddAnc.selection.index === 1) ? "bottom" : "top";

    if (state.template === "below") L.miniGapTop  = numOf(eGapMM, L.miniGapTop,  LIMITS.gap);
    else                            L.mainMiniGap = numOf(eGapMM, L.mainMiniGap, LIMITS.gap);

    O.fixedSixRows      = cbSix.value;
    O.showAdjacentDays  = cbAdj.value;
    O.showMiniCalendars = cbMini.value;

    L.titleSize  = numOf(eTitle,  L.titleSize,  LIMITS.fontSize);
    L.daySize    = numOf(eDay,    L.daySize,    LIMITS.fontSize);
    L.cellH      = numOf(eCellH,  L.cellH,      LIMITS.cellH);
    L.headUaSize = numOf(eHeadUa, L.headUaSize, LIMITS.fontSize);
    L.headEnSize = numOf(eHeadEn, L.headEnSize, LIMITS.fontSize);
    L.weekNoSize = numOf(eWeekNo, L.weekNoSize, LIMITS.fontSize);

    L.miniTitleSize = numOf(eMTitle, L.miniTitleSize, LIMITS.fontSize);
    L.miniDaySize   = numOf(eMDay,   L.miniDaySize,   LIMITS.fontSize);
    L.miniCellH     = numOf(eMCellH, L.miniCellH,     LIMITS.cellH);
    L.miniHeadSize  = numOf(eMHead,  L.miniHeadSize,  LIMITS.fontSize);
    L.miniGap       = numOf(eMGap,   L.miniGap,       LIMITS.gap);
    L.miniW         = numOf(eMW,     L.miniW,         LIMITS.miniW);

    C.redC = numOf(eC, C.redC, LIMITS.percent);
    C.redM = numOf(eM, C.redM, LIMITS.percent);
    C.redY = numOf(eY, C.redY, LIMITS.percent);
    C.redK = numOf(eK, C.redK, LIMITS.percent);
    C.grey    = numOf(eGrey,  C.grey,    LIMITS.percent);
    C.redTint = numOf(eRTint, C.redTint, LIMITS.percent);

    if (ddFam.selection && ddFam.selection.index > 0) {
      state.font.family  = ddFam.selection.text;
      state.font.regular = ddReg.selection  ? ddReg.selection.text  : "";
      state.font.bold    = ddBold.selection ? ddBold.selection.text : "";
    } else {
      state.font.family = ""; state.font.regular = ""; state.font.bold = "";
    }
  }

  /* Зчитати введене, показати назад уже затиснуті значення, перемалювати */
  function refresh() {
    if (filling) return;
    readIntoState();
    filling = true;
    syncNumericFields();
    filling = false;
    redrawPreview();
  }

  function applyAutofit() {
    readIntoState();
    var colW = gridWidth() / 7;
    state.layout.cellH   = Math.round(colW * AUTOFIT.cellH * 10) / 10;
    state.layout.daySize = Math.round(colW * AUTOFIT.daySize);
    filling = true;
    syncNumericFields();
    filling = false;
    redrawPreview();
  }

  /* ---------- схема ---------- */

  /* ScriptUI не має однієї надійної команди «перемалюй елемент»:
     notify("onDraw") спрацьовує не в кожній версії. Тому лічильником
     перевіряємо, чи справді відпрацював onDraw, і лише якщо ні —
     вдаємось до hide/show (він перемальовує завжди, ціною блимання). */
  var drawCount = 0;

  function redrawPreview() {
    var before = drawCount;
    try { prev.notify("onDraw"); } catch (e) {}
    if (drawCount === before) {
      try { prev.hide(); prev.show(); } catch (e) {}
    }
    try { win.update(); } catch (e) {}
    updateMetrics();
  }

  /* Цифри під схемою: те, що на око зі схеми не зчитаєш. */
  function updateMetrics() {
    try {
      var NL = String.fromCharCode(10);
      var L = state.layout, D = state.doc;
      var w = worstBottom();
      var v = validate(w);
      var limit = D.pageHeight - D.marginBottom;

      var txt = "Колонка " + (gridWidth() / 7).toFixed(1) + " мм · рядок " +
                L.cellH + " мм · числа " + L.daySize + " pt" + NL +
                "Найнижча точка за 12 місяців: " + w.y.toFixed(1) +
                " з " + limit.toFixed(0) + " мм";

      if (v.errors.length)        txt += NL + "Помилка: " + v.errors[0];
      else if (v.warnings.length) txt += NL + "Увага: " + v.warnings[0];

      stMetrics.text = txt;
      bOk.enabled = (v.errors.length === 0);
    } catch (e) {}
  }

  prev.onDraw = function () {
    drawCount++;
    var g = this.graphics;
    var W = this.size.width, H = this.size.height;

    var deck    = g.newBrush(g.BrushType.SOLID_COLOR, [0.58, 0.58, 0.58, 1]);
    var paper   = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
    var photo   = g.newBrush(g.BrushType.SOLID_COLOR, [0.90, 0.90, 0.90, 1]);
    var ink     = g.newBrush(g.BrushType.SOLID_COLOR, [0.20, 0.20, 0.20, 1]);
    var inkPale = g.newBrush(g.BrushType.SOLID_COLOR, [0.66, 0.66, 0.66, 1]);
    var red     = g.newBrush(g.BrushType.SOLID_COLOR, [0.85, 0.12, 0.10, 1]);
    var redPale = g.newBrush(g.BrushType.SOLID_COLOR, [0.93, 0.70, 0.68, 1]);
    var penEdge = g.newPen(g.PenType.SOLID_COLOR, [0.40, 0.40, 0.40, 1], 1);
    var penMarg = g.newPen(g.PenType.SOLID_COLOR, [0.45, 0.70, 0.90, 1], 1);
    var penRule = g.newPen(g.PenType.SOLID_COLOR, [0.45, 0.45, 0.45, 1], 1);

    // спершу гасимо всю площу — інакше попередня схема просвічує крізь нову
    g.newPath(); g.rectPath(0, 0, W, H); g.fillPath(deck);

    try {
      var D = state.doc, L = state.layout, O = state.options;
      var pw = D.pageWidth, ph = D.pageHeight;
      if (!(pw > 0 && ph > 0)) return;

      var pad = 6;
      var sc = Math.min((W - pad * 2) / pw, (H - pad * 2) / ph);
      if (!(sc > 0)) return;
      var ox = (W - pw * sc) / 2, oy = (H - ph * sc) / 2;

      var S = function (v) { return v * sc; };
      var box = function (x, y, w, h, brush) {
        if (w < 0.8) w = 0.8;
        if (h < 0.8) h = 0.8;
        g.newPath(); g.rectPath(x, y, w, h); g.fillPath(brush);
      };

      // аркуш
      g.newPath(); g.rectPath(ox, oy, S(pw), S(ph));
      g.fillPath(paper); g.strokePath(penEdge);

      // поля
      g.newPath();
      g.rectPath(ox + S(D.marginLeft), oy + S(D.marginTop),
                 S(pw - D.marginLeft - D.marginRight),
                 S(ph - D.marginTop - D.marginBottom));
      g.strokePath(penMarg);

      var mIdx = (ddPrevMonth && ddPrevMonth.selection)
               ? ddPrevMonth.selection.index : 4;
      var gc = computeMonth(state.year, mIdx);
      var cw = S(gc.colW);
      var c, r, ry, dt, own, br;

      // вільне місце під зображення
      if (gc.titleY > D.marginTop + 3) {
        box(ox + S(D.marginLeft), oy + S(D.marginTop),
            S(pw - D.marginLeft - D.marginRight),
            S(gc.titleY - D.marginTop - 4), photo);
      }

      // назва місяця
      box(ox + S(gc.gx), oy + S(gc.titleY + gc.thH * 0.25),
          S(gc.gw * 0.5), S(gc.thH * 0.55), ink);

      // заголовки днів (укр)
      for (c = 0; c < 7; c++) {
        box(ox + S(gc.gx + c * gc.colW) + cw * 0.15,
            oy + S(gc.headUaY + gc.hUa * 0.32),
            cw * 0.7, S(gc.hUa * 0.34), c >= 5 ? redPale : inkPale);
      }

      // сітка чисел
      var rh = S(L.cellH);
      for (r = 0; r < gc.rows.length; r++) {
        ry = oy + S(gc.gridTop + r * L.cellH);

        box(ox + S(gc.gx - L.weekNoGap - L.weekNoW), ry + rh * 0.34,
            S(L.weekNoW) * 0.7, rh * 0.26, inkPale);

        for (c = 0; c < 7; c++) {
          dt  = gc.rows[r].days[c];
          own = (dt.getUTCMonth() === mIdx);
          if (!own && !O.showAdjacentDays) continue;
          br = own ? (c >= 5 ? red : ink) : (c >= 5 ? redPale : inkPale);
          box(ox + S(gc.gx + c * gc.colW) + cw * 0.42, ry + rh * 0.22,
              cw * 0.48, rh * 0.5, br);
        }
      }

      // заголовки днів (англ)
      for (c = 0; c < 7; c++) {
        box(ox + S(gc.gx + c * gc.colW) + cw * 0.2,
            oy + S(gc.headEnY + gc.hEn * 0.32),
            cw * 0.65, S(gc.hEn * 0.32), c >= 5 ? redPale : inkPale);
      }

      // міні-календарі — з внутрішньою структурою
      var mi, mn, mrows, mwkW, mgap, mx, my, mcw, mhh, yy, hc, mr, mc, mry,
          mGridTop, mch, mGridBot, ec;

      for (mi = 0; mi < gc.minis.length; mi++) {
        mn    = gc.minis[mi];
        mrows = monthMatrix(mn.year, mn.month, false);
        mwkW  = S(L.miniWeekNoW); mgap = S(L.miniWeekNoGap);
        mx    = ox + S(mn.x); my = oy + S(mn.y);
        mcw   = (S(mn.w) - mwkW - mgap) / 7;
        mhh   = S(pt2mm(L.miniHeadSize) * FRAME.miniHead);
        if (mcw <= 0) continue;

        // заголовок міні
        box(mx, my + S(pt2mm(L.miniTitleSize)) * 0.2, S(mn.w) * 0.78,
            S(pt2mm(L.miniTitleSize)) * 0.7, ink);
        yy = my + S(pt2mm(L.miniTitleSize) * FRAME.miniTitle + L.miniTitleGap);

        for (hc = 0; hc < 7; hc++) {
          box(mx + mwkW + mgap + hc * mcw + mcw * 0.28, yy + mhh * 0.28,
              mcw * 0.45, mhh * 0.38, hc >= 5 ? redPale : inkPale);
        }
        yy += mhh;

        mGridTop = yy; mch = S(L.miniCellH);
        for (mr = 0; mr < mrows.length; mr++) {
          mry = mGridTop + mr * mch;
          box(mx, mry + mch * 0.28, mwkW * 0.72, mch * 0.34, redPale);
          for (mc = 0; mc < 7; mc++) {
            if (mrows[mr].days[mc].getUTCMonth() !== mn.month) continue;
            box(mx + mwkW + mgap + mc * mcw + mcw * 0.3, mry + mch * 0.22,
                mcw * 0.52, mch * 0.48, mc >= 5 ? red : ink);
          }
        }
        mGridBot = mGridTop + mrows.length * mch;

        // лінійка після номерів тижнів
        g.newPath();
        g.moveTo(mx + mwkW + mgap / 2, mGridTop);
        g.lineTo(mx + mwkW + mgap / 2, mGridBot);
        g.strokePath(penRule);

        for (ec = 0; ec < 7; ec++) {
          box(mx + mwkW + mgap + ec * mcw + mcw * 0.28, mGridBot + mhh * 0.28,
              mcw * 0.45, mhh * 0.38, ec >= 5 ? redPale : inkPale);
        }
      }
    } catch (e) {}
  };

  /* ---------- події ---------- */

  var rt;
  for (rt = 0; rt < TEMPLATES.length; rt++) {
    (function (t) {
      radios[t].onClick = function () {
        readIntoState();                        // не губимо щойно введене
        var keepDoc  = clone(state.doc),    keepFont = clone(state.font),
            keepCol  = clone(state.colors), keepYear = state.year;
        state = factoryState(t);
        state.doc = keepDoc; state.font = keepFont;
        state.colors = keepCol; state.year = keepYear;
        // пресет розрахований під A2 книжну; на іншому аркуші підганяємо,
        // на A2 не чіпаємо, щоб не затерти вручну виставлені поля
        if (keepDoc.pageWidth !== BASE.pageW || keepDoc.pageHeight !== BASE.pageH)
          applyPageFit();
        fillFromState();
      };
    })(TEMPLATES[rt]);
  }

  ddFmt.onChange = function () {
    if (filling || !ddFmt.selection) return;
    var p = PAGE_PRESETS[ddFmt.selection.index];
    if (!p.w) return;                        // «власний розмір» — нічого не чіпаємо
    readIntoState();
    state.doc.pageWidth = p.w; state.doc.pageHeight = p.h;
    applyPageFit();                          // пресети рахувалися під A2
    fillFromState();
  };

  bFit.onClick = function () { readIntoState(); applyPageFit(); fillFromState(); };

  ddPrevMonth.onChange = function () { if (!filling) redrawPreview(); };

  ddFam.onChange = function () {
    if (filling) return;
    if (ddFam.selection && ddFam.selection.index > 0)
      fillStyleDropdowns(ddFam.selection.text);
    else { ddReg.removeAll(); ddBold.removeAll(); }
  };

  ddAnc.onChange = function () {
    if (filling) return;
    readIntoState(); updateEnabled(); redrawPreview();
  };

  cbMini.onClick = function () { readIntoState(); updateEnabled(); redrawPreview(); };
  cbSix.onClick  = function () { readIntoState(); redrawPreview(); };
  cbAdj.onClick  = function () { readIntoState(); redrawPreview(); };
  cbAuto.onClick = function () { if (cbAuto.value) { applyAutofit(); cbAuto.value = false; } };

  var live = [ePage[0], ePage[1], eMar1[0], eMar1[1], eMar2[0], eMar2[1],
              eYear, eRatio, eTop, eGapMM,
              eTitle, eDay, eCellH, eHeadUa, eHeadEn, eWeekNo,
              eMTitle, eMDay, eMCellH, eMHead, eMGap, eMW], li;
  for (li = 0; li < live.length; li++) live[li].onChange = refresh;

  bReset.onClick = function () {
    readIntoState();
    var keepDoc = clone(state.doc),    keepFont = clone(state.font),
        keepCol = clone(state.colors), keepYear = state.year;
    state = factoryState(state.template);
    state.doc = keepDoc; state.font = keepFont;     // формат аркуша, шрифт і
    state.colors = keepCol; state.year = keepYear;  // колір — не частина шаблону
    fillFromState();
  };

  bOk.onClick = function () {
    var NL = String.fromCharCode(10);
    readIntoState();
    var v = validate();

    if (v.errors.length) {
      alert("Так документ не побудувати:" + NL + NL + "• " +
            v.errors.join(NL + "• "), "Некоректні налаштування");
      return;
    }
    if (v.warnings.length) {
      if (!confirm("Перед створенням варто перевірити:" + NL + NL + "• " +
                   v.warnings.join(NL + "• ") + NL + NL +
                   "Все одно створити документ?", false, "Геометрія")) return;
    }
    win.close(1);
  };

  loadPrefs();
  fillFromState();

  return (win.show() === 1);
}

/* =====================================================================
   9. ЗАПУСК
   ===================================================================== */

if (showDialog()) {
  savePrefs();

  var buildError = null;
  app.doScript(function () { buildError = build(); },
               ScriptLanguage.JAVASCRIPT, undefined,
               UndoModes.ENTIRE_SCRIPT, "Календарна сітка " + state.year);

  if (buildError) {
    alert("Не вдалося побудувати календар:\n\n" + buildError, "Помилка");
  } else {
    alert("Календар на " + state.year + " рік створено: 12 сторінок " +
          state.doc.pageWidth + " × " + state.doc.pageHeight + " мм.\n" +
          "Шаблон: " + TEMPLATE_LABELS[state.template] + "\n\n" +
          "Стилі абзаців — у групі «CAL» на панелі Paragraph Styles.\n" +
          "Колір — «CAL Red» на панелі Swatches.");
  }
}

})();
