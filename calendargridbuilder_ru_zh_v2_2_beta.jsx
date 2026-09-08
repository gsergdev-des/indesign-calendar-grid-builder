/* =====================================================================
   КАЛЕНДАРНАЯ СЕТКА — конструктор для Adobe InDesign
   Русская и китайская ветка (RU / ZH)
   ---------------------------------------------------------------------
   Три шаблона в одном скрипте + диалог настроек при запуске:

     1. «Мини под сеткой»  — сетка на всю ширину, мини-календари
                             предыдущего/следующего месяца под ней справа;
     2. «Мини рядом»       — сетка ~65 % ширины, оба мини-календаря
                             справа от неё в один ряд;
     3. «Мини столбиком»   — сетка ~73 % ширины, мини один под другим.

   Два независимых языка:
     • язык интерфейса  — русский или 中文;
     • язык календаря   — русско-английский или китайско-английский.

   Создаёт документ, по одному месяцу на страницу, со стилями абзацев
   в группе «CAL» и плашкой «CAL Red». Для китайской сетки дополнительно
   создаётся знаковый стиль «CJK» в группе «CAL» — им набраны иероглифы,
   поэтому цифры и латиница остаются в основном шрифте.

   Запуск:  положить файл в папку Scripts Panel > User
            (Window > Utilities > Scripts, ПКМ на User > Reveal in Explorer)
            и дважды щёлкнуть по нему в панели Scripts.

   Настройки сохраняются между запусками; кнопка «Сбросить параметры
   шаблона» возвращает заводские значения выбранного шаблона.

   Структура файла:
     1  заводские пресеты шаблонов и границы значений
     2  языковые таблицы (интерфейс и календарь)
     3  состояние + сохранение между запусками
     4  даты (ISO-8601)
     5  расчёт геометрии — единственный источник координат
     6  проверка настроек
     7  шрифты
     8  стили абзацев и отрисовка
     9  диалог
    10  запуск
   ===================================================================== */

#target "indesign"

(function () {

/* =====================================================================
   1. ЗАВОДСКИЕ ПРЕСЕТЫ И ГРАНИЦЫ ЗНАЧЕНИЙ
   ===================================================================== */

var TEMPLATES = ["below", "side", "stack"];

/* Множители высоты текстовых фреймов относительно кегля. Вынесены сюда,
   чтобы расчёт, отрисовка и схема пользовались одними и теми же
   числами. */
var FRAME = {
  title    : 1.3,   // фрейм названия месяца
  head     : 1.5,   // фрейм заголовков дней (местный и английский)
  miniTitle: 1.4,   // фрейм заголовка мини-календаря
  miniHead : 1.5    // фрейм заголовков дней в мини
};

/* Каждый пресет содержит ВСЕ ключи, даже те, что этим шаблоном не
   используются — так переключение между шаблонами не оставляет дыр. */
var PRESETS = {

  below: {
    layout: {
      blockTop      : 282,
      mainRatio     : 1.00,   // не используется этим шаблоном
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
      fixedSixRows: true,   // иначе в феврале пара мини свисает ниже сетки
      showMiniCalendars: true, blockAnchor: "top"
    }
  }
};

/* Общее для всех шаблонов */
var COMMON = {
  year: 2027,
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
var SCALABLE = ["titleSize", "titleGap", "headUaSize", "headUaGap",
                "cellH", "daySize", "headEnGap", "headEnSize",
                "weekNoSize", "weekNoW", "weekNoGap", "mainMiniGap",
                "miniGapTop", "miniW", "miniGap",
                "miniTitleSize", "miniTitleGap", "miniHeadSize",
                "miniDaySize", "miniCellH", "miniWeekNoW", "miniWeekNoGap",
                "miniWeekNoSize", "miniVGapMin", "miniVGapMax"];

/* То, что влияет на высоту блока: сжимается дополнительно, если после
   масштабирования по ширине блок не влезает в лист (типично для
   альбомных форматов — широких и низких). */
var VERTICAL = ["titleSize", "titleGap", "headUaSize", "headUaGap",
                "cellH", "daySize", "headEnGap", "headEnSize", "weekNoSize",
                "miniGapTop", "miniTitleSize", "miniTitleGap",
                "miniHeadSize", "miniDaySize", "miniCellH",
                "miniVGapMin", "miniVGapMax"];

/* =====================================================================
   2. ЯЗЫКОВЫЕ ТАБЛИЦЫ

   CAL — то, что попадает в документ.
   UI  — то, что видно в диалоге и в сообщениях.

   Подстановка — через fmt() по {0}, {1}, … Добавление третьего языка
   сводится к двум новым веткам здесь; в остальной код лезть не нужно.
   ===================================================================== */

var MONTHS_EN = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
var DAYS_EN   = ["Monday","Tuesday","Wednesday","Thursday","Friday",
                 "Saturday","Sunday"];
var DAYS_EN_S = ["M","T","W","R","F","S","U"];

var CAL = {

  ru: {
    tag      : "RU",
    months   : ["Январь","Февраль","Март","Апрель","Май","Июнь",
                "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
    days     : ["Понедельник","Вторник","Среда","Четверг","Пятница",
                "Суббота","Воскресенье"],
    daysShort: ["П","В","С","Ч","П","С","В"],
    monthsEn : MONTHS_EN, daysEn: DAYS_EN, daysEnShort: DAYS_EN_S,
    titleSep : " / "
  },

  zh: {
    tag      : "ZH",
    months   : ["一月","二月","三月","四月","五月","六月",
                "七月","八月","九月","十月","十一月","十二月"],
    days     : ["星期一","星期二","星期三","星期四","星期五",
                "星期六","星期日"],
    daysShort: ["一","二","三","四","五","六","日"],
    monthsEn : MONTHS_EN, daysEn: DAYS_EN, daysEnShort: DAYS_EN_S,
    titleSep : " / "
  }
};

/* Названия языков — всегда эндонимами, в любом интерфейсе */
var LANG_UI_NAMES  = { ru: "Русский", zh: "中文" };
var LANG_CAL_NAMES = { ru: "Русский + English", zh: "中文 + English" };
var LANGS = ["ru", "zh"];

var UI = {

  ru: {
    labelW: 176, ddW: 214,

    winTitle : "Календарная сетка — конструктор",

    panelLang: "Язык",
    langUi   : "Язык интерфейса",
    langCal  : "Язык календаря",
    calNames : { ru: "рус", zh: "кит" },

    panelTpl : "Шаблон",
    tpl: {
      below: "Мини под сеткой — сетка на всю ширину",
      side : "Мини рядом — сетка 65 % ширины, два мини в ряд справа",
      stack: "Мини столбиком — сетка 73 % ширины, мини один под другим"
    },
    tplHint  : "Смена шаблона возвращает все его заводские значения.",

    panelDoc : "Документ",
    fYear    : "Год",
    fFormat  : "Формат листа",
    fPageWH  : "Ширина / высота, мм",
    fMarTB   : "Поля: верх / низ, мм",
    fMarLR   : "Поля: слева / справа",
    btnFit   : "Подогнать шаблон под лист",
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
    cbAdj    : "Показывать числа соседних месяцев",
    cbMini   : "Рисовать мини-календари",

    panelType: "Типографика",
    fFont    : "Шрифт",
    fFontCjk : "Шрифт иероглифов",
    fStyles  : "Начертание: осн. / жирное",
    fontAuto : "— автовыбор —",
    fTitleSize: "Кегль названия месяца, pt",
    fDaySize : "Кегль чисел, pt",
    fCellH   : "Высота строки сетки, мм",
    fHeadLocal: "Кегль дней недели ({0}), pt",
    fHeadEn  : "Кегль дней недели (англ), pt",
    fWeekNo  : "Кегль номеров недель, pt",
    cbAuto   : "Подобрать высоту строки и кегль чисел по ширине колонки",

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
    fGrey    : "Серый соседних месяцев, %",
    fRedTint : "Тинт красного соседних, %",

    panelPrev : "Схема страницы",
    fPrevMonth: "Показать месяц:",

    btnReset : "Сбросить параметры шаблона",
    btnCancel: "Отмена",
    btnOk    : "Создать",

    months   : ["Январь","Февраль","Март","Апрель","Май","Июнь",
                "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],

    mLine1   : "Колонка {0} мм · строка {1} мм · числа {2} pt",
    mLine2   : "Самая нижняя точка за 12 месяцев: {0} из {1} мм",
    mErr     : "Ошибка: ",
    mWarn    : "Внимание: ",

    errInner : "Поля не оставляют места на листе: полоса набора {0} мм.",
    errMargins: "Верхнее и нижнее поля перекрывают друг друга.",
    errMiniRoom: "Для мини-календарей не осталось места ({0} мм). " +
                 "Уменьшите долю ширины под сетку или отступ.",

    warnMiniNarrow: "Мини-календарь шириной всего {0} мм — числа будут тесными.",
    warnMiniWide  : "Два мини-календаря ({0} мм) шире полосы набора — " +
                    "левый выйдет за поле.",
    warnMiniDay   : "Числа в мини-календарях {0} pt — на печати это почти не " +
                    "читается. Попробуйте другой шаблон или больший лист.",
    warnBelow     : "Блок выходит за нижнее поле на {0} мм ({1}). Уменьшите " +
                    "отступ от верха, высоту строки или кегли.",
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
    doneBody      : "Календарь на {0} год создан: 12 страниц {1} × {2} мм." +
                    "\nШаблон: {3}\n\nСтили абзацев — в группе «CAL» на панели " +
                    "Paragraph Styles.\nЦвет — «CAL Red» на панели Swatches.",
    doneCjkNote   : "\nИероглифы набраны знаковым стилем «CJK» в группе «CAL» " +
                    "на панели Character Styles."
  },

  /* labelW/ddW: иероглиф в диалоге почти вдвое шире буквы, зато слов в
     подписи втрое меньше. 150 px — самая длинная подпись «网格 → 小月历间距，
     毫米» плюс запас; на украинских 168 она бы обрезалась. */
  zh: {
    labelW: 150, ddW: 190,

    winTitle : "日历网格生成器",

    panelLang: "语言",
    langUi   : "界面语言",
    langCal  : "日历语言",
    calNames : { ru: "俄文", zh: "中文" },

    panelTpl : "版式",
    tpl: {
      below: "小月历在下方 — 网格占满宽度",
      side : "小月历在右侧 — 网格占 65 % 宽度，两个并排",
      stack: "小月历竖排 — 网格占 73 % 宽度，两个上下排列"
    },
    tplHint  : "切换版式会恢复该版式的全部默认值。",

    panelDoc : "文档",
    fYear    : "年份",
    fFormat  : "页面尺寸",
    fPageWH  : "宽 / 高，毫米",
    fMarTB   : "页边距：上 / 下",
    fMarLR   : "页边距：左 / 右",
    btnFit   : "按页面尺寸重算版式",
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
    fGapSide : "网格 → 小月历间距，毫米",
    cbSix    : "网格固定 6 行",
    cbAdj    : "显示相邻月份的日期",
    cbMini   : "绘制小月历",

    panelType: "文字",
    fFont    : "字体",
    fFontCjk : "中文字体",
    fStyles  : "字重：正文 / 粗体",
    fontAuto : "— 自动选择 —",
    fTitleSize: "月份名称字号 pt",
    fDaySize : "日期数字字号 pt",
    fCellH   : "网格行高，毫米",
    fHeadLocal: "星期名称字号（{0}）pt",
    fHeadEn  : "星期名称字号（英文）pt",
    fWeekNo  : "周次字号 pt",
    cbAuto   : "按列宽自动匹配行高与日期字号",

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
    fGrey    : "相邻月份灰度 %",
    fRedTint : "相邻月份红色淡度 %",

    panelPrev : "页面示意图",
    fPrevMonth: "显示月份：",

    btnReset : "恢复版式默认值",
    btnCancel: "取消",
    btnOk    : "生成",

    months   : ["一月","二月","三月","四月","五月","六月",
                "七月","八月","九月","十月","十一月","十二月"],

    mLine1   : "列宽 {0} 毫米 · 行高 {1} 毫米 · 日期 {2} pt",
    mLine2   : "全年最低点：{0} / {1} 毫米",
    mErr     : "错误：",
    mWarn    : "注意：",

    errInner : "页边距没有留下版心：版心宽度仅 {0} 毫米。",
    errMargins: "上下页边距互相重叠。",
    errMiniRoom: "小月历没有可用空间（{0} 毫米）。请减小网格宽度占比或间距。",

    warnMiniNarrow: "小月历宽度仅 {0} 毫米，日期会很拥挤。",
    warnMiniWide  : "两个小月历共 {0} 毫米，超出版心宽度，左侧会越出页边距。",
    warnMiniDay   : "小月历日期为 {0} pt，印刷后几乎无法辨认。" +
                    "请改用其他版式或更大的页面。",
    warnBelow     : "版块超出下页边距 {0} 毫米（{1}）。" +
                    "请减小顶部留白、行高或字号。",
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
    doneBody      : "{0} 年日历已生成：12 页，{1} × {2} 毫米。\n版式：{3}\n\n" +
                    "段落样式位于“段落样式”面板的 CAL 样式组。\n" +
                    "颜色为“色板”面板中的 CAL Red。",
    doneCjkNote   : "\n汉字使用“字符样式”面板 CAL 样式组中的 CJK 样式。"
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
   3. СОСТОЯНИЕ + СОХРАНЕНИЕ МЕЖДУ ЗАПУСКАМИ
   ===================================================================== */

/* Имя отличается от украинской ветки — настройки двух скриптов
   не должны затирать друг друга. */
var PREFS_FILE = File(Folder.userData + "/CalendarGridBuilderML.txt");

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
    uiLang  : "ru",
    calLang : "ru",
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

    // шаблон читаем первым — от него зависит набор заводских значений
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
      if (node[seg] === undefined) continue;      // ключ из старой версии

      if (typeof node[seg] === "number") {
        num = parseFloat(val);
        if (!isNaN(num)) node[seg] = num;         // испорченный файл не должен
      }                                           // разнести NaN по геометрии
      else if (typeof node[seg] === "boolean") node[seg] = (val === "true");
      else node[seg] = val;
    }
  } catch (e) {}

  // язык из файла может оказаться каким угодно — дальше по коду он
  // используется как ключ таблиц, и промах уронил бы диалог на undefined
  if (!UI[state.uiLang])   state.uiLang  = "ru";
  if (!CAL[state.calLang]) state.calLang = "ru";
}

/* =====================================================================
   4. ДАТЫ (всё в UTC, чтобы избежать сдвигов часового пояса)
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

/* Матрицы кешируются: за одно обновление схемы их нужно 75, а разных
   среди них самое большее 13. Даты не меняются, поэтому кеш не устаревает. */
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

function pt2mm(v) { return v * 25.4 / 72; }

/* =====================================================================
   5. РАСЧЁТ ГЕОМЕТРИИ
   Единственный источник координат: им пользуются и отрисовка,
   и схема в диалоге, и проверка настроек.
   ===================================================================== */

function measureMini(year, month) {
  var L = state.layout;
  var rows = monthMatrix(year, month, false).length;
  return pt2mm(L.miniTitleSize) * FRAME.miniTitle + L.miniTitleGap
       + pt2mm(L.miniHeadSize) * FRAME.miniHead
       + rows * L.miniCellH
       + pt2mm(L.miniHeadSize) * FRAME.miniHead;
}

/* Ширина полосы под основную сетку */
function gridWidth() {
  var D = state.doc;
  var innerW = D.pageWidth - D.marginLeft - D.marginRight;
  return (state.template === "below") ? innerW : innerW * state.layout.mainRatio;
}

/* Вся геометрия страницы месяца — никакого рисования.
   Отрицательные ширины здесь не появляются: они зажимаются, чтобы
   некорректные настройки не доходили до InDesign в виде фрейма с x2 < x1.
   О самой проблеме сообщает validate(). */
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
    // под сеткой, оба в ряд, прижаты к правому полю
    mw    = Math.max(5, L.miniW);
    zoneX = D.pageWidth - D.marginRight - (mw * 2 + L.miniGap);
    my    = g.blockBottom + L.miniGapTop;
    g.minis.push({ x: zoneX,                  y: my, w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX + mw + L.miniGap, y: my, w: mw, h: h2, year: ny, month: nm });

  } else if (T === "side") {
    // справа от сетки, в один ряд
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
    // stack — справа, один под другим; промежуток растягивается так, чтобы
    // верх первого и низ второго совпали с границами сетки чисел
    zoneX = gx + gw + L.mainMiniGap;
    mw    = Math.max(5, innerW - gw - L.mainMiniGap);
    vgap  = gridH - (h1 + h2);
    my    = gridTop;

    if (vgap < L.miniVGapMin) {
      vgap = L.miniVGapMin;                       // не вмещается — свисает вниз
    } else if (vgap > L.miniVGapMax) {
      vgap = L.miniVGapMax;                       // слишком большой — центруем пару
      my   = gridTop + (gridH - (h1 + h2 + vgap)) / 2;
    }

    g.minis.push({ x: zoneX, y: my,             w: mw, h: h1, year: py, month: pm });
    g.minis.push({ x: zoneX, y: my + h1 + vgap, w: mw, h: h2, year: ny, month: nm });
  }

  return g;
}

/* Самая нижняя точка блока за все 12 месяцев + сопутствующие наблюдения */
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

/* Подгоняет заводские пропорции шаблона под текущий формат листа.

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
   6. ПРОВЕРКА НАСТРОЕК
   errors   — то, что сломает создание документа;
   warnings — то, о чём стоит знать, но решает пользователь.
   ===================================================================== */

/* precomputed — уже посчитанный worstBottom(): позволяет не проходить
   12 месяцев дважды за одно обновление. */
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

  var gw = gridWidth(), zoneW, mw, need;

  if (state.template !== "below" && O.showMiniCalendars) {
    zoneW = innerW - gw - L.mainMiniGap;
    mw = (state.template === "side") ? (zoneW - L.miniGap) / 2 : zoneW;
    if (mw < 5) {
      res.errors.push(fmt(U.errMiniRoom, mw.toFixed(1)));
    } else if (mw < 30) {
      res.warnings.push(fmt(U.warnMiniNarrow, mw.toFixed(1)));
    }
  }

  if (state.template === "below" && O.showMiniCalendars) {
    need = L.miniW * 2 + L.miniGap;
    if (need > innerW) res.warnings.push(fmt(U.warnMiniWide, need.toFixed(0)));
  }

  if (O.showMiniCalendars && L.miniDaySize < 6) {
    res.warnings.push(fmt(U.warnMiniDay, L.miniDaySize));
  }

  var w = precomputed || worstBottom();
  var limit = D.pageHeight - D.marginBottom;

  if (w.y > limit + 0.2) {          // 0.2 мм — погрешность округления, не повод
    res.warnings.push(fmt(U.warnBelow, (w.y - limit).toFixed(1), U.months[w.month]));
  }
  if (w.aboveTop >= 0) {
    res.warnings.push(fmt(U.warnAbove, U.months[w.aboveTop]));
  }
  if (w.overhang > 10) {
    res.warnings.push(fmt(U.warnOverhang, w.overhang.toFixed(1),
                          U.months[w.overMonth]));
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
   7. ШРИФТЫ
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

/* Перечень шрифтов — самая дорогая операция при открытии диалога.
   everyItem() отдаёт все названия двумя обращениями к InDesign, тогда как
   поэлементный перебор app.fonts[i] стоит три межпроцессных вызова на
   каждый шрифт: на тысяче установленных шрифтов это секунды ожидания. */
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

  if (empty) {                                     // запасной путь, если
    try {                                          // everyItem() не сработал
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

/* Автовыбор, если пользователь не задал шрифт явно.

   latin — цифры, латиница, кириллица; курсив здесь осознанный,
           это исходная типографика шаблонов.
   cjk    — иероглифы. Курсивных начертаний у CJK-шрифтов не бывает,
           поэтому списки начертаний совсем другие. Семейства перечислены
           и латиницей, и иероглифами: InDesign отдаёт fontFamily
           по-разному в зависимости от локали системы. */
var AUTO = {
  latin: {
    families: ["Myriad Pro", "Segoe UI", "Roboto", "Arial", "Helvetica"],
    regular : ["Italic", "Regular Italic", "Regular"],
    bold    : ["Bold Italic", "Semibold Italic", "Bold", "Italic"]
  },
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
    return f.isValid && f.status === FontStatus.INSTALLED;
  } catch (e) { return false; }
}

/* Выбранный пользователем шрифт имеет приоритет: если нужного начертания
   в нём нет, берём любое из этой же семьи и НЕ прыгаем на другую —
   иначе выбор пользователя молча подменялся бы на Arial. */
function resolveFont(which, script) {
  var F = state.font, A = AUTO[script];
  var fam = (script === "cjk") ? F.cjkFamily : F.family;
  var sty = (script === "cjk") ? (which === "bold" ? F.cjkBold : F.cjkRegular)
                               : (which === "bold" ? F.bold    : F.regular);
  var want = (which === "bold") ? A.bold : A.regular;
  var i, f, s, styles;

  if (fam && sty && fontExists(fam, sty)) return fam + "\t" + sty;

  if (fam) {
    for (i = 0; i < want.length; i++)
      if (fontExists(fam, want[i])) return fam + "\t" + want[i];

    styles = fontMap()[fam] || [];
    for (i = 0; i < styles.length; i++)
      if (fontExists(fam, styles[i])) return fam + "\t" + styles[i];
  }

  for (f = 0; f < A.families.length; f++)
    for (s = 0; s < want.length; s++)
      if (fontExists(A.families[f], want[s]))
        return A.families[f] + "\t" + want[s];

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
   8. СТИЛИ АБЗАЦЕВ И ОТРИСОВКА
   ===================================================================== */

var STYLES = {};        // внутренний ключ → стиль абзаца
var CJK_STYLES = {};    // regular / bold → знаковый стиль иероглифов

/* Жирное начертание в сетке только у названия месяца — значит, и второй
   знаковый стиль нужен только ему. */
var CJK_BOLD_KEYS = { title: true };

function makeColor(doc, name, cmyk) {
  var c = doc.colors.itemByName(name);
  if (c.isValid) return c;
  return doc.colors.add({
    name: name, model: ColorModel.PROCESS,
    space: ColorSpace.CMYK, colorValue: cmyk
  });
}

function buildStyles(doc) {
  var L = state.layout, C = state.colors, CL = CAL[state.calLang];

  var red   = makeColor(doc, "CAL Red", [C.redC, C.redM, C.redY, C.redK]);
  var black = doc.swatches.itemByName("Black");

  var fReg  = resolveFont("regular", "latin");
  var fBold = resolveFont("bold",    "latin");

  var grp = doc.paragraphStyleGroups.itemByName("CAL");
  if (!grp.isValid) grp = doc.paragraphStyleGroups.add({ name: "CAL" });

  /* key    — по нему обращается код, он от языка не зависит;
     name   — то, что видит верстальщик в панели Paragraph Styles. */
  function ps(key, name, opts) {
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

    STYLES[key] = st;
  }

  ps("title",        "Month title",        { size: L.titleSize, bold: true,
                                             align: Justification.LEFT_ALIGN });
  ps("headLocal",    "Weekday " + CL.tag,      { size: L.headUaSize });
  ps("headLocalRed", "Weekday " + CL.tag + " red", { size: L.headUaSize, red: true });
  ps("headEn",       "Weekday EN",         { size: L.headEnSize });
  ps("headEnRed",    "Weekday EN red",     { size: L.headEnSize, red: true });
  ps("day",          "Day",                { size: L.daySize });
  ps("dayRed",       "Day red",            { size: L.daySize, red: true });
  ps("dayAdj",       "Day adjacent",       { size: L.daySize, tint: C.grey });
  ps("dayAdjRed",    "Day adjacent red",   { size: L.daySize, red: true,
                                             tint: C.redTint });
  ps("weekNo",       "Week no",            { size: L.weekNoSize });
  ps("miniTitle",    "Mini title",         { size: L.miniTitleSize,
                                             align: Justification.LEFT_ALIGN });
  ps("miniHead",     "Mini weekday",       { size: L.miniHeadSize });
  ps("miniHeadRed",  "Mini weekday red",   { size: L.miniHeadSize, red: true });
  ps("miniDay",      "Mini day",           { size: L.miniDaySize });
  ps("miniDayRed",   "Mini day red",       { size: L.miniDaySize, red: true });
  ps("miniWeekNo",   "Mini week no",       { size: L.miniWeekNoSize, red: true });

  buildCjkStyles(doc);
}

/* Знаковые стили для иероглифов. Задан только шрифт: кегль, цвет и
   выключка наследуются от стиля абзаца, поэтому глобальная правка стилей
   продолжает работать как обычно. */
function buildCjkStyles(doc) {
  CJK_STYLES = {};
  if (state.calLang !== "zh") return;

  var cReg  = resolveFont("regular", "cjk");
  var cBold = resolveFont("bold",    "cjk");
  if (!cReg && !cBold) return;                  // validate() уже предупредил

  var grp = doc.characterStyleGroups.itemByName("CAL");
  if (!grp.isValid) grp = doc.characterStyleGroups.add({ name: "CAL" });

  function cs(name, fnt) {
    var st = grp.characterStyles.itemByName(name);
    if (!st.isValid) st = grp.characterStyles.add({ name: name });
    if (fnt) { try { st.appliedFont = fnt; } catch (e) {} }
    return st;
  }

  CJK_STYLES.regular = cs("CJK",      cReg  || cBold);
  CJK_STYLES.bold    = cs("CJK bold", cBold || cReg);
}

/* Иероглифы и латиница живут в одном фрейме («一月 / January»), поэтому
   одного appliedFont на стиле абзаца мало — размечаем каждый непрерывный
   прогон иероглифов знаковым стилем. Индексы символов совпадают со
   строкой: contents — один абзац, InDesign в него ничего не вставляет. */
function applyCjkRuns(tf, str, styleKey) {
  if (!CJK_STYLES.regular) return;
  var st = CJK_BOLD_KEYS[styleKey] ? CJK_STYLES.bold : CJK_STYLES.regular;
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

function addText(page, x1, y1, x2, y2, str, styleKey, vjust) {
  var tf = page.textFrames.add();
  tf.geometricBounds = [y1, x1, y2, x2];

  var p = tf.textFramePreferences;
  p.insetSpacing          = [0, 0, 0, 0];
  p.verticalJustification = vjust || VerticalJustification.CENTER_ALIGN;
  p.firstBaselineOffset   = FirstBaseline.LEADING_OFFSET;
  p.ignoreWrap            = true;
  try { p.autoSizingType = AutoSizingTypeEnum.OFF; } catch (e) {}   // нет в CS6

  tf.contents = str;
  tf.parentStory.texts[0].appliedParagraphStyle = STYLES[styleKey];
  applyCjkRuns(tf, str, styleKey);
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
  var L = state.layout, CL = CAL[state.calLang];

  var wkW  = L.miniWeekNoW, gap = L.miniWeekNoGap;
  var gx   = x + wkW + gap;
  var colW = (w - wkW - gap) / 7;
  if (colW <= 0) return;                     // страховка; validate() это ловит

  var yy = y, i, r, c, k, ry, dt;

  var title = CL.months[month] + CL.titleSep + year +
              CL.titleSep + CL.monthsEn[month];
  var th = pt2mm(L.miniTitleSize) * FRAME.miniTitle;
  addText(page, x, yy, x + w, yy + th, title, "miniTitle");
  yy += th + L.miniTitleGap;

  var hh = pt2mm(L.miniHeadSize) * FRAME.miniHead;
  for (i = 0; i < 7; i++) {
    addText(page, gx + i * colW, yy, gx + (i + 1) * colW, yy + hh,
            CL.daysShort[i], i >= 5 ? "miniHeadRed" : "miniHead");
  }
  yy += hh;

  var rows = monthMatrix(year, month, false);
  var gridTop = yy;

  for (r = 0; r < rows.length; r++) {
    ry = gridTop + r * L.miniCellH;
    addText(page, x, ry, x + wkW, ry + L.miniCellH,
            String(rows[r].week), "miniWeekNo");

    for (c = 0; c < 7; c++) {
      dt = rows[r].days[c];
      if (dt.getUTCMonth() !== month) continue;   // соседние месяцы тут не показываем
      addText(page, gx + c * colW, ry, gx + (c + 1) * colW, ry + L.miniCellH,
              String(dt.getUTCDate()), c >= 5 ? "miniDayRed" : "miniDay");
    }
  }
  var gridBottom = gridTop + rows.length * L.miniCellH;

  vLine(doc, page, x + wkW + gap / 2, gridTop, gridBottom, L.miniRuleWeight);

  for (k = 0; k < 7; k++) {
    addText(page, gx + k * colW, gridBottom, gx + (k + 1) * colW, gridBottom + hh,
            CL.daysEnShort[k], k >= 5 ? "miniHeadRed" : "miniHead");
  }
}

function drawMonth(doc, page, year, month) {
  var L = state.layout, O = state.options, CL = CAL[state.calLang];
  var g = computeMonth(year, month);
  var i, r, c, k, mi, ry, dt, own, stKey, mn;

  // название месяца
  addText(page, g.gx, g.titleY, g.gx + g.gw, g.titleY + g.thH,
          CL.months[month] + CL.titleSep + CL.monthsEn[month],
          "title", VerticalJustification.BOTTOM_ALIGN);

  // названия дней на языке календаря
  for (i = 0; i < 7; i++) {
    addText(page, g.gx + i * g.colW, g.headUaY,
            g.gx + (i + 1) * g.colW, g.headUaY + g.hUa,
            CL.days[i], i >= 5 ? "headLocalRed" : "headLocal");
  }

  // сетка чисел
  for (r = 0; r < g.rows.length; r++) {
    ry = g.gridTop + r * L.cellH;

    // номер недели — слева от сетки, в поле
    addText(page, g.gx - L.weekNoGap - L.weekNoW, ry,
            g.gx - L.weekNoGap, ry + L.cellH,
            String(g.rows[r].week), "weekNo");

    for (c = 0; c < 7; c++) {
      dt  = g.rows[r].days[c];
      own = (dt.getUTCMonth() === month);
      if (!own && !O.showAdjacentDays) continue;

      if (own) stKey = (c >= 5) ? "dayRed" : "day";
      else     stKey = (c >= 5) ? "dayAdjRed" : "dayAdj";

      addText(page, g.gx + c * g.colW, ry, g.gx + (c + 1) * g.colW, ry + L.cellH,
              String(dt.getUTCDate()), stKey);
    }
  }

  // английские названия дней
  for (k = 0; k < 7; k++) {
    addText(page, g.gx + k * g.colW, g.headEnY,
            g.gx + (k + 1) * g.colW, g.headEnY + g.hEn,
            CL.daysEn[k], k >= 5 ? "headEnRed" : "headEn");
  }

  // мини-календари
  for (mi = 0; mi < g.minis.length; mi++) {
    mn = g.minis[mi];
    drawMini(doc, page, mn.x, mn.y, mn.w, mn.year, mn.month);
  }
}

/* Возвращает null или текст ошибки. Недостроенный документ закрывается,
   чтобы не оставлять пользователю половину календаря. */
function build() {
  var D = state.doc, U = UI[state.uiLang], doc = null, m;

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
    return err.message + (err.line ? "  (" + U.lineWord + " " + err.line + ")" : "");
  }
}

/* =====================================================================
   9. ДИАЛОГ
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

/* Шрифт интерфейса с иероглифами. ScriptUI берёт системный шрифт диалога,
   а он на нелокализованной Windows иероглифов не содержит — вместо текста
   получаются пустые квадраты. */
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

/* Возвращает "ok", "cancel" или "relang" — последнее означает, что
   пользователь сменил язык и окно нужно построить заново. */
function showDialog() {

  var U = UI[state.uiLang], C = CAL[state.calLang];
  var isZhCal = (state.calLang === "zh");

  var win = new Window("dialog", U.winTitle);
  win.orientation = "column";
  win.alignChildren = "fill";
  win.spacing = 10;
  win.margins = 14;

  var PREV_W = 360, PREV_H = 520;   // размер полотна схемы, px
  var LABEL_W = U.labelW;           // ширина подписей в полях
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

  /* ---------- каркас: слева настройки, справа большая схема ---------- */
  var main = win.add("group");
  main.orientation = "row";
  main.alignChildren = "top";
  main.spacing = 12;

  var leftCol = main.add("group");
  leftCol.orientation = "column";
  leftCol.alignChildren = "fill";
  leftCol.spacing = 10;

  /* ---------- язык ---------- */
  var pLang = leftCol.add("panel", undefined, U.panelLang);
  pLang.orientation = "column"; pLang.alignChildren = "left";
  pLang.margins = 12; pLang.spacing = 6;

  function langRow(label, names) {
    var g = pLang.add("group");
    g.orientation = "row";
    var s = g.add("statictext", undefined, label);
    s.preferredSize.width = LABEL_W;
    var dd = g.add("dropdownlist", undefined, []);
    dd.preferredSize.width = DD_W;
    var i;
    for (i = 0; i < LANGS.length; i++) dd.add("item", names[LANGS[i]]);
    return dd;
  }

  var ddLangUi  = langRow(U.langUi,  LANG_UI_NAMES);
  var ddLangCal = langRow(U.langCal, LANG_CAL_NAMES);

  /* ---------- шаблон ---------- */
  var pT = leftCol.add("panel", undefined, U.panelTpl);
  pT.orientation = "column"; pT.alignChildren = "left";
  pT.margins = 12; pT.spacing = 6;

  var radios = {}, ti;
  for (ti = 0; ti < TEMPLATES.length; ti++) {
    radios[TEMPLATES[ti]] = pT.add("radiobutton", undefined, U.tpl[TEMPLATES[ti]]);
  }
  var hintT = pT.add("statictext", undefined, U.tplHint);

  /* ---------- два столбца настроек ---------- */
  var cols = leftCol.add("group");
  cols.orientation = "row"; cols.alignChildren = "fill"; cols.spacing = 10;

  var colA = cols.add("group"); colA.orientation = "column"; colA.alignChildren = "fill";
  var colB = cols.add("group"); colB.orientation = "column"; colB.alignChildren = "fill";

  /* ---------- схема страницы справа ---------- */
  var pPrev = main.add("panel", undefined, U.panelPrev);
  pPrev.orientation = "column"; pPrev.alignChildren = "left";
  pPrev.margins = 12; pPrev.spacing = 6;

  var gPrevTop = pPrev.add("group");
  gPrevTop.orientation = "row";
  gPrevTop.add("statictext", undefined, U.fPrevMonth);
  var ddPrevMonth = gPrevTop.add("dropdownlist", undefined, U.months);
  ddPrevMonth.preferredSize.width = 150;

  // group, а не panel: в panel системная рамка перекрывает onDraw и
  // перерисовка по событию не срабатывает
  var prev = pPrev.add("group");
  prev.preferredSize = [PREV_W, PREV_H];
  prev.minimumSize   = [PREV_W, PREV_H];

  var stMetrics = pPrev.add("statictext", undefined, "", { multiline: true });
  stMetrics.preferredSize = [PREV_W, 52];

  /* ---------- конструкторы полей ---------- */

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
    e.labelText = s;                 // чтобы менять подпись в зависимости от шаблона
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
    dd.preferredSize.width = w || DD_W;
    dd.labelText = s;
    return dd;
  }

  /* --- документ --- */
  var pD = panelIn(colA, U.panelDoc);
  var eYear = field(pD, U.fYear, 70);
  var ddFmt = dropdown(pD, U.fFormat, U.pagePresets);

  var ePage = fieldPair(pD, U.fPageWH, "×");
  var eMar1 = fieldPair(pD, U.fMarTB, "/");
  var eMar2 = fieldPair(pD, U.fMarLR, "/");

  var bFit = pD.add("button", undefined, U.btnFit);
  bFit.helpTip = U.btnFitTip;

  /* --- раскладка --- */
  var pL = panelIn(colA, U.panelLayout);
  var eRatio = field(pL, U.fRatio);
  var eTop   = field(pL, U.fTop);
  var ddAnc  = dropdown(pL, U.fAnchor, U.anchor);
  var eGapMM = field(pL, U.fGapSide);
  var cbSix  = pL.add("checkbox", undefined, U.cbSix);
  var cbAdj  = pL.add("checkbox", undefined, U.cbAdj);
  var cbMini = pL.add("checkbox", undefined, U.cbMini);

  /* --- типографика --- */
  var pF = panelIn(colB, U.panelType);
  // массив сразу в конструктор: ddFam.add("item", …) в цикле на тысячу
  // шрифтов заметно медленнее
  var ddFam = dropdown(pF, U.fFont, [U.fontAuto].concat(familyList()));

  var gSty = pF.add("group"); gSty.orientation = "row";
  var sSty = gSty.add("statictext", undefined, U.fStyles);
  sSty.preferredSize.width = LABEL_W;
  var ddReg  = gSty.add("dropdownlist", undefined, []); ddReg.preferredSize.width = 92;
  var ddBold = gSty.add("dropdownlist", undefined, []); ddBold.preferredSize.width = 92;

  /* Шрифт иероглифов — только для китайской сетки. Опознанные CJK-семьи
     идут первыми: искать нужное среди тысячи установленных шрифтов,
     отсортированных по алфавиту, — мучение. */
  var ddCjk = null, ddCjkReg = null, ddCjkBold = null;
  if (isZhCal) {
    ddCjk = dropdown(pF, U.fFontCjk, []);
    (function () {
      var all = familyList(), a = [], b = [], i;
      for (i = 0; i < all.length; i++) (looksCJK(all[i]) ? a : b).push(all[i]);
      ddCjk.add("item", U.fontAuto);
      for (i = 0; i < a.length; i++) ddCjk.add("item", a[i]);
      if (a.length && b.length) ddCjk.add("separator");
      for (i = 0; i < b.length; i++) ddCjk.add("item", b[i]);
    })();

    var gCSty = pF.add("group"); gCSty.orientation = "row";
    var sCSty = gCSty.add("statictext", undefined, U.fStyles);
    sCSty.preferredSize.width = LABEL_W;
    ddCjkReg  = gCSty.add("dropdownlist", undefined, []);
    ddCjkReg.preferredSize.width = 92;
    ddCjkBold = gCSty.add("dropdownlist", undefined, []);
    ddCjkBold.preferredSize.width = 92;
  }

  var eTitle  = field(pF, U.fTitleSize);
  var eDay    = field(pF, U.fDaySize);
  var eCellH  = field(pF, U.fCellH);
  var eHeadUa = field(pF, fmt(U.fHeadLocal, U.calNames[state.calLang]));
  var eHeadEn = field(pF, U.fHeadEn);
  var eWeekNo = field(pF, U.fWeekNo);
  var cbAuto  = pF.add("checkbox", undefined, U.cbAuto);

  /* --- мини-календари --- */
  var pM = panelIn(colB, U.panelMini);
  var eMTitle = field(pM, U.fMiniTitle);
  var eMDay   = field(pM, U.fMiniDay);
  var eMCellH = field(pM, U.fMiniCellH);
  var eMHead  = field(pM, fmt(U.fMiniHead, C.daysShort.join(" ")));
  var eMGap   = field(pM, U.fMiniGap);
  var eMW     = field(pM, U.fMiniWOne);

  /* --- цвета --- */
  var pC = panelIn(colB, U.panelColors);
  var gRed = pC.add("group"); gRed.orientation = "row";
  var sRed = gRed.add("statictext", undefined, U.fRed);
  sRed.preferredSize.width = LABEL_W;
  var eC = gRed.add("edittext", undefined, ""); eC.preferredSize.width = 42;
  var eM = gRed.add("edittext", undefined, ""); eM.preferredSize.width = 42;
  var eY = gRed.add("edittext", undefined, ""); eY.preferredSize.width = 42;
  var eK = gRed.add("edittext", undefined, ""); eK.preferredSize.width = 42;

  var eGrey  = field(pC, U.fGrey);
  var eRTint = field(pC, U.fRedTint);

  /* ---------- кнопки ---------- */
  var gBtn = win.add("group");
  gBtn.orientation = "row";
  gBtn.alignment = "right";
  var bReset = gBtn.add("button", undefined, U.btnReset);
  gBtn.add("button", undefined, U.btnCancel, { name: "cancel" });
  var bOk = gBtn.add("button", undefined, U.btnOk, { name: "ok" });

  /* ---------- заполнение / считывание ---------- */

  var filling = false;

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
    pickStyle(ddR, AUTO[script].regular, curR);
    pickStyle(ddB, AUTO[script].bold,    curB);
  }

  /* Числовые поля из state. Вызывается и после зажатия в границы, чтобы в
     поле не оставалось значения, которое на самом деле не применено. */
  function syncNumericFields() {
    var L = state.layout, D = state.doc, Col = state.colors;

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

    eC.text = Col.redC; eM.text = Col.redM; eY.text = Col.redY; eK.text = Col.redK;
    eGrey.text = Col.grey; eRTint.text = Col.redTint;
  }

  function selectByText(dd, text) {
    var i;
    if (!text) return 0;
    for (i = 0; i < dd.items.length; i++)
      if (dd.items[i].text === text) return i;
    return 0;
  }

  function fillFromState() {
    filling = true;
    var D = state.doc, O = state.options, F = state.font, i, sel;

    ddLangUi.selection  = (state.uiLang  === "zh") ? 1 : 0;
    ddLangCal.selection = (state.calLang === "zh") ? 1 : 0;

    radios[state.template].value = true;
    syncNumericFields();

    var fmtIdx = PAGE_PRESETS.length - 1;
    for (i = 0; i < PAGE_PRESETS.length - 1; i++)
      if (PAGE_PRESETS[i].w === D.pageWidth && PAGE_PRESETS[i].h === D.pageHeight)
        fmtIdx = i;
    ddFmt.selection = fmtIdx;

    ddAnc.selection = (O.blockAnchor === "bottom") ? 1 : 0;

    cbSix.value  = O.fixedSixRows;
    cbAdj.value  = O.showAdjacentDays;
    cbMini.value = O.showMiniCalendars;

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

    // май — шестистрочный месяц, худший случай по высоте
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

    // тот же промежуток означает разное в разных шаблонах
    eGapMM.labelText.text = isBelow ? U.fGapBelow : U.fGapSide;
    eMW.labelText.text    = isBelow ? U.fMiniWOne : U.fMiniWCalc;
  }

  function readIntoState() {
    var L = state.layout, D = state.doc, O = state.options, Col = state.colors;
    var F = state.font, sc;

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

    Col.redC = numOf(eC, Col.redC, LIMITS.percent);
    Col.redM = numOf(eM, Col.redM, LIMITS.percent);
    Col.redY = numOf(eY, Col.redY, LIMITS.percent);
    Col.redK = numOf(eK, Col.redK, LIMITS.percent);
    Col.grey    = numOf(eGrey,  Col.grey,    LIMITS.percent);
    Col.redTint = numOf(eRTint, Col.redTint, LIMITS.percent);

    if (ddFam.selection && ddFam.selection.index > 0) {
      F.family  = ddFam.selection.text;
      F.regular = ddReg.selection  ? ddReg.selection.text  : "";
      F.bold    = ddBold.selection ? ddBold.selection.text : "";
    } else {
      F.family = ""; F.regular = ""; F.bold = "";
    }

    // при русской сетке списка нет — сохранённый выбор CJK не трогаем
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

      var txt = fmt(U.mLine1, (gridWidth() / 7).toFixed(1), L.cellH, L.daySize) +
                NL + fmt(U.mLine2, w.y.toFixed(1), limit.toFixed(0));

      if (v.errors.length)        txt += NL + U.mErr  + v.errors[0];
      else if (v.warnings.length) txt += NL + U.mWarn + v.warnings[0];

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

    // сперва гасим всю площадь — иначе прежняя схема просвечивает сквозь новую
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

      // лист
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

      // свободное место под изображение
      if (gc.titleY > D.marginTop + 3) {
        box(ox + S(D.marginLeft), oy + S(D.marginTop),
            S(pw - D.marginLeft - D.marginRight),
            S(gc.titleY - D.marginTop - 4), photo);
      }

      // название месяца
      box(ox + S(gc.gx), oy + S(gc.titleY + gc.thH * 0.25),
          S(gc.gw * 0.5), S(gc.thH * 0.55), ink);

      // заголовки дней (язык календаря)
      for (c = 0; c < 7; c++) {
        box(ox + S(gc.gx + c * gc.colW) + cw * 0.15,
            oy + S(gc.headUaY + gc.hUa * 0.32),
            cw * 0.7, S(gc.hUa * 0.34), c >= 5 ? redPale : inkPale);
      }

      // сетка чисел
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

      // заголовки дней (англ)
      for (c = 0; c < 7; c++) {
        box(ox + S(gc.gx + c * gc.colW) + cw * 0.2,
            oy + S(gc.headEnY + gc.hEn * 0.32),
            cw * 0.65, S(gc.hEn * 0.32), c >= 5 ? redPale : inkPale);
      }

      // мини-календари — с внутренней структурой
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

        // заголовок мини
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

        // линейка после номеров недель
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

  var rt;
  for (rt = 0; rt < TEMPLATES.length; rt++) {
    (function (t) {
      radios[t].onClick = function () {
        readIntoState();                        // не теряем только что введённое
        var keepDoc  = clone(state.doc),    keepFont = clone(state.font),
            keepCol  = clone(state.colors), keepYear = state.year,
            keepUi   = state.uiLang,        keepCal  = state.calLang;
        state = factoryState(t);
        state.doc = keepDoc; state.font = keepFont;
        state.colors = keepCol; state.year = keepYear;
        state.uiLang = keepUi; state.calLang = keepCal;
        // пресет рассчитан под A2 книжную; на другом листе подгоняем,
        // на A2 не трогаем, чтобы не затереть вручную выставленные поля
        if (keepDoc.pageWidth !== BASE.pageW || keepDoc.pageHeight !== BASE.pageH)
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

  ddFam.onChange = function () {
    if (filling) return;
    if (ddFam.selection && ddFam.selection.index > 0)
      fillStyleDropdowns(ddReg, ddBold, ddFam.selection.text, "latin",
                         state.font.regular, state.font.bold);
    else { ddReg.removeAll(); ddBold.removeAll(); }
  };

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
        keepCol = clone(state.colors), keepYear = state.year,
        keepUi  = state.uiLang,        keepCal  = state.calLang;
    state = factoryState(state.template);
    state.doc = keepDoc; state.font = keepFont;     // формат листа, шрифт и
    state.colors = keepCol; state.year = keepYear;  // цвет — не часть шаблона
    state.uiLang = keepUi; state.calLang = keepCal;
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
    // русский диалог, но иероглифы в нём всё равно есть — точечно
    cjkUi(ddLangUi); cjkUi(ddLangCal);    // 中文 в списке языков
    if (isZhCal) {
      cjkUi(eMHead.labelText);            // «Кегль 一 二 三 …»
      cjkUi(ddCjk);                       // 微软雅黑 и прочие имена семейств
      cjkUi(ddCjkReg); cjkUi(ddCjkBold);  // 常规 / 粗体 вместо Regular / Bold
    }
  }

  // подсказка под радиокнопками — мельче остального; курсив только для
  // кириллицы, в китайском наборе наклонного начертания не бывает
  try {
    var hf = hintT.graphics.font;
    hintT.graphics.font = (state.uiLang === "zh")
      ? ScriptUI.newFont(hf.name, ScriptUI.FontStyle.REGULAR, hf.size - 1)
      : ScriptUI.newFont(hf.name, "italic", hf.size - 1);
  } catch (e) {}

  var code = win.show();
  if (code === 1) return "ok";
  if (code === 3) return "relang";
  return "cancel";
}

/* =====================================================================
   10. ЗАПУСК
   ===================================================================== */

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
               UndoModes.ENTIRE_SCRIPT, fmt(U.undo, state.year));

  if (buildError) {
    alert(U.buildFailHead + NL + NL + buildError, U.buildFailTitle);
  } else {
    alert(fmt(U.doneBody, state.year, state.doc.pageWidth, state.doc.pageHeight,
              U.tpl[state.template]) +
          (state.calLang === "zh" ? U.doneCjkNote : ""));
  }
}

})();
