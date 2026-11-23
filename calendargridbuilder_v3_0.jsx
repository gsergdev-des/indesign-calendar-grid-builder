/* =====================================================================
   КАЛЕНДАРНАЯ СЕТКА v3 — конструктор для Adobe InDesign
   ---------------------------------------------------------------------
   Один скрипт вместо двух веток v2 (украинской и RU/ZH).

   Два независимых выбора:
     • компоновка — где стоят мини-календари соседних месяцев:
         «под сеткой», «рядом», «столбиком» — справа или слева;
     • дизайн     — оформление: заливки шапки, линии, рамки ячеек,
         контурные числа, состав заголовка. Десять готовых наборов,
         любую деталь можно переключить в диалоге.

   Языки:
     • интерфейс — українська, русский, 中文;
     • календарь — українська, русский или 中文, всегда в паре с English.

   Создаёт документ, по одному месяцу на страницу: год с января по
   декабрь или любой диапазон от 1 до 24 месяцев с любого месяца
   (например, «декабрь 2026 — декабрь 2027», 13 страниц). Последней
   страницей по желанию идёт следующий год целиком — 12 месяцев сеткой.
   Всё оформление живёт в стилях группы «CAL»: стили абзацев (кегли,
   шрифт, цвет), объектные стили (заливки, линии, рамки), знаковые стили
   (красная точка, иероглифы). Цвета — «CAL Red» и «CAL Fill» на панели
   Swatches. Поменяли стиль — поменялись все страницы.

   Выходными считаются только суббота и воскресенье; праздники
   скрипт не отмечает.

   Запуск:  положить файл в папку Scripts Panel > User
            (Window > Utilities > Scripts, ПКМ на User > Reveal in Explorer)
            и дважды щёлкнуть по нему в панели Scripts.

   Структура файла:
      1  компоновки: заводские размеры и границы значений
      2  дизайны: наборы оформления
      3  языки календаря
      4  языки интерфейса
      5  состояние + сохранение между запусками
      6  даты (ISO-8601)
      7  геометрия — единственный источник координат
      8  сцена — что и где рисовать (общая для документа и схемы)
      9  проверка настроек
     10  шрифты
     11  отрисовка в InDesign
     12  схема в диалоге
     13  диалог
     14  запуск
   ===================================================================== */

#target "indesign"

(function () {

/* =====================================================================
   1. КОМПОНОВКИ: ЗАВОДСКИЕ РАЗМЕРЫ И ГРАНИЦЫ ЗНАЧЕНИЙ
   ===================================================================== */

var TEMPLATES = ["below", "side", "stack"];

/* Множители высоты текстовых фреймов относительно кегля. Вынесены сюда,
   чтобы расчёт, отрисовка и схема пользовались одними и теми же числами. */
var FRAME = {
  title    : 1.3,   // фрейм названия месяца
  head     : 1.5,   // однострочная шапка дней недели
  headStack: 1.3,   // двухстрочная шапка: (местный + английский) × 1.3
  pill     : 1.4,   // шапка «пилюлями» выше обычной в 1.4 раза
  miniTitle: 1.4,   // заголовок мини-календаря
  miniHead : 1.5    // дни недели в мини
};

/* Доли, которые не зависят от формата листа: всё считается от ширины
   колонки или высоты строки, поэтому само масштабируется. */
var K = {
  weekCol  : 0.65,  // колонка недель внутри таблицы — доля колонки дня
  inset    : 0.10,  // отступ числа от правой линии — доля колонки
  boxGap   : 0.07,  // зазор между рамками ячеек — доля меньшей стороны
  boxRadius: 0.16,  // скругление рамки — доля её высоты
  boxInset : 0.12,  // отступ числа внутри рамки — доля колонки
  corner   : 0.08,  // отступ снизу для «числа в углу» — доля строки
  cellLine : 0.13,  // «линейки в ячейках»: базовая линия над низом строки
  notesGap : 0.30,  // строки заметок: отступ от блока — доля строки
  notesStep: 0.28,  // строки заметок: шаг — доля строки
  pillPadX : 0.06,  // «пилюли»: зазор по горизонтали — доля колонки
  pillPadY : 0.12,  // «пилюли»: зазор по вертикали — доля высоты шапки
  panelPad : 0.45   // плашка под мини: поле — доля отступа сетка → мини
};

/* Каждый пресет содержит ВСЕ ключи, даже те, что этой компоновкой не
   используются — так переключение не оставляет дыр. */
var PRESETS = {

  below: {
    layout: {
      blockTop      : 282,
      mainRatio     : 1.00,   // не используется этой компоновкой
      mainMiniGap   : 0,
      titleSize     : 34,  titleGap      : 16,
      headLocSize   : 12,  headLocGap    : 6,
      cellH         : 25,  daySize       : 52,
      headEnGap     : 5,   headEnSize    : 10,
      weekNoSize    : 11,  weekNoW       : 10,  weekNoGap     : 3.5,
      miniGapTop    : 20,  miniW         : 105, miniGap       : 20,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 12,  miniTitleGap  : 3.5,
      miniHeadSize  : 9,   miniDaySize   : 11,  miniCellH     : 6.2,
      miniWeekNoW   : 6,   miniWeekNoGap : 2,   miniWeekNoSize: 8,
      miniRuleWeight: 0.5,
      photoGap      : 12
    },
    options: {
      fixedSixRows: false, showMiniCalendars: true, blockAnchor: "top",
      miniSide: "right", photoFrame: true
    }
  },

  side: {
    layout: {
      blockTop      : 395,
      mainRatio     : 0.65,
      mainMiniGap   : 16,
      titleSize     : 30,  titleGap      : 12,
      headLocSize   : 9,   headLocGap    : 5,
      cellH         : 17.5, daySize      : 34,
      headEnGap     : 4,   headEnSize    : 8,
      weekNoSize    : 8,   weekNoW       : 7,   weekNoGap     : 3,
      miniGapTop    : 20,  miniW         : 51.75, miniGap     : 10,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 8.5, miniTitleGap  : 2.5,
      miniHeadSize  : 6.5, miniDaySize   : 8,   miniCellH     : 4.6,
      miniWeekNoW   : 4.5, miniWeekNoGap : 1.5, miniWeekNoSize: 6,
      miniRuleWeight: 0.4,
      photoGap      : 12
    },
    options: {
      fixedSixRows: false, showMiniCalendars: true, blockAnchor: "top",
      miniSide: "right", photoFrame: true
    }
  },

  stack: {
    layout: {
      blockTop      : 385,
      mainRatio     : 0.73,
      mainMiniGap   : 16,
      titleSize     : 32,  titleGap      : 13,
      headLocSize   : 10,  headLocGap    : 5,
      cellH         : 19.7, daySize      : 38,
      headEnGap     : 4,   headEnSize    : 9,
      weekNoSize    : 9,   weekNoW       : 8,   weekNoGap     : 3,
      miniGapTop    : 20,  miniW         : 83.9, miniGap      : 10,
      miniVAlign    : "center",
      miniVGapMin   : 8,   miniVGapMax   : 22,
      miniTitleSize : 11,  miniTitleGap  : 3,
      miniHeadSize  : 8.5, miniDaySize   : 12,  miniCellH     : 6.4,
      miniWeekNoW   : 6,   miniWeekNoGap : 2,   miniWeekNoSize: 8,
      miniRuleWeight: 0.5,
      photoGap      : 12
    },
    options: {
      fixedSixRows: true,   // иначе в феврале пара мини свисает ниже сетки
      showMiniCalendars: true, blockAnchor: "top",
      miniSide: "right", photoFrame: true
    }
  }
};

/* Общее для всех компоновок */
var COMMON = {
  year: 2027,
  // диапазон: с какого месяца (0 = январь) и сколько страниц-месяцев.
  // 0 и 12 — обычный календарь на год; декабрь + 13 — «с декабря по декабрь»
  startMonth: 0,
  monthCount: 12,
  // последняя страница — следующий год целиком; 0 = год подставляется сам
  yearPage: true,
  yearPageYear: 0,
  doc: {
    pageWidth: 420, pageHeight: 594,      // A2 книжная
    marginTop: 25, marginLeft: 25, marginRight: 25, marginBottom: 25
  },
  // "" = автовыбор; cjk* используется только китайской сеткой
  font: { family: "", regular: "", bold: "",
          cjkFamily: "", cjkRegular: "", cjkBold: "" },
  colors: { redC: 0, redM: 100, redY: 100, redK: 0, grey: 45, redTint: 35 }
};

/* Границы значений [мин, макс]. Введённое вне границ зажимается:
   отрицательный кегль или нулевая ширина валят InDesign уже во время
   создания фреймов. 5486 мм и 1296 pt — максимумы самого InDesign. */
var LIMITS = {
  year    : [1600, 3000],
  months  : [1, 24],
  pageSide: [10, 5486],
  margin  : [0, 1000],
  ratioPct: [20, 100],
  offset  : [0, 5486],
  gap     : [0, 1000],
  cellH   : [0.5, 1000],
  fontSize: [1, 1296],
  miniW   : [5, 2000],
  percent : [0, 100],
  weight  : [0.1, 20],
  notes   : [0, 20]
};

/* Размеры листа. Названия — в языковой таблице, здесь только числа. */
var PAGE_PRESETS = [
  { w: 420, h: 594 },
  { w: 594, h: 420 },
  { w: 297, h: 420 },
  { w: 420, h: 297 },
  { w: 210, h: 297 },
  { w: 297, h: 210 },
  { w: 0,   h: 0   }        // свой размер
];

/* Автоподбор: коэффициенты выведены из трёх утверждённых раскладок —
   для высоты строки и кегля чисел они совпадают с точностью до 1 %. */
var AUTOFIT = { cellH: 0.51, daySize: 0.984 };

/* Лист, под который считались все три пресета. Подгонка под другой формат
   меряется именно от него, поэтому на A2 книжной она ничего не меняет. */
var BASE = { pageW: 420, pageH: 594, margin: 25, innerW: 370, minSide: 420 };

/* Ключи, что масштабируются линейно вместе с полосой набора.
   Вне списка сознательно остались: mainRatio и miniVAlign (безразмерные),
   miniRuleWeight (толщина линейки не зависит от формата),
   blockTop (считается отдельно, от высоты листа). */
var SCALABLE = ["titleSize", "titleGap", "headLocSize", "headLocGap",
                "cellH", "daySize", "headEnGap", "headEnSize",
                "weekNoSize", "weekNoW", "weekNoGap", "mainMiniGap",
                "miniGapTop", "miniW", "miniGap",
                "miniTitleSize", "miniTitleGap", "miniHeadSize",
                "miniDaySize", "miniCellH", "miniWeekNoW", "miniWeekNoGap",
                "miniWeekNoSize", "miniVGapMin", "miniVGapMax", "photoGap"];

/* То, что влияет на высоту блока: сжимается дополнительно, если после
   масштабирования по ширине блок не влезает в лист (типично для
   альбомных форматов — широких и низких). */
var VERTICAL = ["titleSize", "titleGap", "headLocSize", "headLocGap",
                "cellH", "daySize", "headEnGap", "headEnSize", "weekNoSize",
                "miniGapTop", "miniTitleSize", "miniTitleGap",
                "miniHeadSize", "miniDaySize", "miniCellH",
                "miniVGapMin", "miniVGapMax"];

/* =====================================================================
   2. ДИЗАЙНЫ: НАБОРЫ ОФОРМЛЕНИЯ

   Дизайн не трогает размеры — только то, КАК нарисованы элементы.
   Каждый набор перечисляет лишь отличия от STYLE_DEFAULT; диалог
   показывает все ключи, и любой можно переключить вручную.
   ===================================================================== */

/* Допустимые значения перечислимых ключей — порядок совпадает
   с порядком пунктов в выпадающих списках диалога. */
var ENUMS = {
  titleMode: ["slash", "slashYear", "dotYear", "spread", "yearFirst", "centered"],
  yearStyle: ["black", "red", "outline"],
  headMode : ["split", "stacked"],
  headFill : ["none", "band", "alt", "pill"],
  lines    : ["none", "rows", "table", "cells"],
  cells    : ["none", "box"],
  colFill  : ["none", "weekend", "alt"],
  numAlign : ["right", "center", "corner"],
  adjacent : ["hide", "tint", "outline"],
  weekNo   : ["margin", "left", "both", "none"],
  miniSide : ["right", "left"]
};

var STYLE_DEFAULT = {
  titleMode : "slash",   // состав заголовка, см. ENUMS.titleMode
  yearStyle : "black",   // год: чёрный / красный / контуром
  caps      : false,     // прописные в заголовке и шапке

  headMode  : "split",   // дни недели: местные над сеткой, английские под ней
                         // или обе строки над сеткой
  headFill  : "none",    // заливка шапки: нет / плашка / через одну / пилюли
  headInverse: false,    // белый текст на заливке шапки
  headWeekendFill: false,// субботу и воскресенье в шапке — на красную плашку

  lines     : "none",    // нет / между строками / таблица / линейки в ячейках
  lineWeight: 0.5,       // pt
  lineTint  : 100,       // % чёрного
  cells     : "none",    // нет / скруглённые рамки вокруг чисел
  colFill   : "none",    // заливка колонок: нет / выходные / через одну
  numAlign  : "right",   // число в ячейке: справа / по центру / в углу
  notes     : 0,         // строк для заметок под сеткой

  adjacent  : "tint",    // числа соседних месяцев: нет / бледные / контуром
  weekNo    : "margin",  // номера недель: в поле / колонкой / с двух сторон / нет
  weekPad   : false,     // 01, 02, … вместо 1, 2, …
  weekFill  : false,     // колонка номеров недель на плашке

  dayTint   : 100,       // тон чисел, % чёрного
  weekTint  : 100,       // тон номеров недель, % чёрного

  miniAdjacent: false,   // числа соседних месяцев в мини-календарях
  miniPanel : false,     // плашка под мини-календарями

  italic    : false,     // автовыбор шрифта предпочитает курсив

  fillC: 0, fillM: 0, fillY: 0, fillK: 15     // цвет «CAL Fill»
};

var DESIGN_ORDER = ["classic", "panel", "rules", "airy", "band",
                    "table", "contrast", "boxes", "pills", "notebook"];

var DESIGNS = {

  // v2: без линий, дни недели над и под сеткой, курсив
  classic: { italic: true },

  // мини на серой плашке, двухстрочная шапка, колонка недель на плашке
  panel: {
    titleMode: "slashYear", headMode: "stacked",
    weekNo: "left", weekPad: true, weekFill: true, weekTint: 45,
    miniAdjacent: true, miniPanel: true, fillK: 12
  },

  // линейки между строками, красный год, колонка недель на плашке
  rules: {
    titleMode: "dotYear", yearStyle: "red", caps: true, headMode: "stacked",
    lines: "rows", lineWeight: 0.75,
    weekNo: "left", weekFill: true, weekTint: 50, fillK: 15
  },

  // светлый: серые числа, контурные соседние дни и год, недели с двух сторон
  airy: {
    titleMode: "dotYear", yearStyle: "outline", caps: true, headMode: "stacked",
    lines: "rows", lineWeight: 0.4, lineTint: 35,
    adjacent: "outline", weekNo: "both", dayTint: 70, weekTint: 30, notes: 2
  },

  // тёмная плашка шапки с белым текстом, выходные на красном
  band: {
    titleMode: "spread", caps: true,
    headFill: "band", headInverse: true, headWeekendFill: true,
    lines: "rows", lineWeight: 0.5, lineTint: 70,
    adjacent: "hide", weekNo: "left", fillK: 45
  },

  // тонкая таблица, шапка через одну, контурные соседние дни
  table: {
    titleMode: "yearFirst", headFill: "alt",
    lines: "table", lineWeight: 0.35, lineTint: 45, numAlign: "center",
    adjacent: "outline", weekNo: "left", weekPad: true, weekTint: 70,
    fillC: 14, fillM: 3, fillY: 0, fillK: 0
  },

  // жирная таблица, выходные колонки залиты, числа в углу
  contrast: {
    titleMode: "spread", caps: true, headMode: "stacked",
    headFill: "band", headInverse: true, headWeekendFill: true,
    lines: "table", lineWeight: 0.75, colFill: "weekend", numAlign: "corner",
    adjacent: "hide", weekNo: "left", fillK: 50
  },

  // каждое число в скруглённой рамке, соседние дни контуром
  boxes: {
    titleMode: "dotYear", yearStyle: "red", caps: true, headMode: "stacked",
    headFill: "band", cells: "box", lineWeight: 0.75,
    adjacent: "outline", weekNo: "margin", fillK: 10
  },

  // шапка «пилюлями», рамки ячеек, соседние дни на серых плашках
  pills: {
    titleMode: "yearFirst",
    headFill: "pill", headInverse: true, headWeekendFill: true,
    cells: "box", lineWeight: 0.5, lineTint: 30, numAlign: "center",
    adjacent: "tint", weekNo: "none", miniAdjacent: true, fillK: 55
  },

  // линейки для записей в каждой ячейке, числа в углу
  notebook: {
    titleMode: "dotYear", headMode: "stacked",
    lines: "cells", lineWeight: 0.5, lineTint: 40, numAlign: "corner",
    weekNo: "margin", weekTint: 40, notes: 1
  }
};

function designStyle(name) {
  var s = clone(STYLE_DEFAULT), d = DESIGNS[name] || {}, k;
  for (k in d) if (d.hasOwnProperty(k)) s[k] = d[k];
  return s;
}

/* =====================================================================
   3. ЯЗЫКИ КАЛЕНДАРЯ — то, что попадает в документ.
   Добавление языка сводится к новой ветке здесь и в UI.
   ===================================================================== */

var MONTHS_EN = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
var DAYS_EN   = ["Monday","Tuesday","Wednesday","Thursday","Friday",
                 "Saturday","Sunday"];
var DAYS_EN_S = ["M","T","W","R","F","S","U"];

var CAL = {

  ua: {
    tag      : "UA",
    months   : ["Січень","Лютий","Березень","Квітень","Травень","Червень",
                "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"],
    days     : ["Понеділок","Вівторок","Середа","Четвер","П’ятниця",
                "Субота","Неділя"],
    daysShort: ["П","В","С","Ч","П","С","Н"],
    weekWord : "Тиждень"
  },

  ru: {
    tag      : "RU",
    months   : ["Январь","Февраль","Март","Апрель","Май","Июнь",
                "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
    days     : ["Понедельник","Вторник","Среда","Четверг","Пятница",
                "Суббота","Воскресенье"],
    daysShort: ["П","В","С","Ч","П","С","В"],
    weekWord : "Неделя"
  },

  zh: {
    tag      : "ZH",
    months   : ["一月","二月","三月","四月","五月","六月",
                "七月","八月","九月","十月","十一月","十二月"],
    days     : ["星期一","星期二","星期三","星期四","星期五",
                "星期六","星期日"],
    daysShort: ["一","二","三","四","五","六","日"],
    weekWord : "周"
  }
};

var EN = { months: MONTHS_EN, days: DAYS_EN, daysShort: DAYS_EN_S,
           weekWord: "Week" };

var SEP_SLASH  = " / ";
var SEP_BULLET = " • ";

var LANGS = ["ua", "ru", "zh"];

/* Названия языков — всегда эндонимами, в любом интерфейсе */
var LANG_UI_NAMES  = { ua: "Українська", ru: "Русский", zh: "中文" };
var LANG_CAL_NAMES = { ua: "Українська + English", ru: "Русский + English",
                       zh: "中文 + English" };

/* =====================================================================
   4. ЯЗЫКИ ИНТЕРФЕЙСА — то, что видно в диалоге и в сообщениях.
   Подстановка — через fmt() по {0}, {1}, …
   ===================================================================== */

var UI = {

  ua: {
    labelW: 168, labelD: 118, ddW: 150,

    winTitle : "Календарна сітка v3 — конструктор",

    langUi   : "Інтерфейс",
    langCal  : "Календар",
    calNames : { ua: "укр", ru: "рос", zh: "кит" },

    tabDesign: "Дизайн",
    tabLayout: "Компонування і аркуш",
    tabType  : "Шрифт і кеглі",
    tabColors: "Кольори",

    fDesign  : "Набір",
    btnDesignReset: "Повернути",
    btnDesignResetTip: "Повертає всі налаштування оформлення обраного набору.",
    designs  : { classic: "Класика", panel: "Панель", rules: "Лінійки",
                 airy: "Повітря", band: "Плашка", table: "Таблиця",
                 contrast: "Контраст", boxes: "Клітинки", pills: "Пігулки",
                 notebook: "Блокнот" },
    designHint: "Дизайн змінює лише оформлення — розміри й компонування лишаються.",

    panelTitle : "Заголовок",
    fTitleMode : "Склад",
    titleModes : ["Місяць / Month", "Місяць / Month … рік",
                  "Місяць • Month … рік", "Місяць … рік … Month",
                  "Рік … місяць … Month", "Рік … Місяць • Month … рік"],
    fYearStyle : "Рік",
    yearStyles : ["чорний", "червоний", "контуром"],
    cbCaps     : "Великі літери в заголовку і шапці",

    panelHead  : "Шапка днів тижня",
    fHeadMode  : "Розташування",
    headModes  : ["над сіткою і під нею", "двома рядками над сіткою"],
    fHeadFill  : "Заливка",
    headFills  : ["немає", "суцільна плашка", "через одну", "пігулки"],
    cbHeadInverse: "Білий текст на заливці",
    cbHeadWeekend: "Вихідні — на червоній плашці",

    panelGrid  : "Сітка",
    fLines     : "Лінії",
    lineModes  : ["немає", "між рядками", "таблиця", "лінійки в клітинках"],
    fLineWT    : "Товщина, pt / тон, %",
    fCells     : "Клітинки",
    cellModes  : ["без рамок", "скруглені рамки"],
    fColFill   : "Заливка колонок",
    colFills   : ["немає", "вихідні", "через одну"],
    fNumAlign  : "Число в клітинці",
    numAligns  : ["праворуч", "по центру", "у правому нижньому куті"],
    fNotes     : "Рядків для нотаток",

    panelNums  : "Числа і тижні",
    fAdjacent  : "Сусідні місяці",
    adjModes   : ["не показувати", "блідим кольором", "контуром"],
    fWeekMode  : "Номери тижнів",
    weekModes  : ["ліворуч, у полі", "колонкою ліворуч",
                  "колонками з двох боків", "не показувати"],
    cbWeekPad  : "З нулем попереду: 01, 02…",
    cbWeekFill : "Колонка тижнів на плашці",
    fDayTint   : "Тон чисел / тижнів, %",

    panelTpl : "Компонування",
    tpl: {
      below: "Міні під сіткою",
      side : "Міні поруч (сітка 65 %)",
      stack: "Міні стовпчиком (сітка 73 %)"
    },
    tplHint  : "Зміна компонування повертає його заводські розміри.",
    fMiniSide: "Міні-календарі",
    miniSides: ["праворуч", "ліворуч"],
    cbMiniPanel: "Плашка під міні-календарями",
    cbMiniAdj: "Сусідні дні в міні-календарях",
    cbPhoto  : "Фрейм під фото над сіткою",

    panelDoc : "Документ",
    fStart   : "Початок: місяць / рік",
    fMonthCount: "Місяців (сторінок)",
    cbYearPage : "Остання сторінка — рік цілком",
    cbYearPageTip: "Дванадцять місяців наступного року на одній сторінці в кінці " +
                   "документа. Рік підставляється сам — той, що йде за календарем; " +
                   "можна вписати свій.",
    prevYearPage : "{0} — рік цілком",
    warnYearSmall: "На сторінці року числа лише {0} pt — для друку це дрібно. " +
                   "Допоможе більший аркуш або вужчі поля.",
    doneYearPage : "\nОстання сторінка — {0} рік цілком.",
    fFormat  : "Формат аркуша",
    fPageWH  : "Ширина / висота, мм",
    fMarTB   : "Поля: верх / низ, мм",
    fMarLR   : "Поля: ліворуч / праворуч",
    btnFit   : "Підігнати під аркуш",
    btnFitTip: "Перераховує поля, кеглі, висоту рядка і відступ згори під " +
               "поточний формат. Викликається автоматично, коли ви обираєте " +
               "формат зі списку.",
    pagePresets: ["A2 книжна  420 × 594", "A2 альбомна 594 × 420",
                  "A3 книжна  297 × 420", "A3 альбомна 420 × 297",
                  "A4 книжна  210 × 297", "A4 альбомна 297 × 210",
                  "Власний розмір"],

    panelLayout: "Розкладка",
    fRatio   : "Частка ширини під сітку, %",
    fTop     : "Відступ від верху аркуша, мм",
    fAnchor  : "Прив'язка блоку",
    anchor   : ["до верху (назва на одній висоті)",
                "до низу (низ блоку на одній висоті)"],
    fGapBelow: "Проміжок під сіткою, мм",
    fGapSide : "Проміжок сітка → міні, мм",
    cbSix    : "Завжди 6 рядків у сітці",
    cbMini   : "Малювати міні-календарі",

    panelFont: "Шрифт",
    fFont    : "Шрифт",
    fFontCjk : "Шрифт ієрогліфів",
    fStyles  : "Накреслення: осн. / жирне",
    fontAuto : "— автовибір —",

    panelSizes: "Основна сітка",
    fTitleSize: "Кегль назви місяця, pt",
    fDaySize : "Кегль чисел, pt",
    fCellH   : "Висота рядка сітки, мм",
    fHeadLocal: "Кегль днів тижня ({0}), pt",
    fHeadEn  : "Кегль днів тижня (англ), pt",
    fWeekNo  : "Кегль номерів тижнів, pt",
    cbAuto   : "Підібрати за шириною колонки",
    cbAutoTip: "Перераховує висоту рядка і кегль чисел за шириною колонки.",

    panelMini : "Міні-календарі",
    fMiniTitle: "Кегль заголовка, pt",
    fMiniDay  : "Кегль чисел, pt",
    fMiniCellH: "Висота рядка, мм",
    fMiniHead : "Кегль {0}, pt",
    fMiniGap  : "Проміжок між двома міні, мм",
    fMiniWOne : "Ширина одного міні, мм",
    fMiniWCalc: "Ширина міні (рахується)",

    panelColors: "Кольори",
    fRed     : "Червоний CMYK",
    fFill    : "Заливка CMYK",
    fGrey    : "Сірий сусідніх місяців, %",
    fRedTint : "Тінт червоного сусідніх, %",
    colorsHint: "«Заливка» — плашки, колонки й рамки дизайну (колір «CAL Fill»).",

    panelPrev : "Схема сторінки",
    fPrevMonth: "Місяць:",
    zoomPage : "Аркуш",
    zoomBlock: "Крупно",

    btnReset : "Скинути розміри компонування",
    btnCancel: "Скасувати",
    btnOk    : "Створити",

    months   : ["Січень","Лютий","Березень","Квітень","Травень","Червень",
                "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"],

    monthYear: "{0} {1}",
    periodYear : "{0} рік",
    periodRange: "{0} — {1}",

    mLine1   : "Колонка {0} мм · рядок {1} мм · числа {2} pt",
    mLine2   : "Найнижча точка серед усіх місяців: {0} з {1} мм",
    mErr     : "Помилка: ",
    mWarn    : "Увага: ",

    errInner : "Поля не лишають місця на аркуші: смуга набору {0} мм.",
    errMargins: "Верхнє і нижнє поля перекривають одне одного.",
    errMiniRoom: "Для міні-календарів не лишилось місця ({0} мм). " +
                 "Зменште частку ширини під сітку або проміжок.",

    warnMiniNarrow: "Міні-календар шириною лише {0} мм — числа будуть тісними.",
    warnMiniWide  : "Два міні-календарі ({0} мм) ширші за смугу набору — " +
                    "один вийде за поле.",
    warnMiniDay   : "Числа в міні-календарях {0} pt — на друку це майже не " +
                    "читається. Спробуйте інше компонування або більший аркуш.",
    warnBelow     : "Блок виходить за нижнє поле на {0} мм ({1}). Зменште " +
                    "відступ згори, висоту рядка, кеглі або кількість рядків " +
                    "для нотаток.",
    warnAbove     : "Блок починається вище верхнього поля ({0}).",
    warnOverhang  : "Міні-календарі звисають нижче сітки на {0} мм ({1}). " +
                    "Допоможе «завжди 6 рядків».",
    warnNoCjk     : "Шрифт з ієрогліфами не знайдено. Китайський текст лишиться " +
                    "шрифтом документа і, найпевніше, не відмалюється.",
    warnCjkDoubt  : "Шрифт «{0}», схоже, не містить ієрогліфів. Перевірте в " +
                    "документі рожеве підсвічування — так InDesign позначає " +
                    "підмінені гліфи.",

    alertErrTitle : "Некоректні налаштування",
    alertErrHead  : "Так документ не побудувати:",
    alertWarnTitle: "Геометрія",
    alertWarnHead : "Перед створенням варто перевірити:",
    alertWarnTail : "Все одно створити документ?",
    buildFailTitle: "Помилка",
    buildFailHead : "Не вдалося побудувати календар:",
    lineWord      : "рядок",
    undo          : "Календарна сітка {0}",
    doneBody      : "Календар на {0} створено: {5} стор., {1} × {2} мм.{6}" +
                    "\nДизайн: {3}\nКомпонування: {4}\n\nУсе оформлення — у " +
                    "групах «CAL»: стилі абзаців, об'єктні й символьні стилі." +
                    "\nКольори — «CAL Red» і «CAL Fill» на панелі Swatches.",
    doneCjkNote   : "\nІєрогліфи набрано символьним стилем «CJK» у групі «CAL»."
  },

  ru: {
    labelW: 176, labelD: 118, ddW: 150,

    winTitle : "Календарная сетка v3 — конструктор",

    langUi   : "Интерфейс",
    langCal  : "Календарь",
    calNames : { ua: "укр", ru: "рус", zh: "кит" },

    tabDesign: "Дизайн",
    tabLayout: "Компоновка и лист",
    tabType  : "Шрифт и кегли",
    tabColors: "Цвета",

    fDesign  : "Набор",
    btnDesignReset: "Вернуть",
    btnDesignResetTip: "Возвращает все настройки оформления выбранного набора.",
    designs  : { classic: "Классика", panel: "Панель", rules: "Линейки",
                 airy: "Воздух", band: "Плашка", table: "Таблица",
                 contrast: "Контраст", boxes: "Ячейки", pills: "Пилюли",
                 notebook: "Блокнот" },
    designHint: "Дизайн меняет только оформление — размеры и компоновка остаются.",

    panelTitle : "Заголовок",
    fTitleMode : "Состав",
    titleModes : ["Месяц / Month", "Месяц / Month … год",
                  "Месяц • Month … год", "Месяц … год … Month",
                  "Год … месяц … Month", "Год … Месяц • Month … год"],
    fYearStyle : "Год",
    yearStyles : ["чёрный", "красный", "контуром"],
    cbCaps     : "Прописные в заголовке и шапке",

    panelHead  : "Шапка дней недели",
    fHeadMode  : "Расположение",
    headModes  : ["над сеткой и под ней", "двумя строками над сеткой"],
    fHeadFill  : "Заливка",
    headFills  : ["нет", "сплошная плашка", "через одну", "пилюли"],
    cbHeadInverse: "Белый текст на заливке",
    cbHeadWeekend: "Выходные — на красной плашке",

    panelGrid  : "Сетка",
    fLines     : "Линии",
    lineModes  : ["нет", "между строками", "таблица", "линейки в ячейках"],
    fLineWT    : "Толщина, pt / тон, %",
    fCells     : "Ячейки",
    cellModes  : ["без рамок", "скруглённые рамки"],
    fColFill   : "Заливка колонок",
    colFills   : ["нет", "выходные", "через одну"],
    fNumAlign  : "Число в ячейке",
    numAligns  : ["справа", "по центру", "в правом нижнем углу"],
    fNotes     : "Строк для заметок",

    panelNums  : "Числа и недели",
    fAdjacent  : "Соседние месяцы",
    adjModes   : ["не показывать", "бледным цветом", "контуром"],
    fWeekMode  : "Номера недель",
    weekModes  : ["слева, в поле", "колонкой слева",
                  "колонками с двух сторон", "не показывать"],
    cbWeekPad  : "С нулём впереди: 01, 02…",
    cbWeekFill : "Колонка недель на плашке",
    fDayTint   : "Тон чисел / недель, %",

    panelTpl : "Компоновка",
    tpl: {
      below: "Мини под сеткой",
      side : "Мини рядом (сетка 65 %)",
      stack: "Мини столбиком (сетка 73 %)"
    },
    tplHint  : "Смена компоновки возвращает её заводские размеры.",
    fMiniSide: "Мини-календари",
    miniSides: ["справа", "слева"],
    cbMiniPanel: "Плашка под мини-календарями",
    cbMiniAdj: "Соседние дни в мини-календарях",
    cbPhoto  : "Фрейм под фото над сеткой",

    panelDoc : "Документ",
    fStart   : "Начало: месяц / год",
    fMonthCount: "Месяцев (страниц)",
    cbYearPage : "Последняя страница — год целиком",
    cbYearPageTip: "Двенадцать месяцев следующего года на одной странице в конце " +
                   "документа. Год подставляется сам — тот, что идёт за календарём; " +
                   "можно вписать свой.",
    prevYearPage : "{0} — год целиком",
    warnYearSmall: "На странице года числа всего {0} pt — для печати мелко. " +
                   "Поможет лист побольше или поля поуже.",
    doneYearPage : "\nПоследняя страница — {0} год целиком.",
    fFormat  : "Формат листа",
    fPageWH  : "Ширина / высота, мм",
    fMarTB   : "Поля: верх / низ, мм",
    fMarLR   : "Поля: слева / справа",
    btnFit   : "Подогнать под лист",
    btnFitTip: "Пересчитывает поля, кегли, высоту строки и отступ сверху под " +
               "текущий формат. Вызывается автоматически, когда вы выбираете " +
               "формат из списка.",
    pagePresets: ["A2 книжная  420 × 594", "A2 альбомная 594 × 420",
                  "A3 книжная  297 × 420", "A3 альбомная 420 × 297",
                  "A4 книжная  210 × 297", "A4 альбомная 297 × 210",
                  "Свой размер"],

    panelLayout: "Раскладка",
    fRatio   : "Доля ширины под сетку, %",
    fTop     : "Отступ от верха листа, мм",
    fAnchor  : "Привязка блока",
    anchor   : ["по верху (месяц на одной высоте)",
                "по низу (низ блока на одной высоте)"],
    fGapBelow: "Отступ под сеткой, мм",
    fGapSide : "Отступ сетка → мини, мм",
    cbSix    : "Всегда 6 строк в сетке",
    cbMini   : "Рисовать мини-календари",

    panelFont: "Шрифт",
    fFont    : "Шрифт",
    fFontCjk : "Шрифт иероглифов",
    fStyles  : "Начертание: осн. / жирное",
    fontAuto : "— автовыбор —",

    panelSizes: "Основная сетка",
    fTitleSize: "Кегль названия месяца, pt",
    fDaySize : "Кегль чисел, pt",
    fCellH   : "Высота строки сетки, мм",
    fHeadLocal: "Кегль дней недели ({0}), pt",
    fHeadEn  : "Кегль дней недели (англ), pt",
    fWeekNo  : "Кегль номеров недель, pt",
    cbAuto   : "Подобрать по ширине колонки",
    cbAutoTip: "Пересчитывает высоту строки и кегль чисел по ширине колонки.",

    panelMini : "Мини-календари",
    fMiniTitle: "Кегль заголовка, pt",
    fMiniDay  : "Кегль чисел, pt",
    fMiniCellH: "Высота строки, мм",
    fMiniHead : "Кегль {0}, pt",
    fMiniGap  : "Отступ между двумя мини, мм",
    fMiniWOne : "Ширина одного мини, мм",
    fMiniWCalc: "Ширина мини (считается)",

    panelColors: "Цвета",
    fRed     : "Красный CMYK",
    fFill    : "Заливка CMYK",
    fGrey    : "Серый соседних месяцев, %",
    fRedTint : "Тинт красного соседних, %",
    colorsHint: "«Заливка» — плашки, колонки и рамки дизайна (цвет «CAL Fill»).",

    panelPrev : "Схема страницы",
    fPrevMonth: "Месяц:",
    zoomPage : "Лист",
    zoomBlock: "Крупно",

    btnReset : "Сбросить размеры компоновки",
    btnCancel: "Отмена",
    btnOk    : "Создать",

    months   : ["Январь","Февраль","Март","Апрель","Май","Июнь",
                "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],

    mLine1   : "Колонка {0} мм · строка {1} мм · числа {2} pt",
    mLine2   : "Самая нижняя точка среди всех месяцев: {0} из {1} мм",
    monthYear: "{0} {1}",
    periodYear : "{0} год",
    periodRange: "{0} — {1}",
    mErr     : "Ошибка: ",
    mWarn    : "Внимание: ",

    errInner : "Поля не оставляют места на листе: полоса набора {0} мм.",
    errMargins: "Верхнее и нижнее поля перекрывают друг друга.",
    errMiniRoom: "Для мини-календарей не осталось места ({0} мм). " +
                 "Уменьшите долю ширины под сетку или отступ.",

    warnMiniNarrow: "Мини-календарь шириной всего {0} мм — числа будут тесными.",
    warnMiniWide  : "Два мини-календаря ({0} мм) шире полосы набора — " +
                    "один выйдет за поле.",
    warnMiniDay   : "Числа в мини-календарях {0} pt — на печати это почти не " +
                    "читается. Попробуйте другую компоновку или больший лист.",
    warnBelow     : "Блок выходит за нижнее поле на {0} мм ({1}). Уменьшите " +
                    "отступ сверху, высоту строки, кегли или число строк " +
                    "для заметок.",
    warnAbove     : "Блок начинается выше верхнего поля ({0}).",
    warnOverhang  : "Мини-календари свисают ниже сетки на {0} мм ({1}). " +
                    "Поможет «всегда 6 строк».",
    warnNoCjk     : "Шрифт с иероглифами не найден. Китайский текст останется " +
                    "шрифтом документа и, скорее всего, не отрисуется.",
    warnCjkDoubt  : "Шрифт «{0}», похоже, не содержит иероглифов. Проверьте в " +
                    "документе розовую подсветку — так InDesign помечает " +
                    "подменённые глифы.",

    alertErrTitle : "Некорректные настройки",
    alertErrHead  : "Так документ не построить:",
    alertWarnTitle: "Геометрия",
    alertWarnHead : "Перед созданием стоит проверить:",
    alertWarnTail : "Всё равно создать документ?",
    buildFailTitle: "Ошибка",
    buildFailHead : "Не удалось построить календарь:",
    lineWord      : "строка",
    undo          : "Календарная сетка {0}",
    doneBody      : "Календарь на {0} создан: {5} стр., {1} × {2} мм.{6}" +
                    "\nДизайн: {3}\nКомпоновка: {4}\n\nВсё оформление — в " +
                    "группах «CAL»: стили абзацев, объектные и знаковые стили." +
                    "\nЦвета — «CAL Red» и «CAL Fill» на панели Swatches.",
    doneCjkNote   : "\nИероглифы набраны знаковым стилем «CJK» в группе «CAL»."
  },

  /* labelW/ddW: иероглиф в диалоге почти вдвое шире буквы, зато слов в
     подписи втрое меньше. */
  zh: {
    labelW: 150, labelD: 96, ddW: 150,

    winTitle : "日历网格生成器 v3",

    langUi   : "界面语言",
    langCal  : "日历语言",
    calNames : { ua: "乌克兰文", ru: "俄文", zh: "中文" },

    tabDesign: "设计",
    tabLayout: "版式与页面",
    tabType  : "字体与字号",
    tabColors: "颜色",

    fDesign  : "方案",
    btnDesignReset: "还原",
    btnDesignResetTip: "恢复所选方案的全部外观设置。",
    designs  : { classic: "经典", panel: "侧栏", rules: "横线",
                 airy: "轻盈", band: "色带", table: "表格",
                 contrast: "对比", boxes: "方格", pills: "胶囊",
                 notebook: "笔记" },
    designHint: "设计只改变外观，尺寸和版式保持不变。",

    panelTitle : "标题",
    fTitleMode : "组成",
    titleModes : ["月份 / Month", "月份 / Month … 年份",
                  "月份 • Month … 年份", "月份 … 年份 … Month",
                  "年份 … 月份 … Month", "年份 … 月份 • Month … 年份"],
    fYearStyle : "年份",
    yearStyles : ["黑色", "红色", "描边"],
    cbCaps     : "标题和表头使用大写",

    panelHead  : "星期表头",
    fHeadMode  : "位置",
    headModes  : ["网格上方和下方", "网格上方两行"],
    fHeadFill  : "底色",
    headFills  : ["无", "整条色带", "隔格填色", "胶囊"],
    cbHeadInverse: "底色上用白字",
    cbHeadWeekend: "周末使用红色底",

    panelGrid  : "网格",
    fLines     : "线条",
    lineModes  : ["无", "行间线", "表格", "格内书写线"],
    fLineWT    : "粗细 pt / 色调 %",
    fCells     : "单元格",
    cellModes  : ["无边框", "圆角边框"],
    fColFill   : "列填色",
    colFills   : ["无", "周末", "隔列"],
    fNumAlign  : "日期位置",
    numAligns  : ["靠右", "居中", "右下角"],
    fNotes     : "备注行数",

    panelNums  : "日期与周次",
    fAdjacent  : "相邻月份",
    adjModes   : ["不显示", "浅色", "描边"],
    fWeekMode  : "周次",
    weekModes  : ["左侧页边", "左侧一列", "两侧各一列", "不显示"],
    cbWeekPad  : "补零：01, 02…",
    cbWeekFill : "周次列加底色",
    fDayTint   : "日期 / 周次色调 %",

    panelTpl : "版式",
    tpl: {
      below: "小月历在网格下方",
      side : "小月历并排（网格 65 %）",
      stack: "小月历竖排（网格 73 %）"
    },
    tplHint  : "切换版式会恢复该版式的默认尺寸。",
    fMiniSide: "小月历位置",
    miniSides: ["右侧", "左侧"],
    cbMiniPanel: "小月历加底色",
    cbMiniAdj: "小月历显示相邻日期",
    cbPhoto  : "在网格上方放置图片框",

    panelDoc : "文档",
    fStart   : "起始：月份 / 年份",
    fMonthCount: "月数（页数）",
    cbYearPage : "末页：全年日历",
    cbYearPageTip: "在文档末尾用一页排出下一年的十二个月。年份自动取日历之后的" +
                   "那一年，也可以自行填写。",
    prevYearPage : "{0} 年全年",
    warnYearSmall: "全年页上的日期只有 {0} pt，印刷时偏小。可以换更大的页面或减小页边距。",
    doneYearPage : "\n末页：{0} 年全年日历。",
    fFormat  : "页面尺寸",
    fPageWH  : "宽 / 高，毫米",
    fMarTB   : "页边距：上 / 下",
    fMarLR   : "页边距：左 / 右",
    btnFit   : "按页面重算",
    btnFitTip: "根据当前页面尺寸重新计算页边距、字号、行高和顶部留白。" +
               "从列表中选择页面尺寸时会自动执行。",
    pagePresets: ["A2 竖向  420 × 594", "A2 横向  594 × 420",
                  "A3 竖向  297 × 420", "A3 横向  420 × 297",
                  "A4 竖向  210 × 297", "A4 横向  297 × 210",
                  "自定义尺寸"],

    panelLayout: "布局",
    fRatio   : "网格宽度占比 %",
    fTop     : "距页面顶部，毫米",
    fAnchor  : "版块对齐",
    anchor   : ["顶对齐（月份名称等高）", "底对齐（版块底部等高）"],
    fGapBelow: "网格下方留白，毫米",
    fGapSide : "网格 → 小月历，毫米",
    cbSix    : "网格固定 6 行",
    cbMini   : "绘制小月历",

    panelFont: "字体",
    fFont    : "字体",
    fFontCjk : "中文字体",
    fStyles  : "字重：正文 / 粗体",
    fontAuto : "— 自动选择 —",

    panelSizes: "主网格",
    fTitleSize: "月份名称字号 pt",
    fDaySize : "日期数字字号 pt",
    fCellH   : "网格行高，毫米",
    fHeadLocal: "星期名称字号（{0}）pt",
    fHeadEn  : "星期名称字号（英文）pt",
    fWeekNo  : "周次字号 pt",
    cbAuto   : "按列宽自动匹配",
    cbAutoTip: "按列宽重新计算行高与日期字号。",

    panelMini : "小月历",
    fMiniTitle: "标题字号 pt",
    fMiniDay  : "日期字号 pt",
    fMiniCellH: "行高，毫米",
    fMiniHead : "{0} 字号 pt",
    fMiniGap  : "两个小月历间距，毫米",
    fMiniWOne : "单个小月历宽度，毫米",
    fMiniWCalc: "小月历宽度（自动计算）",

    panelColors: "颜色",
    fRed     : "红色 CMYK",
    fFill    : "底色 CMYK",
    fGrey    : "相邻月份灰度 %",
    fRedTint : "相邻月份红色淡度 %",
    colorsHint: "“底色”用于设计中的色带、列和边框（色板 CAL Fill）。",

    panelPrev : "页面示意图",
    fPrevMonth: "月份：",
    zoomPage : "整页",
    zoomBlock: "放大",

    btnReset : "恢复版式默认尺寸",
    btnCancel: "取消",
    btnOk    : "生成",

    months   : ["一月","二月","三月","四月","五月","六月",
                "七月","八月","九月","十月","十一月","十二月"],

    mLine1   : "列宽 {0} 毫米 · 行高 {1} 毫米 · 日期 {2} pt",
    mLine2   : "所有月份最低点：{0} / {1} 毫米",
    monthYear: "{1} 年{0}",
    periodYear : "{0} 年",
    periodRange: "{0}至 {1}",
    mErr     : "错误：",
    mWarn    : "注意：",

    errInner : "页边距没有留下版心：版心宽度仅 {0} 毫米。",
    errMargins: "上下页边距互相重叠。",
    errMiniRoom: "小月历没有可用空间（{0} 毫米）。请减小网格宽度占比或间距。",

    warnMiniNarrow: "小月历宽度仅 {0} 毫米，日期会很拥挤。",
    warnMiniWide  : "两个小月历共 {0} 毫米，超出版心宽度，其中一个会越出页边距。",
    warnMiniDay   : "小月历日期为 {0} pt，印刷后几乎无法辨认。" +
                    "请改用其他版式或更大的页面。",
    warnBelow     : "版块超出下页边距 {0} 毫米（{1}）。" +
                    "请减小顶部留白、行高、字号或备注行数。",
    warnAbove     : "版块起点高于上页边距（{0}）。",
    warnOverhang  : "小月历比网格低出 {0} 毫米（{1}）。勾选“网格固定 6 行”可以解决。",
    warnNoCjk     : "未找到包含汉字的字体。中文将保留文档默认字体，很可能无法显示。",
    warnCjkDoubt  : "字体“{0}”可能不含汉字。请检查文档中的粉色高亮 — " +
                    "InDesign 用它标记被替换的字形。",

    alertErrTitle : "设置有误",
    alertErrHead  : "按当前设置无法生成文档：",
    alertWarnTitle: "版面几何",
    alertWarnHead : "生成前请确认：",
    alertWarnTail : "仍然生成文档吗？",
    buildFailTitle: "错误",
    buildFailHead : "无法生成日历：",
    lineWord      : "行",
    undo          : "日历网格 {0}",
    doneBody      : "{0}日历已生成：{5} 页，{1} × {2} 毫米。{6}\n设计：{3}\n" +
                    "版式：{4}\n\n全部外观都在 CAL 样式组中：段落样式、" +
                    "对象样式和字符样式。\n颜色为色板中的 CAL Red 和 CAL Fill。",
    doneCjkNote   : "\n汉字使用 CAL 样式组中的 CJK 字符样式。"
  }
};

/* Подстановка по {0}, {1}, … split/join, а не replace: в имени шрифта
   может встретиться $, который replace истолкует как ссылку на группу. */
function fmt(s) {
  var i;
  for (i = 1; i < arguments.length; i++)
    s = s.split("{" + (i - 1) + "}").join(String(arguments[i]));
  return s;
}

/* =====================================================================
   5. СОСТОЯНИЕ + СОХРАНЕНИЕ МЕЖДУ ЗАПУСКАМИ
   ===================================================================== */

/* Имя отличается от v2 — настройки старых скриптов не затираются. */
var PREFS_FILE = File(Folder.userData + "/CalendarGridBuilder3.txt");

function clone(o) {
  var r = {}, k;
  for (k in o) {
    if (!o.hasOwnProperty(k)) continue;
    r[k] = (typeof o[k] === "object" && o[k] !== null) ? clone(o[k]) : o[k];
  }
  return r;
}

function indexOf(arr, v) {
  var i;
  for (i = 0; i < arr.length; i++) if (arr[i] === v) return i;
  return -1;
}

/* Язык по умолчанию — по локали системы; дальше его помнит файл настроек */
function defaultLang() {
  var loc = "";
  try { loc = String($.locale || "").toLowerCase(); } catch (e) {}
  if (loc.indexOf("ru") === 0) return "ru";
  if (loc.indexOf("zh") === 0) return "zh";
  return "ua";
}

function factoryState(tpl, design) {
  var lang = defaultLang();
  return {
    template: tpl,
    design  : design,
    uiLang  : lang,
    calLang : lang,
    year    : COMMON.year,
    startMonth: COMMON.startMonth,
    monthCount: COMMON.monthCount,
    yearPage  : COMMON.yearPage,
    yearPageYear: COMMON.yearPageYear,
    doc     : clone(COMMON.doc),
    font    : clone(COMMON.font),
    colors  : clone(COMMON.colors),
    layout  : clone(PRESETS[tpl].layout),
    options : clone(PRESETS[tpl].options),
    style   : designStyle(design),
    view    : { zoom: "block" }
  };
}

var state = factoryState("stack", "classic");

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
    var tpl = state.template, des = state.design;

    // компоновку и дизайн читаем первыми — от них зависят заводские значения
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i].split("\t");
      if (p[0] === "template" && PRESETS[p[1]]) tpl = p[1];
      if (p[0] === "design"   && DESIGNS[p[1]]) des = p[1];
    }
    state = factoryState(tpl, des);

    for (i = 0; i < pairs.length; i++) {
      p = pairs[i].split("\t");
      if (p.length !== 2) continue;
      path = p[0].split("."); val = p[1];
      if (path[0] === "template" || path[0] === "design") continue;

      node = state;
      for (j = 0; j < path.length - 1; j++) {
        seg = path[j];
        if (node[seg] === undefined) { node = null; break; }
        node = node[seg];
      }
      if (!node) continue;
      seg = path[path.length - 1];
      if (node[seg] === undefined) continue;      // ключ из старой версии

      if (typeof node[seg] === "number") {
        num = parseFloat(val);
        if (!isNaN(num)) node[seg] = num;         // испорченный файл не должен
      }                                           // разнести NaN по геометрии
      else if (typeof node[seg] === "boolean") node[seg] = (val === "true");
      else if (node === state.style && ENUMS[seg]) {
        if (indexOf(ENUMS[seg], val) >= 0) node[seg] = val;
      }
      else node[seg] = val;
    }
  } catch (e) {}

  // язык из файла может оказаться каким угодно — дальше по коду он
  // используется как ключ таблиц, и промах уронил бы диалог на undefined
  if (!UI[state.uiLang])   state.uiLang  = "ua";
  if (!CAL[state.calLang]) state.calLang = "ua";
  if (indexOf(ENUMS.miniSide, state.options.miniSide) < 0) state.options.miniSide = "right";
  // диапазон идёт индексом в таблицы месяцев — только целые и в границах
  state.startMonth = clampInt(state.startMonth, 0, 11);
  state.monthCount = clampInt(state.monthCount, LIMITS.months[0], LIMITS.months[1]);
  state.year       = clampInt(state.year, LIMITS.year[0], LIMITS.year[1]);
  if (state.yearPageYear !== 0)
    state.yearPageYear = clampInt(state.yearPageYear, LIMITS.year[0], LIMITS.year[1]);
}

function clampInt(v, lo, hi) {
  v = Math.round(v);
  if (isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/* =====================================================================
   6. ДАТЫ (всё в UTC, чтобы избежать сдвигов часового пояса)
   ===================================================================== */

var DAY_MS = 86400000;

function dUTC(y, m, d)  { return new Date(Date.UTC(y, m, d)); }
function addDays(dt, n) { return new Date(dt.getTime() + n * DAY_MS); }
function dowMon(dt)     { return (dt.getUTCDay() + 6) % 7; }   // 0 = Пн … 6 = Вс
function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

/* Номер недели по ISO-8601 */
function isoWeek(dt) {
  var t = dUTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  t = addDays(t, 3 - dowMon(t));                 // четверг этой недели
  var ft = dUTC(t.getUTCFullYear(), 0, 4);       // 4 января всегда в 1-й неделе
  ft = addDays(ft, 3 - dowMon(ft));              // четверг 1-й недели
  return 1 + Math.round((t.getTime() - ft.getTime()) / (7 * DAY_MS));
}

/* Матрицы кешируются: за одно обновление схемы их нужно больше сотни,
   а разных среди них самое большее 13. Даты не меняются, кеш не устаревает. */
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
  MATRIX_CACHE[key] = rows;                  // только читается, не мутируется
  return rows;
}

/* Месяцы, которые войдут в документ, по порядку страниц. У каждого свой
   год: диапазон «декабрь 2026 + 13» переходит через Новый год. */
function monthRange() {
  var list = [], i, m;
  for (i = 0; i < state.monthCount; i++) {
    m = state.startMonth + i;
    list.push({ year: state.year + Math.floor(m / 12), month: m % 12 });
  }
  return list;
}

function isWholeYear() { return state.startMonth === 0 && state.monthCount === 12; }

/* «Май 2027» / «2027 年五月» — для подписей и предупреждений */
function monthLabel(U, e, lower) {
  var name = U.months[e.month];
  return fmt(U.monthYear, lower ? name.toLowerCase() : name, e.year);
}

/* Период для итогового сообщения: «2027 год» или «декабрь 2026 — декабрь 2027» */
function periodText(U) {
  var list = monthRange(), a = list[0], b = list[list.length - 1];
  if (isWholeYear())    return fmt(U.periodYear, a.year);
  if (list.length === 1) return monthLabel(U, a, true);
  return fmt(U.periodRange, monthLabel(U, a, true), monthLabel(U, b, true));
}

/* Короткий период без слов — для названия шага отмены */
function periodShort() {
  var list = monthRange(), a = list[0], b = list[list.length - 1];
  function mm(e) { return (e.month < 9 ? "0" : "") + (e.month + 1) + "." + e.year; }
  if (isWholeYear())    return String(a.year);
  if (list.length === 1) return mm(a);
  return mm(a) + "–" + mm(b);
}

/* Год для страницы «год целиком», если его не вписали вручную: год
   месяца, который идёт сразу за последней страницей. Для календаря на
   2027 это 2028, для «декабрь 2026 + 13» — тоже 2028, для «июль 2027 —
   июнь 2028» — 2028: год, который продолжается после календаря. */
function autoYearPageYear() {
  var list = monthRange(), last = list[list.length - 1];
  return last.year + (last.month === 11 ? 1 : 0);
}

function yearPageYear() {
  return (state.yearPageYear > 0) ? state.yearPageYear : autoYearPageYear();
}

/* Страниц в документе: месяцы плюс, если включена, страница года */
function pageCount() { return state.monthCount + (state.yearPage ? 1 : 0); }

/* Месяц с наибольшим числом строк — худший случай по высоте, его схема
   показывает первым */
function tallestMonth(list) {
  var best = 0, rows = 0, i, n;
  for (i = 0; i < list.length; i++) {
    n = monthMatrix(list[i].year, list[i].month, false).length;
    if (n > rows) { rows = n; best = i; }
  }
  return best;
}

function pt2mm(v) { return v * 25.4 / 72; }

/* =====================================================================
   7. ГЕОМЕТРИЯ
   Единственный источник координат: им пользуются и сцена (а через неё
   документ и схема в диалоге), и проверка настроек.
   ===================================================================== */

function measureMini(year, month) {
  var L = state.layout;
  var rows = monthMatrix(year, month, false).length;
  return pt2mm(L.miniTitleSize) * FRAME.miniTitle + L.miniTitleGap
       + pt2mm(L.miniHeadSize) * FRAME.miniHead
       + rows * L.miniCellH
       + pt2mm(L.miniHeadSize) * FRAME.miniHead;
}

/* Сколько колонок недель стоит внутри таблицы.

   ВНИМАНИЕ: ExtendScript разбирает «a ? b : c ? d : e» как
   «(a ? b : c) ? d : e». Вложенные тернарные операторы в этом файле
   либо заключены в скобки, либо заменены на if. */
function weekCols() {
  var w = state.style.weekNo;
  if (w === "left") return 1;
  if (w === "both") return 2;
  return 0;
}

/* Высота шапки над сеткой и под ней */
function headerHeights() {
  var L = state.layout, S = state.style;
  var k = (S.headFill === "pill") ? FRAME.pill : 1;   // пилюле нужен воздух вокруг текста
  if (S.headMode === "stacked")
    return { top: (pt2mm(L.headLocSize) + pt2mm(L.headEnSize)) * FRAME.headStack * k, bot: 0 };
  return { top: pt2mm(L.headLocSize) * FRAME.head * k,
           bot: pt2mm(L.headEnSize) * FRAME.head * k };
}

/* Шапка вплотную к сетке: у таблицы, линеек и плашек зазор выглядел бы
   разрывом. Рамки и пилюли держат свой зазор сами. */
function attached() {
  var S = state.style;
  if (S.cells === "box" || S.headFill === "pill") return false;
  return S.lines === "rows" || S.lines === "table" ||
         S.headFill === "band" || S.headFill === "alt";
}

/* Полоса под сетку и зона мини-календарей — без зажатия: validate()
   берёт отсюда «сырую» ширину мини, чтобы сообщить о нехватке места. */
function zones() {
  var L = state.layout, D = state.doc, O = state.options, S = state.style;
  var T = state.template;

  var innerW = Math.max(1, D.pageWidth - D.marginLeft - D.marginRight);
  var gw     = Math.max(7, (T === "below") ? innerW : innerW * L.mainRatio);
  var left   = (O.miniSide === "left");
  var gx     = D.marginLeft + ((T !== "below" && left) ? innerW - gw : 0);

  var z = { innerW: innerW, gw: gw, gx: gx, left: left, pad: 0 };

  if (T === "below") {
    z.mw  = L.miniW;
    z.pad = S.miniPanel ? L.miniGap * K.panelPad : 0;
  } else {
    z.zoneW = innerW - gw - L.mainMiniGap;
    z.zoneX = left ? D.marginLeft : gx + gw + L.mainMiniGap;
    z.pad   = S.miniPanel ? L.mainMiniGap * K.panelPad : 0;
    z.mw    = (T === "side") ? (z.zoneW - 2 * z.pad - L.miniGap) / 2
                             : z.zoneW - 2 * z.pad;
  }
  return z;
}

/* Вся геометрия страницы месяца — никакого рисования.
   Отрицательные ширины здесь не появляются: они зажимаются, чтобы
   некорректные настройки не доходили до InDesign в виде фрейма с x2 < x1.
   О самой проблеме сообщает validate(). */
function computeMonth(year, month) {
  var L = state.layout, D = state.doc, O = state.options, S = state.style;
  var T = state.template;
  var z = zones();

  var gx = z.gx, gw = z.gw;
  var nWk  = weekCols();
  var colW = gw / (7 + nWk * K.weekCol);
  var wkW  = colW * K.weekCol;
  var dx   = gx + (nWk >= 1 ? wkW : 0);           // левый край понедельника

  var rows = monthMatrix(year, month, O.fixedSixRows);
  var thH  = pt2mm(L.titleSize) * FRAME.title;
  var hh   = headerHeights();
  var att  = attached();
  var gapTop = att ? 0 : L.headLocGap;
  var gapBot = (hh.bot > 0) ? (att ? 0 : L.headEnGap) : 0;
  var notesH = (S.notes > 0) ? L.cellH * (K.notesGap + S.notes * K.notesStep) : 0;

  var blockH = thH + L.titleGap + hh.top + gapTop + rows.length * L.cellH +
               gapBot + hh.bot + notesH;

  var top = (O.blockAnchor === "bottom")
          ? (D.pageHeight - D.marginBottom - blockH)
          : L.blockTop;

  var headTopY = top + thH + L.titleGap;
  var gridTop  = headTopY + hh.top + gapTop;
  var gridH    = rows.length * L.cellH;
  var gridBot  = gridTop + gridH;
  var headBotY = gridBot + gapBot;

  var g = {
    rows: rows, gx: gx, gw: gw, tx1: gx, tx2: gx + gw,
    colW: colW, wkW: wkW, nWk: nWk, dx: dx,
    att: att, thH: thH, hTop: hh.top, hBot: hh.bot,
    titleY: top, headTopY: headTopY,
    gridTop: gridTop, gridBottom: gridBot, gridH: gridH,
    headBotY: headBotY,
    tableTop: att ? headTopY : gridTop,
    tableBottom: (att && hh.bot > 0) ? headBotY + hh.bot : gridBot,
    notesY: headBotY + hh.bot, notesH: notesH,
    blockBottom: top + blockH,
    weekX1: gx - L.weekNoGap - L.weekNoW, weekX2: gx - L.weekNoGap,
    minis: [], panel: null
  };

  if (!O.showMiniCalendars) return g;

  var pm = month - 1, py = year;  if (pm < 0)  { pm = 11; py = year - 1; }
  var nm = month + 1, ny = year;  if (nm > 11) { nm = 0;  ny = year + 1; }

  var h1 = measureMini(py, pm), h2 = measureMini(ny, nm);
  var mw = Math.max(5, z.mw), pad = z.pad;
  var zoneX, my, maxH, vgap, x1, i, mt, mb;

  if (T === "below") {
    // под сеткой, оба в ряд, прижаты к правому (или левому) полю
    zoneX = z.left ? D.marginLeft + pad
                   : D.pageWidth - D.marginRight - pad - (mw * 2 + L.miniGap);
    my    = g.blockBottom + L.miniGapTop + pad;
    g.minis.push({ x: zoneX,                  y: my, w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX + mw + L.miniGap, y: my, w: mw, h: h2, year: ny, month: nm });

  } else if (T === "side") {
    // сбоку от сетки, в один ряд
    x1   = z.zoneX + pad;
    maxH = Math.max(h1, h2);

    if (L.miniVAlign === "top")         my = gridTop;
    else if (L.miniVAlign === "bottom") my = gridBot - maxH;
    else                                my = gridTop + (gridH - maxH) / 2;

    g.minis.push({ x: x1,                  y: my, w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: x1 + mw + L.miniGap, y: my, w: mw, h: h2, year: ny, month: nm });

  } else {
    // stack — сбоку, один под другим; промежуток растягивается так, чтобы
    // верх первого и низ второго совпали с границами сетки чисел
    x1   = z.zoneX + pad;
    vgap = gridH - (h1 + h2);
    my   = gridTop;

    if (vgap < L.miniVGapMin) {
      vgap = L.miniVGapMin;                       // не вмещается — свисает вниз
    } else if (vgap > L.miniVGapMax) {
      vgap = L.miniVGapMax;                       // слишком большой — центруем пару
      my   = gridTop + (gridH - (h1 + h2 + vgap)) / 2;
    }

    g.minis.push({ x: x1, y: my,             w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: x1, y: my + h1 + vgap, w: mw, h: h2, year: ny, month: nm });
  }

  if (S.miniPanel) {
    mt = g.minis[0].y; mb = g.minis[0].y + g.minis[0].h;
    for (i = 1; i < g.minis.length; i++) {
      mt = Math.min(mt, g.minis[i].y);
      mb = Math.max(mb, g.minis[i].y + g.minis[i].h);
    }
    if (T === "below") {
      g.panel = [g.minis[0].x - pad, mt - pad,
                 g.minis[1].x + g.minis[1].w + pad, mb + pad];
    } else {
      // плашка во всю высоту блока — от заголовка до низа таблицы
      g.panel = [z.zoneX, Math.min(mt - pad, g.titleY),
                 z.zoneX + Math.max(5, z.zoneW), Math.max(mb + pad, g.tableBottom)];
    }
  }
  return g;
}

/* Ширина колонки дня — для подписи под схемой и автоподбора */
function columnWidth() { return computeMonth(state.year, 0).colW; }

/* Самая нижняя точка блока по всем месяцам диапазона + сопутствующие
   наблюдения. Месяцы в ответе — записи { year, month } из monthRange(). */
function worstBottom() {
  var list = monthRange();
  var r = { y: 0, month: list[0], overhang: 0, overMonth: list[0],
            aboveTop: null, top: 1e9 };
  var k, e, i, g, b, ov, t;

  for (k = 0; k < list.length; k++) {
    e = list[k];
    g = computeMonth(e.year, e.month);
    b = g.blockBottom;
    t = g.titleY;

    for (i = 0; i < g.minis.length; i++) {
      b = Math.max(b, g.minis[i].y + g.minis[i].h);
      t = Math.min(t, g.minis[i].y);
      if (state.template !== "below") {
        ov = (g.minis[i].y + g.minis[i].h) - g.gridBottom;
        if (ov > r.overhang) { r.overhang = ov; r.overMonth = e; }
      }
    }
    if (g.panel) { b = Math.max(b, g.panel[3]); t = Math.min(t, g.panel[1]); }
    if (b > r.y) { r.y = b; r.month = e; }
    if (t < r.top) r.top = t;
    if (!r.aboveTop && t < state.doc.marginTop) r.aboveTop = e;
  }
  return r;
}

/* Высота блока от названия месяца до самой нижней точки, считанная по
   6-строчному месяцу — худшему случаю. Не зависит от blockTop. */
function contentHeight() {
  var L = state.layout, O = state.options;
  var keepTop = L.blockTop, keepAnchor = O.blockAnchor, keepSix = O.fixedSixRows;

  L.blockTop = 0; O.blockAnchor = "top"; O.fixedSixRows = true;
  var h = worstBottom().y;
  L.blockTop = keepTop; O.blockAnchor = keepAnchor; O.fixedSixRows = keepSix;

  return h;
}

/* Низ фрейма под фото: выше самого высокого блока диапазона — чтобы
   фото на всех страницах были одного размера. */
function photoBottom() {
  return worstBottom().top - state.layout.photoGap;
}

/* Подгоняет заводские пропорции компоновки под текущий формат листа.

   Шаг 1: поля — по меньшей стороне листа.
   Шаг 2: всё линейное умножается на отношение полос набора. Пропорции,
          проверенные на A2, сохраняются точно.
   Шаг 3: если блок не влезает в высоту (широкий низкий лист), вертикаль
          дополнительно сжимается.
   Шаг 4: блок прижимается так, чтобы низ не выходил за нижнее поле.

   На A2 книжной все коэффициенты равны 1 и значения остаются
   заводскими. */
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

  // 2 % оставляем запасом: иначе блок садится в поле впритык и любое
  // округление выглядит как выход за границы
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

/* Мелкий лист может дать кегль меньше допустимого — границы те же,
   что и для полей диалога. */
function clampLayout() {
  var L = state.layout, i, key;
  var sizes = ["titleSize", "headLocSize", "headEnSize", "daySize", "weekNoSize",
               "miniTitleSize", "miniHeadSize", "miniDaySize", "miniWeekNoSize"];

  for (i = 0; i < sizes.length; i++) {
    key = sizes[i];
    if (L[key] < LIMITS.fontSize[0]) L[key] = LIMITS.fontSize[0];
  }
  if (L.cellH < LIMITS.cellH[0])     L.cellH = LIMITS.cellH[0];
  if (L.miniCellH < LIMITS.cellH[0]) L.miniCellH = LIMITS.cellH[0];
  if (L.miniW < LIMITS.miniW[0])     L.miniW = LIMITS.miniW[0];
}

/* Страница «год целиком»: крупный год сверху и двенадцать месяцев сеткой.
   Всё меряется в u — ширине колонки дня; u подбирается под лист так,
   чтобы месяцы вышли как можно крупнее. Кегли получаются из u, поэтому
   страница сама подстраивается под A2, A4 и альбомную ориентацию. */
var YP = {
  title   : 2.2,   // кегль года = кегль названия месяца × 2.2
  titleGap: 0.45,  // зазор под годом — доля высоты строки года
  month   : 0.44,  // кегль названия месяца, доля u (в мм)
  monthGap: 0.22,
  head    : 0.27,  // буквы дней недели
  day     : 0.40,  // числа
  week    : 0.26,  // номера недель
  cellMin : 0.62,  // высота строки: не ниже…
  cellMax : 0.95,  // …и не выше, остаток высоты уходит в зазоры
  wkW     : 0.80,  // колонка номеров недель
  wkGap   : 0.25,
  gutX    : 1.2,  gutXMax: 3.0,   // зазоры между месяцами
  gutY    : 1.1,  gutYMax: 2.2,
  pad     : 0.35   // поле плашки вокруг месяца (дизайны с плашкой под мини)
};

function yearGeom() {
  var D = state.doc, L = state.layout, S = state.style;
  var x0 = D.marginLeft, y0 = D.marginTop;
  var w  = Math.max(10, D.pageWidth  - D.marginLeft - D.marginRight);
  var h  = Math.max(10, D.pageHeight - D.marginTop  - D.marginBottom);

  var titlePt = Math.max(1, Math.min(LIMITS.fontSize[1], L.titleSize * YP.title));
  var th = pt2mm(titlePt) * FRAME.title;
  var gy = y0 + th * (1 + YP.titleGap);
  var gh = Math.max(5, y0 + h - gy);

  var wkU  = (S.weekNo !== "none") ? YP.wkW + YP.wkGap : 0;
  var padU = S.miniPanel ? YP.pad : 0;
  var fixU = YP.month * FRAME.miniTitle + YP.monthGap + 2 * YP.head * FRAME.miniHead;

  // раскладка 2×6, 3×4, 4×3 или 6×2 — какая даст месяцы крупнее
  var opts = [2, 3, 4, 6], best = null, i, cols, rows, uw, uh, u;
  for (i = 0; i < opts.length; i++) {
    cols = opts[i]; rows = 12 / cols;
    uw = w  / (cols * (7 + wkU) + (cols - 1) * YP.gutX + 2 * padU);
    uh = gh / (rows * (fixU + 6 * YP.cellMin) + (rows - 1) * YP.gutY + 2 * padU);
    u  = Math.min(uw, uh);
    if (!best || u > best.u + 1e-9) best = { cols: cols, rows: rows, u: u };
  }
  u = best.u; cols = best.cols; rows = best.rows;

  var pad = padU * u, bw = (7 + wkU) * u, fix = fixU * u;
  var availH = gh - 2 * pad;

  // строки растягиваются по высоте, но в разумных пределах
  var cellH = (availH - (rows - 1) * YP.gutY * u - rows * fix) / (rows * 6);
  cellH = Math.max(YP.cellMin * u, Math.min(YP.cellMax * u, cellH));
  var bh = fix + 6 * cellH;

  var gapY = (rows > 1) ? (availH - rows * bh) / (rows - 1) : 0;
  gapY = Math.max(YP.gutY * u, Math.min(YP.gutYMax * u, gapY));
  var gapX = (cols > 1) ? (w - 2 * pad - cols * bw) / (cols - 1) : 0;
  gapX = Math.max(YP.gutX * u, Math.min(YP.gutXMax * u, gapX));

  var gridW = cols * bw + (cols - 1) * gapX;
  var gridH = rows * bh + (rows - 1) * gapY;

  function pt(k) { return Math.max(1, Math.round(k * u / pt2mm(1) * 10) / 10); }

  return {
    titleB: [x0, y0, x0 + w, y0 + th], titlePt: titlePt,
    cols: cols, rows: rows, u: u, bw: bw, bh: bh, cellH: cellH,
    gapX: gapX, gapY: gapY, pad: pad,
    // левый верхний угол сетки вместе с полями плашек; сетка по центру
    left: x0 + (w  - gridW - 2 * pad) / 2,
    top : gy + (gh - gridH - 2 * pad) / 2,
    wkW : wkU ? YP.wkW * u : 0, wkGap: wkU ? YP.wkGap * u : 0,
    monthPt: pt(YP.month), headPt: pt(YP.head), dayPt: pt(YP.day), weekPt: pt(YP.week),
    monthH: YP.month * u * FRAME.miniTitle, monthGap: YP.monthGap * u,
    headH : YP.head  * u * FRAME.miniHead
  };
}

/* =====================================================================
   8. СЦЕНА — ЧТО И ГДЕ РИСОВАТЬ

   monthScene() превращает геометрию месяца в плоский список элементов:
     { k: "rect",  b: [x1, y1, x2, y2], os: ключ объектного стиля }
     { k: "line",  b: [x1, y1, x2, y2], os: … }
     { k: "photo", b: [ … ] }                         — пустой фрейм под фото
     { k: "text",  b, t, ps, t2, ps2, os, vj, ins, bullet }
   Порядок списка — порядок наложения: фон, затем линии, затем текст.

   По этому списку строятся и страницы документа, и схема в диалоге —
   поэтому схема не может разойтись с результатом.
   ===================================================================== */

/* Стили абзацев. key — по нему обращается код (от языка не зависит),
   name — то, что видит верстальщик на панели Paragraph Styles. */
function paraSpecs() {
  var L = state.layout, S = state.style, C = state.colors;
  var tag = CAL[state.calLang].tag;
  var hAlign  = (S.numAlign === "center") ? "C" : "R";
  var wkAlign = (S.weekNo === "margin") ? "R" : "C";
  var outTint = Math.min(100, C.grey + 35);
  var sp = {};

  function add(key, name, o) { o.name = name; sp[key] = o; }
  function head(key, name, size, extra) {
    var o = { size: size, align: hAlign, caps: S.caps }, k;
    for (k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    add(key, name, o);
  }

  add("title",  "Month title",        { size: L.titleSize, bold: true, align: "L", caps: S.caps });
  add("titleC", "Month title center", { size: L.titleSize, bold: true, align: "C", caps: S.caps });
  add("titleR", "Month title right",  { size: L.titleSize, bold: true, align: "R", caps: S.caps });

  var yr = { size: L.titleSize, bold: true };
  if (S.yearStyle === "red")     yr.color = "red";
  if (S.yearStyle === "outline") { yr.outline = true; yr.tint = outTint; }
  add("year",  "Year",        { size: yr.size, bold: true, align: "L", color: yr.color, outline: yr.outline, tint: yr.tint });
  add("yearC", "Year center", { size: yr.size, bold: true, align: "C", color: yr.color, outline: yr.outline, tint: yr.tint });
  add("yearR", "Year right",  { size: yr.size, bold: true, align: "R", color: yr.color, outline: yr.outline, tint: yr.tint });

  head("headLoc",    "Weekday " + tag,              L.headLocSize, {});
  head("headLocRed", "Weekday " + tag + " red",     L.headLocSize, { color: "red" });
  head("headLocInv", "Weekday " + tag + " inverse", L.headLocSize, { color: "paper" });
  head("headEn",     "Weekday EN",                  L.headEnSize,  {});
  head("headEnRed",  "Weekday EN red",              L.headEnSize,  { color: "red" });
  head("headEnInv",  "Weekday EN inverse",          L.headEnSize,  { color: "paper" });

  add("day",    "Day",     { size: L.daySize, align: hAlign, tint: S.dayTint });
  add("dayRed", "Day red", { size: L.daySize, align: hAlign, color: "red" });
  if (S.adjacent === "outline") {
    add("dayAdj",    "Day adjacent",     { size: L.daySize, align: hAlign, outline: true, tint: outTint });
    add("dayAdjRed", "Day adjacent red", { size: L.daySize, align: hAlign, outline: true,
                                           color: "red", tint: outTint });
  } else {
    add("dayAdj",    "Day adjacent",     { size: L.daySize, align: hAlign, tint: C.grey });
    add("dayAdjRed", "Day adjacent red", { size: L.daySize, align: hAlign, color: "red",
                                           tint: C.redTint });
  }
  add("weekNo", "Week no", { size: L.weekNoSize, align: wkAlign, tint: S.weekTint });

  add("miniTitle",     "Mini title",            { size: L.miniTitleSize, align: "L" });
  add("miniHead",      "Mini weekday",          { size: L.miniHeadSize, align: "R" });
  add("miniHeadRed",   "Mini weekday red",      { size: L.miniHeadSize, align: "R", color: "red" });
  add("miniDay",       "Mini day",              { size: L.miniDaySize, align: "R" });
  add("miniDayRed",    "Mini day red",          { size: L.miniDaySize, align: "R", color: "red" });
  add("miniDayAdj",    "Mini day adjacent",     { size: L.miniDaySize, align: "R", tint: C.grey });
  add("miniDayAdjRed", "Mini day adjacent red", { size: L.miniDaySize, align: "R", color: "red",
                                                  tint: C.redTint });
  add("miniWeekNo",    "Mini week no",          { size: L.miniWeekNoSize, align: "R", color: "red" });

  // страница «год целиком»: кегли считает yearGeom() по формату листа
  var G = yearGeom();
  add("ypTitle",  "Year page",        { size: G.titlePt, bold: true, align: "L", color: yr.color,
                                        outline: yr.outline, tint: yr.tint });
  add("ypTitleC", "Year page center", { size: G.titlePt, bold: true, align: "C", color: yr.color,
                                        outline: yr.outline, tint: yr.tint });
  add("ypMonth",     "Year page month",       { size: G.monthPt, bold: true, align: "L", caps: S.caps });
  add("ypHead",      "Year page weekday",     { size: G.headPt, align: "R" });
  add("ypHeadRed",   "Year page weekday red", { size: G.headPt, align: "R", color: "red" });
  add("ypDay",       "Year page day",         { size: G.dayPt, align: "R", tint: S.dayTint });
  add("ypDayRed",    "Year page day red",     { size: G.dayPt, align: "R", color: "red" });
  add("ypDayAdj",    "Year page day adjacent",     { size: G.dayPt, align: "R", tint: C.grey });
  add("ypDayAdjRed", "Year page day adjacent red", { size: G.dayPt, align: "R", color: "red",
                                                     tint: C.redTint });
  add("ypWeekNo",    "Year page week no",     { size: G.weekPt, align: "R", tint: C.grey });
  return sp;
}

/* Названия и заголовки — жирным; им же нужен жирный стиль иероглифов */
var BOLD_KEYS = { title: true, titleC: true, titleR: true,
                  year: true, yearC: true, yearR: true,
                  ypTitle: true, ypTitleC: true, ypMonth: true };

function boxGap(g) { return Math.min(g.colW, state.layout.cellH) * K.boxGap; }

/* Объектные стили: заливки, линии, рамки. Размеры колонок одинаковы во
   всех месяцах, поэтому радиусы считаются по любому из них. */
function objSpecs(g) {
  var S = state.style, L = state.layout;
  var w = S.lineWeight, lt = S.lineTint;
  var boxR  = Math.max(0, (L.cellH - 2 * boxGap(g)) * K.boxRadius);
  var pillH = Math.min(g.hTop, g.hBot > 0 ? g.hBot : g.hTop) * (1 - 2 * K.pillPadY);
  var pillR = Math.max(0, pillH / 2);

  return {
    band     : { name: "CAL Head band",          fill: "fill" },
    headAlt  : { name: "CAL Head cell",          fill: "fill" },
    headRed  : { name: "CAL Head weekend",       fill: "red" },
    pill     : { name: "CAL Head pill",          fill: "fill", radius: pillR },
    pillRed  : { name: "CAL Head pill weekend",  fill: "red",  radius: pillR },
    colFill  : { name: "CAL Column fill",        fill: "fill", fillTint: 40 },
    weekFill : { name: "CAL Week column",        fill: "fill", fillTint: 60 },
    rule     : { name: "CAL Rule",       stroke: true, weight: w, strokeTint: lt, cap: true },
    ruleThin : { name: "CAL Rule notes", stroke: true, weight: Math.max(0.1, w * 0.6),
                 strokeTint: Math.max(10, lt * 0.6), cap: true },
    box      : { name: "CAL Day box",          stroke: true, weight: w, strokeTint: lt,
                 radius: boxR },
    boxAdj   : { name: "CAL Day box adjacent", stroke: true, weight: w, strokeTint: lt,
                 radius: boxR, fill: "fill", fillTint: 30 },
    miniPanel: { name: "CAL Mini panel",       fill: "fill", fillTint: 50 },
    miniRule : { name: "CAL Mini rule",        stroke: true, weight: L.miniRuleWeight,
                 strokeTint: 100 },
    photo    : { name: "CAL Photo" }
  };
}

function txt(b, t, ps, o) {
  var it = { k: "text", b: b, t: t, ps: ps, t2: null, ps2: null,
             os: null, vj: "C", ins: null, bullet: -1 }, k;
  if (o) for (k in o) if (o.hasOwnProperty(k)) it[k] = o[k];
  return it;
}

/* Колонки таблицы слева направо: колонки недель внутри таблицы + 7 дней */
function tableColumns(g) {
  var a = [], c;
  if (g.nWk >= 1) a.push({ x1: g.tx1, x2: g.tx1 + g.wkW, week: true, c: -1 });
  for (c = 0; c < 7; c++)
    a.push({ x1: g.dx + c * g.colW, x2: g.dx + (c + 1) * g.colW, week: false, c: c });
  if (g.nWk === 2) a.push({ x1: g.tx2 - g.wkW, x2: g.tx2, week: true, c: -1 });
  return a;
}

/* Где стоят номера недель: в поле слева или колонками таблицы */
function weekColumns(g) {
  var S = state.style, a = [];
  if (S.weekNo === "margin") a.push([g.weekX1, g.weekX2]);
  else if (S.weekNo === "left") a.push([g.tx1, g.tx1 + g.wkW]);
  else if (S.weekNo === "both") { a.push([g.tx1, g.tx1 + g.wkW]); a.push([g.tx2 - g.wkW, g.tx2]); }
  return a;
}

/* Число в ячейке прижато вправо — вплотную к линии или рамке оно
   выглядело бы ошибкой, поэтому при оформлении нужен отступ. */
function decorated() {
  var S = state.style;
  return S.lines !== "none" || S.cells === "box" || S.colFill !== "none" ||
         S.headFill !== "none" || S.weekFill;
}

/* Шапка: which = "loc" (язык календаря), "en" или "both" (две строки) */
function headerScene(out, g, y, h, which) {
  var S = state.style, CL = CAL[state.calLang];
  var cols = tableColumns(g), i, col, wkend, filled, os, inv, red, suf, b, loc, en, it;
  var insR = (S.numAlign !== "center" && decorated()) ? g.colW * K.inset : 0;

  for (i = 0; i < cols.length; i++) {
    col = cols[i];
    wkend = !col.week && col.c >= 5;
    os = null; filled = false;

    if (S.headFill === "band") filled = true;
    else if (S.headFill === "alt") { if (i % 2 === 0) { os = "headAlt"; filled = true; } }
    else if (S.headFill === "pill") { os = "pill"; filled = true; }
    if (wkend && S.headWeekendFill) os = (S.headFill === "pill") ? "pillRed" : "headRed";

    inv = (wkend && S.headWeekendFill) || (filled && S.headInverse);
    red = wkend && !S.headWeekendFill;
    suf = inv ? "Inv" : (red ? "Red" : "");

    b = [col.x1, y, col.x2, y + h];
    if (S.headFill === "pill")
      b = [col.x1 + g.colW * K.pillPadX, y + h * K.pillPadY,
           col.x2 - g.colW * K.pillPadX, y + h - h * K.pillPadY];

    loc = col.week ? CL.weekWord : CL.days[col.c];
    en  = col.week ? EN.weekWord : EN.days[col.c];

    if (which === "loc")     it = txt(b, loc, "headLoc" + suf);
    else if (which === "en") it = txt(b, en,  "headEn"  + suf);
    else it = txt(b, loc, "headLoc" + suf, { t2: en, ps2: "headEn" + suf });

    it.os = os;
    if (insR > 0 && !col.week) it.ins = [0, 0, 0, insR];
    out.push(it);
  }
}

function hLine(out, x1, x2, y, os) { out.push({ k: "line", b: [x1, y, x2, y], os: os }); }
function vLine(out, x, y1, y2, os) { out.push({ k: "line", b: [x, y1, x, y2], os: os }); }

function linesScene(out, g) {
  var S = state.style, L = state.layout;
  var r, c, i, ys = [], cols, ry, x1, x2, gp;

  if (S.lines === "rows") {
    if (g.att && S.headFill === "none") ys.push(g.headTopY);
    for (r = 0; r <= g.rows.length; r++) ys.push(g.gridTop + r * L.cellH);
    if (g.att && g.hBot > 0 && S.headFill === "none") ys.push(g.tableBottom);
    for (i = 0; i < ys.length; i++) hLine(out, g.tx1, g.tx2, ys[i], "rule");

    // колонку недель без плашки отделяем от чисел вертикалью
    if (g.nWk >= 1 && !S.weekFill) vLine(out, g.dx, g.gridTop, g.gridBottom, "rule");
    if (g.nWk === 2 && !S.weekFill) vLine(out, g.dx + 7 * g.colW, g.gridTop, g.gridBottom, "rule");

  } else if (S.lines === "table") {
    if (g.tableTop < g.gridTop) ys.push(g.tableTop);
    for (r = 0; r <= g.rows.length; r++) ys.push(g.gridTop + r * L.cellH);
    if (g.tableBottom > g.gridBottom) ys.push(g.tableBottom);
    for (i = 0; i < ys.length; i++) hLine(out, g.tx1, g.tx2, ys[i], "rule");

    cols = tableColumns(g);
    vLine(out, cols[0].x1, g.tableTop, g.tableBottom, "rule");
    for (i = 0; i < cols.length; i++) vLine(out, cols[i].x2, g.tableTop, g.tableBottom, "rule");

  } else if (S.lines === "cells") {
    // в каждой ячейке: базовая линия под числом и две строки для записей
    gp = g.colW * K.inset * 0.8;
    for (r = 0; r < g.rows.length; r++) {
      ry = g.gridTop + r * L.cellH;
      for (c = 0; c < 7; c++) {
        x1 = g.dx + c * g.colW + gp;
        x2 = g.dx + (c + 1) * g.colW - gp;
        hLine(out, x1, x2, ry + L.cellH * 0.30, "ruleThin");
        hLine(out, x1, x2, ry + L.cellH * 0.50, "ruleThin");
        hLine(out, x1, x2, ry + L.cellH * (1 - K.cellLine), "rule");
      }
    }
  }
}

function titleScene(out, g, year, month) {
  var S = state.style, CL = CAL[state.calLang];
  var loc = CL.months[month], en = EN.months[month], yr = String(year);
  var b = [g.tx1, g.titleY, g.tx2, g.titleY + g.thH];
  var dot = loc + SEP_BULLET + en, bi = loc.length + 1;   // индекс «•»

  function add(t, ps, bullet) {
    out.push(txt(b, t, ps, { vj: "B", bullet: (bullet === undefined) ? -1 : bullet }));
  }

  switch (S.titleMode) {
    case "slashYear": add(loc + SEP_SLASH + en, "title"); add(yr, "yearR"); break;
    case "dotYear"  : add(dot, "title", bi);              add(yr, "yearR"); break;
    case "spread"   : add(loc, "title"); add(yr, "yearC"); add(en, "titleR"); break;
    case "yearFirst": add(yr, "year");   add(loc, "titleC"); add(en, "titleR"); break;
    case "centered" : add(yr, "year");   add(dot, "titleC", bi); add(yr, "yearR"); break;
    default         : add(loc + SEP_SLASH + en, "title");
  }
}

/* Ключи стилей абзацев мини-календаря: на странице месяца и на странице
   года одна и та же разметка, но свои стили — у них разные кегли. */
var MINI_KEYS = { title: "miniTitle", head: "miniHead", headRed: "miniHeadRed",
                  day: "miniDay", dayRed: "miniDayRed",
                  adj: "miniDayAdj", adjRed: "miniDayAdjRed", week: "miniWeekNo" };
var YEAR_KEYS = { title: "ypMonth", head: "ypHead", headRed: "ypHeadRed",
                  day: "ypDay", dayRed: "ypDayRed",
                  adj: "ypDayAdj", adjRed: "ypDayAdjRed", week: "ypWeekNo" };

/* Размеры мини-календаря на странице месяца */
function miniParams() {
  var L = state.layout;
  return {
    titleH: pt2mm(L.miniTitleSize) * FRAME.miniTitle, titleGap: L.miniTitleGap,
    headH : pt2mm(L.miniHeadSize) * FRAME.miniHead,   cellH: L.miniCellH,
    wkW   : L.miniWeekNoW, wkGap: L.miniWeekNoGap,
    withYear: true, fixedRows: 0, adjacent: state.style.miniAdjacent, ps: MINI_KEYS
  };
}

/* P — размеры и ключи стилей (miniParams() или страница года).
   P.wkW = 0 — без колонки номеров недель; P.fixedRows — английские буквы
   дней ставятся под шестой строкой, чтобы ряды месяцев совпадали. */
function miniScene(out, mn, P) {
  if (!P) P = miniParams();
  var CL = CAL[state.calLang], KS = P.ps;
  var x = mn.x, w = mn.w, year = mn.year, month = mn.month;

  var wkW  = P.wkW, gap = (wkW > 0) ? P.wkGap : 0;
  var gx   = x + wkW + gap;
  var colW = (w - wkW - gap) / 7;
  if (colW <= 0) return;                     // страховка; validate() это ловит

  var yy = mn.y, i, r, c, k, ry, dt, own, ps;

  var title = P.withYear
            ? CL.months[month] + SEP_SLASH + year + SEP_SLASH + EN.months[month]
            : CL.months[month] + SEP_SLASH + EN.months[month];
  out.push(txt([x, yy, x + w, yy + P.titleH], title, KS.title));
  yy += P.titleH + P.titleGap;

  var hh = P.headH;
  for (i = 0; i < 7; i++)
    out.push(txt([gx + i * colW, yy, gx + (i + 1) * colW, yy + hh],
                 CL.daysShort[i], i >= 5 ? KS.headRed : KS.head));
  yy += hh;

  var rows = monthMatrix(year, month, false);
  var gridTop = yy;

  for (r = 0; r < rows.length; r++) {
    ry = gridTop + r * P.cellH;
    if (wkW > 0)
      out.push(txt([x, ry, x + wkW, ry + P.cellH], String(rows[r].week), KS.week));

    for (c = 0; c < 7; c++) {
      dt  = rows[r].days[c];
      own = (dt.getUTCMonth() === month);
      if (!own && !P.adjacent) continue;
      if (own) ps = (c >= 5) ? KS.dayRed : KS.day;
      else     ps = (c >= 5) ? KS.adjRed : KS.adj;
      out.push(txt([gx + c * colW, ry, gx + (c + 1) * colW, ry + P.cellH],
                   String(dt.getUTCDate()), ps));
    }
  }
  var gridBottom = gridTop + rows.length * P.cellH;

  if (wkW > 0) vLine(out, x + wkW + gap / 2, gridTop, gridBottom, "miniRule");

  var enY = gridTop + Math.max(rows.length, P.fixedRows) * P.cellH;
  for (k = 0; k < 7; k++)
    out.push(txt([gx + k * colW, enY, gx + (k + 1) * colW, enY + hh],
                 EN.daysShort[k], k >= 5 ? KS.headRed : KS.head));
}

/* Последняя страница: год крупно и двенадцать месяцев сеткой.
   Оформление берётся из дизайна: цвет года, капитель названий, соседние
   дни и плашки — как у мини-календарей, номера недель — если они есть. */
function yearScene(year) {
  var G = yearGeom(), S = state.style, out = [], i, c, r, x, y;

  out.push(txt(G.titleB, String(year),
               (S.titleMode === "centered") ? "ypTitleC" : "ypTitle", { vj: "B" }));

  var P = { titleH: G.monthH, titleGap: G.monthGap, headH: G.headH, cellH: G.cellH,
            wkW: G.wkW, wkGap: G.wkGap, withYear: false, fixedRows: 6,
            adjacent: S.miniAdjacent, ps: YEAR_KEYS };

  for (i = 0; i < 12; i++) {
    c = i % G.cols; r = Math.floor(i / G.cols);
    x = G.left + G.pad + c * (G.bw + G.gapX);
    y = G.top  + G.pad + r * (G.bh + G.gapY);
    if (S.miniPanel)
      out.push({ k: "rect", b: [x - G.pad, y - G.pad, x + G.bw + G.pad, y + G.bh + G.pad],
                 os: "miniPanel" });
    miniScene(out, { x: x, y: y, w: G.bw, h: G.bh, year: year, month: i }, P);
  }
  return out;
}

/* photoY — низ фрейма под фото (общий для всех месяцев) или undefined */
function monthScene(year, month, photoY) {
  var g = computeMonth(year, month);
  var L = state.layout, D = state.doc, O = state.options, S = state.style;
  var out = [], i, r, c, ry, dt, own, ps, wk, ws, wc, b, os;

  // 1. фрейм под фото
  if (O.photoFrame && photoY !== undefined && photoY - D.marginTop > 5)
    out.push({ k: "photo", b: [D.marginLeft, D.marginTop,
                               D.pageWidth - D.marginRight, photoY], os: "photo" });

  // 2. фон: плашка под мини, плашки шапки, заливки колонок
  if (g.panel) out.push({ k: "rect", b: g.panel, os: "miniPanel" });

  if (S.headFill === "band") {
    out.push({ k: "rect", b: [g.tx1, g.headTopY, g.tx2, g.headTopY + g.hTop], os: "band" });
    if (g.hBot > 0)
      out.push({ k: "rect", b: [g.tx1, g.headBotY, g.tx2, g.headBotY + g.hBot], os: "band" });
  }
  if (S.colFill !== "none") {
    for (c = 0; c < 7; c++) {
      if (S.colFill === "weekend" ? c < 5 : c % 2 === 0) continue;
      out.push({ k: "rect", b: [g.dx + c * g.colW, g.gridTop,
                                g.dx + (c + 1) * g.colW, g.gridBottom], os: "colFill" });
    }
  }
  wc = weekColumns(g);
  if (S.weekFill)
    for (i = 0; i < wc.length; i++)
      out.push({ k: "rect", b: [wc[i][0], g.gridTop, wc[i][1], g.gridBottom], os: "weekFill" });

  // 3. шапка — до линий, чтобы ячейки «через одну» не закрыли линии
  headerScene(out, g, g.headTopY, g.hTop, S.headMode === "stacked" ? "both" : "loc");
  if (g.hBot > 0) headerScene(out, g, g.headBotY, g.hBot, "en");

  // 4. линии
  linesScene(out, g);

  // 5. заголовок
  titleScene(out, g, year, month);

  // 6. номера недель и числа
  var right  = (S.numAlign !== "center");
  var corner = (S.numAlign === "corner");
  var box    = (S.cells === "box");
  var bg     = box ? boxGap(g) : 0;
  var insR   = right ? (box ? g.colW * K.boxInset : (decorated() ? g.colW * K.inset : 0)) : 0;
  var insB   = corner ? L.cellH * (S.lines === "cells" ? K.cellLine + 0.03 : K.corner) : 0;

  for (r = 0; r < g.rows.length; r++) {
    ry = g.gridTop + r * L.cellH;

    wk = g.rows[r].week;
    ws = (S.weekPad && wk < 10) ? "0" + wk : String(wk);
    for (i = 0; i < wc.length; i++)
      out.push(txt([wc[i][0], ry, wc[i][1], ry + L.cellH], ws, "weekNo"));

    for (c = 0; c < 7; c++) {
      dt  = g.rows[r].days[c];
      own = (dt.getUTCMonth() === month);
      if (!own && S.adjacent === "hide") continue;

      if (own) ps = (c >= 5) ? "dayRed" : "day";
      else     ps = (c >= 5) ? "dayAdjRed" : "dayAdj";

      os = null;
      if (box) os = (!own && S.adjacent === "tint") ? "boxAdj" : "box";

      b = [g.dx + c * g.colW + bg, ry + bg, g.dx + (c + 1) * g.colW - bg, ry + L.cellH - bg];
      out.push(txt(b, String(dt.getUTCDate()), ps,
                   { os: os, vj: corner ? "B" : "C",
                     ins: (insR > 0 || insB > 0) ? [0, 0, insB, insR] : null }));
    }
  }

  // 7. строки для заметок
  for (i = 0; i < S.notes; i++)
    hLine(out, g.tx1, g.tx2,
          g.notesY + L.cellH * (K.notesGap + (i + 1) * K.notesStep), "ruleThin");

  // 8. мини-календари
  for (i = 0; i < g.minis.length; i++) miniScene(out, g.minis[i]);

  return out;
}

/* =====================================================================
   9. ПРОВЕРКА НАСТРОЕК
   errors   — то, что сломает создание документа;
   warnings — то, о чём стоит знать, но решает пользователь.
   ===================================================================== */

/* precomputed — уже посчитанный worstBottom(): позволяет не проходить
   все месяцы дважды за одно обновление. */
function validate(precomputed) {
  var D = state.doc, L = state.layout, O = state.options;
  var U = UI[state.uiLang];
  var res = { errors: [], warnings: [] };

  var innerW = D.pageWidth - D.marginLeft - D.marginRight;
  if (innerW <= 7) {
    res.errors.push(fmt(U.errInner, innerW.toFixed(1)));
    return res;                                   // остальное считать незачем
  }
  if (D.pageHeight - D.marginTop - D.marginBottom <= 0) {
    res.errors.push(U.errMargins);
    return res;
  }

  var z = zones(), need;

  if (state.template !== "below" && O.showMiniCalendars) {
    if (z.mw < 5) {
      res.errors.push(fmt(U.errMiniRoom, z.mw.toFixed(1)));
    } else if (z.mw < 30) {
      res.warnings.push(fmt(U.warnMiniNarrow, z.mw.toFixed(1)));
    }
  }

  if (state.template === "below" && O.showMiniCalendars) {
    need = L.miniW * 2 + L.miniGap + 2 * z.pad;
    if (need > innerW) res.warnings.push(fmt(U.warnMiniWide, need.toFixed(0)));
  }

  if (O.showMiniCalendars && L.miniDaySize < 6) {
    res.warnings.push(fmt(U.warnMiniDay, L.miniDaySize));
  }

  var w = precomputed || worstBottom();
  var limit = D.pageHeight - D.marginBottom;

  if (w.y > limit + 0.2) {          // 0.2 мм — погрешность округления, не повод
    res.warnings.push(fmt(U.warnBelow, (w.y - limit).toFixed(1), monthLabel(U, w.month)));
  }
  if (w.aboveTop) {
    res.warnings.push(fmt(U.warnAbove, monthLabel(U, w.aboveTop)));
  }
  if (w.overhang > 10) {
    res.warnings.push(fmt(U.warnOverhang, w.overhang.toFixed(1),
                          monthLabel(U, w.overMonth)));
  }

  // страница года сама подбирает кегли под лист; на маленьком листе с
  // широкими полями числа могут выйти нечитаемыми
  if (state.yearPage) {
    var yg = yearGeom();
    if (yg.dayPt < 6) res.warnings.push(fmt(U.warnYearSmall, yg.dayPt));
  }

  // шрифт с иероглифами — предупреждение, а не ошибка: документ построится
  // в любом случае, просто вместо иероглифов будут пустые места
  if (state.calLang === "zh") {
    var cs = cjkStatus();
    if (!cs.font)                   res.warnings.push(U.warnNoCjk);
    else if (!looksCJK(cs.family))  res.warnings.push(fmt(U.warnCjkDoubt, cs.family));
  }
  return res;
}

/* =====================================================================
   10. ШРИФТЫ
   ===================================================================== */

var FONT_CACHE = null;

function collectFonts(fams, stys) {
  var i, j, fam, sty, list, dup;
  for (i = 0; i < fams.length; i++) {
    fam = fams[i]; sty = stys[i];
    if (!fam || !sty) continue;
    if (!FONT_CACHE[fam]) FONT_CACHE[fam] = [];
    list = FONT_CACHE[fam];
    dup = false;                                   // одно начертание может
    for (j = 0; j < list.length; j++)              // прийти несколькими копиями
      if (list[j] === sty) { dup = true; break; }
    if (!dup) list.push(sty);
  }
}

function fontCacheEmpty() {
  var k;
  for (k in FONT_CACHE) if (FONT_CACHE.hasOwnProperty(k)) return false;
  return true;
}

/* Перечень шрифтов — самая дорогая операция при открытии диалога.

   Основной путь — everyItem().name: имя шрифта InDesign отдаёт в виде
   «Семейство<TAB>Начертание», все сразу, за десятки миллисекунд.

   В v2 здесь были everyItem().fontFamily и .fontStyleName, но у некоторых
   повреждённых шрифтов (встречено: Swis721 BT) свойство fontStyleName
   недоступно — и групповой запрос падает целиком. Тогда v2 уходила
   в поэлементный перебор app.fonts[i] по три межпроцессных вызова на
   шрифт: на тысяче шрифтов это полторы минуты ожидания. */
function fontMap() {
  if (FONT_CACHE) return FONT_CACHE;
  FONT_CACHE = {};

  var names, fams = [], stys = [], i, p, f;

  try {
    names = app.fonts.everyItem().name;
    if (!(names instanceof Array)) names = [names];
    for (i = 0; i < names.length; i++) {
      p = String(names[i]).split("\t");
      if (p.length < 2) continue;
      fams.push(p[0]); stys.push(p[1]);
    }
    collectFonts(fams, stys);
  } catch (e) {}

  if (fontCacheEmpty()) {                          // запасной путь №1
    try {
      fams = app.fonts.everyItem().fontFamily;
      stys = app.fonts.everyItem().fontStyleName;
      if (!(fams instanceof Array)) { fams = [fams]; stys = [stys]; }
      if (fams.length === stys.length) collectFonts(fams, stys);
    } catch (e1) {}
  }

  if (fontCacheEmpty()) {                          // запасной путь №2 — медленный;
    for (i = 0; i < app.fonts.length; i++) {       // сломанный шрифт пропускаем,
      try {                                        // а не обрываем весь перебор
        f = app.fonts[i];
        collectFonts([f.fontFamily], [f.fontStyleName]);
      } catch (e2) {}
    }
  }
  return FONT_CACHE;
}

function familyList() {
  var map = fontMap(), out = [], k;
  for (k in map) if (map.hasOwnProperty(k)) out.push(k);
  out.sort();
  return out;
}

/* Автовыбор, если пользователь не задал шрифт явно.

   latin — цифры, латиница, кириллица. Курсив — только для дизайнов, где
           он задуман (classic повторяет типографику v2).
   cjk   — иероглифы. Курсивных начертаний у CJK-шрифтов не бывает,
           поэтому списки начертаний совсем другие. Семейства перечислены
           и латиницей, и иероглифами: InDesign отдаёт fontFamily
           по-разному в зависимости от локали системы. */
var AUTO = {
  latin: ["Myriad Pro", "Segoe UI", "Roboto", "Arial", "Helvetica"],
  cjk: {
    families: ["Source Han Sans SC", "Noto Sans SC", "Noto Sans CJK SC",
               "Source Han Serif SC", "Noto Serif SC",
               "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB",
               "Heiti SC", "SimHei", "黑体", "SimSun", "宋体",
               "Adobe Song Std", "Adobe Heiti Std"],
    regular : ["Regular", "R", "Normal", "Roman", "Light", "L", "Medium"],
    bold    : ["Bold", "B", "Heavy", "Black", "Semibold", "DemiBold",
               "Medium", "M"]
  }
};

function autoStyles(script, which) {
  if (script === "cjk") return (which === "bold") ? AUTO.cjk.bold : AUTO.cjk.regular;
  var it = state.style.italic;
  if (which === "bold")
    return it ? ["Bold Italic", "Semibold Italic", "Bold", "Italic"]
              : ["Bold", "Semibold", "SemiBold", "Black", "Heavy", "Bold Italic"];
  return it ? ["Italic", "Regular Italic", "Regular"]
            : ["Regular", "Roman", "Book", "Normal", "Medium", "Italic"];
}

function autoFamilies(script) {
  return (script === "cjk") ? AUTO.cjk.families : AUTO.latin;
}

function isCjk(c) {           // диапазонов BMP хватает для 简体中文
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF)
      || (c >= 0x3000 && c <= 0x303F) || (c >= 0xFF00 && c <= 0xFFEF);
}

function hasCjk(s) {
  var i;
  for (i = 0; i < s.length; i++) if (isCjk(s.charCodeAt(i))) return true;
  return false;
}

function endsWith(s, tail) {
  return s.length >= tail.length &&
         s.substring(s.length - tail.length) === tail;
}

/* Реального теста на покрытие глифов ExtendScript не даёт, поэтому
   опознание — по имени. Отсюда и цена ошибки: результат идёт в подсказку
   (порядок в списке шрифтов) и в предупреждение, но никогда в ошибку. */
var CJK_HINTS = ["CJK", "Hei", "Song", "Ming", "Kai", "Yuan", "Mincho", "Sung"];
var CJK_TAILS = [" SC", " TC", " HK", " GB", " JP", " KR"];

function looksCJK(fam) {
  var i;
  if (!fam) return false;
  if (hasCjk(fam)) return true;
  for (i = 0; i < AUTO.cjk.families.length; i++)
    if (AUTO.cjk.families[i] === fam) return true;
  for (i = 0; i < CJK_TAILS.length; i++) if (endsWith(fam, CJK_TAILS[i])) return true;
  for (i = 0; i < CJK_HINTS.length; i++) if (fam.indexOf(CJK_HINTS[i]) >= 0) return true;
  return false;
}

function fontExists(fam, sty) {
  try {
    var f = app.fonts.itemByName(fam + "\t" + sty);
    if (!f.isValid || f.status !== FontStatus.INSTALLED) return false;
    return !FONT_PROBE || FONT_PROBE(fam, sty);
  } catch (e) { return false; }
}

/* Установлен — ещё не значит пригоден. InDesign 2026 при назначении
   молча подменяет некоторые семейства: встречено Myriad Pro → Acumin
   Variable Concept, в котором нет кириллицы, и месяцы выходят квадратами.
   Поэтому на время сборки шрифт-кандидат пробно назначается служебному
   стилю: если InDesign вернул другое семейство, берётся следующий
   кандидат. Без документа (в диалоге) проба не делается. */
var FONT_PROBE = null;

function makeFontProbe(doc) {
  var cache = {}, st = null;
  var probe = function (fam, sty) {
    var key = fam + "\t" + sty;
    if (cache[key] !== undefined) return cache[key];
    var ok = false;
    try {
      if (!st) st = doc.paragraphStyles.add({ name: "CAL font probe" });
      st.appliedFont = key;
      // сравниваем с семейством, как его называет сам InDesign: имена
      // CJK-семейств зависят от локали системы
      ok = (String(st.appliedFont.fontFamily) ===
            String(app.fonts.itemByName(key).fontFamily));
    } catch (e) {}
    cache[key] = ok;
    return ok;
  };
  probe.done = function () { try { if (st) st.remove(); } catch (e) {} };
  return probe;
}

/* Выбранный пользователем шрифт имеет приоритет: если нужного начертания
   в нём нет, берём любое из этой же семьи и НЕ прыгаем на другую —
   иначе выбор пользователя молча подменялся бы на Arial. */
function resolveFont(which, script) {
  var F = state.font;
  var fam = (script === "cjk") ? F.cjkFamily : F.family;
  var sty = (script === "cjk") ? (which === "bold" ? F.cjkBold : F.cjkRegular)
                               : (which === "bold" ? F.bold    : F.regular);
  var want = autoStyles(script, which), fams = autoFamilies(script);
  var i, f, s, styles;

  if (fam && sty && fontExists(fam, sty)) return fam + "\t" + sty;

  if (fam) {
    for (i = 0; i < want.length; i++)
      if (fontExists(fam, want[i])) return fam + "\t" + want[i];

    styles = fontMap()[fam] || [];
    for (i = 0; i < styles.length; i++)
      if (fontExists(fam, styles[i])) return fam + "\t" + styles[i];
  }

  for (f = 0; f < fams.length; f++)
    for (s = 0; s < want.length; s++)
      if (fontExists(fams[f], want[s]))
        return fams[f] + "\t" + want[s];

  return null;                                     // останется шрифт документа
}

/* validate() зовётся на каждое нажатие клавиши в диалоге, а resolveFont()
   для CJK перебирает до полусотни пар «семья + начертание», и каждая
   проверка — три обращения к InDesign. Поэтому результат кешируется,
   а сбрасывается там, где меняется выбор шрифта. */
var CJK_RESOLVED = null;

function cjkStatus() {
  if (CJK_RESOLVED) return CJK_RESOLVED;
  var r = resolveFont("regular", "cjk");
  CJK_RESOLVED = { font: r, family: r ? r.split("\t")[0] : "" };
  return CJK_RESOLVED;
}

function dropCjkCache() { CJK_RESOLVED = null; }

/* =====================================================================
   11. ОТРИСОВКА В INDESIGN
   Стили создаются лениво — на панелях остаётся только то, чем реально
   набран документ.
   ===================================================================== */

var R = null;            // состояние текущей отрисовки, см. beginRender()

/* Встроенные образцы: имя для скриптов не зависит от языка InDesign,
   но на всякий случай есть запасной путь по позиции в панели. */
function builtinSwatch(doc, name, idx) {
  var s = doc.swatches.itemByName(name);
  if (s.isValid) return s;
  return doc.swatches[idx];
}

function makeColor(doc, name, cmyk) {
  var c = doc.colors.itemByName(name);
  if (c.isValid) { try { c.colorValue = cmyk; } catch (e) {} return c; }
  return doc.colors.add({
    name: name, model: ColorModel.PROCESS,
    space: ColorSpace.CMYK, colorValue: cmyk
  });
}

function swatchOf(which) {
  if (R.sw[which]) return R.sw[which];
  var doc = R.doc, C = state.colors, S = state.style, s;
  if (which === "red")        s = makeColor(doc, "CAL Red", [C.redC, C.redM, C.redY, C.redK]);
  else if (which === "fill")  s = makeColor(doc, "CAL Fill", [S.fillC, S.fillM, S.fillY, S.fillK]);
  else if (which === "paper") s = builtinSwatch(doc, "Paper", 2);
  else if (which === "none")  s = builtinSwatch(doc, "None", 0);
  else                        s = builtinSwatch(doc, "Black", 3);
  R.sw[which] = s;
  return s;
}

function paraStyle(key) {
  if (R.ps[key]) return R.ps[key];
  var sp = R.specs[key];
  var st = R.psGroup.paragraphStyles.itemByName(sp.name);
  if (!st.isValid) st = R.psGroup.paragraphStyles.add({ name: sp.name });

  var fnt = sp.bold ? (R.fBold || R.fReg) : (R.fReg || R.fBold);
  if (fnt) { try { st.appliedFont = fnt; } catch (e) {} }

  st.pointSize     = sp.size;
  st.leading       = sp.size;
  if (sp.align === "L")      st.justification = Justification.LEFT_ALIGN;
  else if (sp.align === "C") st.justification = Justification.CENTER_ALIGN;
  else                       st.justification = Justification.RIGHT_ALIGN;
  st.hyphenation   = false;
  st.spaceBefore   = 0;
  st.spaceAfter    = 0;
  try { st.capitalization = sp.caps ? Capitalization.ALL_CAPS : Capitalization.NORMAL; } catch (e) {}

  var col  = swatchOf(sp.color || "black");
  var tint = (sp.tint === undefined || sp.tint >= 100) ? -1 : sp.tint;

  if (sp.outline) {
    // контурные числа: без заливки, тонкая обводка — растёт вместе с кеглем
    st.fillColor    = swatchOf("none");
    st.strokeColor  = col;
    st.strokeWeight = Math.max(0.3, Math.round(sp.size * 0.018 * 100) / 100);
    st.strokeTint   = tint;
  } else {
    st.fillColor   = col;
    st.fillTint    = tint;
    st.strokeColor = swatchOf("none");
  }
  R.ps[key] = st;
  return st;
}

/* Объектный стиль: включены только «Заливка», «Обводка» и «Обводка и
   углы» — геометрию и отступы текста он не трогает, поэтому локальные
   настройки фрейма не считаются отклонением от стиля. */
function objStyle(key) {
  if (R.os[key] !== undefined) return R.os[key];
  var sp = R.ospecs[key], st = null, i, corners;
  try {
    if (!R.osGroup) {
      R.osGroup = R.doc.objectStyleGroups.itemByName("CAL");
      if (!R.osGroup.isValid) R.osGroup = R.doc.objectStyleGroups.add({ name: "CAL" });
    }
    st = R.osGroup.objectStyles.itemByName(sp.name);
    if (!st.isValid) st = R.osGroup.objectStyles.add({ name: sp.name });
    setLook(st, sp, true);
  } catch (e) { st = null; }
  R.os[key] = st;
  return st;
}

/* Общая часть для объектного стиля и для запасного пути — прямой
   настройки объекта, если стиль создать не удалось. */
function setLook(obj, sp, isStyle) {
  var i, opt, r, names = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
  if (isStyle) {
    obj.enableFill = true; obj.enableStroke = true;
    obj.enableStrokeAndCornerOptions = true;
  }
  obj.fillColor = sp.fill ? swatchOf(sp.fill) : swatchOf("none");
  if (sp.fill) obj.fillTint = (sp.fillTint === undefined || sp.fillTint >= 100) ? -1 : sp.fillTint;
  if (sp.stroke) {
    obj.strokeColor  = swatchOf("black");
    obj.strokeWeight = sp.weight;
    obj.strokeTint   = (sp.strokeTint >= 100) ? -1 : sp.strokeTint;
  } else {
    obj.strokeColor  = swatchOf("none");
  }
  r   = sp.radius || 0;
  opt = (r > 0.05) ? CornerOptions.ROUNDED_CORNER : CornerOptions.NONE;
  for (i = 0; i < names.length; i++) {
    try {
      obj[names[i] + "CornerOption"] = opt;
      if (r > 0.05) obj[names[i] + "CornerRadius"] = r;
    } catch (e) {}
  }
  if (sp.cap) { try { obj.endCap = EndCap.PROJECTING_END_CAP; } catch (e) {} }
}

function decorate(obj, key) {
  if (!key) return;
  var st = objStyle(key);
  if (st) obj.applyObjectStyle(st, true);
  else    { try { setLook(obj, R.ospecs[key], false); } catch (e) {} }
}

/* Знаковые стили: иероглифы (шрифт) и красная точка в заголовке (цвет).
   Кегль и выключка наследуются от стиля абзаца, поэтому глобальная правка
   стилей продолжает работать как обычно. */
function charGroup() {
  if (!R.csGroup) {
    R.csGroup = R.doc.characterStyleGroups.itemByName("CAL");
    if (!R.csGroup.isValid) R.csGroup = R.doc.characterStyleGroups.add({ name: "CAL" });
  }
  return R.csGroup;
}

function charStyle(name) {
  var st = charGroup().characterStyles.itemByName(name);
  if (!st.isValid) st = charGroup().characterStyles.add({ name: name });
  return st;
}

function redChar() {
  if (!R.redChar) {
    R.redChar = charStyle("Red");
    R.redChar.fillColor = swatchOf("red");
  }
  return R.redChar;
}

function buildCjkStyles() {
  R.cjk = {};
  if (state.calLang !== "zh") return;

  var cReg  = resolveFont("regular", "cjk");
  var cBold = resolveFont("bold",    "cjk");
  if (!cReg && !cBold) return;                  // validate() уже предупредил

  R.cjk.regular = charStyle("CJK");
  try { R.cjk.regular.appliedFont = cReg || cBold; } catch (e) {}
  R.cjk.bold = charStyle("CJK bold");
  try { R.cjk.bold.appliedFont = cBold || cReg; } catch (e) {}
}

/* Иероглифы и латиница живут в одном фрейме («一月 / January»), поэтому
   одного appliedFont на стиле абзаца мало — размечаем каждый непрерывный
   прогон иероглифов знаковым стилем. Индексы символов совпадают со
   строкой: InDesign в contents ничего не вставляет. */
function applyCjkRuns(tf, str, bold) {
  if (!R.cjk.regular) return;
  var st = bold ? R.cjk.bold : R.cjk.regular;
  var i = 0, n = str.length, s;

  while (i < n) {
    if (!isCjk(str.charCodeAt(i))) { i++; continue; }
    s = i;
    while (i < n && isCjk(str.charCodeAt(i))) i++;
    try {
      tf.parentStory.characters.itemByRange(s, i - 1).appliedCharacterStyle = st;
    } catch (e) {}
  }
}

function bounds(b) { return [b[1], b[0], b[3], b[2]]; }   // [y1, x1, y2, x2]

function addText(page, it) {
  var tf = page.textFrames.add();
  decorate(tf, it.os);
  tf.geometricBounds = bounds(it.b);

  var p = tf.textFramePreferences;
  p.insetSpacing          = it.ins ? it.ins : [0, 0, 0, 0];
  p.verticalJustification = (it.vj === "B") ? VerticalJustification.BOTTOM_ALIGN
                                            : VerticalJustification.CENTER_ALIGN;
  p.firstBaselineOffset   = FirstBaseline.LEADING_OFFSET;
  p.ignoreWrap            = true;
  try { p.autoSizingType = AutoSizingTypeEnum.OFF; } catch (e) {}   // нет в CS6

  var str = it.t2 ? it.t + "\r" + it.t2 : it.t;
  tf.contents = str;

  var story = tf.parentStory;
  if (it.t2) {
    story.paragraphs[0].appliedParagraphStyle = paraStyle(it.ps);
    story.paragraphs[1].appliedParagraphStyle = paraStyle(it.ps2);
  } else {
    story.texts[0].appliedParagraphStyle = paraStyle(it.ps);
  }
  applyCjkRuns(tf, str, BOLD_KEYS[it.ps] === true);
  if (it.bullet >= 0) {
    try { story.characters[it.bullet].appliedCharacterStyle = redChar(); } catch (e) {}
  }
  return tf;
}

function renderScene(page, items) {
  var i, it, o;
  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (it.k === "text") { addText(page, it); continue; }

    if (it.k === "line") {
      o = page.graphicLines.add();
      decorate(o, it.os);
      o.geometricBounds = bounds(it.b);
    } else {
      o = page.rectangles.add();
      decorate(o, it.os);
      o.geometricBounds = bounds(it.b);
      if (it.k === "photo") {
        try { o.contentType = ContentType.GRAPHIC_TYPE; } catch (e) {}
      }
    }
  }
}

function beginRender(doc) {
  R = { doc: doc, sw: {}, ps: {}, os: {}, osGroup: null, csGroup: null,
        redChar: null, cjk: {} };
  R.specs  = paraSpecs();
  R.ospecs = objSpecs(computeMonth(state.year, 0));

  // шрифты подбираются с пробным назначением — см. makeFontProbe()
  FONT_PROBE = makeFontProbe(doc);
  try {
    R.fReg  = resolveFont("regular", "latin");
    R.fBold = resolveFont("bold",    "latin");

    R.psGroup = doc.paragraphStyleGroups.itemByName("CAL");
    if (!R.psGroup.isValid) R.psGroup = doc.paragraphStyleGroups.add({ name: "CAL" });

    buildCjkStyles();
  } finally {
    FONT_PROBE.done();
    FONT_PROBE = null;
  }
}

/* Возвращает null или текст ошибки. Недостроенный документ закрывается,
   чтобы не оставлять пользователю половину календаря.
   opts.hidden — не открывать окно документа (для проверочного прогона). */
var LAST_DOC = null;

function build(opts) {
  var D = state.doc, U = UI[state.uiLang], doc = null, k, pY;
  var list = monthRange();
  var hidden = opts && opts.hidden;
  var redraw = true;
  try { redraw = app.scriptPreferences.enableRedraw; } catch (e) {}

  try {
    try { app.scriptPreferences.enableRedraw = false; } catch (e) {}

    // окно откроем в самом конце: в невидимый документ объекты
    // добавляются заметно быстрее
    doc = app.documents.add(false);

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

    dp.pagesPerDocument = pageCount();

    beginRender(doc);
    pY = state.options.photoFrame ? photoBottom() : undefined;
    for (k = 0; k < list.length; k++)
      renderScene(doc.pages[k], monthScene(list[k].year, list[k].month, pY));
    if (state.yearPage)
      renderScene(doc.pages[list.length], yearScene(yearPageYear()));

    if (!hidden) {
      try {
        var w = doc.windows.add();
        w.activePage = doc.pages[0];
        w.zoomPercentage = 40;
      } catch (e) {}
    }
    LAST_DOC = doc;
    return null;

  } catch (err) {
    if (doc !== null) { try { doc.close(SaveOptions.NO); } catch (e2) {} }
    return err.message + (err.line ? "  (" + U.lineWord + " " + err.line + ")" : "");
  } finally {
    try { app.scriptPreferences.enableRedraw = redraw; } catch (e3) {}
  }
}

/* =====================================================================
   12. СХЕМА В ДИАЛОГЕ

   Рисует ту же сцену, что уходит в документ: плашки, линии, рамки,
   числа и подписи.

   Ограничение ScriptUI (проверено в InDesign 2026): drawString() и
   measureString() игнорируют шрифт — любой текст выходит системным
   шрифтом диалога одного размера. Поэтому:
     • числа рисуются собственными векторными цифрами — в точный кегль,
       жирные, курсивные и контурные, как в документе;
     • слова (названия месяцев) — системным шрифтом, если кегль на
       схеме сопоставим с ним, иначе полоской;
     • скругления — ломаной по четыре отрезка на угол.
   ===================================================================== */

var PV = {
  WORD_PX : 9,                      // слова мельче — полоской
  DIGIT_PX: 3.5,                    // цифры мельче — полоской
  deck    : [0.58, 0.58, 0.58, 1],  // фон вокруг листа
  margin  : [0.45, 0.70, 0.90, 1],  // линия полей
  photo   : [0.90, 0.90, 0.90, 1],
  photoX  : [0.80, 0.80, 0.80, 1]
};

/* Шрифты интерфейса с иероглифами. ScriptUI берёт системный шрифт диалога,
   а он на нелокализованной Windows иероглифов не содержит. */
var UI_CJK_FAMILIES = ["Microsoft YaHei UI", "Microsoft YaHei", "微软雅黑",
                       "PingFang SC", "Hiragino Sans GB",
                       "Microsoft JhengHei UI", "Microsoft JhengHei",
                       "SimHei", "黑体", "SimSun", "宋体"];

function uiCjkFamily() {
  var map = fontMap(), i;
  for (i = 0; i < UI_CJK_FAMILIES.length; i++)
    if (map[UI_CJK_FAMILIES[i]]) return UI_CJK_FAMILIES[i];
  return null;
}

/* CMYK → RGB для экрана, с тинтом (смешение с белым) */
function cmykRgb(c, m, y, k, tint) {
  var t = (tint === undefined || tint < 0) ? 1 : tint / 100;
  var r = (1 - c / 100) * (1 - k / 100);
  var g = (1 - m / 100) * (1 - k / 100);
  var b = (1 - y / 100) * (1 - k / 100);
  return [1 - t * (1 - r), 1 - t * (1 - g), 1 - t * (1 - b), 1];
}

function swatchRgb(which, tint) {
  var C = state.colors, S = state.style;
  if (which === "red")   return cmykRgb(C.redC, C.redM, C.redY, C.redK, tint);
  if (which === "fill")  return cmykRgb(S.fillC, S.fillM, S.fillY, S.fillK, tint);
  if (which === "paper") return [1, 1, 1, 1];
  return cmykRgb(0, 0, 0, 88, tint);       // чёрный чуть смягчён для экрана
}

/* ---------- векторные цифры ----------
   Каждая цифра — набор штрихов в квадрате 0…1 (y вниз). Штрих — ломаная
   [x0, y0, x1, y1, …] или эллипс { e: [x, y, w, h] }. Пропорции —
   обычный гротеск: высота цифры 0.72 кегля, ширина 0.5, шаг 0.6
   (табличные цифры, как в календарях). */
var GLYPHS = {
  "0": [{ e: [0, 0, 1, 1] }],
  "1": [[0.22, 0.22, 0.62, 0, 0.62, 1]],
  "2": [[0.06, 0.24, 0.16, 0.07, 0.5, 0, 0.84, 0.07, 0.94, 0.27, 0.84, 0.47,
         0.06, 1, 0.97, 1]],
  "3": [[0.08, 0.1, 0.4, 0, 0.8, 0.06, 0.9, 0.25, 0.78, 0.42, 0.42, 0.47,
         0.8, 0.53, 0.94, 0.72, 0.84, 0.93, 0.5, 1, 0.06, 0.9]],
  "4": [[0.72, 1, 0.72, 0, 0.03, 0.68, 0.98, 0.68]],
  "5": [[0.88, 0, 0.2, 0, 0.13, 0.46, 0.45, 0.38, 0.8, 0.44, 0.95, 0.68,
         0.82, 0.92, 0.48, 1, 0.08, 0.9]],
  "6": [[0.84, 0.06, 0.52, 0, 0.18, 0.12, 0.05, 0.45, 0.06, 0.72, 0.2, 0.93,
         0.5, 1, 0.82, 0.93, 0.95, 0.7, 0.84, 0.48, 0.52, 0.4, 0.2, 0.48,
         0.07, 0.66]],
  "7": [[0.04, 0, 0.96, 0, 0.36, 1]],
  "8": [{ e: [0.1, 0, 0.8, 0.48] }, { e: [0.03, 0.46, 0.94, 0.54] }],
  "9": [[0.16, 0.94, 0.48, 1, 0.82, 0.88, 0.95, 0.55, 0.94, 0.28, 0.8, 0.07,
         0.5, 0, 0.18, 0.07, 0.05, 0.3, 0.16, 0.52, 0.48, 0.6, 0.8, 0.52,
         0.93, 0.34]]
};

var DIGIT = { capH: 0.72, w: 0.5, adv: 0.6, thin: 0.085, bold: 0.13, slant: 0.18 };

function isDigits(s) { return /^[0-9]+$/.test(s); }

/* Кисти и перья создаются сотнями — кешируем их на одну перерисовку */
function PreviewCanvas(gfx) {
  this.g = gfx;
  this.brushes = {}; this.pens = {};
}

PreviewCanvas.prototype.brush = function (rgb) {
  var k = rgb.join(",");
  if (!this.brushes[k]) this.brushes[k] = this.g.newBrush(this.g.BrushType.SOLID_COLOR, rgb);
  return this.brushes[k];
};

PreviewCanvas.prototype.pen = function (rgb, w) {
  var k = rgb.join(",") + "/" + w;
  if (!this.pens[k]) this.pens[k] = this.g.newPen(this.g.PenType.SOLID_COLOR, rgb, w);
  return this.pens[k];
};

/* Прямоугольник со скруглёнными углами — ScriptUI умеет только прямые
   отрезки, поэтому дуга — четыре отрезка. */
PreviewCanvas.prototype.shape = function (x, y, w, h, r) {
  var g = this.g, i, a, n = 4, cx, cy, ang, corners;
  g.newPath();
  if (!(r > 0.8)) { g.rectPath(x, y, w, h); return; }
  r = Math.min(r, w / 2, h / 2);
  corners = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0],
             [x + r, y + h - r, 90], [x + r, y + r, 180]];
  g.moveTo(x + r, y);
  for (i = 0; i < 4; i++) {
    cx = corners[i][0]; cy = corners[i][1];
    for (a = 0; a <= n; a++) {
      ang = (corners[i][2] + a * 90 / n) * Math.PI / 180;
      g.lineTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
    }
  }
  g.closePath();
};

/* Путь для строки цифр; (x, top) — левый верхний угол цифр */
PreviewCanvas.prototype.digitsPath = function (s, x, top, em, sw, italic) {
  var g = this.g, i, j, k, gl, st, bx, by, bw, bh, px, py, a, pts;
  var slant = italic ? DIGIT.slant : 0;
  g.newPath();
  for (i = 0; i < s.length; i++) {
    gl = GLYPHS[s.charAt(i)];
    if (!gl) continue;
    bx = x + i * DIGIT.adv * em + sw / 2;
    by = top + sw / 2;
    bw = DIGIT.w * em - sw;
    bh = DIGIT.capH * em - sw;
    for (j = 0; j < gl.length; j++) {
      st = gl[j];
      pts = [];
      if (st.e) {                                   // эллипс — ломаной
        for (a = 0; a <= 20; a++) {
          pts.push(st.e[0] + st.e[2] / 2 + st.e[2] / 2 * Math.cos(a * Math.PI / 10));
          pts.push(st.e[1] + st.e[3] / 2 + st.e[3] / 2 * Math.sin(a * Math.PI / 10));
        }
      } else pts = st;
      for (k = 0; k < pts.length; k += 2) {
        px = bx + pts[k] * bw + (1 - pts[k + 1]) * bh * slant;
        py = by + pts[k + 1] * bh;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
    }
  }
};

PreviewCanvas.prototype.digits = function (s, x, top, em, rgb, bold, italic, outline) {
  var sw = Math.max(1, em * (bold ? DIGIT.bold : DIGIT.thin));
  var hollow = outline && sw >= 3;
  // тонкий штрих вырезать нечем — контурные цифры тогда просто бледнее
  if (outline && !hollow)
    rgb = [1 - 0.45 * (1 - rgb[0]), 1 - 0.45 * (1 - rgb[1]), 1 - 0.45 * (1 - rgb[2]), 1];
  this.digitsPath(s, x, top, em, sw, italic);
  this.g.strokePath(this.pen(rgb, sw));
  if (hollow) {                                    // контур: вырезаем середину
    this.digitsPath(s, x, top, em, sw, italic);
    this.g.strokePath(this.pen([1, 1, 1, 1], sw - 2));
  }
};

function digitsWidth(n, em) { return ((n - 1) * DIGIT.adv + DIGIT.w) * em; }

/* Начертание для схемы: явный выбор пользователя или предпочтение дизайна */
function previewItalic(bold) {
  var F = state.font, s;
  if (!F.family) return state.style.italic;
  s = bold ? F.bold : F.regular;
  return /italic|oblique|kursiv/i.test(s || "");
}

/* entry — { year, month } из monthRange() или { yearPage: true, year } */
function drawPreview(gfx, W, H, entry, zoom) {
  var cv = new PreviewCanvas(gfx), g = gfx;
  var D = state.doc;

  // фон всего полотна
  g.newPath(); g.rectPath(0, 0, W, H); g.fillPath(cv.brush(PV.deck));

  var pw = D.pageWidth, ph = D.pageHeight;
  if (!(pw > 0 && ph > 0)) return;

  var items, osp, pY;
  if (entry.yearPage) {
    items = yearScene(entry.year);
    osp   = objSpecs(computeMonth(state.year, 0));
  } else {
    pY    = state.options.photoFrame ? photoBottom() : undefined;
    items = monthScene(entry.year, entry.month, pY);
    osp   = objSpecs(computeMonth(entry.year, entry.month));
  }
  var specs = paraSpecs();
  var i, it, vx1, vy1, vx2, vy2, b;

  // область просмотра: весь лист или блок календаря крупно
  if (zoom === "page") {
    vx1 = 0; vy1 = 0; vx2 = pw; vy2 = ph;
  } else {
    vx1 = 1e9; vy1 = 1e9; vx2 = -1e9; vy2 = -1e9;
    for (i = 0; i < items.length; i++) {
      if (items[i].k === "photo") continue;
      b = items[i].b;
      vx1 = Math.min(vx1, b[0]); vy1 = Math.min(vy1, b[1]);
      vx2 = Math.max(vx2, b[2]); vy2 = Math.max(vy2, b[3]);
    }
    var padMM = Math.max(vx2 - vx1, vy2 - vy1) * 0.03;
    vx1 -= padMM; vy1 -= padMM; vx2 += padMM; vy2 += padMM;
  }
  if (!(vx2 > vx1 && vy2 > vy1)) return;

  var pad = 6;
  var sc = Math.min((W - pad * 2) / (vx2 - vx1), (H - pad * 2) / (vy2 - vy1));
  if (!(sc > 0)) return;
  var ox = (W - (vx2 - vx1) * sc) / 2 - vx1 * sc;
  var oy = (H - (vy2 - vy1) * sc) / 2 - vy1 * sc;
  var X = function (v) { return ox + v * sc; };
  var Y = function (v) { return oy + v * sc; };

  // лист и поля
  if (zoom === "page") {
    g.newPath(); g.rectPath(X(0), Y(0), pw * sc, ph * sc);
    g.fillPath(cv.brush([1, 1, 1, 1]));
    g.strokePath(cv.pen([0.40, 0.40, 0.40, 1], 1));
    g.newPath();
    g.rectPath(X(D.marginLeft), Y(D.marginTop),
               (pw - D.marginLeft - D.marginRight) * sc,
               (ph - D.marginTop - D.marginBottom) * sc);
    g.strokePath(cv.pen(PV.margin, 1));
  } else {
    g.newPath(); g.rectPath(0, 0, W, H); g.fillPath(cv.brush([1, 1, 1, 1]));
  }

  for (i = 0; i < items.length; i++) {
    it = items[i];
    try {
      if (it.k === "text")       drawTextItem(cv, it, specs, osp, X, Y, sc);
      else if (it.k === "line")  drawLineItem(cv, it, osp[it.os], X, Y, sc);
      else if (it.k === "photo") { if (zoom === "page") drawPhotoItem(cv, it, X, Y); }
      else                       drawShapeItem(cv, it.b, osp[it.os], X, Y, sc);
    } catch (e) {}
  }
}

function strokePx(weightPt, sc) { return Math.max(1, Math.round(pt2mm(weightPt) * sc)); }

function drawShapeItem(cv, b, sp, X, Y, sc) {
  if (!sp) return;
  var x = X(b[0]), y = Y(b[1]), w = (b[2] - b[0]) * sc, h = (b[3] - b[1]) * sc;
  var r = (sp.radius || 0) * sc;
  if (sp.fill) {
    cv.shape(x, y, w, h, r);
    cv.g.fillPath(cv.brush(swatchRgb(sp.fill, sp.fillTint)));
  }
  if (sp.stroke) {
    cv.shape(x, y, w, h, r);
    cv.g.strokePath(cv.pen(swatchRgb("black", sp.strokeTint), strokePx(sp.weight, sc)));
  }
}

function drawLineItem(cv, it, sp, X, Y, sc) {
  if (!sp) return;
  var g = cv.g;
  g.newPath();
  g.moveTo(X(it.b[0]), Y(it.b[1]));
  g.lineTo(X(it.b[2]), Y(it.b[3]));
  g.strokePath(cv.pen(swatchRgb("black", sp.strokeTint), strokePx(sp.weight, sc)));
}

function drawPhotoItem(cv, it, X, Y) {
  var g = cv.g, x1 = X(it.b[0]), y1 = Y(it.b[1]), x2 = X(it.b[2]), y2 = Y(it.b[3]);
  g.newPath(); g.rectPath(x1, y1, x2 - x1, y2 - y1); g.fillPath(cv.brush(PV.photo));
  g.newPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.moveTo(x2, y1); g.lineTo(x1, y2);
  g.strokePath(cv.pen(PV.photoX, 1));
}

/* Цвет текста на схеме. Контурные слова (рисуются системным шрифтом)
   показываем бледнее — обводки у текста ScriptUI не умеет. */
function textRgb(sp, forWords) {
  var c = sp.color || "black";
  if (sp.outline && forWords) return swatchRgb(c, Math.round((sp.tint || 100) * 0.45));
  return swatchRgb(c, sp.tint);
}

function alignX(a, x1, x2, w) {
  if (a === "L") return x1;
  if (a === "C") return (x1 + x2) / 2 - w / 2;
  return x2 - w;
}

function drawTextItem(cv, it, specs, osp, X, Y, sc) {
  var g = cv.g;
  if (it.os) drawShapeItem(cv, it.b, osp[it.os], X, Y, sc);

  var ins = it.ins || [0, 0, 0, 0];
  var x1 = X(it.b[0] + ins[1]), y1 = Y(it.b[1] + ins[0]);
  var x2 = X(it.b[2] - ins[3]), y2 = Y(it.b[3] - ins[2]);

  var lines = [{ t: it.t, sp: specs[it.ps] }];
  if (it.t2) lines.push({ t: it.t2, sp: specs[it.ps2] });

  var i, ln, totalH = 0;
  for (i = 0; i < lines.length; i++) {
    ln = lines[i];
    if (!ln.sp) return;
    ln.em = pt2mm(ln.sp.size) * sc;               // кегль на схеме, px
    if (ln.sp.caps) ln.t = ln.t.toUpperCase();
    ln.num = isDigits(ln.t);
    if (ln.num)                     ln.mode = (ln.em >= PV.DIGIT_PX) ? "digits" : "bar";
    else if (ln.em >= PV.WORD_PX)   ln.mode = "words";
    else                            ln.mode = "bar";
    totalH += ln.em;                                // интерлиньяж = кегль
  }

  // как в InDesign: строки по центру фрейма или прижаты к низу
  var top = (it.vj === "B") ? y2 - totalH : (y1 + y2) / 2 - totalH / 2;
  var w, x, h, ty, parts, bx, rgb;

  for (i = 0; i < lines.length; i++) {
    ln = lines[i];
    rgb = textRgb(ln.sp, ln.mode !== "digits");

    if (ln.mode === "digits") {
      w = digitsWidth(ln.t.length, ln.em);
      x = alignX(ln.sp.align, x1, x2, w);
      // цифры стоят на базовой линии: сверху ~0.2 кегля воздуха
      cv.digits(ln.t, x, top + ln.em * 0.16, ln.em, rgb,
                ln.sp.bold, previewItalic(ln.sp.bold), ln.sp.outline);

    } else if (ln.mode === "words") {
      h  = g.measureString(ln.t)[1];
      w  = g.measureString(ln.t)[0];
      x  = alignX(ln.sp.align, x1, x2, w);
      ty = top + (ln.em - h) / 2;
      if (it.bullet >= 0 && i === 0) {
        // красная точка в заголовке: три куска подряд
        parts = [ln.t.substring(0, it.bullet), ln.t.charAt(it.bullet),
                 ln.t.substring(it.bullet + 1)];
        bx = x;
        g.drawString(parts[0], cv.pen(rgb, 1), bx, ty);
        bx += g.measureString(parts[0])[0];
        g.drawString(parts[1], cv.pen(swatchRgb("red"), 1), bx, ty);
        bx += g.measureString(parts[1])[0];
        g.drawString(parts[2], cv.pen(rgb, 1), bx, ty);
      } else {
        g.drawString(ln.t, cv.pen(rgb, 1), x, ty);
      }

    } else {
      // полоска вместо нечитаемо мелкого текста
      w = Math.min(x2 - x1, ln.t.length * ln.em * (ln.num ? DIGIT.adv : 0.55));
      x = alignX(ln.sp.align, x1, x2, w);
      g.newPath();
      g.rectPath(x, top + ln.em * 0.25, Math.max(1, w), Math.max(1, ln.em * 0.5));
      g.fillPath(cv.brush(rgb));
    }
    top += ln.em;
  }
}

/* =====================================================================
   13. ДИАЛОГ
   ===================================================================== */

/* Читает число из поля и зажимает в границы: вне них InDesign или не
   создаст объект, или создаст нечитаемый. */
function numOf(field, fallback, lim) {
  var v = parseFloat(String(field.text).replace(",", "."));
  if (isNaN(v)) return fallback;
  if (lim) {
    if (v < lim[0]) v = lim[0];
    if (v > lim[1]) v = lim[1];
  }
  return v;
}

/* Возвращает "ok", "cancel" или "relang" — последнее означает, что
   пользователь сменил язык и окно нужно построить заново. */
function showDialog() {

  var U = UI[state.uiLang], CL = CAL[state.calLang];
  var isZhCal = (state.calLang === "zh");

  var win = new Window("dialog", U.winTitle);
  win.orientation = "column";
  win.alignChildren = "fill";
  win.spacing = 8;
  win.margins = 12;

  var PREV_W = 500, PREV_H = 420;   // размер полотна схемы, px
  var LABEL_W = U.labelW;           // подписи полей на вкладках с размерами
  var LABEL_D = U.labelD;           // подписи на вкладке «Дизайн»
  var DD_W    = U.ddW;

  /* Шрифт для контролов с иероглифами. Размер берём у самого диалога,
     чтобы не разъехаться с системным масштабом. */
  var cjkFont = null;
  (function () {
    var fam = uiCjkFamily(), sz = 12;
    if (!fam) return;
    try { if (win.graphics.font) sz = win.graphics.font.size; } catch (e) {}
    try { cjkFont = ScriptUI.newFont(fam, ScriptUI.FontStyle.REGULAR, sz); } catch (e) {}
  })();

  function cjkUi(ctrl) {
    if (cjkFont && ctrl) { try { ctrl.graphics.font = cjkFont; } catch (e) {} }
  }
  function cjkUiTree(node) {
    var i;
    cjkUi(node);
    try {
      if (node.children)
        for (i = 0; i < node.children.length; i++) cjkUiTree(node.children[i]);
    } catch (e) {}
  }

  /* ---------- конструкторы ---------- */

  function column(parent) {
    var g = parent.add("group");
    g.orientation = "column"; g.alignChildren = "fill"; g.spacing = 8;
    return g;
  }
  function panelIn(parent, title) {
    var p = parent.add("panel", undefined, title);
    p.orientation = "column"; p.alignChildren = "left";
    p.margins = [10, 14, 10, 8]; p.spacing = 4;
    return p;
  }
  function row(parent, label, lw) {
    var g = parent.add("group");
    g.orientation = "row"; g.spacing = 6;
    var s = g.add("statictext", undefined, label);
    s.preferredSize.width = lw || LABEL_W;
    return g;
  }
  function field(parent, label, w, lw) {
    var g = row(parent, label, lw);
    var e = g.add("edittext", undefined, "");
    e.preferredSize.width = w || 58;
    e.labelText = g.children[0];
    return e;
  }
  function fieldPair(parent, label, sep, lw, w) {
    var g = row(parent, label, lw);
    var e1 = g.add("edittext", undefined, ""); e1.preferredSize.width = w || 58;
    g.add("statictext", undefined, sep);
    var e2 = g.add("edittext", undefined, ""); e2.preferredSize.width = w || 58;
    return [e1, e2];
  }
  function dropdown(parent, label, items, w, lw) {
    var g = row(parent, label, lw);
    var dd = g.add("dropdownlist", undefined, items);
    dd.preferredSize.width = w || DD_W;
    dd.labelText = g.children[0];
    return dd;
  }
  function cmykRow(parent, label) {
    var g = row(parent, label), a = [], i;
    for (i = 0; i < 4; i++) {
      a.push(g.add("edittext", undefined, ""));
      a[i].preferredSize.width = 42;
    }
    return a;
  }
  function hint(parent, text, w) {
    var s = parent.add("statictext", undefined, text, { multiline: true });
    s.preferredSize = [w, 30];
    try {
      var f = s.graphics.font;
      s.graphics.font = ScriptUI.newFont(f.name, (state.uiLang === "zh") ? ScriptUI.FontStyle.REGULAR : ScriptUI.FontStyle.ITALIC,
                                         f.size - 1);
    } catch (e) {}
    return s;
  }

  /* ---------- каркас: слева вкладки, справа схема ---------- */
  var main = win.add("group");
  main.orientation = "row";
  main.alignChildren = "top";
  main.spacing = 12;

  var leftCol = column(main);

  // язык — одной строкой над вкладками
  var gLang = leftCol.add("group");
  gLang.orientation = "row"; gLang.spacing = 6;
  gLang.add("statictext", undefined, U.langUi);
  var ddLangUi = gLang.add("dropdownlist", undefined, []);
  ddLangUi.preferredSize.width = 130;
  gLang.add("statictext", undefined, U.langCal);
  var ddLangCal = gLang.add("dropdownlist", undefined, []);
  ddLangCal.preferredSize.width = 190;
  (function () {
    var i;
    for (i = 0; i < LANGS.length; i++) {
      ddLangUi.add("item", LANG_UI_NAMES[LANGS[i]]);
      ddLangCal.add("item", LANG_CAL_NAMES[LANGS[i]]);
    }
  })();

  var tabs = leftCol.add("tabbedpanel");
  tabs.alignChildren = "fill";

  function tab(title) {
    var t = tabs.add("tab", undefined, title);
    t.orientation = "row"; t.alignChildren = "top";
    t.margins = 10; t.spacing = 12;
    return t;
  }
  var tD = tab(U.tabDesign);
  var tL = tab(U.tabLayout);
  var tF = tab(U.tabType);
  var tC = tab(U.tabColors);

  /* ===== вкладка «Дизайн» ===== */
  var dA = column(tD), dB = column(tD);

  var gDes = row(dA, U.fDesign, 60);
  var ddDesign = gDes.add("dropdownlist", undefined, []);
  ddDesign.preferredSize.width = 150;
  (function () {
    var i;
    for (i = 0; i < DESIGN_ORDER.length; i++) ddDesign.add("item", U.designs[DESIGN_ORDER[i]]);
  })();
  var bDesign = gDes.add("button", undefined, U.btnDesignReset);
  bDesign.helpTip = U.btnDesignResetTip;
  hint(dA, U.designHint, LABEL_D + DD_W + 16);

  var pTi = panelIn(dA, U.panelTitle);
  var ddTitle = dropdown(pTi, U.fTitleMode, U.titleModes, DD_W, LABEL_D);
  var ddYear  = dropdown(pTi, U.fYearStyle, U.yearStyles, DD_W, LABEL_D);
  var cbCaps  = pTi.add("checkbox", undefined, U.cbCaps);

  var pHe = panelIn(dA, U.panelHead);
  var ddHeadMode = dropdown(pHe, U.fHeadMode, U.headModes, DD_W, LABEL_D);
  var ddHeadFill = dropdown(pHe, U.fHeadFill, U.headFills, DD_W, LABEL_D);
  var cbHeadInv  = pHe.add("checkbox", undefined, U.cbHeadInverse);
  var cbHeadWknd = pHe.add("checkbox", undefined, U.cbHeadWeekend);

  var pGr = panelIn(dB, U.panelGrid);
  var ddLines  = dropdown(pGr, U.fLines, U.lineModes, DD_W, LABEL_D);
  var eLine    = fieldPair(pGr, U.fLineWT, "/", LABEL_D, 50);
  var ddCells  = dropdown(pGr, U.fCells, U.cellModes, DD_W, LABEL_D);
  var ddColF   = dropdown(pGr, U.fColFill, U.colFills, DD_W, LABEL_D);
  var ddAlign  = dropdown(pGr, U.fNumAlign, U.numAligns, DD_W, LABEL_D);
  var eNotes   = field(pGr, U.fNotes, 50, LABEL_D);

  var pNu = panelIn(dB, U.panelNums);
  var ddAdj    = dropdown(pNu, U.fAdjacent, U.adjModes, DD_W, LABEL_D);
  var ddWeek   = dropdown(pNu, U.fWeekMode, U.weekModes, DD_W, LABEL_D);
  var cbWkPad  = pNu.add("checkbox", undefined, U.cbWeekPad);
  var cbWkFill = pNu.add("checkbox", undefined, U.cbWeekFill);
  var eTints   = fieldPair(pNu, U.fDayTint, "/", LABEL_D, 50);

  /* ===== вкладка «Компоновка и лист» ===== */
  var lA = column(tL), lB = column(tL);

  var pT = panelIn(lA, U.panelTpl);
  var radios = {}, ti;
  for (ti = 0; ti < TEMPLATES.length; ti++)
    radios[TEMPLATES[ti]] = pT.add("radiobutton", undefined, U.tpl[TEMPLATES[ti]]);
  hint(pT, U.tplHint, LABEL_W + 120);
  var ddSide    = dropdown(pT, U.fMiniSide, U.miniSides, 120);
  var cbMiniPan = pT.add("checkbox", undefined, U.cbMiniPanel);
  var cbMiniAdj = pT.add("checkbox", undefined, U.cbMiniAdj);

  var pD = panelIn(lA, U.panelDoc);
  var gStart  = row(pD, U.fStart);
  var ddStart = gStart.add("dropdownlist", undefined, U.months);
  ddStart.preferredSize.width = 100;
  var eYear   = gStart.add("edittext", undefined, "");
  eYear.preferredSize.width = 52;
  var eCount  = field(pD, U.fMonthCount, 52);
  var gYP = pD.add("group");
  gYP.orientation = "row"; gYP.spacing = 6;
  var cbYearPage = gYP.add("checkbox", undefined, U.cbYearPage);
  cbYearPage.helpTip = U.cbYearPageTip;
  var eYPYear = gYP.add("edittext", undefined, "");
  eYPYear.preferredSize.width = 52;
  eYPYear.helpTip = U.cbYearPageTip;
  var ddFmt = dropdown(pD, U.fFormat, U.pagePresets, 160);
  var ePage = fieldPair(pD, U.fPageWH, "×");
  var eMar1 = fieldPair(pD, U.fMarTB, "/");
  var eMar2 = fieldPair(pD, U.fMarLR, "/");
  var bFit  = pD.add("button", undefined, U.btnFit);
  bFit.helpTip = U.btnFitTip;

  var pL = panelIn(lB, U.panelLayout);
  var eRatio = field(pL, U.fRatio);
  var eTop   = field(pL, U.fTop);
  var ddAnc  = dropdown(pL, U.fAnchor, U.anchor, 140);
  var eGapMM = field(pL, U.fGapSide);
  var cbSix  = pL.add("checkbox", undefined, U.cbSix);
  var cbMini = pL.add("checkbox", undefined, U.cbMini);
  var cbPhoto = pL.add("checkbox", undefined, U.cbPhoto);

  /* ===== вкладка «Шрифт и кегли» ===== */
  var fA = column(tF), fB = column(tF);

  var pF = panelIn(fA, U.panelFont);
  // массив сразу в конструктор: ddFam.add("item", …) в цикле на тысячу
  // шрифтов заметно медленнее
  var ddFam = dropdown(pF, U.fFont, [U.fontAuto].concat(familyList()), 190, 130);
  var gSty = row(pF, U.fStyles, 130);
  var ddReg  = gSty.add("dropdownlist", undefined, []); ddReg.preferredSize.width = 92;
  var ddBold = gSty.add("dropdownlist", undefined, []); ddBold.preferredSize.width = 92;

  /* Шрифт иероглифов — только для китайской сетки. Опознанные CJK-семьи
     идут первыми: искать нужное среди тысячи установленных шрифтов,
     отсортированных по алфавиту, — мучение. */
  var ddCjk = null, ddCjkReg = null, ddCjkBold = null;
  if (isZhCal) {
    ddCjk = dropdown(pF, U.fFontCjk, [], 190, 130);
    (function () {
      var all = familyList(), a = [], b = [], i;
      for (i = 0; i < all.length; i++) (looksCJK(all[i]) ? a : b).push(all[i]);
      ddCjk.add("item", U.fontAuto);
      for (i = 0; i < a.length; i++) ddCjk.add("item", a[i]);
      if (a.length && b.length) ddCjk.add("separator");
      for (i = 0; i < b.length; i++) ddCjk.add("item", b[i]);
    })();
    var gCSty = row(pF, U.fStyles, 130);
    ddCjkReg  = gCSty.add("dropdownlist", undefined, []); ddCjkReg.preferredSize.width = 92;
    ddCjkBold = gCSty.add("dropdownlist", undefined, []); ddCjkBold.preferredSize.width = 92;
  }

  var pS = panelIn(fA, U.panelSizes);
  var eTitle  = field(pS, U.fTitleSize);
  var eDay    = field(pS, U.fDaySize);
  var eCellH  = field(pS, U.fCellH);
  var eHeadLc = field(pS, fmt(U.fHeadLocal, U.calNames[state.calLang]));
  var eHeadEn = field(pS, U.fHeadEn);
  var eWeekNo = field(pS, U.fWeekNo);
  var bAuto   = pS.add("button", undefined, U.cbAuto);
  bAuto.helpTip = U.cbAutoTip;

  var pM = panelIn(fB, U.panelMini);
  var eMTitle = field(pM, U.fMiniTitle);
  var eMDay   = field(pM, U.fMiniDay);
  var eMCellH = field(pM, U.fMiniCellH);
  var eMHead  = field(pM, fmt(U.fMiniHead, CL.daysShort.join(" ")));
  var eMGap   = field(pM, U.fMiniGap);
  var eMW     = field(pM, U.fMiniWOne);

  /* ===== вкладка «Цвета» ===== */
  var cA = column(tC);
  var pC = panelIn(cA, U.panelColors);
  var eRed   = cmykRow(pC, U.fRed);
  var eFill  = cmykRow(pC, U.fFill);
  var eGrey  = field(pC, U.fGrey);
  var eRTint = field(pC, U.fRedTint);
  hint(pC, U.colorsHint, LABEL_W + 190);

  tabs.selection = tD;

  /* ---------- схема страницы справа ---------- */
  var pPrev = main.add("panel", undefined, U.panelPrev);
  pPrev.orientation = "column"; pPrev.alignChildren = "left";
  pPrev.margins = [10, 14, 10, 8]; pPrev.spacing = 6;

  var gPrevTop = pPrev.add("group");
  gPrevTop.orientation = "row"; gPrevTop.spacing = 8;
  gPrevTop.add("statictext", undefined, U.fPrevMonth);
  // пункты — месяцы диапазона, их заполняет fillPrevMonths()
  var ddPrevMonth = gPrevTop.add("dropdownlist", undefined, []);
  ddPrevMonth.preferredSize.width = 170;            // «2028 — год целиком»
  var rbPage  = gPrevTop.add("radiobutton", undefined, U.zoomPage);
  var rbBlock = gPrevTop.add("radiobutton", undefined, U.zoomBlock);

  // group, а не panel: в panel системная рамка перекрывает onDraw и
  // перерисовка по событию не срабатывает
  var prev = pPrev.add("group");
  prev.preferredSize = [PREV_W, PREV_H];
  prev.minimumSize   = [PREV_W, PREV_H];

  var stMetrics = pPrev.add("statictext", undefined, "", { multiline: true });
  stMetrics.preferredSize = [PREV_W, 48];

  /* ---------- кнопки ---------- */
  var gBtn = win.add("group");
  gBtn.orientation = "row";
  gBtn.alignment = "right";
  var bReset = gBtn.add("button", undefined, U.btnReset);
  gBtn.add("button", undefined, U.btnCancel, { name: "cancel" });
  var bOk = gBtn.add("button", undefined, U.btnOk, { name: "ok" });

  /* ---------- заполнение / считывание ---------- */

  var filling = false;
  var ypShown = "";        // год страницы года, каким его показали в поле

  function pickStyle(dd, want, current) {
    var a, b;
    if (current)
      for (a = 0; a < dd.items.length; a++)
        if (dd.items[a].text === current) { dd.selection = a; return; }
    for (b = 0; b < want.length; b++)
      for (a = 0; a < dd.items.length; a++)
        if (dd.items[a].text === want[b]) { dd.selection = a; return; }
    if (dd.items.length) dd.selection = 0;
  }

  function fillStyleDropdowns(ddR, ddB, fam, script, curR, curB) {
    ddR.removeAll(); ddB.removeAll();
    var styles = fontMap()[fam] || [], i;
    for (i = 0; i < styles.length; i++) {
      ddR.add("item", styles[i]);
      ddB.add("item", styles[i]);
    }
    pickStyle(ddR, autoStyles(script, "regular"), curR);
    pickStyle(ddB, autoStyles(script, "bold"),    curB);
  }

  function selEnum(dd, key) {
    var i = indexOf(ENUMS[key], state.style[key]);
    dd.selection = (i < 0) ? 0 : i;
  }
  function readEnum(dd, key) {
    if (dd.selection) state.style[key] = ENUMS[key][dd.selection.index];
  }

  /* Числовые поля из state. Вызывается и после зажатия в границы, чтобы в
     поле не оставалось значения, которое на самом деле не применено. */
  function syncNumericFields() {
    var L = state.layout, D = state.doc, Col = state.colors, S = state.style;

    eYear.text  = state.year;
    eCount.text = state.monthCount;
    eYPYear.text = ypShown = String(yearPageYear());
    ePage[0].text = D.pageWidth;  ePage[1].text = D.pageHeight;
    eMar1[0].text = D.marginTop;  eMar1[1].text = D.marginBottom;
    eMar2[0].text = D.marginLeft; eMar2[1].text = D.marginRight;

    eRatio.text = (L.mainRatio * 100).toFixed(0);
    eTop.text   = L.blockTop;
    eGapMM.text = (state.template === "below") ? L.miniGapTop : L.mainMiniGap;

    eTitle.text  = L.titleSize;   eDay.text    = L.daySize;
    eCellH.text  = L.cellH;       eHeadLc.text = L.headLocSize;
    eHeadEn.text = L.headEnSize;  eWeekNo.text = L.weekNoSize;

    eMTitle.text = L.miniTitleSize; eMDay.text  = L.miniDaySize;
    eMCellH.text = L.miniCellH;     eMHead.text = L.miniHeadSize;
    eMGap.text   = L.miniGap;       eMW.text    = L.miniW;

    eRed[0].text = Col.redC; eRed[1].text = Col.redM;
    eRed[2].text = Col.redY; eRed[3].text = Col.redK;
    eFill[0].text = S.fillC; eFill[1].text = S.fillM;
    eFill[2].text = S.fillY; eFill[3].text = S.fillK;
    eGrey.text = Col.grey; eRTint.text = Col.redTint;

    eLine[0].text = S.lineWeight; eLine[1].text = S.lineTint;
    eNotes.text   = S.notes;
    eTints[0].text = S.dayTint;   eTints[1].text = S.weekTint;
  }

  function selectByText(dd, text) {
    var i;
    if (!text) return 0;
    for (i = 0; i < dd.items.length; i++)
      if (dd.items[i].text === text) return i;
    return 0;
  }

  function fillStyleControls() {
    var S = state.style;
    ddDesign.selection = Math.max(0, indexOf(DESIGN_ORDER, state.design));
    selEnum(ddTitle, "titleMode");   selEnum(ddYear, "yearStyle");
    selEnum(ddHeadMode, "headMode"); selEnum(ddHeadFill, "headFill");
    selEnum(ddLines, "lines");       selEnum(ddCells, "cells");
    selEnum(ddColF, "colFill");      selEnum(ddAlign, "numAlign");
    selEnum(ddAdj, "adjacent");      selEnum(ddWeek, "weekNo");
    cbCaps.value     = S.caps;
    cbHeadInv.value  = S.headInverse;
    cbHeadWknd.value = S.headWeekendFill;
    cbWkPad.value    = S.weekPad;
    cbWkFill.value   = S.weekFill;
    cbMiniPan.value  = S.miniPanel;
    cbMiniAdj.value  = S.miniAdjacent;
  }

  function fillFromState() {
    filling = true;
    var D = state.doc, O = state.options, F = state.font, i, sel;

    ddLangUi.selection  = Math.max(0, indexOf(LANGS, state.uiLang));
    ddLangCal.selection = Math.max(0, indexOf(LANGS, state.calLang));

    radios[state.template].value = true;
    ddStart.selection = state.startMonth;
    fillStyleControls();
    syncNumericFields();

    var fmtIdx = PAGE_PRESETS.length - 1;
    for (i = 0; i < PAGE_PRESETS.length - 1; i++)
      if (PAGE_PRESETS[i].w === D.pageWidth && PAGE_PRESETS[i].h === D.pageHeight)
        fmtIdx = i;
    ddFmt.selection = fmtIdx;

    ddAnc.selection  = (O.blockAnchor === "bottom") ? 1 : 0;
    ddSide.selection = Math.max(0, indexOf(ENUMS.miniSide, O.miniSide));

    cbSix.value   = O.fixedSixRows;
    cbMini.value  = O.showMiniCalendars;
    cbPhoto.value = O.photoFrame;
    cbYearPage.value = state.yearPage;

    sel = selectByText(ddFam, F.family);          // список уже наполнен
    ddFam.selection = sel;
    if (sel > 0) fillStyleDropdowns(ddReg, ddBold, ddFam.selection.text,
                                    "latin", F.regular, F.bold);
    else { ddReg.removeAll(); ddBold.removeAll(); }

    if (ddCjk) {
      sel = selectByText(ddCjk, F.cjkFamily);
      ddCjk.selection = sel;
      if (sel > 0) fillStyleDropdowns(ddCjkReg, ddCjkBold, ddCjk.selection.text,
                                      "cjk", F.cjkRegular, F.cjkBold);
      else { ddCjkReg.removeAll(); ddCjkBold.removeAll(); }
    }

    fillPrevMonths();
    rbBlock.value = (state.view.zoom !== "page");
    rbPage.value  = !rbBlock.value;

    updateEnabled();
    filling = false;
    redrawPreview();
  }

  function updateEnabled() {
    var isBelow = (state.template === "below");
    var minisOn = cbMini.value;
    var S = state.style;

    eRatio.enabled = !isBelow;
    eTop.enabled   = !(ddAnc.selection && ddAnc.selection.index === 1);

    eGapMM.enabled  = minisOn;
    eMTitle.enabled = minisOn;
    eMDay.enabled   = minisOn;
    eMCellH.enabled = minisOn;
    eMHead.enabled  = minisOn;
    eMGap.enabled   = minisOn && (state.template !== "stack");
    eMW.enabled     = minisOn && isBelow;
    ddSide.enabled    = minisOn;
    cbMiniPan.enabled = minisOn;
    cbMiniAdj.enabled = minisOn;

    eLine[0].enabled = eLine[1].enabled =
      (S.lines !== "none" || S.cells === "box" || S.notes > 0);
    cbHeadInv.enabled = (S.headFill !== "none");
    cbWkPad.enabled   = (S.weekNo !== "none");
    cbWkFill.enabled  = (S.weekNo !== "none");
    ddYear.enabled    = (S.titleMode !== "slash");
    eYPYear.enabled   = cbYearPage.value;

    // тот же промежуток означает разное в разных компоновках
    eGapMM.labelText.text = isBelow ? U.fGapBelow : U.fGapSide;
    eMW.labelText.text    = isBelow ? U.fMiniWOne : U.fMiniWCalc;
  }

  function readIntoState() {
    var L = state.layout, D = state.doc, O = state.options, Col = state.colors;
    var S = state.style, F = state.font, sc;

    state.year       = Math.round(numOf(eYear,  state.year,       LIMITS.year));
    state.monthCount = Math.round(numOf(eCount, state.monthCount, LIMITS.months));
    if (ddStart.selection) state.startMonth = ddStart.selection.index;

    // год страницы «год целиком»: пока поле не трогали, он следует за
    // диапазоном; вписанный вручную запоминается, а совпавший с
    // автоматическим снова становится автоматическим
    state.yearPage = cbYearPage.value;
    if (eYPYear.text !== ypShown) {
      var yp = Math.round(numOf(eYPYear, yearPageYear(), LIMITS.year));
      state.yearPageYear = (yp === autoYearPageYear()) ? 0 : yp;
    }

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
    if (ddSide.selection) O.miniSide = ENUMS.miniSide[ddSide.selection.index];

    if (state.template === "below") L.miniGapTop  = numOf(eGapMM, L.miniGapTop,  LIMITS.gap);
    else                            L.mainMiniGap = numOf(eGapMM, L.mainMiniGap, LIMITS.gap);

    O.fixedSixRows      = cbSix.value;
    O.showMiniCalendars = cbMini.value;
    O.photoFrame        = cbPhoto.value;

    L.titleSize   = numOf(eTitle,  L.titleSize,   LIMITS.fontSize);
    L.daySize     = numOf(eDay,    L.daySize,     LIMITS.fontSize);
    L.cellH       = numOf(eCellH,  L.cellH,       LIMITS.cellH);
    L.headLocSize = numOf(eHeadLc, L.headLocSize, LIMITS.fontSize);
    L.headEnSize  = numOf(eHeadEn, L.headEnSize,  LIMITS.fontSize);
    L.weekNoSize  = numOf(eWeekNo, L.weekNoSize,  LIMITS.fontSize);

    L.miniTitleSize = numOf(eMTitle, L.miniTitleSize, LIMITS.fontSize);
    L.miniDaySize   = numOf(eMDay,   L.miniDaySize,   LIMITS.fontSize);
    L.miniCellH     = numOf(eMCellH, L.miniCellH,     LIMITS.cellH);
    L.miniHeadSize  = numOf(eMHead,  L.miniHeadSize,  LIMITS.fontSize);
    L.miniGap       = numOf(eMGap,   L.miniGap,       LIMITS.gap);
    L.miniW         = numOf(eMW,     L.miniW,         LIMITS.miniW);

    Col.redC = numOf(eRed[0], Col.redC, LIMITS.percent);
    Col.redM = numOf(eRed[1], Col.redM, LIMITS.percent);
    Col.redY = numOf(eRed[2], Col.redY, LIMITS.percent);
    Col.redK = numOf(eRed[3], Col.redK, LIMITS.percent);
    Col.grey    = numOf(eGrey,  Col.grey,    LIMITS.percent);
    Col.redTint = numOf(eRTint, Col.redTint, LIMITS.percent);

    // дизайн
    readEnum(ddTitle, "titleMode");   readEnum(ddYear, "yearStyle");
    readEnum(ddHeadMode, "headMode"); readEnum(ddHeadFill, "headFill");
    readEnum(ddLines, "lines");       readEnum(ddCells, "cells");
    readEnum(ddColF, "colFill");      readEnum(ddAlign, "numAlign");
    readEnum(ddAdj, "adjacent");      readEnum(ddWeek, "weekNo");
    S.caps            = cbCaps.value;
    S.headInverse     = cbHeadInv.value;
    S.headWeekendFill = cbHeadWknd.value;
    S.weekPad         = cbWkPad.value;
    S.weekFill        = cbWkFill.value;
    S.miniPanel       = cbMiniPan.value;
    S.miniAdjacent    = cbMiniAdj.value;
    S.lineWeight = numOf(eLine[0], S.lineWeight, LIMITS.weight);
    S.lineTint   = numOf(eLine[1], S.lineTint,   LIMITS.percent);
    S.notes      = Math.round(numOf(eNotes, S.notes, LIMITS.notes));
    S.dayTint    = numOf(eTints[0], S.dayTint,  LIMITS.percent);
    S.weekTint   = numOf(eTints[1], S.weekTint, LIMITS.percent);
    S.fillC = numOf(eFill[0], S.fillC, LIMITS.percent);
    S.fillM = numOf(eFill[1], S.fillM, LIMITS.percent);
    S.fillY = numOf(eFill[2], S.fillY, LIMITS.percent);
    S.fillK = numOf(eFill[3], S.fillK, LIMITS.percent);

    if (ddFam.selection && ddFam.selection.index > 0) {
      F.family  = ddFam.selection.text;
      F.regular = ddReg.selection  ? ddReg.selection.text  : "";
      F.bold    = ddBold.selection ? ddBold.selection.text : "";
    } else {
      F.family = ""; F.regular = ""; F.bold = "";
    }

    // при некитайской сетке списка нет — сохранённый выбор CJK не трогаем
    if (ddCjk) {
      sc = ddCjk.selection;
      if (sc && sc.index > 0 && sc.type !== "separator") {
        F.cjkFamily  = sc.text;
        F.cjkRegular = ddCjkReg.selection  ? ddCjkReg.selection.text  : "";
        F.cjkBold    = ddCjkBold.selection ? ddCjkBold.selection.text : "";
      } else {
        F.cjkFamily = ""; F.cjkRegular = ""; F.cjkBold = "";
      }
    }
  }

  /* Считать введённое, показать назад уже зажатые значения, перерисовать */
  function refresh() {
    if (filling) return;
    readIntoState();
    filling = true;
    syncNumericFields();
    updateEnabled();
    fillPrevMonths();
    filling = false;
    redrawPreview();
  }

  /* Список над схемой = месяцы диапазона и, если включена, страница года.
     Перестраивается только при смене диапазона; выбранный пункт
     сохраняется, если он остался в списке, иначе берётся самый высокий
     месяц — худший случай по высоте. */
  var prevList = [], prevKey = "";

  function fillPrevMonths() {
    var ypY = state.yearPage ? yearPageYear() : 0;
    var key = state.year + "/" + state.startMonth + "/" + state.monthCount + "/" + ypY;
    if (key === prevKey) return;

    var old = (ddPrevMonth.selection) ? prevList[ddPrevMonth.selection.index] : null;
    var i, e, sel = -1, months = monthRange();
    prevKey  = key;
    prevList = months.slice(0);
    if (state.yearPage) prevList.push({ yearPage: true, year: ypY });

    ddPrevMonth.removeAll();
    for (i = 0; i < prevList.length; i++) {
      e = prevList[i];
      ddPrevMonth.add("item", e.yearPage ? fmt(U.prevYearPage, e.year) : monthLabel(U, e));
      if (!old || sel >= 0) continue;
      if (e.yearPage) { if (old.yearPage) sel = i; }
      else if (!old.yearPage && e.year === old.year && e.month === old.month) sel = i;
    }
    ddPrevMonth.selection = (sel >= 0) ? sel : tallestMonth(months);
  }

  function applyAutofit() {
    readIntoState();
    var colW = columnWidth();
    state.layout.cellH   = Math.round(colW * AUTOFIT.cellH * 10) / 10;
    state.layout.daySize = Math.round(colW * AUTOFIT.daySize);
    filling = true;
    syncNumericFields();
    filling = false;
    redrawPreview();
  }

  /* ---------- схема ---------- */

  /* ScriptUI не имеет одной надёжной команды «перерисуй элемент»:
     notify("onDraw") срабатывает не в каждой версии. Поэтому счётчиком
     проверяем, действительно ли отработал onDraw, и только если нет —
     прибегаем к hide/show (он перерисовывает всегда, ценой мигания). */
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

  /* Цифры под схемой: то, что на глаз со схемы не считаешь. */
  function updateMetrics() {
    try {
      var NL = String.fromCharCode(10);
      var L = state.layout, D = state.doc;
      var w = worstBottom();
      var v = validate(w);
      var limit = D.pageHeight - D.marginBottom;

      var txt = fmt(U.mLine1, columnWidth().toFixed(1), L.cellH, L.daySize) +
                NL + fmt(U.mLine2, w.y.toFixed(1), limit.toFixed(0));

      if (v.errors.length)        txt += NL + U.mErr  + v.errors[0];
      else if (v.warnings.length) txt += NL + U.mWarn + v.warnings[0];

      stMetrics.text = txt;
      bOk.enabled = (v.errors.length === 0);
    } catch (e) {}
  }

  prev.onDraw = function () {
    drawCount++;
    var sel   = ddPrevMonth.selection;
    var entry = (sel && prevList[sel.index]) || prevList[0];
    if (!entry) return;
    try {
      drawPreview(this.graphics, this.size.width, this.size.height, entry,
                  state.view.zoom);
    } catch (e) {}
  };

  /* ---------- события ---------- */

  /* ScriptUI не умеет перестраивать окно на месте, поэтому смена языка
     закрывает диалог, а запуск открывает его заново. Введённое перед этим
     считывается в state и не теряется. */
  function relang(which, idx) {
    if (filling) return;
    readIntoState();
    if (which === "ui") state.uiLang  = LANGS[idx];
    else                state.calLang = LANGS[idx];
    win.close(3);
  }

  ddLangUi.onChange = function () {
    if (ddLangUi.selection) relang("ui", ddLangUi.selection.index);
  };
  ddLangCal.onChange = function () {
    if (ddLangCal.selection) relang("cal", ddLangCal.selection.index);
  };

  /* Дизайн: заменяет оформление целиком, размеры не трогает */
  function applyDesign(name) {
    readIntoState();
    state.design = name;
    state.style  = designStyle(name);
    fillFromState();
  }
  ddDesign.onChange = function () {
    if (filling || !ddDesign.selection) return;
    applyDesign(DESIGN_ORDER[ddDesign.selection.index]);
  };
  bDesign.onClick = function () { applyDesign(state.design); };

  var styleDDs = [ddTitle, ddYear, ddHeadMode, ddHeadFill, ddLines, ddCells,
                  ddColF, ddAlign, ddAdj, ddWeek, ddSide];
  var styleCBs = [cbCaps, cbHeadInv, cbHeadWknd, cbWkPad, cbWkFill,
                  cbMiniPan, cbMiniAdj, cbPhoto, cbSix];
  var si;
  for (si = 0; si < styleDDs.length; si++) styleDDs[si].onChange = refresh;
  for (si = 0; si < styleCBs.length; si++) styleCBs[si].onClick  = refresh;

  var rt;
  for (rt = 0; rt < TEMPLATES.length; rt++) {
    (function (t) {
      radios[t].onClick = function () {
        readIntoState();                        // не теряем только что введённое
        var keep = state;
        state = factoryState(t, keep.design);
        state.style  = keep.style;     state.doc    = keep.doc;
        state.font   = keep.font;      state.colors = keep.colors;
        state.year   = keep.year;      state.view   = keep.view;
        state.startMonth = keep.startMonth; state.monthCount = keep.monthCount;
        state.yearPage = keep.yearPage; state.yearPageYear = keep.yearPageYear;
        state.uiLang = keep.uiLang;    state.calLang = keep.calLang;
        state.options.miniSide   = keep.options.miniSide;
        state.options.photoFrame = keep.options.photoFrame;
        // пресет рассчитан под A2 книжную; на другом листе подгоняем,
        // на A2 не трогаем, чтобы не затереть вручную выставленные поля
        if (keep.doc.pageWidth !== BASE.pageW || keep.doc.pageHeight !== BASE.pageH)
          applyPageFit();
        fillFromState();
      };
    })(TEMPLATES[rt]);
  }

  ddFmt.onChange = function () {
    if (filling || !ddFmt.selection) return;
    var p = PAGE_PRESETS[ddFmt.selection.index];
    if (!p.w) return;                        // «свой размер» — ничего не трогаем
    readIntoState();
    state.doc.pageWidth = p.w; state.doc.pageHeight = p.h;
    applyPageFit();                          // пресеты считались под A2
    fillFromState();
  };

  bFit.onClick = function () { readIntoState(); applyPageFit(); fillFromState(); };

  ddPrevMonth.onChange = function () { if (!filling) redrawPreview(); };
  rbPage.onClick  = function () { state.view.zoom = "page";  redrawPreview(); };
  rbBlock.onClick = function () { state.view.zoom = "block"; redrawPreview(); };

  ddFam.onChange = function () {
    if (filling) return;
    if (ddFam.selection && ddFam.selection.index > 0)
      fillStyleDropdowns(ddReg, ddBold, ddFam.selection.text, "latin",
                         state.font.regular, state.font.bold);
    else { ddReg.removeAll(); ddBold.removeAll(); }
    readIntoState(); redrawPreview();
  };
  ddReg.onChange  = function () { if (!filling) { readIntoState(); redrawPreview(); } };
  ddBold.onChange = function () { if (!filling) { readIntoState(); redrawPreview(); } };

  if (ddCjk) {
    ddCjk.onChange = function () {
      if (filling) return;
      var s = ddCjk.selection;
      if (s && s.index > 0 && s.type !== "separator")
        fillStyleDropdowns(ddCjkReg, ddCjkBold, s.text, "cjk",
                           state.font.cjkRegular, state.font.cjkBold);
      else { ddCjkReg.removeAll(); ddCjkBold.removeAll(); }
      readIntoState(); dropCjkCache(); updateMetrics();
    };
    ddCjkReg.onChange  = function () {
      if (filling) return;
      readIntoState(); dropCjkCache(); updateMetrics();
    };
    ddCjkBold.onChange = function () {
      if (filling) return;
      readIntoState(); dropCjkCache(); updateMetrics();
    };
  }

  ddAnc.onChange   = refresh;
  ddStart.onChange = refresh;
  cbMini.onClick   = refresh;
  cbYearPage.onClick = refresh;
  bAuto.onClick  = applyAutofit;

  var live = [ePage[0], ePage[1], eMar1[0], eMar1[1], eMar2[0], eMar2[1],
              eYear, eCount, eYPYear, eRatio, eTop, eGapMM,
              eTitle, eDay, eCellH, eHeadLc, eHeadEn, eWeekNo,
              eMTitle, eMDay, eMCellH, eMHead, eMGap, eMW,
              eRed[0], eRed[1], eRed[2], eRed[3],
              eFill[0], eFill[1], eFill[2], eFill[3], eGrey, eRTint,
              eLine[0], eLine[1], eNotes, eTints[0], eTints[1]], li;
  for (li = 0; li < live.length; li++) live[li].onChange = refresh;

  bReset.onClick = function () {
    readIntoState();
    var keep = state;
    state = factoryState(keep.template, keep.design);
    state.style  = keep.style;     state.doc    = keep.doc;       // лист, шрифт,
    state.font   = keep.font;      state.colors = keep.colors;    // цвет и дизайн —
    state.year   = keep.year;      state.view   = keep.view;      // не часть
    state.uiLang = keep.uiLang;    state.calLang = keep.calLang;  // компоновки
    state.startMonth = keep.startMonth; state.monthCount = keep.monthCount;
    state.yearPage = keep.yearPage; state.yearPageYear = keep.yearPageYear;
    state.options.miniSide   = keep.options.miniSide;
    state.options.photoFrame = keep.options.photoFrame;
    if (keep.doc.pageWidth !== BASE.pageW || keep.doc.pageHeight !== BASE.pageH)
      applyPageFit();
    fillFromState();
  };

  bOk.onClick = function () {
    var NL = String.fromCharCode(10);
    readIntoState();
    var v = validate();

    if (v.errors.length) {
      alert(U.alertErrHead + NL + NL + "• " + v.errors.join(NL + "• "),
            U.alertErrTitle);
      return;
    }
    if (v.warnings.length) {
      if (!confirm(U.alertWarnHead + NL + NL + "• " +
                   v.warnings.join(NL + "• ") + NL + NL +
                   U.alertWarnTail, false, U.alertWarnTitle)) return;
    }
    win.close(1);
  };

  /* ---------- шрифт интерфейса ---------- */

  fillFromState();

  if (state.uiLang === "zh") {
    cjkUiTree(win);                       // весь диалог набран иероглифами
  } else {
    // интерфейс не китайский, но иероглифы в нём всё равно есть — точечно
    cjkUi(ddLangUi); cjkUi(ddLangCal);    // 中文 в списке языков
    if (isZhCal) {
      cjkUi(eMHead.labelText);            // «Кегль 一 二 三 …»
      cjkUi(ddCjk);                       // 微软雅黑 и прочие имена семейств
      cjkUi(ddCjkReg); cjkUi(ddCjkBold);  // 常规 / 粗体 вместо Regular / Bold
    }
  }

  // проверочный прогон может подсмотреть окно перед показом
  if ($.global.CGB_HARNESS && $.global.CGB_HARNESS.onDialog) {
    try {
      $.global.CGB_HARNESS.onDialog(win, {
        tabs: tabs, tabList: [tD, tL, tF, tC], design: ddDesign, month: ddPrevMonth,
        start: ddStart, year: eYear, count: eCount,
        yearPage: cbYearPage, ypYear: eYPYear,
        rbPage: rbPage, rbBlock: rbBlock, applyDesign: applyDesign,
        redraw: redrawPreview
      });
    } catch (e) {}
  }

  var code = win.show();
  if (code === 1) return "ok";
  if (code === 3) return "relang";
  return "cancel";
}

/* =====================================================================
   14. ЗАПУСК
   ===================================================================== */

/* Точка входа для проверочного прогона без диалога: если перед запуском
   задан $.global.CGB_HARNESS, скрипт ничего не строит, а отдаёт свои
   функции. В обычном запуске эта ветка не срабатывает. */
if ($.global.CGB_HARNESS) {
  $.global.CGB_HARNESS.api = {
    getState    : function () { return state; },
    setState    : function (s) { state = s; },
    factoryState: factoryState,
    designStyle : designStyle,
    applyPageFit: applyPageFit,
    validate    : validate,
    build       : build,
    lastDoc     : function () { return LAST_DOC; },
    monthScene  : monthScene,
    computeMonth: computeMonth,
    monthRange  : monthRange,
    worstBottom : worstBottom,
    yearScene   : yearScene,
    yearGeom    : yearGeom,
    yearPageYear: yearPageYear,
    periodText  : periodText,
    periodShort : periodShort,
    ui          : UI,
    showDialog  : function () { return (typeof showDialog === "function") ? showDialog() : "n/a"; },
    designs     : DESIGN_ORDER,
    templates   : TEMPLATES
  };
  return;
}

loadPrefs();

var answer;
do { answer = showDialog(); } while (answer === "relang");

if (answer === "ok") {
  savePrefs();

  var U = UI[state.uiLang];
  var NL = String.fromCharCode(10);
  var buildError = null;

  app.doScript(function () { buildError = build(); },
               ScriptLanguage.JAVASCRIPT, undefined,
               UndoModes.ENTIRE_SCRIPT, fmt(U.undo, periodShort()));

  if (buildError) {
    alert(U.buildFailHead + NL + NL + buildError, U.buildFailTitle);
  } else {
    alert(fmt(U.doneBody, periodText(U), state.doc.pageWidth, state.doc.pageHeight,
              U.designs[state.design], U.tpl[state.template], pageCount(),
              state.yearPage ? fmt(U.doneYearPage, yearPageYear()) : "") +
          (state.calLang === "zh" ? U.doneCjkNote : ""));
  }
}

})();
