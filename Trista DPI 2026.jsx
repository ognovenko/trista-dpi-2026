// Пакетная обработка растровых изображений в документах Adobe InDesign
//
/**
TristaDPI 2026. Версия 0.9.2
Форк скрипта Trista DPI для Adobe InDesign 2026. 
Оригинал — Денис Либит (2008, https://github.com/bteapot/Trista-DPI).
Оптимизация 2014 года — Евгений Борисов.
Vibecoding Сергей Огновенко, ognovenko@gmail.com. Спасибо Алисе AI и DeepSeek. 
Форк исправляет нестабильность на больших документах (поиск спреда вынесен
из горячего цикла, documentOfGraphic защищён от зацикливания), ограничивает
обработку активным документом и добавляет: панель Images с выбором изображений
и метками статуса — внедрённые, битмапы, дубли, картинки на полях; необновлённые
картинки помечаются жёлтым треугольником, как в палитре Links, и по умолчанию
не обрабатываются (отметьте вручную — обработаются); заблокированные файлы
и файлы в заблокированных папках помечаются и не обрабатываются; статусная
строка под списком; три режима изменения форматов; постобработку (Merge layers →
Convert to working space → Unsharp Mask); развнедрение встроенных и вставленных
изображений в общий цикл обработки; отдельные файлы для дублей изображений
с разными масштабами; указание диапазона страниц с метками как в диалоге печати
InDesign. Конвертация цвета выполняется в рабочее пространство Photoshop
(CMYK или RGB); встраивание профиля и теги изображений полностью отданы
настройкам Photoshop и InDesign; оригиналы изображений всегда сохраняются
на диске. Удалены анахронизмы прежних лет. Киллер-фича масштабирования Bitmaps
сохранена навечно :)

Скрипт протестирован на InDesign + Photoshop 2022/2026.
*/
    
#target indesign

// Локализованные сообщения
const kDefaultLocale = "en";
const kLocalesList = [
	["ru", "Русский"],
	["en", "English"]];

const msgCheckingOpenedDocumentsStatus = { ru: "ПРОВЕРКА ОТКРЫТЫХ ДОКУМЕНТОВ", en: "CHECKING OPENED DOCUMENTS" };
const msgRestoringBackup = { ru: "ВОССТАНОВЛЕНИЕ РЕЗЕРВНОЙ КОПИИ", en: "RESTORING BACKUP" };
const msgCheckingImagesStatus = { ru: "ПРОВЕРКА КАРТИНОК", en: "CHECKING IMAGES" };
const msgBackupStatus = { ru: "РЕЗЕРВНОЕ КОПИРОВАНИЕ", en: "BACKUP" };
const msgDeleteOldBackupsStatus = { ru: "УДАЛЕНИЕ СТАРЫХ РЕЗЕРВНЫХ КОПИЙ", en: "DELETING OLD BACKUPS" };
const msgUnembeddingImagesStatus = { ru: "РАЗВНЕДРЕНИЕ ИЗОБРАЖЕНИЙ", en: "UNEMBEDDING IMAGES" };
const msgProcessingImagesStatus = { ru: "ОБРАБОТКА ИЗОБРАЖЕНИЙ", en: "PROCESSING IMAGES" };
const msgRelinkingImagesStatus = { ru: "ПЕРЕЛИНКОВКА ИЗОБРАЖЕНИЙ", en: "UPDATING IMAGES" };
const msgSavingDocumentsStatus = { ru: "СОХРАНЕНИЕ ДОКУМЕНТОВ", en: "SAVING DOCUMENTS" };
const msgPreferencesError = { ru: "Ошибка при чтении настроек.\nТо-есть файл-то с настройками есть, да вот открыть его не получается.\n\nВыполнение скрипта прекращаем.", en: "Error reading preferences file.\nFile exists, but can't be opened.\n\nTerminating execution." };
const msgExecution = { ru: "Выполнение", en: "Execution" };
const msgOK = { ru: "OK", en: "OK" };
const msgCancel = { ru: "Отмена", en: "Cancel" };
const msgNoDocumentsOpen = { ru: "Не открыт ни один документ.\nДля работы скрипта необходимо, чтобы были открыты один или несколько документов.\n\nМожно тихо-спокойно прекратить работу скрипта, а можно восстановить ранее сделанную резервную копию.", en: "No documents opened.\nOne or more documents should be opened to proceed.\n\nIt is possible to terminate script now, or to restore previous backup." };
const msgChooseBackupFolderToRestoreFrom = { ru: "Выберите папку, из которой будем восстанавливать резервную копию.", en: "Choose backup folder to restore from" };
const msgLogFileOpenError = { ru: "Ошибка при открытии log-файла этой резервной копии.\nУбедитесь, что выбранная папка содержит ранее сделанную резервную копию и попробуйте ещё раз.", en: "Error opening log-file.\nEnsure that selected folder contains previously made backup and try again." };
const msgLogFileStructureError = { ru: "Выбранная резервная копия не была завершена.\nИз соображений безопасности автоматическое восстановление этой резервной копии проводится не будет. Лучше ручками.", en: "Selected backup was not completed correctly.\nAutomatic recovery of this backup will not be performed for security reasons. Try to do it manually." };
const msgReplaceFilesWarning = { ru: "Файлы резервной копии будут восстановлены по указанным ниже адресам.\n\nФайлы, находящиеся там в данный момент, будут необратимо заменены.\n\nПродолжить?", en: "Files from selected backup will be restored to URLs listed below.\n\nFiles that resides there now will be replaced.\n\nContinue?" };
const msgErrorRestoringBackupFile = { ru: "Ошибка при восстановлении файла.\n%1\n\nПроверьте права доступа, свободное место и т.п.", en: "Error restoring file.\n%1\n\nCheck permissions, free space, etc." };
const msgErrorOpeningBackupDocument = { ru: "Ошибка при открытии документа из восстановленной резервной копии.\nЭто может быть связано с тем, что документ был создан в более новой версии InDesign.", en: "Error opening restored document.\n.It possibly was created by newer version of InDesign." };
const msgRestorationDone = { ru: "Резервная копия восстановлена.\nВосстановленный документ открыт в InDesign.", en: "Backup restored.\nRestored document are opened in Indesign." };
const msgConfirmDocumentSave = { ru: "Документ %1 изменён с момента последнего сохранения.\nЧтобы документ можно было обработать, его необходимо сохранить.\n\nСохранить?", en: "Document %1 was changed since last save.\nThis document needs be saved to be processed. Save document?" };
const msgConfirmOutdatedImages = { ru: "В открытых документах есть необновлённые изображения.\n%1.\n\nОни попадут в список без отметки на обработку.\nВсё равно продолжить?", en: "There are outdated images in opened documents.\n%1\n\nThey will appear in the list without being selected for processing.\nContinue anyway?" };
const msgPreferences = { ru: "Параметры", en: "Preferences" };
const msgAdditionalParameters = { ru: "Дополнительные параметры", en: "Additional parameters" };
const msgProcessEmbedded = { ru: "Развнедрять и обрабатывать встроенные картинки", en: "Unembed and process embedded images" };
const msgProcessBitmaps = { ru: "Обрабатывать Bitmap", en: "Process Bitmaps" };
const msgLeaveImagesOpen = { ru: "Оставлять картинки открытыми в Фотошопе", en: "Leave images opened in Photoshop" };
const msgFormatOfImages = { ru: "Изменение форматов", en: "Changing formats" };
const msgChangeFormatOfNone = { ru: "Обрабатывать только файлы TIFF и PSD", en: "Process only TIFF and PSD" };
const msgChangeFormatOfWrong = { ru: "Обрабатывать только JPEG, PNG, WebP и т.п.", en: "Process only JPEG, PNG, WebP, etc." };
const msgChangeFormatOfAll = { ru: "Изменять формат всех файлов на", en: "Change the format of All files to" };
const msgProcessPhotoshopEPS = { ru: "Обрабатывать Photoshop EPS", en: "Process Photoshop EPS" };
const msgSeparateDuplicates = { ru: "Создавать отдельные файлы для дублей", en: "Create separate files for duplicates" };
const msgChangeResolution = { ru: "Изменять разрешение (DPI)", en: "Change resolution (DPI)" };
const msgColorAndGrayscale = { ru: "Color и Grayscale:", en: "Color and Grayscale:" };
const msgTo = { ru: " до:", en: " to:" };
const msgDelta = { ru: "∆:", en: "∆:" };
const msgBitmap = { ru: "Bitmap:", en: "Bitmap:" };
const msgMethod = { ru: "Метод:", en: "Method:" };
const msgScope = { ru: "Область действия", en: "Scope" };
const msgProcessOffBleedImages = { ru: "Обрабатывать картинки на полях", en: "Process off-bleed images" };
const msgBackup = { ru: "Резервное копирование", en: "Backup" };
const msgDoBackup = { ru: "Делать резервную копию", en: "Do backup" };
const msgChoose = { ru: "Выбрать", en: "Choose" };
const msgDeleteOldBackups = { ru: "Удалять резервные копии старше месяца", en: "Delete backups created more than month ago" };
const msgWarning = { ru: "Предупреждение", en: "Warning" };
const msgMultipleEntriesDescription = { ru: "Выбранные картинки встречаются в открытых документах несколько раз.\n\nМожно обработать только выбранные в документе картинки, проигнорировав остальные вхождения, а можно и учесть их при обработке.", en: "Selected images are placed more than once in opened documents.\n\nIt is possible to process only images, selected in document, by ignoring other entries, or to process all instances." };
const msgErrorSavingPreferences = { ru: "Ошибка при сохранении настроек.\nВообще такого не должно было случиться, поэтому на всякий случай дальнейшее выполнение скрипта отменяется.", en: "Error saving preferences.\nIn general, this should not happen, so just in case the further execution of the script is canceled." };
const msgEmbeddedImage = { ru: "<внедрённая картинка>", en: "<embedded image>" };
const msgNoImagesToProcess = { ru: "Нет картинок, нуждающихся в обработке.\nПоздравляю!", en: "There is no images to process.\nCongratulations!" };
const msgErrorDeletingBackupFolder = { ru: "Ошибка при удалении элемента резервной копии:\n%1", en: "Error deleting backup element:\n%1" };
const msgBackupsSkipped = { ru: "Эти папки похожи на старые резервные копии, но не содержат валидного backup.log — пропущены, не удалялись:\n%1", en: "These folders look like old backups but contain no valid backup.log — skipped, not deleted:\n%1" };
const msgErrorCreatingBackupFolder = { ru: "Ошибка при создании папки резервных копий.\nПроверьте правильность пути, слэш на конце, права доступа и т.п.", en: "Error creating backup folder.\nCheck path, trailing slash, permissions, etc." };
const msgErrorCopyingFile = { ru: "Ошибка при резервном копировании файла.\n%1\n\nПроверьте права доступа, свободное место и т.п.", en: "Error copying file.\n%1\n\nCheck permissions, free space, etc." };
const msgErrorCreatingUnembeddedFolder = { ru: "Ошибка при создании папки развнедрённых картинок.\n%1\n\nПроверьте права доступа, свободное место и т.п.", en: "Error creating folder for unembedded images.\n%1\n\nCheck permissions, free space, etc." };
const msgErrorUnembeddingImage = { ru: "Ошибка при развнедрении картинки.\n%1\n\nПроверьте права доступа, свободное место и т.п.", en: "Error unembedding image.\n%1\n\nCheck permissions, free space, etc." };
const msgPhotoshopNotInstalled = { ru: "Не найдено ни одной версии Фотошопа, способной общаться с этой версией ИнДизайна через BridgeTalk.\nЭто лечится только установкой Фотошопа из той-же версии CS, что и ИнДизайн.", en: "No Photoshop version that able to communicate with this version of InDesign through BridgeTalk found.\nThat can be corrected by installing Photoshop of the same CS version as InDesign." };
const msgPhotoshopTimeout = { ru: "Фотошоп не отвечает на запросы.\nВозможно, он там чем-то занят и всё-таки скоро освободится.\n\nПодождать ещё?", en: "Photoshop is not responding.\nIt's possibly very busy right now, but will unfreeze soon.\n\nWait a little bit more?" };
const msgErrorProcessingImage = { ru: "Ошибка при обработке изображения\n%1\n\n%2", en: "Error processing image\n%1\n\n%2" };
const msgErrorCreatingCopy = { ru: "Ошибка при создании копии изображения (масштаб %1).\nОсновной файл не обрабатывался.", en: "Error creating image copy (scale %1).\nThe main file was not processed." };
const msgImagesToProcess = { ru: "Изображения", en: "Images" };
const msgShowImages = { ru: "Показывать и выбирать изображения для обработки", en: "Show and select images to process" };
const msgPostprocessing = { ru: "Постобработка", en: "Postprocessing" };
const msgMergeVisible = { ru: "Свести слои", en: "Merge layers" };
const msgUnsharpMask = { ru: "Unsharp Mask", en: "Unsharp Mask" };
const msgAmount = { ru: "Amount:", en: "Amount:" };
const msgRadius = { ru: "Radius:", en: "Radius:" };
const msgThreshold = { ru: "Threshold:", en: "Threshold:" };
const msgColorConversion = { ru: "Конвертировать в рабочее пространство", en: "Convert to working space" };
const msgConversionTargetMissing = { ru: "Рабочее пространство не назначено\n(«Adobe InDesign Default» в настройках цвета).\n\nНазначьте профиль в Edit > Color Settings и повторите прогон.", en: "Working space is not assigned\n(\"Adobe InDesign Default\" in color settings).\n\nAssign a profile in Edit > Color Settings and run again." };
const msgConvertGrayscale = { ru: "Включить Grayscale в конвертацию", en: "Include Grayscale in convert process" };
const msgPageRangeUnknown = { ru: "В диапазоне страниц есть нераспознанные метки: %1.\nОни будут пропущены. Продолжить?", en: "Unrecognized page labels in the page range: %1.\nThey will be skipped. Continue?" };
const msgLocked = { ru: "заблокировано", en: "locked" };
const msgOutdated = { ru: "устарело", en: "outdated" };
const msgNoImages = { ru: "Нет изображений", en: "No images" };
const msgOf = { ru: " из ", en: " of " };
const msgSelected = { ru: " выбрано", en: " selected" };
const msgToProcess = { ru: " к обработке", en: " to process" };
const msgImage_1 = { ru: " изображение", en: " image" };
const msgImage_2 = { ru: " изображения", en: " images" };
const msgImage_5 = { ru: " изображений", en: " images" };
const msgSelImage_1 = { ru: " выбранное изображение", en: " selected image" };
const msgSelImage_2 = { ru: " выбранных изображения", en: " selected images" };
const msgSelImage_5 = { ru: " выбранных изображений", en: " selected images" };
const msgOnPages = { ru: " на ", en: " on " };
const msgPage = { ru: " стр.", en: " pages" };

// Объект-словарь
function dictionary() {}

// Глобальные переменные
var appVersion;
var statusWindow;
var statusWindowPhase;
var statusWindowObject;
var statusWindowGauge;
var preferences = {};
var preferencesFileName;
var tempFolder;
var smallFont;
var headerColor = [0.1, 0.1, 0.1];
var documents = new dictionary();
var documentSelection = new dictionary();
var graphics = new dictionary();
var selectedGraphics = new dictionary();
var folders = new dictionary();
var activeDocument;
var pageRegistry = [];
var pageRegistryBuilt = false;
var pageRangeCacheText = null;
var pageRangeCacheResult = null;
var pageRangeUnknown = {};
var flagStopExecution = false;
var flagRestart;
var flagOldBackupsDeleted = false;

var conversionTargetName = "";

// Константы
const kPrefsLocale = "locale";
const kPrefsProcessEmbedded = "processEmbedded";
const kPrefsShowList = "showList";
const kPrefsProcessBitmaps = "processBitmaps";
const kPrefsLeaveGraphicsOpen = "leaveGraphicsOpen";
const kPrefsChangeFormatOf = "changeFormat";
const kPrefsChangeFormatOfNone = "changeFormatOfNone";
const kPrefsChangeFormatOfWrong = "changeFormatOfWrong";
const kPrefsChangeFormatOfAll = "changeFormatOfAll";
const kPrefsChangeTargetFormat = "changeTargetFormat";
const kPrefsProcessPhotoshopEPS = "processPhotoshopEPS";
const kPrefsScope = "scope";
const kPrefsIncludePasteboard = "includePasteboard";
const kPrefsColorTargetDPI = "colorTargetDPI";
const kPrefsColorDownsample = "colorDownsample";
const kPrefsColorUpsample = "colorUpsample";
const kPrefsColorDelta = "colorDelta";
const kPrefsBitmapTargetDPI = "bitmapTargetDPI";
const kPrefsBitmapDownsample = "bitmapDownsample";
const kPrefsBitmapUpsample = "bitmapUpsample";
const kPrefsBitmapDelta = "bitmapDelta";
const kPrefsResampleMethod = "resampleMethod";
const kPrefsBackup = "backup";
const kPrefsBackupFolder = "backupFolder";
const kPrefsDeleteOldBackups = "deleteOldBackups";
const kPrefsColorConversion = "colorConversion";
const kPrefsConversionTarget = "conversionTarget";
const kPrefsMergeVisible = "mergeVisible";
const kPrefsUnsharpMask = "unsharpMask";
const kPrefsUnsharpAmount = "unsharpAmount";
const kPrefsUnsharpRadius = "unsharpRadius";
const kPrefsUnsharpThreshold = "unsharpThreshold";
const kPrefsPageRange = "pageRange";
const kPrefsConvertGrayscale = "convertGrayscale";
const kPrefsSeparateDuplicates = "separateDuplicates";

const kDocumentsObject = "documentsObject";
const kDocumentsName = "documentsName";
const kDocumentsProcessable = "documentsProcessable";
const kDocumentsModified = "documentsModified";
const kDocumentsFileReadonly = "documentsFileReadonly";
const kDocumentsLinksTotal = "documentsLinksTotal";
const kDocumentsLinksNormal = "documentsLinksNormal";
const kDocumentsLinksOutOfDate = "documentsLinksOutOfDate";
const kDocumentsLinksMissing = "documentsLinksMissing";
const kDocumentsLinksEmbedded = "documentsLinksEmbedded";
const kDocumentsBackupList = "documentsBackupList";

const kGraphicsName = "graphicsName";
const kGraphicsNewFilePath = "graphicsNewFilePath";
const kGraphicsUnembedPath = "graphicsUnembedPath";
const kGraphicsFileReadonly = "graphicsFileReadonly";
const kGraphicsFolderReadonly = "graphicsFolderReadonly";
const kGraphicsDoRelink = "graphicsDoRelink";
const kGraphicsOutdated = "graphicsOutdated";
const kGraphicsFormat = "graphicsFormat";
const kGraphicsResample = "graphicsResample";
const kGraphicsPhotoshopEPS = "graphicsPhotoshopEPS";
const kGraphicsBitmap = "graphicsBitmap";
const kGraphicsActualDPI = "graphicsActualDPI";
const kGraphicsLowestDPI = "graphicsLowestDPI";
const kGraphicsMaxPercentage = "graphicsMaxPercentage";
const kGraphicsHasClippingPath = "graphicsHasClippingPath";
const kGraphicsOnMaster = "graphicsOnMaster";
const kGraphicsPasted = "graphicsPasted";
const kGraphicsEmbedded = "graphicsEmbedded";
const kGraphicsWithinBleeds = "graphicsWithinBleeds";
const kGraphicsObjectList = "graphicsObjectList";
const kGraphicsObject = "graphicsObject";
const kGraphicsParentDocument = "graphicsParentDocument";
const kGraphicsParentPage = "graphicsParentPage";
const kGraphicsObjectHScale = "graphicsObjectHScale";
const kGraphicsObjectVScale = "graphicsObjectVScale";
const kGraphicsCopyClasses = "graphicsCopyClasses";
const kGraphicsCopyClass = "graphicsCopyClass";
const kGraphicsCopyPath = "graphicsCopyPath";

const kListItemObject = "listItemObject";

const kLogFileName = "backup.log";
const kLogFileEND = "END";
const kLogFileERR = "ERR";
const kUnembedFilePrefix = "unembedded_";

// Списки
const kResampleAutomatic = 0;
const kResampleBicubic = 1;
const kResampleSmootherSharper = 2;
const kResampleOptions = [
    [kResampleAutomatic, "Automatic"],
    [kResampleBicubic, "Bicubic"],
    [kResampleSmootherSharper, "Bicubic sharper/smoother"]
];

const kScopeActiveDoc = 0;
const kScopeSelectedPages = 1;
const kScopeSelectedImages = 2;
const kScopeOptions = [
    [kScopeActiveDoc, { ru: "Документ", en: "Document" }],
    [kScopeSelectedPages, { ru: "Выбранные страницы", en: "Selected pages" }],
    [kScopeSelectedImages, { ru: "Выбранные изображения", en: "Selected images" }]
];

const kChangeFormatToTIFF = 0;
const kChangeFormatToPSD = 2;
const kChangeFormatToOptions = [
    [kChangeFormatToTIFF, { ru: "TIFF", en: "TIFF" }],
    [kChangeFormatToPSD, { ru: "PSD", en: "PSD" }]
];

const kMultipleEntriesSingle = 0;
const kMultipleEntriesMultiple = 1;
const kMultipleEntriesOptions = [
    [kMultipleEntriesSingle, { ru: "Обработать только выбранные картинки", en: "Process only selected images" }],
    [kMultipleEntriesMultiple, { ru: "Обработать все картинки", en: "Process all images" }]
];

const kNoDocumentsOpenExit = 0;
const kNoDocumentsOpenRestoreBackup = 1;
const kNoDocumentsOpenOptions = [
    [kNoDocumentsOpenExit, { ru: "Завершить работу скрипта", en: "Terminate script" }],
    [kNoDocumentsOpenRestoreBackup, { ru: "Восстановить резервную копию", en: "Restore backup" }]
];


const kStatusPanelWidth = 300;
const kDialogPanelWidth = 400;
const kServiceDialogSize = [400, 200];
const kDialogSubPanelMargins = [14, 14, 10, 10];
const kDialogSubControlMargins = [18, 0, 0, 0];
const kDialogSubControlWidth = 300;

var appSettingsPreserveBounds;
var appSettingsPreserveLocale;
var appSettingsUserInteractionLevel;
var appSettingsEnableRedraw;

// --- ГЛАВНЫЙ БЛОК ---
main();

function main() {
    preserveSettings();
    try {
        do { process() } while (flagRestart);
    } finally {
        restoreSettings();
    }
}

function process() {
    flagRestart = false;

    if (statusWindow == undefined) {
        statusWindow = new Window("palette", "Execution");
        statusWindow.orientation = "row";
        statusWindow.alignChildren = ["fill", "top"];
        smallFont = statusWindow.graphics.font = ScriptUI.newFont("dialog", "Regular", 10);

        var myDisplayZone = statusWindow.add("group");
        myDisplayZone.orientation = "column";
        myDisplayZone.minimumSize.width = kStatusPanelWidth;
        myDisplayZone.maximumSize.width = kStatusPanelWidth;
        myDisplayZone.alignChildren = ["fill", "top"];

        statusWindowPhase = myDisplayZone.add("statictext", undefined, "\u00A0");
        statusWindowPhase.minimumSize.height = 30;
        statusWindowPhase.alignment = ["fill", "top"];
        statusWindowPhase.justify = "left";
        statusWindowPhase.graphics.font = ScriptUI.newFont("dialog", "Bold", 12);
        statusWindowPhase.graphics.foregroundColor = statusWindowPhase.graphics.newPen(statusWindowPhase.graphics.PenType.SOLID_COLOR, headerColor, 1);

        statusWindowObject = myDisplayZone.add("statictext", undefined, "\u00A0");
        statusWindowObject.alignment = ["fill", "top"];
        statusWindowObject.justify = "left";
        statusWindowObject.graphics.font = smallFont;

        statusWindowGauge = myDisplayZone.add("progressbar", undefined, 0, 100);
        statusWindow.show();
    }

    if (!initialSettings()) return;

    statusWindow.text = localize(msgExecution);
    showStatus(localize(msgCheckingOpenedDocumentsStatus), "", 0, 1);

    $.gc();

    if (!restoreBackup()) return;
    if (!checkDocuments()) return;
    buildPageRegistry();
    if (!analyseGraphics()) return;
    if (!displayPreferences()) return;
    var _unknownList = [];
    for (var _uk in pageRangeUnknown) { _unknownList.push(_uk); }
    if (_unknownList.length > 0) {
        if (!confirm(localize(msgPageRangeUnknown, _unknownList.join(", ")))) return false;
    }
    if (!deleteOldBackups()) return;
    if (!backupImages()) return;
    if (!unembedImages()) return;
    if (!processImages()) return;
    if (!relinkImages()) return;
    if (!saveDocuments()) return;
}

function preserveSettings() {
    appSettingsPreserveBounds = app.imagePreferences.preserveBounds;
    appSettingsPreserveLocale = $.locale;
    app.imagePreferences.preserveBounds = true;
    appSettingsUserInteractionLevel = app.scriptPreferences.userInteractionLevel;
    appSettingsEnableRedraw = app.scriptPreferences.enableRedraw;
}

function restoreSettings() {
    $.locale = appSettingsPreserveLocale;
    app.imagePreferences.preserveBounds = appSettingsPreserveBounds;
    app.scriptPreferences.userInteractionLevel = appSettingsUserInteractionLevel;
    app.scriptPreferences.enableRedraw = appSettingsEnableRedraw;
}

function initialSettings() {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;
    app.scriptPreferences.enableRedraw = true;
    appVersion = Number(app.version.match(/^\d+/));
    $.localize = true;

    preferences[kPrefsLocale] = kDefaultLocale;
    for (var itm in kLocalesList) {
        if ($.locale.slice(0, 2) == kLocalesList[itm][0]) {
            preferences[kPrefsLocale] = $.locale.slice(0, 2);
            break;
        }
    }

    preferences[kPrefsProcessEmbedded] = false;
    preferences[kPrefsShowList] = true;
    preferences[kPrefsProcessBitmaps] = true;
    preferences[kPrefsLeaveGraphicsOpen] = true;
    preferences[kPrefsChangeFormatOf] = kPrefsChangeFormatOfAll;
    preferences[kPrefsChangeTargetFormat] = kChangeFormatToTIFF;
    preferences[kPrefsProcessPhotoshopEPS] = false;
    preferences[kPrefsScope] = kScopeActiveDoc;
    preferences[kPrefsIncludePasteboard] = false;
    preferences[kPrefsColorTargetDPI] = 300;
    preferences[kPrefsColorDownsample] = true;
    preferences[kPrefsColorUpsample] = false;
    preferences[kPrefsColorDelta] = 50;
    preferences[kPrefsBitmapTargetDPI] = 1200;
    preferences[kPrefsBitmapDownsample] = true;
    preferences[kPrefsBitmapUpsample] = false;
    preferences[kPrefsBitmapDelta] = 150;
    preferences[kPrefsResampleMethod] = kResampleAutomatic;
    preferences[kPrefsBackup] = true;
    preferences[kPrefsDeleteOldBackups] = false;
    preferences[kPrefsColorConversion] = false;
    preferences[kPrefsConvertGrayscale] = false;
    preferences[kPrefsConversionTarget] = "CMYK";
    preferences[kPrefsMergeVisible] = false;
    preferences[kPrefsUnsharpMask] = false;
    preferences[kPrefsUnsharpAmount] = 100;
    preferences[kPrefsUnsharpRadius] = 1;
    preferences[kPrefsUnsharpThreshold] = 0;
    preferences[kPrefsPageRange] = "";
    preferences[kPrefsSeparateDuplicates] = false;

    if ($.os.toLowerCase().indexOf("macintosh") != -1) {
        preferencesFileName = "~/Library/Preferences/ru.colorbox.trista-dpi.txt";
        preferences[kPrefsBackupFolder] = Folder.encode(Folder.myDocuments + "/Trista DPI backup/");
        tempFolder = Folder.temp + "/";
    } else if ($.os.toLowerCase().indexOf("windows") != -1) {
        preferencesFileName = Folder.userData + "/ru.colorbox.trista-dpi.txt";
        preferences[kPrefsBackupFolder] = Folder.myDocuments + "/Trista DPI backup/";
        tempFolder = Folder.temp + "/";
    }

    var preferencesFile = new File(preferencesFileName);
    if (preferencesFile.exists) {
        if (preferencesFile.open("r")) {
            var preferencesArray = preferencesFile.read(preferencesFile.length).split("\n");
            var preferenceRecord = [];
            for (var prf in preferencesArray) {
                preferenceRecord = preferencesArray[prf].split("\t");
                if (preferences.hasOwnProperty(preferenceRecord[0])) {
                    if (preferenceRecord[1] == "boolean") {
                        preferences[preferenceRecord[0]] = (preferenceRecord[2] == "true");
                    } else if (preferenceRecord[1] == "number") {
                        preferences[preferenceRecord[0]] = Number(preferenceRecord[2]);
                    } else {
                        preferences[preferenceRecord[0]] = preferenceRecord[2];
                    }
                }
            }
            preferencesFile.close();
        } else {
            alert(localize(msgPreferencesError));
            return false;
        }
    }
    if (preferences[kPrefsScope] < kScopeActiveDoc || preferences[kPrefsScope] > kScopeSelectedImages) {
        preferences[kPrefsScope] = kScopeActiveDoc;
    }
    $.locale = preferences[kPrefsLocale];
    return true;
}

function showStatus(myPhase, myObject, myGaugeCurrent, myGaugeMax) {
    if (!statusWindow.visible) statusWindow.show();
    if (myPhase != undefined) statusWindowPhase.text = myPhase;
    if (myObject != undefined) statusWindowObject.text = myObject;
    if (myGaugeCurrent != undefined) statusWindowGauge.value = myGaugeCurrent;
    if (myGaugeMax != undefined) statusWindowGauge.maxvalue = myGaugeMax;
}

function hideStatus() {
    statusWindowPhase.text = "";
    statusWindowObject.text = "";
    statusWindowGauge.value = 0;
    statusWindowGauge.maxvalue = 1;
    statusWindow.hide();
}

function restoreBackup() {
    if (app.documents.length > 0) return true;
    var decisionResult = askForDecision(msgWarning, msgNoDocumentsOpen, kNoDocumentsOpenOptions, kNoDocumentsOpenExit);
    if (decisionResult == kNoDocumentsOpenRestoreBackup) {
        var backupFolder = new Folder(preferences[kPrefsBackupFolder]);
        backupFolder = backupFolder.selectDlg(localize(msgChooseBackupFolderToRestoreFrom));
        if (backupFolder == null) return false;
        var logFile = new File(backupFolder.fullName + "/" + kLogFileName);
        if (!logFile.open("r")) { alert(localize(msgLogFileOpenError)); return false; }
        var logArray = logFile.read(logFile.length).split("\n");
        logFile.close();
        var log = new dictionary();
        var logRecord;
        for (var itm in logArray) {
            if (logArray[itm] != "") {
                logRecord = logArray[itm].split("\t");
                if (logRecord.length != 2) { alert(localize(msgLogFileStructureError)); return false; }
                log[logRecord[0]] = logRecord[1];
            }
        }
        if (log[kLogFileEND] != kLogFileEND) { alert(localize(msgLogFileStructureError)); return false; }
        delete log[kLogFileEND];

        var lastWarningDialog = new Window("dialog", localize(msgWarning));
        with (lastWarningDialog) {
            orientation = "column";
            alignChildren = ["fill", "top"];
            preferredSize = kServiceDialogSize;
            with (add("statictext", undefined, localize(msgReplaceFilesWarning), {multiline: true})) { alignment = "fill"; }
            var itemsList = add("listbox", undefined, undefined, {multiselect:true, numberOfColumns:1, showHeaders:false});
            with (itemsList) {
                alignment = ["fill", "fill"];
                maximumSize = [kServiceDialogSize[0] + 200 - kDialogSubPanelMargins[2] - kDialogSubPanelMargins[3], 350];
                minimumSize = [kServiceDialogSize[0] - kDialogSubPanelMargins[2] - kDialogSubPanelMargins[3], 350];
                for (var itm in log) { itemsList.add("item", File.decode(log[itm])); }
            }
            with (add("group")) {
                orientation = "row";
                alignChildren = ["right", "top"];
                margins = kDialogSubPanelMargins;
                add("button", undefined, localize(msgCancel), {name: "cancel"});
                add("button", undefined, localize(msgOK), {name: "ok"});                    
            }
        }
        if (lastWarningDialog.show() == 2) return false;

        showStatus(localize(msgRestoringBackup), "", 0, dictionaryLength(log));
        var sourceFile;
        for (var itm in log) {
            sourceFile = new File(backupFolder.fullName + "/" + File.decode(itm));
            showStatus(undefined, File.decode(sourceFile.name), statusWindowGauge.value + 1, undefined);
            if (!sourceFile.copy(log[itm])) { alert(localize(msgErrorRestoringBackupFile, File.decode(sourceFile.name))); return false; }
            if (flagStopExecution) return false;
        }
        showStatus(undefined, undefined, dictionaryLength(log), undefined);
        hideStatus();

        app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        var restoredDocument = null;
        var myOpenFailed = false;
        try {
            restoredDocument = app.open(new File(logArray[0].split("\t")[1]));
        } catch (e) {
            myOpenFailed = true;
        } finally {
            app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;
        }
        if (myOpenFailed) {
            alert(localize(msgErrorOpeningBackupDocument));
            return false;
        }

        showStatus(localize(msgRelinkingImagesStatus), "", 0, restoredDocument.links.length);
        var linkedFile;
        for (var lnk = 0; lnk < restoredDocument.links.length; lnk++) {
            linkedFile = new File(restoredDocument.links[lnk].filePath);
            showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
            for (var itm in log) {
                if (log[itm] == File.encode(linkedFile.fullName)) {
                    showStatus(undefined, File.decode(linkedFile.name), undefined, undefined);
                    restoredDocument.links[lnk].update();
                    break;
                }
            }
            if (flagStopExecution) return false;
        }
        showStatus(undefined, undefined, restoredDocument.links.length, undefined);
        hideStatus();
        restoredDocument.save();
        alert(localize(msgRestorationDone));
    }
    return false;
}

function checkDocuments() {
    var myOutdatedDocs = [];
    if (dictionaryLength(documents) > 0) return true;
    showStatus(localize(msgCheckingOpenedDocumentsStatus), "", 0, app.documents.length);
    activeDocument = documentID(app.activeDocument);
    for (var doc = 0; doc < app.documents.length; doc++) {
        var myDocument = app.documents[doc];
        if (documentID(myDocument) != activeDocument) continue;
        showStatus(undefined, myDocument.name, doc, undefined);
        if (myDocument.modified) {
            if (confirm(localize(msgConfirmDocumentSave, myDocument.name))) myDocument.save();
        }
        var myLinksNormal = 0;
        var myLinksOutOfDate = 0;
        var myLinksMissing = 0;
        var myLinksEmbedded = 0;
        var mylinksAll = myDocument.links;
        for (var lnk = 0; lnk < myDocument.links.length; lnk++) {
            try {
                if (mylinksAll[lnk].status == LinkStatus.NORMAL) {
                    myLinksNormal++;
                    continue;
                }
            } catch (err) { 
                continue; 
            }
            switch (myDocument.links[lnk].status) {
                case LinkStatus.LINK_OUT_OF_DATE: myLinksOutOfDate++; break;
                case LinkStatus.LINK_MISSING: myLinksMissing++; break;
                case LinkStatus.LINK_EMBEDDED: myLinksEmbedded++; break;
                default: break;
            }
        }
        var docID = documentID(myDocument);
        documents[docID] = {};
        documents[docID][kDocumentsName] = myDocument.name;
        documents[docID][kDocumentsObject] = myDocument;
        documents[docID][kDocumentsModified] = myDocument.modified;
        documents[docID][kDocumentsFileReadonly] = myDocument.readOnly;
        documents[docID][kDocumentsLinksTotal] = myDocument.links.length;
        documents[docID][kDocumentsLinksNormal] = myLinksNormal;
        documents[docID][kDocumentsLinksOutOfDate] = myLinksOutOfDate;
        documents[docID][kDocumentsLinksMissing] = myLinksMissing;
        documents[docID][kDocumentsLinksEmbedded] = myLinksEmbedded;
        documents[docID][kDocumentsProcessable] = (!documents[docID][kDocumentsModified]) && (!documents[docID][kDocumentsFileReadonly]) && (documents[docID][kDocumentsLinksOutOfDate] == 0);
        if ((!documents[docID][kDocumentsModified]) && (!documents[docID][kDocumentsFileReadonly]) && (documents[docID][kDocumentsLinksMissing] == 0) && (documents[docID][kDocumentsLinksOutOfDate] > 0)) { myOutdatedDocs.push(docID); }
        documents[docID][kDocumentsBackupList] = {};
        if (flagStopExecution) { break }
    }
    var myDocListString = "";
    for (var doc in documents) {
        if (documents[doc][kDocumentsLinksOutOfDate] > 0) {
            if (myDocListString.length > 0) { myDocListString += ", " + documents[doc][kDocumentsName]; }
            else { myDocListString = documents[doc][kDocumentsName]; }
        }
    }
    if (myDocListString.length > 0) {
        if (confirm(localize(msgConfirmOutdatedImages, myDocListString))) {
            for (var _od = 0; _od < myOutdatedDocs.length; _od++) { documents[myOutdatedDocs[_od]][kDocumentsProcessable] = true; }
        } else {
            return false;
        }
    }
    showStatus(undefined, undefined, app.documents.length, undefined);
    hideStatus();
    return !flagStopExecution;
}

function analyseGraphics() {
    function checkGraphic(myGraphic) {
        try { showStatus(undefined, myGraphic.itemLink.name, undefined, undefined); }
        catch (e) { showStatus(undefined, localize(msgEmbeddedImage), undefined, undefined); }

        function addFirstEntry(grc, name, isPhotoshopEPS) {
            graphics[grc] = new dictionary();
            graphics[grc][kGraphicsName] = name;
            graphics[grc][kGraphicsFormat] = graphicFormat(myGraphic);
            graphics[grc][kGraphicsResample] = false;
            graphics[grc][kGraphicsPhotoshopEPS] = isPhotoshopEPS;
            graphics[grc][kGraphicsBitmap] = isGraphicBitmap(myGraphic);
            graphics[grc][kGraphicsActualDPI] = actualPPI(myGraphic)[0];
            graphics[grc][kGraphicsHasClippingPath] = false;
            graphics[grc][kGraphicsOnMaster] = false;
            graphics[grc][kGraphicsPasted] = isGraphicPasted(myGraphic);
            graphics[grc][kGraphicsEmbedded] = isGraphicEmbedded(myGraphic);
            graphics[grc][kGraphicsOutdated] = false;
            graphics[grc][kGraphicsObjectList] = new dictionary();
            if (graphics[grc][kGraphicsPasted] || graphics[grc][kGraphicsEmbedded]) {
                graphics[grc][kGraphicsFileReadonly] = false;
                graphics[grc][kGraphicsFolderReadonly] = false;
            } else {
                var myFile = new File(myGraphic.itemLink.filePath);
                graphics[grc][kGraphicsFileReadonly] = myFile.readonly;
                graphics[grc][kGraphicsFolderReadonly] = isFolderReadOnly(myFile.parent);
            }
        }

        function addEntry(grc, name, isPhotoshopEPS) {
            if (!(grc in graphics)) { addFirstEntry(grc, name, isPhotoshopEPS); }
            var itm = myGraphic.id;
            var gr = new dictionary();
            gr[kGraphicsObject] = myGraphic;
            gr[kGraphicsParentDocument] = documentID(documentOfGraphic(myGraphic));
            gr[kGraphicsParentPage] = pageOfGraphic(myGraphic);
            gr[kGraphicsWithinBleeds] = isGraphicWithinBleeds(myGraphic);
            gr[kGraphicsLowestDPI] = lowestDPI(myGraphic);
            gr[kGraphicsMaxPercentage] = maxPercentage(myGraphic);
            gr[kGraphicsObjectHScale] = (myGraphic.absoluteFlip == Flip.HORIZONTAL ? -1 : 1) * myGraphic.absoluteHorizontalScale / 100;
            gr[kGraphicsObjectVScale] = (myGraphic.absoluteFlip == Flip.VERTICAL ? -1 : 1) * myGraphic.absoluteVerticalScale / 100;
            graphics[grc][kGraphicsObjectList][itm] = gr;
            if (hasClippingPath(myGraphic)) { graphics[grc][kGraphicsHasClippingPath] = true; }
            if (isGraphicOnMaster(myGraphic)) { graphics[grc][kGraphicsOnMaster] = true; }
        }

        if (isGraphicPasted(myGraphic)) {
            addEntry(localize(msgEmbeddedImage) + " " + myGraphic.id, "<" + myGraphic.id + ">");
        } else if (isGraphicEmbedded(myGraphic)) {
            addEntry(localize(msgEmbeddedImage) + " " + myGraphic.itemLink.filePath, myGraphic.itemLink.name);
        } else {
            var myDoProcess = true;
            var myIsPhotoshopEPS = false;
            var myLinkOutdated = (myGraphic.itemLink.status == LinkStatus.LINK_OUT_OF_DATE);
            if (myGraphic.itemLink.status != LinkStatus.NORMAL && !myLinkOutdated) myDoProcess = false;
            if (!isGraphicRaster(myGraphic)) {
                if (isGraphicPhotoshopEPS(myGraphic)) {
                    myIsPhotoshopEPS = true;
                } else {
                    myDoProcess = false;
                }
            }

            if (myDoProcess || myLinkOutdated) addEntry(myGraphic.itemLink.filePath, myGraphic.itemLink.name, myIsPhotoshopEPS);
            if (myLinkOutdated) { graphics[myGraphic.itemLink.filePath][kGraphicsOutdated] = true; }
        }
        showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
    }

    if (dictionaryLength(graphics) > 0) return true;
    showStatus(localize(msgCheckingImagesStatus), "", 0, 0);
    var totalImages = 0;
    for (var doc in documents) { totalImages += documents[doc][kDocumentsObject].allGraphics.length; }
    showStatus(undefined, undefined, 0, totalImages);
    for (var doc in documents) {
        if (doc != activeDocument) continue;
        if (documents[doc][kDocumentsProcessable]) {
            for (var grc = 0; grc < documents[doc][kDocumentsObject].allGraphics.length; grc++) {
                checkGraphic(documents[doc][kDocumentsObject].allGraphics[grc]);
                if (flagStopExecution) { break }
            }
            if (flagStopExecution) { break }
        }
    }
    function parseObject(obj) {
        if (obj.reflect.name == "Image") { documentSelection[obj.id] = true; return; }
        if (obj.hasOwnProperty("allPageItems")) {
            for (var sbj = 0; sbj < obj.allPageItems.length; sbj++) { parseObject(obj.allPageItems[sbj]); }
        }
        if (obj.hasOwnProperty("allGraphics")) {
            for (var sbj = 0; sbj < obj.allGraphics.length; sbj++) { parseObject(obj.allGraphics[sbj]); }
        }
        if (obj instanceof Array) {
            for (var sbj = 0; sbj < obj.length; sbj++) { parseObject(obj[sbj]); }
        }
    }
    if (documents[activeDocument][kDocumentsObject].selection != null) {
        parseObject(documents[activeDocument][kDocumentsObject].selection);
    }
    hideStatus();
    if (flagStopExecution) { return false }
    return true;
}

function displayPreferences() {
    for (var _doc in documents) {
        if (_doc != activeDocument) delete documents[_doc];
    }

    var preferencesDialog = new Window("dialog", "Trista DPI 2026");
    preferencesDialog.orientation = "column";
    preferencesDialog.alignChildren = ["fill", "fill"];
    var myFlagResample = false;
    var myLastListSignature = "";


    var myUpperGroup = preferencesDialog.add("group");
    myUpperGroup.orientation = "row";
    myUpperGroup.alignChildren = ["fill", "fill"];

    var myParametersGroup = myUpperGroup.add("group");
    myParametersGroup.orientation = "column";
    myParametersGroup.minimumSize.width = kDialogPanelWidth;
    myParametersGroup.alignChildren = ["fill", "top"];

    var myScopeGroup = myParametersGroup.add("panel", undefined, localize(msgScope));
    with (myScopeGroup) {
        orientation = "row";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["fill", "fill"];
        margins = kDialogSubPanelMargins;
    }
    var myScopeControlGroup = myScopeGroup.add("group");
    with (myScopeControlGroup) { orientation = "column"; alignChildren = ["fill", "fill"]; }
    var myScopeRadioGroup = myScopeControlGroup.add("group");
    with (myScopeRadioGroup) { orientation = "column"; alignChildren = ["fill", "top"]; }

    var myScopeButtons = [];
    var myPageRangeField = null;

    function myScopeButtonClicked() {
        for (var btn = 0; btn < myScopeButtons.length; btn++) {
            if (myScopeButtons[btn].value == true) {
                preferences[kPrefsScope] = btn;
                if (myPageRangeField) {
                    myPageRangeField.enabled = (preferences[kPrefsScope] == kScopeSelectedPages) &&
                                               documents[activeDocument][kDocumentsProcessable];
                }
                if (preferences[kPrefsScope] == kScopeSelectedPages && myPageRangeField) {
                    if (myPageRangeField.text == "") {
                        myPageRangeField.text = getDocumentPageRange(documents[activeDocument][kDocumentsObject]);
                        preferences[kPrefsPageRange] = myPageRangeField.text;
                    }
                }
                interfaceItemsChanged();
                return;
            }
        }
    }

    for (var btn = 0; btn < kScopeOptions.length; btn++) {
        (function(scopeIndex) {
            var myScopeRow = myScopeRadioGroup.add("group");
            myScopeRow.orientation = "row";
            myScopeRow.alignChildren = ["left", "center"];
            myScopeRow.spacing = 10;

            var myButton = myScopeRow.add("radiobutton", undefined, localize(kScopeOptions[scopeIndex][1]));
            myScopeButtons.push(myButton);

            var myScopeRestored = preferences[kPrefsScope];
            if (!documents[activeDocument][kDocumentsProcessable]) { myScopeRestored = kScopeActiveDoc; }
            if (dictionaryLength(documentSelection) > 0) { myScopeRestored = kScopeSelectedImages; }
            else if (myScopeRestored == kScopeSelectedImages) { myScopeRestored = kScopeActiveDoc; }
            myButton.value = (scopeIndex == myScopeRestored);

            switch (scopeIndex) {
                case kScopeActiveDoc: myButton.enabled = documents[activeDocument][kDocumentsProcessable]; break;
                case kScopeSelectedPages: myButton.enabled = documents[activeDocument][kDocumentsProcessable]; break;
                case kScopeSelectedImages: myButton.enabled = ((documents[activeDocument][kDocumentsProcessable]) && (dictionaryLength(documentSelection) > 0)); break;
            }

            myButton.onClick = function() {
                for (var k = 0; k < myScopeButtons.length; k++) {
                    if (k !== scopeIndex) myScopeButtons[k].value = false;
                }
                preferences[kPrefsScope] = scopeIndex;

                if (myPageRangeField) {
                    myPageRangeField.enabled = (preferences[kPrefsScope] == kScopeSelectedPages) &&
                                               documents[activeDocument][kDocumentsProcessable];
                }
                if (preferences[kPrefsScope] == kScopeSelectedPages && myPageRangeField) {
                    if (myPageRangeField.text == "") {
                        myPageRangeField.text = getDocumentPageRange(documents[activeDocument][kDocumentsObject]);
                        preferences[kPrefsPageRange] = myPageRangeField.text;
                    }
                }
                interfaceItemsChanged();
            };

            if (scopeIndex == kScopeSelectedPages) {
                myPageRangeField = myScopeRow.add("edittext", undefined, preferences[kPrefsPageRange]);
                myPageRangeField.characters = 15;
                myPageRangeField.enabled = (documents[activeDocument][kDocumentsProcessable]);
                myPageRangeField.onChanging = function() {
                    preferences[kPrefsPageRange] = myPageRangeField.text;
                    interfaceItemsChanged();
                }
            }
        })(btn);
    }

    with (myScopeControlGroup.add("group")) {
        orientation = "column";
        alignChildren = ["fill", "bottom"];
        margins = [0, 0, 0, 2];
        var myIncludePasteboard = add("checkbox", undefined, localize(msgProcessOffBleedImages));
        myIncludePasteboard.onClick = function() {
            preferences[kPrefsIncludePasteboard] = myIncludePasteboard.value;
            interfaceItemsChanged();
        }
        myIncludePasteboard.value = preferences[kPrefsIncludePasteboard];
    }

    var myFormatOfImagesGroup = myParametersGroup.add("panel", undefined, localize(msgFormatOfImages));
    with (myFormatOfImagesGroup) {
        orientation = "column";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["fill", "top"];
        margins = kDialogSubPanelMargins;

        var myChangeFormatOfGroup = add("group");
        with (myChangeFormatOfGroup) {
            orientation = "column";
            alignChildren = ["left", "top"];

            var myChangeFormatOfNoneButton = add("radiobutton", undefined, localize(msgChangeFormatOfNone));
            myChangeFormatOfNoneButton.onClick = function() {
                myChangeFormatOfWrongButton.value = false;
                myChangeFormatOfAllButton.value = false;
                preferences[kPrefsChangeFormatOf] = kPrefsChangeFormatOfNone;
                interfaceItemsChanged();
            }

            var myChangeFormatOfWrongButton = add("radiobutton", undefined, localize(msgChangeFormatOfWrong));
            myChangeFormatOfWrongButton.onClick = function() {
                myChangeFormatOfNoneButton.value = false;
                myChangeFormatOfAllButton.value = false;
                preferences[kPrefsChangeFormatOf] = kPrefsChangeFormatOfWrong;
                interfaceItemsChanged();
            }

            var myChangeFormatOfAllRow = add("group");
            with (myChangeFormatOfAllRow) {
                orientation = "row";
                alignChildren = ["left", "center"];
            }
            var myChangeFormatOfAllButton = myChangeFormatOfAllRow.add("radiobutton", undefined, localize(msgChangeFormatOfAll));
            myChangeFormatOfAllButton.onClick = function() {
                myChangeFormatOfNoneButton.value = false;
                myChangeFormatOfWrongButton.value = false;
                preferences[kPrefsChangeFormatOf] = kPrefsChangeFormatOfAll;
                interfaceItemsChanged();
            }
            var myChangeFormatToDropdown = myChangeFormatOfAllRow.add("dropdownlist");
            for (var itm = 0; itm < kChangeFormatToOptions.length; itm++) {
                var newListItem = myChangeFormatToDropdown.add("item", localize(kChangeFormatToOptions[itm][1]));
                newListItem[kListItemObject] = kChangeFormatToOptions[itm][0];
                if (newListItem[kListItemObject] == preferences[kPrefsChangeTargetFormat]) {
                    myChangeFormatToDropdown.selection = newListItem;
                }
            }
            myChangeFormatToDropdown.onChange = function () {
                preferences[kPrefsChangeTargetFormat] = myChangeFormatToDropdown.selection[kListItemObject];
                interfaceItemsChanged();
            }

            // Третья радио живёт в отдельной группе — соседей гасим вручную
            myChangeFormatOfNoneButton.value = (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfNone);
            myChangeFormatOfWrongButton.value = (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfWrong);
            myChangeFormatOfAllButton.value = (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfAll);
        }

        var myProcessBitmaps = add("checkbox", undefined, localize(msgProcessBitmaps));
        myProcessBitmaps.onClick = function() {
            preferences[kPrefsProcessBitmaps] = myProcessBitmaps.value;
            interfaceItemsChanged();
        }
        myProcessBitmaps.value = preferences[kPrefsProcessBitmaps];

        var myProcessPhotoshopEPS = add("checkbox", undefined, localize(msgProcessPhotoshopEPS));
        myProcessPhotoshopEPS.onClick = function() {
            preferences[kPrefsProcessPhotoshopEPS] = myProcessPhotoshopEPS.value;
            myLastListSignature = "";
            interfaceItemsChanged();
        }
        myProcessPhotoshopEPS.value = preferences[kPrefsProcessPhotoshopEPS];

        var myProcessEmbedded = add("checkbox", undefined, localize(msgProcessEmbedded));
        myProcessEmbedded.onClick = function() {
            preferences[kPrefsProcessEmbedded] = myProcessEmbedded.value;
            myLastListSignature = "";
            interfaceItemsChanged();
        }
        myProcessEmbedded.value = preferences[kPrefsProcessEmbedded];
    }

    var myChangeResolutionGroup = myParametersGroup.add("panel", undefined, localize(msgChangeResolution));
    with (myChangeResolutionGroup) {
        orientation = "column";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["left", "center"];
        margins = kDialogSubPanelMargins;

        var myColorAndGrayscaleGraphicsGroup = add("group");
        with (myColorAndGrayscaleGraphicsGroup) {
            orientation = "row";
            alignChildren = ["right", "center"];
            with (add("group")) {
                orientation = "row"; alignChildren = ["right", "center"]; minimumSize.width = kDialogPanelWidth / 3;
                with (add("statictext", undefined, localize(msgColorAndGrayscale))) { justify = "right"; }
            }
            with (add("group")) {
                orientation = "row"; alignChildren = ["left", "center"]; margins = [0, 3, 0, 0];
                var myColorUpsample = add("checkbox", undefined, "+");
                myColorUpsample.alignment = ["left", "center"];
                myColorUpsample.value = preferences[kPrefsColorUpsample];
                myColorUpsample.onClick = function() { preferences[kPrefsColorUpsample] = myColorUpsample.value; interfaceItemsChanged(); }
            }
            with (add("group")) {
                orientation = "row"; alignChildren = ["left", "center"]; margins = [0, 3, 0, 0];
                var myColorDownsample = add("checkbox", undefined, "-");
                myColorDownsample.alignment = ["left", "center"];
                myColorDownsample.value = preferences[kPrefsColorDownsample];
                myColorDownsample.onClick = function() { preferences[kPrefsColorDownsample] = myColorDownsample.value; interfaceItemsChanged(); }
            }
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; with (add("statictext", undefined, localize(msgTo))) { characters = 3; justify = "right"; } }
            with (add("group")) {
                orientation = "row"; alignChildren = ["left", "center"];
                var myColorTargetDPI = add("edittext", undefined, preferences[kPrefsColorTargetDPI]);
                myColorTargetDPI.characters = 6; myColorTargetDPI.justify = "right";
                myColorTargetDPI.onChanging = function() { preferences[kPrefsColorTargetDPI] = parseInt(myColorTargetDPI.text); filterGraphics(); }
            }
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; with (add("statictext", undefined, localize(msgDelta))) { characters = 3; justify = "right"; } }
            with (add("group")) {
                orientation = "row"; alignChildren = ["left", "center"];
                var myColorDelta = add("edittext", undefined, preferences[kPrefsColorDelta]);
                myColorDelta.characters = 6; myColorDelta.justify = "right";
                myColorDelta.onChanging = function() { preferences[kPrefsColorDelta] = parseInt(myColorDelta.text); filterGraphics(); }
            }
        }

        var myBitmapGraphicsGroup = add("group");
        with (myBitmapGraphicsGroup) {
            orientation = "row";
            alignChildren = ["right", "center"];
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; minimumSize.width = kDialogPanelWidth / 3; with (add("statictext", undefined, localize(msgBitmap))) { justify = "right"; } }
            with (add("group")) { 
                orientation = "row"; alignChildren = ["left", "center"]; margins = [0, 3, 0, 0];
                var myBitmapUpsample = add("checkbox", undefined, "+"); 
                myBitmapUpsample.alignment = ["left", "center"];
                myBitmapUpsample.value = preferences[kPrefsBitmapUpsample]; 
                myBitmapUpsample.onClick = function() { preferences[kPrefsBitmapUpsample] = myBitmapUpsample.value; interfaceItemsChanged(); } 
            }
            with (add("group")) { 
                orientation = "row"; alignChildren = ["left", "center"]; margins = [0, 3, 0, 0];
                var myBitmapDownsample = add("checkbox", undefined, "-"); 
                myBitmapDownsample.alignment = ["left", "center"];
                myBitmapDownsample.value = preferences[kPrefsBitmapDownsample]; 
                myBitmapDownsample.onClick = function() { preferences[kPrefsBitmapDownsample] = myBitmapDownsample.value; interfaceItemsChanged(); } 
            }
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; with (add("statictext", undefined, localize(msgTo))) { characters = 3; justify = "right"; } }
            with (add("group")) { orientation = "row"; alignChildren = ["left", "center"]; var myBitmapTargetDPI = add("edittext", undefined, preferences[kPrefsBitmapTargetDPI]); myBitmapTargetDPI.characters = 6; myBitmapTargetDPI.justify = "right"; myBitmapTargetDPI.onChanging = function() { preferences[kPrefsBitmapTargetDPI] = parseInt(myBitmapTargetDPI.text); filterGraphics(); } }
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; with (add("statictext", undefined, localize(msgDelta))) { characters = 3; justify = "right"; } }
            with (add("group")) { orientation = "row"; alignChildren = ["left", "center"]; var myBitmapDelta = add("edittext", undefined, preferences[kPrefsBitmapDelta]); myBitmapDelta.characters = 6; myBitmapDelta.justify = "right"; myBitmapDelta.onChanging = function() { preferences[kPrefsBitmapDelta] = parseInt(myBitmapDelta.text); filterGraphics(); } }
        }

        var myResampleMethodGroup = add("group");
        with (myResampleMethodGroup) {
            orientation = "row";
            alignChildren = ["right", "center"];
            with (add("group")) { orientation = "row"; alignChildren = ["right", "center"]; minimumSize.width = kDialogPanelWidth / 3; with (add("statictext", undefined, localize(msgMethod))) { justify = "right"; } }
            var myResampleDropdown = add("dropdownlist");
            for (var itm = 0; itm < kResampleOptions.length; itm++) {
                myResampleDropdown.add("item", kResampleOptions[itm][1]);
            }
            myResampleDropdown.onChange = function () {
                preferences[kPrefsResampleMethod] = myResampleDropdown.selection.index;
            }
            myResampleDropdown.selection = preferences[kPrefsResampleMethod];
        }
    }

    var myPostprocessingGroup = myParametersGroup.add("panel", undefined, localize(msgPostprocessing));
    with (myPostprocessingGroup) {
        orientation = "column";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["left", "center"];
        margins = kDialogSubPanelMargins;

        var myMergeVisibleCheckbox = add("checkbox", undefined, localize(msgMergeVisible));
        myMergeVisibleCheckbox.value = preferences[kPrefsMergeVisible];
        myMergeVisibleCheckbox.onClick = function() {
            preferences[kPrefsMergeVisible] = myMergeVisibleCheckbox.value;
            if (!myMergeVisibleCheckbox.value) {
                preferences[kPrefsUnsharpMask] = false;
                myUnsharpMaskCheckbox.value = false;
            }
            interfaceItemsChanged();
        }

        var myColorConversionGroup = add("group");
        with (myColorConversionGroup) {
            orientation = "row";
            alignChildren = ["left", "center"];

            var myColorConversionCheck = add("checkbox", undefined, localize(msgColorConversion));
            myColorConversionCheck.value = preferences[kPrefsColorConversion];

            var myProfileDropdown = add("dropdownlist");
            myProfileDropdown.enabled = preferences[kPrefsColorConversion];

            function refreshProfileDropdown() {
                myProfileDropdown.removeAll();
                var myTargets = ["CMYK", "RGB"];
                var selectedIndex = 0;
                for (var i = 0; i < myTargets.length; i++) {
                    var item = myProfileDropdown.add("item", myTargets[i]);
                    item[kListItemObject] = myTargets[i];
                    if (myTargets[i] == preferences[kPrefsConversionTarget]) selectedIndex = i;
                }
                myProfileDropdown.selection = myProfileDropdown.items[selectedIndex];
            }

            refreshProfileDropdown();

            myColorConversionCheck.onClick = function() {
                preferences[kPrefsColorConversion] = myColorConversionCheck.value;
                myProfileDropdown.enabled = preferences[kPrefsColorConversion];
                interfaceItemsChanged();
            }

            myProfileDropdown.onChange = function() {
                if (myProfileDropdown.selection != null) {
                    preferences[kPrefsConversionTarget] = myProfileDropdown.selection[kListItemObject];
                }
            }
        }

        var myConvertGrayscaleCheckbox = add("checkbox", undefined, localize(msgConvertGrayscale));
        myConvertGrayscaleCheckbox.value = preferences[kPrefsConvertGrayscale];
        myConvertGrayscaleCheckbox.onClick = function() {
            preferences[kPrefsConvertGrayscale] = myConvertGrayscaleCheckbox.value;
            interfaceItemsChanged();
        }

        var myUnsharpMaskCheckbox = add("checkbox", undefined, localize(msgUnsharpMask));
        myUnsharpMaskCheckbox.value = preferences[kPrefsUnsharpMask];
        myUnsharpMaskCheckbox.onClick = function() {
            preferences[kPrefsUnsharpMask] = myUnsharpMaskCheckbox.value;
            interfaceItemsChanged();
        }

        var myUnsharpParamsGroup = add("group");
        with (myUnsharpParamsGroup) {
            orientation = "row";
            alignChildren = ["left", "center"];
            margins = kDialogSubControlMargins;

            add("statictext", undefined, localize(msgAmount));
            var myUnsharpAmount = add("edittext", undefined, preferences[kPrefsUnsharpAmount]);
            myUnsharpAmount.characters = 5;
            myUnsharpAmount.onChanging = function() { preferences[kPrefsUnsharpAmount] = parseInt(myUnsharpAmount.text) || 0; }

            add("statictext", undefined, localize(msgRadius));
            var myUnsharpRadius = add("edittext", undefined, preferences[kPrefsUnsharpRadius]);
            myUnsharpRadius.characters = 5;
            myUnsharpRadius.onChanging = function() { preferences[kPrefsUnsharpRadius] = parseFloat(myUnsharpRadius.text) || 0; }

            add("statictext", undefined, localize(msgThreshold));
            var myUnsharpThreshold = add("edittext", undefined, preferences[kPrefsUnsharpThreshold]);
            myUnsharpThreshold.characters = 5;
            myUnsharpThreshold.onChanging = function() { preferences[kPrefsUnsharpThreshold] = parseInt(myUnsharpThreshold.text) || 0; }
        }
    }

    with (myParametersGroup.add("panel", undefined, localize(msgAdditionalParameters))) {
        orientation = "column";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["fill", "top"];
        margins = kDialogSubPanelMargins;

        var mySeparateDuplicates = add("checkbox", undefined, localize(msgSeparateDuplicates));
        mySeparateDuplicates.onClick = function() {
            preferences[kPrefsSeparateDuplicates] = mySeparateDuplicates.value;
            interfaceItemsChanged();
        }
        mySeparateDuplicates.value = preferences[kPrefsSeparateDuplicates];


        var myLeaveGraphicsOpen = add("checkbox", undefined, localize(msgLeaveImagesOpen));
        myLeaveGraphicsOpen.onClick = function() {
            preferences[kPrefsLeaveGraphicsOpen] = myLeaveGraphicsOpen.value;
        }
        myLeaveGraphicsOpen.value = preferences[kPrefsLeaveGraphicsOpen];
    }

    with (myParametersGroup.add("panel", undefined, localize(msgBackup))) {
        orientation = "column";
        minimumSize.width = kDialogPanelWidth;
        alignChildren = ["fill", "top"];
        margins = kDialogSubPanelMargins;
        var myDoBackup = add("checkbox", undefined, localize(msgDoBackup));
        myDoBackup.onClick = function() {
            preferences[kPrefsBackup] = myDoBackup.value;
            interfaceItemsChanged();
        }
        myDoBackup.value = preferences[kPrefsBackup];
        var myBackupGroup = add("group");
        myBackupGroup.orientation = "column";
        myBackupGroup.alignChildren = ["fill", "top"];
        myBackupGroup.margins = kDialogSubControlMargins;
        with (myBackupGroup.add("group")) {
            orientation = "row";
            alignChildren = ["fill", "top"];
            var myBackupPath = add("edittext", undefined, Folder.decode(preferences[kPrefsBackupFolder]));
            myBackupPath.preferredSize.width = kDialogSubControlWidth;
            myBackupPath.onChange = function() { preferences[kPrefsBackupFolder] = Folder.encode(myBackupPath.text); }
            var myBackupChooseButton = add("button", undefined, localize(msgChoose));
            myBackupChooseButton.onClick = function() {
                var mySelectedFolder = Folder.selectDialog();
                if (mySelectedFolder != null) {
                    preferences[kPrefsBackupFolder] = Folder.encode(mySelectedFolder.fullName) + "/";
                    myBackupPath.text = mySelectedFolder.fullName + "/";
                }
            }
        }
        with (myBackupGroup.add("group")) {
            orientation = "row";
            alignChildren = ["fill", "top"];
            var myDeleteOldBackups = add("checkbox", undefined, localize(msgDeleteOldBackups));
            myDeleteOldBackups.onClick = function() {
                preferences[kPrefsDeleteOldBackups] = myDeleteOldBackups.value;
                interfaceItemsChanged();
            }
            myDeleteOldBackups.value = preferences[kPrefsDeleteOldBackups];
        }
    }

    var myImagesGroup = myUpperGroup.add("panel", undefined, localize(msgImagesToProcess));
    with (myImagesGroup) {
        orientation = "column";
        alignment = ["fill", "fill"];
        alignChildren = ["fill", "top"];
        preferredSize.width = 460;
        maximumSize.width = 460;
        margins = [10, 14, 10, 10];
        
        var myShowListCheckbox = myImagesGroup.add("checkbox", undefined, localize(msgShowImages));
        myShowListCheckbox.value = preferences[kPrefsShowList];
        myShowListCheckbox.onClick = function() {
            preferences[kPrefsShowList] = myShowListCheckbox.value;
            savePreferences();
            if (!myShowListCheckbox.value) {
                myImagesList.removeAll();
                myLastListSignature = "";
            }
            filterGraphics();
        }

        var myImagesList = myImagesGroup.add("listbox", undefined, undefined, {multiselect:true, numberOfColumns:5, showHeaders:true, columnTitles:["Name", "eDPI", "Qty", "Pages", ""], columnWidths:[265, 40, 30, 55, 25]});
        with (myImagesList) { 
            alignment = ["fill", "fill"];
        }
        
        myImagesList.onChange = function () {
            updateStatusText();
            if (preferences[kPrefsShowList]) {
                myOKButton.enabled = (myImagesList.selection != null && myImagesList.selection.length > 0);
            } else {
                myOKButton.enabled = (dictionaryLength(selectedGraphics) > 0);
            }
        }
        myImagesList.onClick = function () {
            updateStatusText();
            if (preferences[kPrefsShowList]) {
                myOKButton.enabled = (myImagesList.selection != null && myImagesList.selection.length > 0);
            } else {
                myOKButton.enabled = (dictionaryLength(selectedGraphics) > 0);
            }
        }

        var myStatusText = myImagesGroup.add("statictext", undefined, "");
        myStatusText.alignment = ["fill", "bottom"];
        myStatusText.graphics.font = smallFont;
    }

    function summarizeImagesData() {
        for (var grc in selectedGraphics) {
            var myFirstItem = true;
            for (var itm in selectedGraphics[grc][kGraphicsObjectList]) {
                var myLowestDPI = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsLowestDPI];
                var myMaxPercentage = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsMaxPercentage];
                if ((myLowestDPI < selectedGraphics[grc][kGraphicsLowestDPI]) || myFirstItem) { selectedGraphics[grc][kGraphicsLowestDPI] = myLowestDPI }
                if ((myMaxPercentage > selectedGraphics[grc][kGraphicsMaxPercentage]) || myFirstItem) { selectedGraphics[grc][kGraphicsMaxPercentage] = myMaxPercentage }
                myFirstItem = false;
            }
            if (selectedGraphics[grc][kGraphicsBitmap]) {
                selectedGraphics[grc][kGraphicsResample] = (
                    (preferences[kPrefsProcessBitmaps]) && (
                        ((preferences[kPrefsBitmapUpsample]) && (isGraphicBitmapDPILow(selectedGraphics[grc][kGraphicsLowestDPI]))) ||
                        ((preferences[kPrefsBitmapDownsample]) && (isGraphicBitmapDPIHigh(selectedGraphics[grc][kGraphicsLowestDPI])))
                    )
                );
            } else {
                selectedGraphics[grc][kGraphicsResample] = (
                    ((preferences[kPrefsColorUpsample]) && (isGraphicColorDPILow(selectedGraphics[grc][kGraphicsLowestDPI]))) ||
                    ((preferences[kPrefsColorDownsample]) && (isGraphicColorDPIHigh(selectedGraphics[grc][kGraphicsLowestDPI])))
                );
            }
            // Классы копий строятся по округлённому до 0,1 п.п. масштабу — один класс на копию.
            selectedGraphics[grc][kGraphicsCopyClasses] = null;
            if (preferences[kPrefsSeparateDuplicates] && selectedGraphics[grc][kGraphicsResample] &&
                (selectedGraphics[grc][kGraphicsFormat] != "CompuServe GIF") && (!selectedGraphics[grc][kGraphicsPhotoshopEPS])) {
                var _pcts = [];
                for (var _ci in selectedGraphics[grc][kGraphicsObjectList]) {
                    _pcts.push(selectedGraphics[grc][kGraphicsObjectList][_ci][kGraphicsMaxPercentage] * 100);
                }
                var _gMax = Math.round(selectedGraphics[grc][kGraphicsMaxPercentage] * 1000) / 10;
                _pcts.sort(function(a, b) { return b - a; });
                var _classes = [];
                for (var _ci2 = 0; _ci2 < _pcts.length; _ci2++) {
                    var _rp = (_pcts[_ci2] < 1) ? (Math.round(_pcts[_ci2] * 100) / 100) : (Math.round(_pcts[_ci2] * 10) / 10);
                    if (_rp >= _gMax) continue;
                    if ((_classes.length > 0) && (_classes[_classes.length - 1] == _rp)) continue;
                    _classes.push(_rp);
                }
                if (_classes.length > 0) {
                    selectedGraphics[grc][kGraphicsCopyClasses] = _classes;
                    for (var _ci3 in selectedGraphics[grc][kGraphicsObjectList]) {
                        var _ipv = selectedGraphics[grc][kGraphicsObjectList][_ci3][kGraphicsMaxPercentage] * 100;
                        var _ip = (_ipv < 1) ? (Math.round(_ipv * 100) / 100) : (Math.round(_ipv * 10) / 10);
                        if (_ip < _gMax) {
                            for (var _ci4 = 0; _ci4 < _classes.length; _ci4++) {
                                if (_classes[_ci4] == _ip) {
                                    selectedGraphics[grc][kGraphicsObjectList][_ci3][kGraphicsCopyClass] = _classes[_ci4];
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    function filterGraphics() {
        function myIsInScope(grc, itm) {
            switch (preferences[kPrefsScope]) {
                case kScopeActiveDoc:
                    return (graphics[grc][kGraphicsObjectList][itm][kGraphicsParentDocument] == activeDocument);
                    
                case kScopeSelectedPages:
                    try {
                        var ranges = parsePageRange(preferences[kPrefsPageRange]);
                        if (ranges == null || ranges.length == 0) return false;
                        var myGraphicObj = graphics[grc][kGraphicsObjectList][itm][kGraphicsObject];
                        var gOffset = offsetOfGraphic(myGraphicObj);
                        if (gOffset >= 0) return pageOffsetInRange(gOffset, ranges);
                        var gBounds = myGraphicObj.parent.geometricBounds;
                        var docPages = documents[activeDocument][kDocumentsObject].pages;
                        for (var p = 0; p < docPages.length; p++) {
                            if (!pageOffsetInRange(p, ranges)) continue;
                            var pBounds = docPages[p].bounds;
                            var overlaps = !(
                                gBounds[2] < pBounds[0] ||
                                gBounds[0] > pBounds[2] ||
                                gBounds[3] < pBounds[1] ||
                                gBounds[1] > pBounds[3]
                            );
                            if (overlaps) return true;
                        }
                    } catch (e) {
                        return false;
                    }
                    return false;
                    
                case kScopeSelectedImages:
                    if (app.selection.length == 0) return false;
                    
                    var myGraphic = graphics[grc][kGraphicsObjectList][itm][kGraphicsObject];
                    var found = false;
                    for (var s = 0; s < app.selection.length; s++) {
                        var selObj = app.selection[s];
                        if (selObj == myGraphic) { found = true; break; }
                        if (selObj.hasOwnProperty("allGraphics")) {
                            for (var ag = 0; ag < selObj.allGraphics.length; ag++) {
                                if (selObj.allGraphics[ag] == myGraphic) { found = true; break; }
                            }
                        }
                        if (selObj.hasOwnProperty("allPageItems")) {
                            for (var ap = 0; ap < selObj.allPageItems.length; ap++) {
                                if (selObj.allPageItems[ap] == myGraphic) { found = true; break; }
                            }
                        }
                        if (found) break;
                    }
                    
                    return found;
                    
                default:
                    return false;
            }
        }

        function myIsSuitable(grc, itm) {
            if (!graphics[grc][kGraphicsOnMaster]) {
                if (((preferences[kPrefsIncludePasteboard]) || (graphics[grc][kGraphicsObjectList][itm][kGraphicsWithinBleeds])) ||
                    (preferences[kPrefsScope] == kScopeSelectedImages)) {
                    var myClass = graphicClass(graphics[grc]);
                    // Режим задаёт набор классов; фильтр стоит до триггера постобработки —
                    // постобработка не протаскивает файлы мимо запрета своего режима.
                    if ((preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfNone) && (myClass == "web")) { return false; }
                    if ((preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfWrong) && (myClass == "native")) { return false; }
                    // Классовые галочки — свободные добавки к набору в любом режиме
                    if (myClass == "eps") { return preferences[kPrefsProcessPhotoshopEPS]; }
                    if (myClass == "unembed") { return preferences[kPrefsProcessEmbedded]; }
                    if (myClass == "bitmap") {
                        if (!preferences[kPrefsProcessBitmaps]) { return false; }
                        if (graphicSaveCode(graphics[grc]) != 0) { return true; }
                        if ((preferences[kPrefsBitmapUpsample]) && (isGraphicBitmapDPILow(graphics[grc][kGraphicsObjectList][itm][kGraphicsLowestDPI]))) {
                            graphics[grc][kGraphicsResample] = true;
                            return true;
                        }
                        if ((preferences[kPrefsBitmapDownsample]) && (isGraphicBitmapDPIHigh(graphics[grc][kGraphicsObjectList][itm][kGraphicsLowestDPI]))) {
                            graphics[grc][kGraphicsResample] = true;
                            return true;
                        }
                        return false;
                    }
                    // Постобработка — самостоятельный триггер: включённые операции добавляют
                    // картинку в обработку без ресайза. Читаем значения preferences[kPrefs...],
                    // а не константы-ключи: строка-ключ всегда истинна.
                    var myPostprocessingOn = (
                        preferences[kPrefsMergeVisible] ||
                        preferences[kPrefsUnsharpMask] ||
                        (preferences[kPrefsColorConversion] &&
                         (preferences[kPrefsConvertGrayscale] || !isGraphicGrayscale(graphics[grc])))
                    );
                    if (myPostprocessingOn) { return true; }
                    if (graphicSaveCode(graphics[grc]) != 0) { return true; }
                    if ((preferences[kPrefsColorUpsample]) && (isGraphicColorDPILow(graphics[grc][kGraphicsObjectList][itm][kGraphicsLowestDPI]))) {
                        graphics[grc][kGraphicsResample] = true;
                        return true;
                    }
                    if ((preferences[kPrefsColorDownsample]) && (isGraphicColorDPIHigh(graphics[grc][kGraphicsObjectList][itm][kGraphicsLowestDPI]))) {
                        graphics[grc][kGraphicsResample] = true;
                        return true;
                    }
                }
            }
            return false;
        }

        myOKButton.enabled = false;
        
        selectedGraphics = new dictionary();
        for (var grc in graphics) {
            var entry = new dictionary();
            for (var prop in graphics[grc]) {
                if (prop != kGraphicsObjectList) {
                    entry[prop] = graphics[grc][prop];
                }
            }
            entry[kGraphicsObjectList] = new dictionary();
            
            for (var itm in graphics[grc][kGraphicsObjectList]) {
                if (myIsInScope(grc, itm) && myIsSuitable(grc, itm)) {
                    entry[kGraphicsObjectList][itm] = graphics[grc][kGraphicsObjectList][itm];
                }
            }
            if (dictionaryLength(entry[kGraphicsObjectList]) > 0) {
                selectedGraphics[grc] = entry;
            }
        }

        summarizeImagesData();
        if (!preferences[kPrefsShowList]) {
            for (var _ho in selectedGraphics) {
                if (selectedGraphics[_ho][kGraphicsOutdated]) { delete selectedGraphics[_ho]; }
            }
            updateStatusText();
            myOKButton.enabled = (dictionaryLength(selectedGraphics) > 0);
            return;
        }

        // Сигнатура состава selectedGraphics
        var _keysArr = [];
        for (var _g in selectedGraphics) { _keysArr.push(_g); }
        _keysArr.sort();
        var _newSignature = "";
        for (var _k = 0; _k < _keysArr.length; _k++) {
            var _g = _keysArr[_k];
            var _itmArr = [];
            for (var _i in selectedGraphics[_g][kGraphicsObjectList]) { _itmArr.push(_i); }
            _itmArr.sort();
            _newSignature += _g + ":" + _itmArr.join(",") + ";";
        }

        if (_newSignature == myLastListSignature && myImagesList.items.length > 0) {
            // Состав не изменился — только обновляем статус
            updateStatusText();
            myOKButton.enabled = (myImagesList.selection != null && myImagesList.selection.length > 0);
            return;
        }

        myImagesList.removeAll();
        for (var grc in selectedGraphics) {
            var isReadonly = (selectedGraphics[grc][kGraphicsFileReadonly] || selectedGraphics[grc][kGraphicsFolderReadonly]);
            var isOutdated = (selectedGraphics[grc][kGraphicsOutdated] == true);
            
            var newListItem = myImagesList.add("item", truncateFileName(selectedGraphics[grc].graphicsName, 35));
            newListItem[kListItemObject] = grc;
            newListItem.selected = !isReadonly && !isOutdated;
            
            if (appVersion > 5) {
                if (selectedGraphics[grc][kGraphicsPhotoshopEPS]) {
                    newListItem.subItems[0].text = "-";
                } else {
                    newListItem.subItems[0].text = String(Math.round(selectedGraphics[grc][kGraphicsLowestDPI]));
                }
                
                newListItem.subItems[1].text = String(dictionaryLength(selectedGraphics[grc][kGraphicsObjectList]));
                
                var pagesDict = {};
                var pagesArr = [];
                for (var itm2 in selectedGraphics[grc][kGraphicsObjectList]) {
                    var pg = selectedGraphics[grc][kGraphicsObjectList][itm2][kGraphicsParentPage];
                    if (pg && pg !== "" && !pagesDict[pg]) {
                        pagesDict[pg] = true;
                        pagesArr.push(pg);
                    }
                }
                var pageStr = "";
                if (pagesArr.length > 0) {
                    pageStr = pagesArr[0];
                    if (pagesArr.length > 1) pageStr += ", " + pagesArr[1];
                    if (pagesArr.length > 2) pageStr += " +" + (pagesArr.length - 2);
                }
                newListItem.subItems[2].text = pageStr;
                
                // Пятая колонка - Статус: предупреждение, тип, счётчик масштабов
                var _statusParts = [];
                if (isReadonly) { _statusParts.push("🚫"); }
                if (selectedGraphics[grc][kGraphicsPasted] || selectedGraphics[grc][kGraphicsEmbedded]) { _statusParts.push("[E]"); }
                if (selectedGraphics[grc][kGraphicsBitmap]) { _statusParts.push("[B]"); }
                if (isOutdated) { _statusParts.push("⚠️"); }
                var _scales = [];
                for (var _sc in selectedGraphics[grc][kGraphicsObjectList]) {
                    var _rp = Math.round(selectedGraphics[grc][kGraphicsObjectList][_sc][kGraphicsMaxPercentage] * 1000) / 10;
                    var _known = false;
                    for (var _si = 0; _si < _scales.length; _si++) {
                        if (_scales[_si] == _rp) { _known = true; break; }
                    }
                    if (!_known) { _scales.push(_rp); }
                }
                if (_scales.length > 1) { _statusParts.push("×" + _scales.length); }
                newListItem.subItems[3].text = _statusParts.join(" ");
                newListItem.subItems[3].alignment = "center";
            }
        }
        myLastListSignature = _newSignature;
        updateStatusText();
    }

    var myControlGroup = preferencesDialog.add("group");
    with (myControlGroup) {
        orientation = "row";
        alignment = ["fill", "top"];
        var myLocaleDropdown = add("dropdownlist");
        for (var itm = 0; itm < kLocalesList.length; itm++) {
            var newListItem = myLocaleDropdown.add("item", kLocalesList[itm][1]);
            newListItem[kListItemObject] = kLocalesList[itm][0];
            if (newListItem[kListItemObject] == preferences[kPrefsLocale]) { myLocaleDropdown.selection = newListItem; }
        }
        myLocaleDropdown.onChange = function () {
            preferences[kPrefsLocale] = myLocaleDropdown.selection[kListItemObject];
            $.locale = preferences[kPrefsLocale];
            preferencesDialog.close(3);
        }
        
        var myButtonsGroup = myControlGroup.add("group");
        with (myButtonsGroup) {
            orientation = "row";
            alignment = ["right", "top"];
            var myCancelButton = add("button", undefined, localize(msgCancel), {name: "cancel"});
            var myOKButton = add("button", undefined, localize(msgOK), {name: "ok"});
            myOKButton.onClick = function () { if (myOKButton.enabled) preferencesDialog.close(1); }
        }
    }

    function savePreferences() {
        var preferencesArray = [];
        for (var prf in preferences) { preferencesArray.push(prf + "\t" + typeof preferences[prf] + "\t" + preferences[prf]); }
        var preferencesFile = new File(preferencesFileName);
        if (preferencesFile.open("w")) {
            preferencesFile.write(preferencesArray.join("\n"));
            preferencesFile.close();
        } else { alert(localize(msgErrorSavingPreferences)); }
    }

    function interfaceItemsChanged() {
        myFlagResample = (preferences[kPrefsColorUpsample] || preferences[kPrefsColorDownsample] || (preferences[kPrefsProcessBitmaps] && (preferences[kPrefsBitmapUpsample] || preferences[kPrefsBitmapDownsample])));
        myChangeFormatToDropdown.enabled = (preferences[kPrefsChangeFormatOf] != kPrefsChangeFormatOfNone);
        myBitmapGraphicsGroup.enabled = myProcessBitmaps.value;
        myResampleMethodGroup.enabled = myFlagResample;
        myIncludePasteboard.enabled = (preferences[kPrefsScope] == kScopeActiveDoc || preferences[kPrefsScope] == kScopeSelectedPages);
        myBackupGroup.enabled = preferences[kPrefsBackup];
        myProfileDropdown.enabled = preferences[kPrefsColorConversion];
        myConvertGrayscaleCheckbox.enabled = preferences[kPrefsColorConversion];
        myUnsharpMaskCheckbox.enabled = preferences[kPrefsMergeVisible];
        myUnsharpParamsGroup.enabled = preferences[kPrefsMergeVisible] && preferences[kPrefsUnsharpMask];
        savePreferences();
        filterGraphics();
    }

    function updateStatusText() {
        var totalCount = 0;
        var lockedCount = 0;
        var outdatedCount = 0;
        if (preferences[kPrefsShowList] && myImagesList.items.length > 0) {
            var _sel = myImagesList.selection;
            totalCount = (_sel != null) ? _sel.length : 0;
            for (var _g in selectedGraphics) {
                if (selectedGraphics[_g][kGraphicsFileReadonly] || selectedGraphics[_g][kGraphicsFolderReadonly]) {
                    lockedCount++;
                }
                if (selectedGraphics[_g][kGraphicsOutdated]) { outdatedCount++; }
            }
        } else {
            for (var _g in selectedGraphics) {
                if (selectedGraphics[_g][kGraphicsFileReadonly] || selectedGraphics[_g][kGraphicsFolderReadonly]) {
                    lockedCount++;
                } else if (selectedGraphics[_g][kGraphicsOutdated]) {
                    outdatedCount++;
                } else {
                    totalCount++;
                }
            }
        }
        var selectedCount = totalCount;
        var scope = preferences[kPrefsScope];
        var lockStr = (lockedCount > 0) ? ", 🚫 " + lockedCount + " " + localize(msgLocked) : "";
        var outStr = (outdatedCount > 0) ? ", ⚠️ " + outdatedCount + " " + localize(msgOutdated) : "";

        var suffix = "";
        if (scope == kScopeSelectedPages) {
            var ranges = parsePageRange(preferences[kPrefsPageRange]);
            var pagesCount = 0;
            if (pageRegistryBuilt) {
                for (var pi = 0; pi < pageRegistry.length; pi++) {
                    if (pageOffsetInRange(pageRegistry[pi][1], ranges)) pagesCount++;
                }
            }
            if (pagesCount > 0) {
                suffix = localize(msgOnPages) + pagesCount + localize(msgPage);
            }
        } else if (scope == kScopeActiveDoc) {
            if (pageRegistryBuilt && pageRegistry.length > 0) {
                suffix = localize(msgOnPages) + pageRegistry.length + localize(msgPage);
            }
        } else if (scope == kScopeSelectedImages) {
            var pagesSet = {};
            for (var _spg in selectedGraphics) {
                for (var _spi in selectedGraphics[_spg][kGraphicsObjectList]) {
                    var _spPage = selectedGraphics[_spg][kGraphicsObjectList][_spi][kGraphicsParentPage];
                    if (_spPage != undefined && _spPage != null) {
                        _spPage = String(_spPage);
                        if (_spPage.indexOf("PB:") != 0 && _spPage != "OFF") { pagesSet[_spPage] = true; }
                    }
                }
            }
            var pagesCount = 0;
            for (var _spk in pagesSet) pagesCount++;
            if (pagesCount > 0) {
                suffix = localize(msgOnPages) + pagesCount + localize(msgPage);
            }
        }

        // Функция для правильного склонения русских слов (1, 2, 5)
        function getPlural(num, form1, form2, form5) {
            var n = Math.abs(num) % 100;
            var n1 = n % 10;
            if (n > 10 && n < 20) return form5;
            if (n1 > 1 && n1 < 5) return form2;
            if (n1 == 1) return form1;
            return form5;
        }

        var statusStr = "";
        if (totalCount == 0) {
            statusStr = localize(msgNoImages) + suffix + outStr + lockStr;
        } else if (selectedCount == 0) {
            statusStr = "0" + localize(msgOf) + totalCount + localize(msgSelected) + suffix + outStr + lockStr;
        } else if (selectedCount == totalCount) {
            if (scope == kScopeSelectedImages) {
                statusStr = totalCount + localize(getPlural(totalCount, msgSelImage_1, msgSelImage_2, msgSelImage_5)) + localize(msgToProcess) + suffix + outStr + lockStr;
            } else {
                statusStr = totalCount + localize(getPlural(totalCount, msgImage_1, msgImage_2, msgImage_5)) + localize(msgToProcess) + suffix + outStr + lockStr;
            }
        } else {
            if (scope == kScopeSelectedImages) {
                statusStr = selectedCount + localize(msgOf) + totalCount + localize(msgSelected) + suffix + outStr + lockStr;
            } else {
                statusStr = selectedCount + localize(msgOf) + totalCount + localize(msgSelected) + suffix + outStr + lockStr;
            }
        }

        myStatusText.text = statusStr;
    }

    var _filteredOnShow = false;
    preferencesDialog.onShow = function() {
        if (!_filteredOnShow) {
            _filteredOnShow = true;
            myScopeButtonClicked();
            filterGraphics();
        }
        updateStatusText();
        if (preferences[kPrefsShowList]) {
            myOKButton.enabled = (myImagesList.selection != null && myImagesList.selection.length > 0);
        } else {
            myOKButton.enabled = (dictionaryLength(selectedGraphics) > 0);
        }
    };
    
    var preferencesDialogResult = preferencesDialog.show();
    savePreferences();

    switch (preferencesDialogResult) {
        case 1: break;
        case 2: return false;
        case 3: flagRestart = true; return false;
    }

    var _selList = myImagesList.selection;
    var _selLen = (_selList != null) ? _selList.length : 0;
    for (var grc in selectedGraphics) {
        var isSelected = false;
        for (sel = 0; sel < _selLen; sel++) {
            if (_selList[sel][kListItemObject] == grc) { isSelected = true; break; }
        }
        if (!isSelected) { delete selectedGraphics[grc]; }
    }

    if (preferences[kPrefsScope] == kScopeSelectedImages) {
        var flagMultipleEntries = false;
        for (var grc in selectedGraphics) {
            if (dictionaryLength(selectedGraphics[grc][kGraphicsObjectList]) != dictionaryLength(graphics[grc][kGraphicsObjectList])) {
                flagMultipleEntries = true;
                break;
            }
        }
        if (flagMultipleEntries) {
            var decisionResult = askForDecision(msgWarning, msgMultipleEntriesDescription, kMultipleEntriesOptions, kMultipleEntriesSingle);
            if (decisionResult == -1) return false;
            if (decisionResult == kMultipleEntriesMultiple) {
                for (var grc in selectedGraphics) {
                    if (graphics[grc] == null) continue;
                    if (dictionaryLength(selectedGraphics[grc][kGraphicsObjectList]) != dictionaryLength(graphics[grc][kGraphicsObjectList])) {
                        for (var itm in selectedGraphics[grc][kGraphicsObjectList]) {
                            delete selectedGraphics[grc][kGraphicsObjectList][itm];
                        }
                        delete selectedGraphics[grc];
                        selectedGraphics[grc] = cloneDictionary(graphics[grc]);
                    }
                }
                summarizeImagesData();
            }
        }
    }

    switch (preferences[kPrefsScope]) {
        case kScopeActiveDoc:
        case kScopeSelectedPages:
        case kScopeSelectedImages:
            for (var doc in documents) { if (doc != activeDocument) delete documents[doc]; }
            break;
        default: return false;
    }
    return true;
}

// --- ОСТАЛЬНЫЕ ФУНКЦИИ ---

function deleteOldBackups() {
    if (!preferences[kPrefsDeleteOldBackups] || flagOldBackupsDeleted) return true;
    showStatus(localize(msgDeleteOldBackupsStatus), "", undefined, undefined);
    var currentDate = new Date();
    function checkOldness(itm) {
        if (itm.reflect.name != "Folder") { return false }
        var timeStamp = itm.name.split("-").slice(-4);
        try {
            var backupDate = new Date(parseInt(timeStamp[0]), parseInt(timeStamp[1]-1), parseInt(timeStamp[2]), parseInt(timeStamp[3].slice(0, 2)), parseInt(timeStamp[3].slice(2, 4)), parseInt(timeStamp[3].slice(4, 6)));
        } catch(e) { return false; }
        return ((currentDate - backupDate) / 86400000 > 31);
    }
    var backupsFolder = new Folder(Folder.decode(preferences[kPrefsBackupFolder]));
    var oldBackups = backupsFolder.getFiles(checkOldness)
    var skippedBackups = [];
    showStatus(undefined, "", 0, oldBackups.length);
    for (itm in oldBackups) {
        if (flagStopExecution) { break }
        showStatus(undefined, Folder.decode(oldBackups[itm].name), undefined, undefined);
        // Удаляем только папки с валидным журналом: backup.log, завершённый меткой END.
        var logFile = new File(oldBackups[itm].fullName + "/" + kLogFileName);
        var logIsValid = false;
        if (logFile.exists && logFile.open("r")) {
            var logLines = logFile.read(logFile.length).split("\n");
            logFile.close();
            for (var _li = 0; _li < logLines.length; _li++) {
                var _lr = logLines[_li].split("\t");
                if (_lr[0] == kLogFileEND && _lr[1] == kLogFileEND) { logIsValid = true; break; }
            }
        }
        if (!logIsValid) { skippedBackups.push(Folder.decode(oldBackups[itm].name)); continue; }
        var containedFiles = oldBackups[itm].getFiles();
        for (fil in containedFiles) {
            if (flagStopExecution) { break }
            if (!containedFiles[fil].remove()) { alert(localize(msgErrorDeletingBackupFolder, containedFiles[fil].fullName)); flagStopExecution = true; }
        }
        if (!oldBackups[itm].remove()) { alert(localize(msgErrorDeletingBackupFolder, containedFiles[fil].fullName)); flagStopExecution = true; }
        showStatus(undefined, undefined, itm, undefined);
    }
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    if (skippedBackups.length > 0) { alert(localize(msgBackupsSkipped, skippedBackups.join("\n"))); }
    flagOldBackupsDeleted = true;
    return !flagStopExecution;
}

function backupImages() {
    if (!preferences[kPrefsBackup]) return true;
    function backupDocument(myItemObject) {
        var myDocument = myItemObject[kDocumentsObject];
        showStatus(undefined, myDocument.name, undefined, undefined);
        var currentDate = new Date();
        var backupFolderName = cleanupPath(File.decode(myDocument.fullName.name) + "-" + currentDate.getFullYear() + "-" + fillZeros(currentDate.getMonth()+1, 2) + "-" + fillZeros(currentDate.getDate(), 2) + "-" + fillZeros(currentDate.getHours(), 2) + fillZeros(currentDate.getMinutes(), 2) + fillZeros(currentDate.getSeconds(), 2));
        var backupFolder = new Folder(Folder.decode(preferences[kPrefsBackupFolder]) + backupFolderName);
        if (!backupFolder.create()) { alert(localize(msgErrorCreatingBackupFolder)); flagStopExecution = true; return; }
        var logFile = new File(backupFolder.fullName + "/" + kLogFileName);
        if (!logFile.open("w")) { flagStopExecution = true; return; }
        var backupDocumentName = uniqueFileName(backupFolder.fullName, cleanupPath(File.decode(myDocument.fullName.name)));
        if (!myDocument.fullName.copy(backupDocumentName)) {
            alert(localize(msgErrorCopyingFile, File.decode(myDocument.name)));
            logFile.write(kLogFileERR + "\n"); logFile.close(); flagStopExecution = true; return;
        }
        logFile.write([File.encode(backupDocumentName.name), File.encode(new File(myDocument.fullName).fullName)].join("\t") + "\n");
        var myBackupList = myItemObject[kDocumentsBackupList];
        for (var grc in myBackupList) {
            showStatus(undefined, myBackupList[grc].name, statusWindowGauge.value + 1, undefined);
            showStatus(undefined,undefined, undefined, undefined);
            var myFile = new File(myBackupList[grc].filePath);
            var backupFileName = uniqueFileName(backupFolder.fullName, cleanupPath(File.decode(myFile.name)));
            if (!myFile.copy(backupFileName)) { alert(localize(msgErrorCopyingFile, myBackupList[grc].filePath)); flagStopExecution = true; }
            myFile.close();
            if (flagStopExecution) { logFile.write(kLogFileEND + "\t" + kLogFileERR + "\n"); logFile.close(); return; }
            logFile.write([File.encode(backupFileName.name), File.encode(myFile.fullName)].join("\t") + "\n");
        }
        logFile.write(kLogFileEND + "\t" + kLogFileEND + "\n");
        logFile.close();
        statusWindowGauge.value++;
    }
    var backupFilesCount = 0;
    // Резерв внешних файлов собирается всегда: развнедрение меняет план записи,
    // но внешние оригиналы перезаписываются в любом случае.
    for (var grc in selectedGraphics) {
        for (var itm in selectedGraphics[grc][kGraphicsObjectList]) {
            var doc = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsParentDocument];
            if (selectedGraphics[grc][kGraphicsPasted] || selectedGraphics[grc][kGraphicsEmbedded]) {
                continue;
            }
            var myItemLink = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject].itemLink;
            var myBackupList = documents[doc][kDocumentsBackupList];
            if (!(myItemLink.filePath in myBackupList)) {
                myBackupList[myItemLink.filePath] = myItemLink;
                backupFilesCount++;
            }
        }
    }
    backupFilesCount += dictionaryLength(documents);
    showStatus(localize(msgBackupStatus), "", 0, backupFilesCount);
    for (var doc in documents) {
        backupDocument(documents[doc]);
        if (flagStopExecution) { break }
    }
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    return !flagStopExecution;
}

function unembedImages() {
    if (!preferences[kPrefsProcessEmbedded]) { return true }
    var unembedFolder = null;
    showStatus(localize(msgUnembeddingImagesStatus), "", 0, dictionaryLength(selectedGraphics));
    for (var doc in documents) {
        var myReferencePoints = [];
        {
            var workDoc = documents[doc];
            var workDocLayoutsLen = workDoc[kDocumentsObject].layoutWindows.length;
            var workDocDocumentsObject = workDoc[kDocumentsObject];
            for (var wnd = 0; wnd < workDocLayoutsLen ; wnd++) {
                myReferencePoints[wnd] = workDocDocumentsObject.layoutWindows[wnd].transformReferencePoint;
                workDocDocumentsObject.layoutWindows[wnd].transformReferencePoint = AnchorPoint.CENTER_ANCHOR;
            }
        }
        var savedJpegPrefs = {
            antiAlias: app.jpegExportPreferences.antiAlias,
            exportResolution: app.jpegExportPreferences.exportResolution,
            jpegColorSpace: app.jpegExportPreferences.jpegColorSpace,
            jpegQuality: app.jpegExportPreferences.jpegQuality,
            jpegRenderingStyle: app.jpegExportPreferences.jpegRenderingStyle
        };
        with (app.jpegExportPreferences) {
            antiAlias = false; exportResolution = 300;
            jpegColorSpace = JpegColorSpaceEnum.RGB; jpegQuality = JPEGOptionsQuality.MAXIMUM; jpegRenderingStyle = JPEGOptionsFormat.BASELINE_ENCODING;
        }
        unembedFolder = new Folder(documents[doc][kDocumentsObject].filePath + "/unembedded_files");
        if (!unembedFolder.exists) {
            if (!unembedFolder.create()) { alert(localize(msgErrorCreatingUnembeddedFolder, Folder.decode(unembedFolder))); flagStopExecution = true; }
        }
        for (var grc in selectedGraphics) {
            if (flagStopExecution) { break }
            var flagUnembedded = false;
            var unembeddedFile;
            for (var itm in selectedGraphics[grc][kGraphicsObjectList]) {
                if (selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsParentDocument] == doc) {
                    showStatus(undefined, selectedGraphics[grc][kGraphicsName], statusWindowGauge.value + 1, undefined);
                    try {
                        if (selectedGraphics[grc][kGraphicsEmbedded]) {
                            if (flagUnembedded) {
                                selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject].itemLink.relink(unembeddedFile);
                            } else {
                                var _linkName = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject].itemLink.name;
                                var _existingFile = new File(unembedFolder.fullName + "/" + _linkName);
if (_existingFile.exists) {
                                    var _renamedBak = false;
                                    try { _renamedBak = _existingFile.rename("~trista_old_" + _linkName); } catch (eBak) {}
                                    if (!_renamedBak) { try { _existingFile.remove(); } catch (eDel) {} }
                                }
                                selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject].itemLink.unembed(unembedFolder);
                                unembeddedFile = new File(selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject].itemLink.filePath);
                                flagUnembedded = true;
                            }
                            selectedGraphics[grc][kGraphicsEmbedded] = false;
                            selectedGraphics[grc][kGraphicsName] = unembeddedFile.name;
                            selectedGraphics[grc][kGraphicsUnembedPath] = unembeddedFile.fullName;
                        }
                        if (selectedGraphics[grc][kGraphicsPasted]) {
                            var obj = selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject];
                            var par = obj.parent;
                            var savedHScale = obj.horizontalScale; var savedVScale = obj.verticalScale;
                            var savedRotationAngle = obj.rotationAngle; var savedShearAngle = obj.shearAngle;
                            var savedGeometricBounds = obj.geometricBounds;
                            obj.horizontalScale = 100; obj.verticalScale = 100; obj.rotationAngle = 0; obj.shearAngle = 0;
                            obj.fit(FitOptions.CENTER_CONTENT);
                            var unpastedFile = new File(unembedFolder.fullName + "/" + kUnembedFilePrefix + itm + ".jpg");
                            if (unpastedFile.exists) unpastedFile.remove();
                            obj.exportFile(ExportFormat.JPG, unpastedFile);
                            var placedResult = par.place(unpastedFile);
                            if (placedResult.length > 0) {
                                if (placedResult[0].allGraphics && placedResult[0].allGraphics.length > 0) {
                                    obj = placedResult[0].allGraphics[0];
                                } else {
                                    obj = placedResult[0];
                                }
                            }
                            obj.geometricBounds = savedGeometricBounds;
                            obj.verticalScale = savedVScale; obj.horizontalScale = savedHScale;
                            obj.shearAngle = savedShearAngle; obj.rotationAngle = savedRotationAngle;
                            selectedGraphics[grc][kGraphicsPasted] = false;
                            selectedGraphics[grc][kGraphicsName] = unpastedFile.name;
                            selectedGraphics[grc][kGraphicsUnembedPath] = unpastedFile.fullName;
                            selectedGraphics[grc][kGraphicsObjectList][itm][kGraphicsObject] = obj;
                        }
                    } catch (e) {
                        alert(localize(msgErrorUnembeddingImage, File.decode(unembedFolder) + "/" + File.decode(selectedGraphics[grc][kGraphicsName]) + "\n\n" + e));
                        flagStopExecution = true;
                    }
                }
                if (flagStopExecution) { break }
            }
            if (flagStopExecution) { break }
        }
        app.jpegExportPreferences.antiAlias = savedJpegPrefs.antiAlias;
        app.jpegExportPreferences.exportResolution = savedJpegPrefs.exportResolution;
        app.jpegExportPreferences.jpegColorSpace = savedJpegPrefs.jpegColorSpace;
        app.jpegExportPreferences.jpegQuality = savedJpegPrefs.jpegQuality;
        app.jpegExportPreferences.jpegRenderingStyle = savedJpegPrefs.jpegRenderingStyle;
        for (var wnd = 0; wnd < documents[doc][kDocumentsObject].layoutWindows.length; wnd++) {
            documents[doc][kDocumentsObject].layoutWindows[wnd].transformReferencePoint = myReferencePoints[wnd];
        }
        if (flagStopExecution) { break }
    }
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    return !flagStopExecution;
}

function processImages() {
    function bridgeFunction(myFilePath, myNewFilePath, myDoResample, myResampleMethodCode, myActualDPI, myTargetDPI, myMaxPercentage, myChangeFormatCode, myLeaveGraphicsOpen, myColorConversion, myDestinationProfile, myMergeVisible, myUnsharpMask, myUnsharpAmount, myUnsharpRadius, myUnsharpThreshold, myIsBitmap, myConvertGrayscale, myIsCopy) {
        var mySavedDisplayDialogs = app.displayDialogs;
        app.displayDialogs = DialogModes.NO;
        myFilePath = File.decode(myFilePath);
        myNewFilePath = File.decode(myNewFilePath);
try {
            var myFileRef = new File(myFilePath);
            // Уже открытый в Photoshop файл не переоткрываем — работаем с ним как есть.
            var myWasOpen = false;
            var myDocument = null;
            try {
                var _openKey = String(File(myFilePath).fullName).toLowerCase();
                for (var _od = 0; _od < app.documents.length; _od++) {
                    var _docName = "";
                    try { _docName = String(app.documents[_od].fullName).toLowerCase(); } catch (eDN) {}
                    if (_docName != "" && _docName == _openKey) { myWasOpen = true; myDocument = app.documents[_od]; break; }
                }
            } catch (eScan) {}
            if (myDocument == null) { myDocument = app.open(myFileRef); }
            if (myDocument == null) throw "Не удаётся открыть документ " + myFilePath;

            // Копии обрабатываются на дубликате: исходник не трогаем.
            if (myIsCopy) {
                // revert и закрытие — только для файлов, открытых самим скриптом.
                if (!myWasOpen) { try { if (myDocument.modified) myDocument.revert(); } catch (e) {} }
                var myCopyDoc = myDocument.duplicate();
                if (!myWasOpen) { myDocument.close(SaveOptions.DONOTSAVECHANGES); }
                myDocument = myCopyDoc;
            } else if (myWasOpen && myDocument.modified) {
                throw "Файл уже открыт в Photoshop с несохранёнными изменениями — сохраните или закройте его: " + myFilePath;
            }

            if (myActualDPI == 0) { } 
            else if (myActualDPI != myDocument.resolution) { myMaxPercentage *= myDocument.resolution / myActualDPI; }

            if (myDoResample) {
                var myResampleMethod;
                switch (myResampleMethodCode) {
                    case 0: myResampleMethod = ResampleMethod.AUTOMATIC; break;
                    case 1: myResampleMethod = ResampleMethod.BICUBIC; break;
                    case 2:
                        if (((myDocument.resolution / myTargetDPI) / myMaxPercentage) > 1) { myResampleMethod = ResampleMethod.BICUBICSHARPER; }
                        else { myResampleMethod = ResampleMethod.BICUBICSMOOTHER; }
                        break;
                }
                myDocument.resizeImage(UnitValue(myMaxPercentage * 100, "%"), UnitValue(myMaxPercentage * 100, "%"), myTargetDPI, myResampleMethod);
            }

            // Постобработка вынесена в функцию: при «Leave images open» и смене
            // формата (final19) она выполняется после переоткрытия нового файла.
            var myPostprocess = function() {
                if (myMergeVisible && !myIsBitmap) {
                    if (myDocument.layers.length > 1) {
                        myDocument.mergeVisibleLayers();
                    }
                    for (var _li = myDocument.layers.length - 1; _li >= 0; _li--) {
                        if (!myDocument.layers[_li].visible) {
                            myDocument.layers[_li].remove();
                        }
                    }
                }

                // Grayscale конвертируется только при включённом Convert Grayscale;
                // Merge и Unsharp применяются к Grayscale как к обычным изображениям.
                var mySkipGrayscaleConversion = false;
                try { mySkipGrayscaleConversion = (myDocument.mode == DocumentMode.GRAYSCALE) && !myConvertGrayscale; } catch (e) {}
                if (myColorConversion && !myIsBitmap && myDestinationProfile != "" && !mySkipGrayscaleConversion) {
                    // Конвертация выполняется одним вызовом convertProfile:
                    // он меняет и цветовой режим, и профиль за одну трансформацию
                    // чисел (это «Convert to Profile» из меню Photoshop).
                    if (String(myDocument.profile || "").toLowerCase() == String(myDestinationProfile).toLowerCase()) {
                        // Документ уже в целевом профиле — преобразование не нужно,
                        // вторая трансформация чисел не проводится.
                    } else {
                        try {
                            myDocument.convertProfile(myDestinationProfile, Intent.RELATIVECOLORIMETRIC, true, true);
                        } catch (e) {
                            // Фолбэк через Action Manager (проверенный путь 0.9.1).
                            try {
                                var _desc = new ActionDescriptor();
                                var _ref = new ActionReference();
                                _ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
                                _desc.putReference(charIDToTypeID("null"), _ref);
                                _desc.putString(charIDToTypeID("T   "), myDestinationProfile);
                                _desc.putEnumerated(charIDToTypeID("Inte"), charIDToTypeID("Inte"), charIDToTypeID("Clrm"));
                                _desc.putBoolean(charIDToTypeID("MpBl"), true);
                                _desc.putBoolean(charIDToTypeID("Dthr"), false);
                                _desc.putInteger(charIDToTypeID("sdwM"), 2);
                                executeAction(stringIDToTypeID("convertToProfile"), _desc, DialogModes.NO);
                            } catch (e2) {
                                throw new Error("[Trista DPI: convertProfile '" + myDestinationProfile + "'] " + e2);
                            }
                        }
                    }
                }

                if (myUnsharpMask && myMergeVisible && !myIsBitmap) {
                    var _amt = Number(myUnsharpAmount); if (isNaN(_amt) || _amt <= 0) _amt = 100;
                    var _rad = Number(myUnsharpRadius); if (isNaN(_rad) || _rad <= 0) _rad = 1;
                    var _thr = Number(myUnsharpThreshold); if (isNaN(_thr)) _thr = 5;
                    myDocument.activeLayer.applyUnSharpMask(_amt, _rad, _thr);
                }
            };

            // «Leave images open» и смена формата: ресайз сохраняется в новый
            // файл сразу, постобработка — после переоткрытия; открытый документ
            // остаётся реальным файлом публикации.
            var myPostponePostprocess = !myIsCopy && myLeaveGraphicsOpen && (myChangeFormatCode == 1 || myChangeFormatCode == 2);
            if (!myPostponePostprocess) { myPostprocess(); }
            if (myIsCopy) {
                // Копия наследует итоговый формат главного файла.
                if (myChangeFormatCode == 2 || (myChangeFormatCode == 0 && myNewFilePath.toLowerCase().slice(-4) == ".psd")) {
                    var myCopyPSDOpts = new PhotoshopSaveOptions();
                    myDocument.saveAs(new File(myNewFilePath), myCopyPSDOpts, false, Extension.LOWERCASE);
                } else {
                    var myCopyTIFFOpts = new TiffSaveOptions();
                    with (myCopyTIFFOpts) { byteOrder = ByteOrder.MACOS; imageCompression = TIFFEncoding.TIFFLZW; }
                    myDocument.saveAs(new File(myNewFilePath), myCopyTIFFOpts, false, Extension.LOWERCASE);
                }
                if (!myLeaveGraphicsOpen) { myDocument.close(SaveOptions.DONOTSAVECHANGES); }
            } else switch (myChangeFormatCode) {
                case 0: if (myLeaveGraphicsOpen) { myDocument.save(); } else { myDocument.close(SaveOptions.SAVECHANGES); } break;
                case 1:
                    var myTIFFSaveOptions = new TiffSaveOptions();
                    with (myTIFFSaveOptions) { byteOrder = ByteOrder.MACOS; imageCompression = TIFFEncoding.TIFFLZW; }
                    var myNewFile = new File(myNewFilePath);
                    myDocument.saveAs(myNewFile, myTIFFSaveOptions, true, Extension.LOWERCASE);
                    myDocument.close(SaveOptions.DONOTSAVECHANGES);
                    if (myPostponePostprocess) {
                        myDocument = app.open(myNewFile);
                        if (myDocument == null) throw "Не удаётся открыть документ " + myNewFilePath;
                        myPostprocess();
                        myDocument.save();
                    }
                    break;
                case 2:
                    var myPSDSaveOptions = new PhotoshopSaveOptions();
                    var myNewFile = new File(myNewFilePath);
                    myDocument.saveAs(myNewFile, myPSDSaveOptions, true, Extension.LOWERCASE);
                    myDocument.close(SaveOptions.DONOTSAVECHANGES);
                    if (myPostponePostprocess) {
                        myDocument = app.open(myNewFile);
                        if (myDocument == null) throw "Не удаётся открыть документ " + myNewFilePath;
                        myPostprocess();
                        myDocument.save();
                    }
                    break;
            }
        } catch (e) {
            throw e;
        } finally {
            app.displayDialogs = mySavedDisplayDialogs;
        }
        return "";
    }

    // Имя копии детерминировано: имя главного файла + масштаб (в процентах)
    // и DPI; целые масштабы — без дробной части, дробные — с запятой.
    // Суффикс с расширением исходника — только при реальной угрозе коллизии:
    // два разных исходника с одинаковым базовым именем и разными расширениями
    // в одной папке; конкурент ищется среди исходников публикации.
    function competitorSuffix(myFolder, myBase, mySrcExt) {
        var _gfx = { jpg: 1, jpeg: 1, png: 1, webp: 1, tif: 1, tiff: 1, psd: 1, eps: 1, gif: 1, bmp: 1, heic: 1, jfif: 1 };
        var _mFolder = new Folder(myFolder).fullName;
        for (var _g in graphics) {
            var _gFile = new File(_g);
            var _gnm = _gFile.name;
            if (_gnm == null || _gnm == "") continue;
            if (_gFile.parent.fullName != _mFolder) continue;
            var _gd = _gnm.lastIndexOf(".");
            if (_gd <= 0) continue;
            if (_gnm.slice(0, _gd) != myBase) continue;
            var _ge = _gnm.slice(_gd + 1).toLowerCase();
            if (!_gfx[_ge] || _ge == mySrcExt) continue;
            return "_" + mySrcExt;
        }
        return "";
    }

    function copyPathForScale(myGroupNewPath, mySrcPath, myChangeFormatCode, myScalePct, myDPI) {
        var myFolder, myBase, myExt;
        var _nm, _dot;
        if (myChangeFormatCode != 0) {
            myFolder = myGroupNewPath.parent.fullName;
            _nm = myGroupNewPath.name;
            _dot = _nm.lastIndexOf(".");
            myBase = (_dot > 0 ? _nm.slice(0, _dot) : _nm);
            myExt = (myChangeFormatCode == 1 ? "tif" : "psd");
        } else {
            var mySrcFile = new File(mySrcPath);
            myFolder = mySrcFile.parent.fullName;
            _nm = mySrcFile.name;
            _dot = _nm.lastIndexOf(".");
            myBase = (_dot > 0 ? _nm.slice(0, _dot) : _nm);
myExt = "tif";
        }
        var _s = (myScalePct < 1) ? (Math.round(myScalePct * 100) / 100) : (Math.round(myScalePct * 10) / 10);
        var _txt;
        if (_s == Math.round(_s)) {
            _txt = String(Math.round(_s));
        } else if (_s < 1) {
            _txt = _s.toFixed(2).replace(".", ",");
        } else {
            _txt = _s.toFixed(1).replace(".", ",");
        }
        return uniqueFileName(myFolder, myBase + "_" + _txt + "x" + myDPI + "." + myExt).fullName;
    }

    var myTotalJobs = dictionaryLength(selectedGraphics);
    for (var _gj in selectedGraphics) {
        if (selectedGraphics[_gj][kGraphicsCopyClasses] != null) {
            myTotalJobs += selectedGraphics[_gj][kGraphicsCopyClasses].length;
        }
    }
    showStatus(localize(msgProcessingImagesStatus), "", 0, myTotalJobs);


    for (var grc in selectedGraphics) {
        if (selectedGraphics[grc][kGraphicsFileReadonly] || selectedGraphics[grc][kGraphicsFolderReadonly]) continue;
        showStatus(undefined, selectedGraphics[grc][kGraphicsName], undefined, undefined);
        var myChangeFormatCode = graphicSaveCode(selectedGraphics[grc]);
        var myDoChangeFormat = (myChangeFormatCode != 0);
        var myTargetDPI = (selectedGraphics[grc][kGraphicsBitmap] ? preferences[kPrefsBitmapTargetDPI] : preferences[kPrefsColorTargetDPI]);
        var myNewFilePath = "";
        if (myDoChangeFormat) {
            var myFile;
            if (selectedGraphics[grc][kGraphicsUnembedPath] != undefined && selectedGraphics[grc][kGraphicsUnembedPath] != "") {
                myFile = new File(selectedGraphics[grc][kGraphicsUnembedPath]);
            } else {
                myFile = new File(grc);
            }
            var myPath = myFile.path;
                        var _srcDot = myFile.name.lastIndexOf(".");
            var _srcExt = (_srcDot > 0 ? myFile.name.slice(_srcDot + 1).toLowerCase() : "");
            var _tgtExt = (myChangeFormatCode == 1 ? "tif" : "psd");
            var _srcBase = myFile.name.slice(0, (_srcDot > 0 ? _srcDot : myFile.name.length));
            var _srcSuffix = (_srcExt != "" ? competitorSuffix(myPath, _srcBase, _srcExt) : "");
myNewFilePath = uniqueFileName(myPath, cleanupPath(_srcBase) + _srcSuffix + "." + _tgtExt);
            selectedGraphics[grc][kGraphicsNewFilePath] = myNewFilePath;
            selectedGraphics[grc][kGraphicsDoRelink] = true;
        } else {
            selectedGraphics[grc][kGraphicsDoRelink] = false;
        }

        try {
            var myPhotoshop = "photoshop";
            var myPhotoshopVersion = 0.0;
            var myRunningPhotoshop = "";
            var myRunningPhotoshopVersion = 0.0;
            for (var itm = 0; itm < apps.length; itm++){
                if (apps[itm].indexOf("photoshop") != -1) {
                    var myInstanceVersion = parseFloat(apps[itm].split("-")[1]);
                    if (myInstanceVersion > myPhotoshopVersion) { myPhotoshop = apps[itm]; myPhotoshopVersion = myInstanceVersion; }
                    if (BridgeTalk.isRunning(apps[itm])) {
                        if (myInstanceVersion > myRunningPhotoshopVersion) { myRunningPhotoshop = apps[itm]; myRunningPhotoshopVersion = myInstanceVersion; }
                    }
                }
            }
            if (BridgeTalk.getStatus(myPhotoshop) == "ISNOTINSTALLED") { alert(localize(msgPhotoshopNotInstalled)); return false; }
            if (myRunningPhotoshopVersion > 0.0) { myPhotoshop = myRunningPhotoshop; }
            if (!BridgeTalk.isRunning(myPhotoshop)) { BridgeTalk.launch(myPhotoshop); }
            // Ожидание IDLE ограничено по времени: зависший Photoshop не должен
            // держать прогрессбар вечно. Диалог «подождать ещё?» — тот же, что
            // и при ожидании результата; повторной посылки здесь нет по определению.
            var idleTimeout = 60;
            var idleTimer = new Date();
            while (BridgeTalk.getStatus(myPhotoshop) != "IDLE") {
                BridgeTalk.pump();
                $.sleep(100);
                var idleLapsed = ((new Date()).getTime() - idleTimer.getTime()) / 1000;
                if (idleLapsed > idleTimeout) {
                    if (confirm(localize(msgPhotoshopTimeout))) { idleTimeout *= 1.5; idleTimer = new Date(); }
                    else { return false; }
                }
            }

            // Целевое рабочее пространство резолвится один раз за прогон
            // из настроек цвета InDesign (синхронизируются с Photoshop).
            if (conversionTargetName == "") {
                var _ws = (preferences[kPrefsConversionTarget] == "RGB" ? app.colorSettings.workingSpaceRGB : app.colorSettings.workingSpaceCMYK);
                if (_ws == null || _ws == "" || String(_ws).indexOf("Adobe InDesign Default") == 0) {
                    alert(localize(msgConversionTargetMissing));
                    return false;
                }
                conversionTargetName = String(_ws);
            }

            var _srcPath = grc;
            if (selectedGraphics[grc][kGraphicsUnembedPath] != undefined && selectedGraphics[grc][kGraphicsUnembedPath] != "") {
                _srcPath = selectedGraphics[grc][kGraphicsUnembedPath];
            }

            // Одна посылка на один файл: копии и основной идут через один помощник
            function sendBridgeJob(srcPath, dstPath, percentage, leaveOpen, isCopy) {
                var myBT = new BridgeTalk;
                myBT.target = myPhotoshop;
                myBT.body = bridgeFunction.toString() + "\r\rbridgeFunction(\"";
                myBT.body += File.encode(srcPath) + "\", \"" + File.encode(dstPath) + "\", ";
                myBT.body += selectedGraphics[grc][kGraphicsResample] + ", " + preferences[kPrefsResampleMethod] + ", ";
                myBT.body += selectedGraphics[grc][kGraphicsActualDPI] + ", " + myTargetDPI + ", ";
                myBT.body += percentage + ", " + myChangeFormatCode + ", ";
                myBT.body += leaveOpen + ", ";
                myBT.body += preferences[kPrefsColorConversion] + ", \"" + conversionTargetName + "\", ";
                myBT.body += preferences[kPrefsMergeVisible] + ", ";
                myBT.body += preferences[kPrefsUnsharpMask] + ", ";
                myBT.body += preferences[kPrefsUnsharpAmount] + ", ";
                myBT.body += preferences[kPrefsUnsharpRadius] + ", ";
                myBT.body += preferences[kPrefsUnsharpThreshold] + ", ";
                myBT.body += selectedGraphics[grc][kGraphicsBitmap];
                myBT.body += ", " + preferences[kPrefsConvertGrayscale];
                myBT.body += ", " + isCopy;
                myBT.body += ");";

                myBT.onReceived = function(obj) { myProcessing = true; }
                myBT.onError = function(obj) { myReturnMessage = obj.body; myReturnValue = false; }
myBT.onResult = function(obj) { myReturnValue = true; myFeedbackBody = String(obj.body || ""); }
myBT.onTimeout = function(obj) {
                    if (flagStopExecution) { return }
                    // Повторная посылка запрещена: Photoshop мог уже начать запись файла.
                    if (confirmTimeout()) { myTimer = new Date(); }
                }
                myReturnValue = undefined;
                myReturnMessage = "";
                myProcessing = false;
                var myFeedbackBody = "";

                var myTimeout = 60;
                function confirmTimeout() {
                    if (confirm(localize(msgPhotoshopTimeout))) { myTimeout *= 1.5; return true; }
                    else { myReturnValue = false; flagStopExecution = true; return false; }
                }
                myBT.send(myTimeout);

                var myTimer = new Date();
                while ((myReturnValue == undefined) && !flagStopExecution) {
                    BridgeTalk.pump();
                    showStatus(undefined, undefined, undefined, undefined);
                    if (myProcessing) {
                        var myNow = new Date();
                        var myTimeLapsed = (myNow.getTime() - myTimer.getTime()) / 1000;
                        if (myTimeLapsed > myTimeout) { if (confirmTimeout()) { myTimer = new Date(); } }
                    }
                }
                return myReturnValue;
            }

            // Копии — до основного файла: основной пересчитывается с нетронутого исходника.
            var myCopyClasses = selectedGraphics[grc][kGraphicsCopyClasses];
            var myCopyFailed = false;
            if (myCopyClasses != null) {
                for (var _cc = 0; _cc < myCopyClasses.length; _cc++) {
                    var _cp = myCopyClasses[_cc];
                    var _copyPath = copyPathForScale(myNewFilePath, _srcPath, myChangeFormatCode, _cp, myTargetDPI);
                    if (_copyPath == null) continue;
                    if (!sendBridgeJob(_srcPath, _copyPath, _cp / 100, preferences[kPrefsLeaveGraphicsOpen], true)) {
                        myCopyFailed = true;
                        break;
                    }
                    var _copyFile = new File(_copyPath);
                    showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
                    for (var _ci in selectedGraphics[grc][kGraphicsObjectList]) {
                        var _ipc = selectedGraphics[grc][kGraphicsObjectList][_ci][kGraphicsCopyClass];
                        if (_ipc != undefined && Math.abs(_ipc - _cp) <= 0.005) {
                            selectedGraphics[grc][kGraphicsObjectList][_ci][kGraphicsCopyPath] = _copyFile;
                        }
                    }
                }
            }
            if (!myCopyFailed) {
                sendBridgeJob(_srcPath, myNewFilePath, selectedGraphics[grc][kGraphicsMaxPercentage], preferences[kPrefsLeaveGraphicsOpen], false);
            } else {
                myReturnValue = false;
                myReturnMessage = localize(msgErrorCreatingCopy, String(_cp));
            }
        } catch (e) {
            myReturnMessage = e.description;
            myReturnValue = false;
        }
        if (flagStopExecution) { break }
        if (!myReturnValue) { alert(localize(msgErrorProcessingImage, grc, myReturnMessage)); return false; }
        showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
    }
    BridgeTalk.bringToFront("indesign");    
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    return !flagStopExecution;
}

function relinkImages() {
    var myTotalLinks = 0;
    for (var grc in selectedGraphics) { myTotalLinks += dictionaryLength(selectedGraphics[grc][kGraphicsObjectList]); }
    showStatus(localize(msgRelinkingImagesStatus), "", 0, myTotalLinks);

    for (var grc in selectedGraphics) {
        if (selectedGraphics[grc][kGraphicsFileReadonly] || selectedGraphics[grc][kGraphicsFolderReadonly]) continue;
        var graphicsList = selectedGraphics[grc][kGraphicsObjectList];
        for (var itm in graphicsList) {
            showStatus(undefined, selectedGraphics[grc][kGraphicsName], undefined, undefined);
            var myDocument = documents[graphicsList[itm][kGraphicsParentDocument]][kDocumentsObject];
            var myReferencePoints = [];
            for (var wnd = 0; wnd < myDocument.layoutWindows.length; wnd++) {
                myReferencePoints[wnd] = myDocument.layoutWindows[wnd].transformReferencePoint;
                myDocument.layoutWindows[wnd].transformReferencePoint = AnchorPoint.CENTER_ANCHOR;
            }
            var myLink;
            var myStaleReference = false;
            try {
                for (var dcl = 0; dcl < myDocument.links.length; dcl++) {
                    if (graphicsList[itm][kGraphicsObject].itemLink.id == myDocument.links[dcl].id) {
                        myLink = myDocument.links[dcl];
                    }
                }
            } catch (myStaleError) {
                // Ссылка на объект картинки протухла. Не роняем весь прогон:
                // пропускаем элемент, вернув опорную точку трансформации.
                myStaleReference = true;
            }
            if (myStaleReference) {
                for (var wnd2 = 0; wnd2 < myDocument.layoutWindows.length; wnd2++) {
                    myDocument.layoutWindows[wnd2].transformReferencePoint = myReferencePoints[wnd2];
                }
                continue;
            }
            // Перелинковка каждой картинки — один шаг отмены: Cmd+Z не показывает
            // промежуточное состояние с временным именем в палитре Links.
            app.doScript(function () {
	            var myCopyPath = graphicsList[itm][kGraphicsCopyPath];
	            if (myCopyPath != undefined && myCopyPath != null) {
	                // Экземпляр линкируется на свою копию (File-объект)
	                myLink.relink(myCopyPath);
	            } else if (selectedGraphics[grc][kGraphicsDoRelink]) {
	                myLink.relink(selectedGraphics[grc][kGraphicsNewFilePath]);
	            } else {
	                // Релинк на тот же путь не пересоздаёт запись линка — статус «изменено»
	                // висит даже после Update. Пересоздаём запись через временное имя.
	                var myRefreshFile = new File(myLink.filePath);
	                var myOriginalFileName = File.decode(myRefreshFile.name);
var myRefreshDone = false;
	                var myRefreshRenamed = false;
	                try {
	                    if (myRefreshFile.rename("~trista_refresh_" + myOriginalFileName)) {
	                        myRefreshRenamed = true;
	                        myLink.relink(myRefreshFile);
	                        myRefreshFile.rename(myOriginalFileName);
	                        myLink.relink(new File(myRefreshFile.parent.fullName + "/" + myOriginalFileName));
	                        myRefreshDone = true;
	                    }
	                } catch (e) {
	                    // Сбой посередине: возвращаем временное имя обратно, файл не теряется.
	                    if (myRefreshRenamed && !myRefreshDone) {
	                        try { myRefreshFile.rename(myOriginalFileName); } catch (eR) {}
	                    }
	                }
	                if (!myRefreshDone) {
	                    // Переименовать не удалось (файл занят) — хотя бы перечитаем
	                    try { myLink.relink(new File(myLink.filePath)); } catch (e2) {}
	                }
	            }
	            graphicsList[itm][kGraphicsObject] = myLink.update().parent;
	            if (myLink.status != LinkStatus.NORMAL) {
	                // Возможна задержка обновления метаданных — пауза и повторная попытка.
	                try { $.sleep(250); myLink.update(); } catch (e) {}
	            }
            }, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Trista DPI: relink image");

            try {
                graphicsList[itm][kGraphicsObject].absoluteHorizontalScale = graphicsList[itm][kGraphicsObjectHScale] * 100;
                graphicsList[itm][kGraphicsObject].absoluteVerticalScale = graphicsList[itm][kGraphicsObjectVScale] * 100;
            } catch (e) {}

            if (selectedGraphics[grc][kGraphicsResample]) {
                if (graphicFormat(graphicsList[itm][kGraphicsObject]) == "CompuServe GIF") {
                    graphicsList[itm][kGraphicsObject].absoluteHorizontalScale = (graphicsList[itm][kGraphicsObjectHScale] * (selectedGraphics[grc][kGraphicsLowestDPI] / preferences[kPrefsColorTargetDPI])) * 100;
                    graphicsList[itm][kGraphicsObject].absoluteVerticalScale = (graphicsList[itm][kGraphicsObjectVScale] * (selectedGraphics[grc][kGraphicsLowestDPI] / preferences[kPrefsColorTargetDPI])) * 100;
                } else {
                    var _normDenom = selectedGraphics[grc][kGraphicsMaxPercentage];
                    if (graphicsList[itm][kGraphicsCopyPath] != undefined && graphicsList[itm][kGraphicsCopyPath] != null) {
                        _normDenom = graphicsList[itm][kGraphicsMaxPercentage];
                    }
                    try {
                        graphicsList[itm][kGraphicsObject].absoluteHorizontalScale = (graphicsList[itm][kGraphicsObjectHScale] / _normDenom) * 100;
                        graphicsList[itm][kGraphicsObject].absoluteVerticalScale = (graphicsList[itm][kGraphicsObjectVScale] / _normDenom) * 100;
                    } catch (e) {
                        $.writeln(e);
                        $.writeln("percent - " + ((graphicsList[itm][kGraphicsObjectHScale] / selectedGraphics[grc][kGraphicsMaxPercentage]) * 100));
                        debugPrintObject(graphicsList[itm][kGraphicsObject]);
                        try {
                            app.select(graphicsList[itm][kGraphicsObject]);
                            app.activeWindow.zoom(ZoomOptions.FIT_PAGE);
                            app.activeWindow.zoomPercentage = 400;
                        } catch (e2) {
                            // Объект невалиден (ошибка 30477) — пропускаем выбор и зум
                            $.writeln(e2);
                        }
                    }
                }
            }
            for (var wnd = 0; wnd < myDocument.layoutWindows.length; wnd++) {
                myDocument.layoutWindows[wnd].transformReferencePoint = myReferencePoints[wnd];
            }
            if (flagStopExecution) { break }
            showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
        }
        // Временный JPEG развнедрения удаляется после успешной перелинковки;
        // остаётся только при «Leave images open» — Фотошоп держит файл.
        if ((selectedGraphics[grc][kGraphicsDoRelink]) && (!preferences[kPrefsLeaveGraphicsOpen])) {
            if ((selectedGraphics[grc][kGraphicsUnembedPath] != undefined) && (selectedGraphics[grc][kGraphicsUnembedPath] != "")) {
                var myUnembedTempFile = new File(selectedGraphics[grc][kGraphicsUnembedPath]);
                if (myUnembedTempFile.exists) { myUnembedTempFile.remove(); }
            }
        }
    }
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    return !flagStopExecution;
}

function saveDocuments() {
    showStatus(localize(msgSavingDocumentsStatus), "", 0, dictionaryLength(documents));
    for (var doc in documents) {
        showStatus(undefined, documents[doc][kDocumentsObject].name, undefined, undefined);
        documents[doc][kDocumentsObject].save();
        showStatus(undefined, undefined, statusWindowGauge.value + 1, undefined);
    }
    showStatus(undefined, undefined, statusWindowGauge.maxvalue, statusWindowGauge.maxvalue);
    hideStatus();
    return !flagStopExecution;
}

function askForDecision(headerText, descriptionText, optionsArray, defaultButton) {
    var decisionDialog = new Window("dialog", localize(headerText));
    var radioButtons = new dictionary();
    with (decisionDialog) {
        orientation = "column";
        alignChildren = ["fill", "top"];
        preferredSize = kServiceDialogSize;
        with (add("group")) {
            orientation = "column";
            alignChildren = ["fill", "top"];
            margins = kDialogSubPanelMargins;
            with (add("statictext", undefined, localize(descriptionText), {multiline: true})) { alignment = "fill"; }
        }
        with (add("group")) {
            alignChildren = ["fill", "fill"];
            margins = kDialogSubPanelMargins;
            with (add("panel")) {
                orientation = "column";
                alignChildren = ["left", "top"];
                margins = kDialogSubPanelMargins;
                for (var itm in optionsArray) {
                    radioButtons[itm] = add("radiobutton", undefined, localize(optionsArray[itm][1]));
                    radioButtons[itm][kListItemObject] = optionsArray[itm][0];
                    if (radioButtons[itm][kListItemObject] == defaultButton) radioButtons[itm].value = true;
                }
            }
        }
        with (add("group")) {
            orientation = "row";
            alignChildren = ["right", "top"];
            margins = kDialogSubPanelMargins;
            add("button", undefined, localize(msgCancel), {name: "cancel"});
            add("button", undefined, localize(msgOK), {name: "ok"});                    
        }
    }
    if (decisionDialog.show() == 2) { return -1; }
    else {
        for (var itm in radioButtons) {
            if (radioButtons[itm].value) return radioButtons[itm][kListItemObject];
        }
        return -1;
    }
}

function documentID(myDocument) {
    if (appVersion > 6) { return myDocument.id; }
    else {
        try { return myDocument.fullName.fullName; }
        catch (e) { return; }
    }
}

function isGraphicOnMaster(myGraphic) {
    var myDocument = documentOfGraphic(myGraphic);
    if (myDocument == null) return false;
    var myOnMaster = false;
    for (var spr = 0; spr < myDocument.masterSpreads.length; spr++) {
        var _mg = myDocument.masterSpreads[spr].allGraphics;
        for (var grc = 0; grc < _mg.length; grc++) {
            if (myGraphic.id == _mg[grc].id) { myOnMaster = true; break; }
        }
        if (myOnMaster) break;
    }
    return myOnMaster;
}

function isGraphicWithinBleeds(myGraphic) {
    try { myGraphic.visibleBounds } catch (e) { return false };
    var myDocument = documentOfGraphic(myGraphic);
    if (myDocument == null) return false;
    var mySpread = null;
    try { mySpread = myGraphic.parent.parentPage.parent; } catch (e) { mySpread = null; }
    if (mySpread == null) {
        try { mySpread = myDocument.pages[0].parent; } catch (e) { return false; }
    }
    if (mySpread == null) return false;
    var myRulerOrigin = myDocument.viewPreferences.rulerOrigin;
    myDocument.viewPreferences.rulerOrigin = RulerOrigin.spreadOrigin;
    var myRawPageBounds = [mySpread.pages[0].bounds, mySpread.pages[-1].bounds];
    var myBleed = [myDocument.documentPreferences.documentBleedTopOffset, myDocument.documentPreferences.documentBleedInsideOrLeftOffset, myDocument.documentPreferences.documentBleedBottomOffset, myDocument.documentPreferences.documentBleedOutsideOrRightOffset]
    var myPagesBounds = [
        myRawPageBounds[0][0] - myBleed[0],
        myRawPageBounds[0][1] - myBleed[1],
        myRawPageBounds[1][2] + myBleed[2],
        myRawPageBounds[1][3] + myBleed[3]];
    var myGraphicBounds = myGraphic.parent.visibleBounds;
    var myOffBleeds = (
        (myGraphicBounds[0] > myPagesBounds[2]) ||
        (myGraphicBounds[1] > myPagesBounds[3]) ||
        (myGraphicBounds[2] < myPagesBounds[0]) ||
        (myGraphicBounds[3] < myPagesBounds[1]));
    myDocument.viewPreferences.rulerOrigin = myRulerOrigin;
    return !myOffBleeds;
}

function isGraphicPasted(myGraphic) { return (myGraphic.itemLink == undefined); }
function isGraphicEmbedded(myGraphic) { return ((!isGraphicPasted(myGraphic)) && (myGraphic.itemLink.status == LinkStatus.LINK_EMBEDDED)); }
function isGraphicRaster(myGraphic) { return (myGraphic.reflect.name == "Image"); }

function isGraphicPhotoshopEPS(myGraphic) {
    var myIsPhotoshopEPS = false;
    try {
        if (myGraphic.imageTypeName == "EPS") {
            var myLinkedFile = new File(myGraphic.itemLink.filePath);
            if (myLinkedFile.open("r")) {
                var str = myLinkedFile.read(2000);
                if (!str || str.length < 50) {
                    myLinkedFile.close();
                    $.sleep(100);
                    if (myLinkedFile.open("r")) {
                        str = myLinkedFile.read(5000);
                    }
                }
                if (str) {
                    myIsPhotoshopEPS = (str.indexOf("Adobe Photoshop") != -1);
                }
                myLinkedFile.close();
            }
        }
    } catch (e) {}
    return myIsPhotoshopEPS;
}

function isGraphicBitmap(myGraphic) {
    try { return (myGraphic.space == "Black and White"); }
    catch (e) { return false; }
}

function graphicFormat(myGraphic) {
    try {
        if (appVersion >= 6) { return myGraphic.imageTypeName; }
        else { return myGraphic.itemLink.linkType; }
    } catch (e) { return false; }
}

function graphicClass(myGraphic) {
    // Класс изображения. Порядок проверок важен: битмап-EPS попадает в EPS,
    // развнедрённый битмап — в развнедрение.
    if (myGraphic[kGraphicsPhotoshopEPS]) { return "eps"; }
    // Развнедрение: путь появляется только во время обработки, поэтому при
    // сканировании встроенные и скопипастченные опознаются по флагам —
    // иначе галочка развнедрения не влияет на список
    if ((myGraphic[kGraphicsUnembedPath] != undefined) && (myGraphic[kGraphicsUnembedPath] != "")) { return "unembed"; }
    if (myGraphic[kGraphicsPasted] || myGraphic[kGraphicsEmbedded]) { return "unembed"; }
    if (myGraphic[kGraphicsBitmap]) { return "bitmap"; }
    if ((myGraphic[kGraphicsFormat] == "TIFF") || (myGraphic[kGraphicsFormat] == "Photoshop")) { return "native"; }
    return "web";
}

function graphicSaveCode(myGraphic) {
    // Код сохранения: 0 — свой формат (на месте), 1 — TIFF, 2 — PSD.
    // EPS, Bitmap и развнедрённые всегда в TIFF; в режиме «все файлы»
    // цель берётся из дропдауна. Контейнер, совпадающий с целью,
    // не перезаписывается.
    var myClass = graphicClass(myGraphic);
    var myTargetTIFF = (preferences[kPrefsChangeTargetFormat] != kChangeFormatToPSD);
    var myTgtExt = "";
    if (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfNone) {
        if (myClass == "eps" || myClass == "unembed" || myClass == "bitmap") { myTgtExt = "tif"; }
    } else if (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfWrong) {
        if (myClass == "web") { myTgtExt = (myTargetTIFF ? "tif" : "psd"); }
        else if (myClass == "eps" || myClass == "unembed" || myClass == "bitmap") { myTgtExt = "tif"; }
    } else if (preferences[kPrefsChangeFormatOf] == kPrefsChangeFormatOfAll) {
        myTgtExt = (myTargetTIFF ? "tif" : "psd");
    }
    if (myTgtExt == "") { return 0; }
    var mySrcExt = "";
    if (myGraphic[kGraphicsFormat] == "TIFF") { mySrcExt = "tif"; }
    else if (myGraphic[kGraphicsFormat] == "Photoshop") { mySrcExt = "psd"; }
    if (mySrcExt == myTgtExt) { return 0; }
    return (myTgtExt == "tif" ? 1 : 2);
}

function isGraphicGrayscale(myGraphic) {
    // Grayscale определяем по space первого вхождения: все вхождения
    // одного файла имеют одинаковый цветовой режим.
    try {
        for (var itm in myGraphic[kGraphicsObjectList]) {
            var _space = String(myGraphic[kGraphicsObjectList][itm][kGraphicsObject].space).toLowerCase();
            return (_space.indexOf("gray") != -1);
        }
    } catch (e) {}
    return false;
}

function isGraphicColorDPILow(myGraphicDPI) {
    if (preferences[kPrefsColorDelta] == 0) { return true; }
    else { return (myGraphicDPI < (preferences[kPrefsColorTargetDPI] - preferences[kPrefsColorDelta])); }
}

function isGraphicColorDPIHigh(myGraphicDPI) {
    if (preferences[kPrefsColorDelta] == 0) { return true; }
    else { return (myGraphicDPI > (preferences[kPrefsColorTargetDPI] + preferences[kPrefsColorDelta])); }
}

function isGraphicBitmapDPILow(myGraphicDPI) { return (myGraphicDPI < (preferences[kPrefsBitmapTargetDPI] - preferences[kPrefsBitmapDelta])); }
function isGraphicBitmapDPIHigh(myGraphicDPI) { return (myGraphicDPI > (preferences[kPrefsBitmapTargetDPI] + preferences[kPrefsBitmapDelta])); }

function actualPPI(myGraphic) {
    try { return [myGraphic.actualPpi[0], myGraphic.actualPpi[1]]; }
    catch (e) { return [0, 0]; }
}

function lowestDPI(myGraphic) {
    var myHorizontalDPI = Math.abs((actualPPI(myGraphic)[0] * 100) / myGraphic.absoluteHorizontalScale);
    var myVerticalDPI = Math.abs((actualPPI(myGraphic)[1] * 100) / myGraphic.absoluteVerticalScale);
    return (myHorizontalDPI < myVerticalDPI ? myHorizontalDPI : myVerticalDPI);
}

function maxPercentage(myGraphic) {
    var myHorizontalPercent = Math.abs((myGraphic.absoluteHorizontalScale / 100) * (myGraphic.parent.absoluteHorizontalScale / 100));
    var myVerticalPercent = Math.abs((myGraphic.absoluteVerticalScale / 100) * (myGraphic.parent.absoluteVerticalScale / 100));
    return (myHorizontalPercent > myVerticalPercent ? myHorizontalPercent : myVerticalPercent);
}

function hasClippingPath(myGraphic) { return (myGraphic.clippingPath.clippingType != ClippingPathType.NONE); }

function documentOfGraphic(myGraphic) {
    var myParentDocument = myGraphic.parent;
    var _guard = 0;
    while (myParentDocument != null && myParentDocument.reflect.name != "Document") {
        myParentDocument = myParentDocument.parent;
        if (++_guard > 1000) return null;
    }
    return myParentDocument;
}

function pageOfGraphic(myGraphic) {
    function spreadName(mySpread) {
        var name = "PB:";
        try {
            for (var pge = 0; pge < mySpread.pages.length; pge++) {
                name = name + mySpread.pages[pge].name;
                if (pge + 1 < mySpread.pages.length) { name = name + "-"; }
            }
            return name;
        } catch (e) { return "OFF"; }
    }
    function getParentPage() {
        var myParentObject = myGraphic.parent;
        while ((myParentObject.reflect.name != "Page") && (myParentObject.reflect.name != "Spread") && (myParentObject.reflect.name != "Document")) {
            myParentObject = myParentObject.parent;
        }
        return (myParentObject.reflect.name == "Page" ? myParentObject.name : spreadName(myParentObject));
    }
    if (appVersion >= 6) {
        try { return myGraphic.parent.parentPage.name; }
        catch (e) { return getParentPage(); }
    } else { return getParentPage(); }
}

function dictionaryLength(dictionaryObject) {
    var myLength = 0;
    for (var key in dictionaryObject) { if (dictionaryObject.hasOwnProperty(key)) myLength++; }
    return myLength;
};

function fillZeros(myNumber, myMinDigits) {
    var myString = "" + myNumber;
    while (myString.length < myMinDigits) { myString = "0" + myString; }
    return myString;
}

function truncateFileName(name, maxLen) {
    if (!name || name.length <= maxLen) return name;
    var dot = name.lastIndexOf(".");
    if (dot > 0 && dot >= maxLen - 10 && (name.length - dot) <= 8) {
        var ext = name.substr(dot);
        var baseMax = maxLen - ext.length - 2;
        if (baseMax >= 5) {
            return name.substr(0, baseMax) + ".." + ext;
        }
    }
    return name.substr(0, maxLen - 2) + "..";
}

function uniqueFileName(myFolderName, myFileName) {
    var myFile = new File(myFolderName + "/" + myFileName);
    var i = 1;
    while (myFile.exists) {
        myFile = new File(myFolderName + "/" + myFileName.substr(0, myFileName.lastIndexOf(".")) + " " + i + myFileName.substr(myFileName.lastIndexOf("."), myFileName.length));
        i++;
    }
    return myFile;
}

function isFolderReadOnly(myFolder) {
    try {
        var myTestFile = new File(myFolder.absoluteURI + "/.readonlytest");
        if (myTestFile.open("w")) { myTestFile.close(); myTestFile.remove(); return false; }
        else { return true; }
    } catch (e) { return true; }
}

function cleanupPath(myPath) { return myPath.replace(/[:]/g, "-"); }

function cloneDictionary(obj) {
    if (!(obj instanceof dictionary)) return obj;
    var copy = new dictionary();
    for (var key in obj) { copy[key] = cloneDictionary(obj[key]); }
    return copy;
}

function debugPrintObject(f) {
    $.writeln("\n\n" + f.reflect.name + "\n----------------------------------------------------------");
    var props = f.reflect.properties;
    var array = [];
    for (var i = 0; i < props.length; i++) { try {array.push(props[i].name + ": " + f[props[i].name])} catch (_){} }
    array.sort();
    $.writeln(array.join("\r"));
    $.writeln("\rMethods");
    for (var i = 0; i < props.length; i++) { $.writeln (props[i].name); }
}

function buildPageRegistry() {
    pageRegistry = [];
    pageRegistryBuilt = false;
    try {
        if (activeDocument == undefined || documents[activeDocument] == undefined) return;
        var docPages = documents[activeDocument][kDocumentsObject].pages;
        for (var i = 0; i < docPages.length; i++) {
            var lbl = "";
            try { lbl = docPages[i].name; } catch (eName) { lbl = ""; }
            if (lbl == "") lbl = String(i + 1);
            pageRegistry.push([lbl, i]);
        }
        pageRegistryBuilt = true;
    } catch (e) {
        pageRegistry = [];
        pageRegistryBuilt = false;
    }
}

function findPageOffset(label) {
    if (!pageRegistryBuilt) return -1;
    for (var i = 0; i < pageRegistry.length; i++) {
        if (pageRegistry[i][0] === label) return pageRegistry[i][1];
    }
    var colonIdx = label.indexOf(":");
    if (colonIdx >= 0) {
        var tail = label.substring(colonIdx + 1);
        for (var j = 0; j < pageRegistry.length; j++) {
            if (pageRegistry[j][0] === tail) return pageRegistry[j][1];
        }
    }
    return -1;
}

function pageOffsetInRange(offset, ranges) {
    for (var i = 0; i < ranges.length; i++) {
        if (offset >= ranges[i][0] && offset <= ranges[i][1]) return true;
    }
    return false;
}

function resolveRangeToken(token, absolute) {
    if (absolute) {
        if (!/^\d+$/.test(token)) return -1;
        var absNum = parseInt(token, 10);
        if (isNaN(absNum) || absNum < 1) return -1;
        return absNum - 1;
    }
    return findPageOffset(token);
}

function offsetOfGraphic(myGraphicObj) {
    try {
        var parentPageObj = myGraphicObj.parent.parentPage;
        if (parentPageObj != null && parentPageObj.isValid) return parentPageObj.documentOffset;
    } catch (e) {}
    try {
        var myParentObject = myGraphicObj.parent;
        var hops = 0;
        while (myParentObject != null && hops < 100) {
            try {
                if (myParentObject.reflect.name == "Page") return myParentObject.documentOffset;
            } catch (e2) { return -1; }
            myParentObject = myParentObject.parent;
            hops++;
        }
    } catch (e) {}
    return -1;
}

// Диапазон страниц в семантике диалога печати InDesign.
// Точная метка проверяется раньше разбиения по дефису (метки могут
// содержать дефис и двоеточие: «Sec2-7», «SecA:5»). Диапазон —
// позиционный: «a-10» = все полосы от метки a до полосы 10 включительно.
// «+N» — абсолютная нумерация (позиция в документе). Регистр и ведущие
// нули строгие. Неразрешимый токен пропускается; пустой результат
// означает пустой список, а не «всё подряд».
function parsePageRange(str) {
    if (str !== undefined && str !== null && pageRangeCacheResult !== null && pageRangeCacheText === ("" + str)) {
        return pageRangeCacheResult;
    }
    var ranges = [];
    pageRangeUnknown = {};
    if (pageRegistryBuilt && str !== undefined && str !== null) {
        var text = ("" + str).replace(/\s+/g, "");
        if (text != "") {
            var parts = text.split(",");
for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                var _origPart = part;
                if (part === "") continue;
                var exactOffset = findPageOffset(part);
                if (exactOffset >= 0) { ranges.push([exactOffset, exactOffset]); continue; }
                var absStart = false;
                if (part.charAt(0) == "+") { absStart = true; part = part.substring(1); }
                var dashIdx = part.indexOf("-");
                var startTok, endTok, absEnd = false;
                if (dashIdx >= 0) {
                    startTok = part.substring(0, dashIdx);
                    endTok = part.substring(dashIdx + 1);
                    if (endTok.charAt(0) == "+") { absEnd = true; endTok = endTok.substring(1); }
                } else {
                    startTok = part;
                    endTok = part;
                }
if (startTok === "" || endTok === "") { pageRangeUnknown[_origPart] = true; continue; }
                var offStart = resolveRangeToken(startTok, absStart);
                var offEnd = resolveRangeToken(endTok, absEnd);
if (offStart < 0 || offEnd < 0) { pageRangeUnknown[_origPart] = true; continue; }
                if (offStart > offEnd) { var tmp = offStart; offStart = offEnd; offEnd = tmp; }
                ranges.push([offStart, offEnd]);
            }
        }
    }
    if (str !== undefined && str !== null) {
        pageRangeCacheText = "" + str;
        pageRangeCacheResult = ranges;
    }
    return ranges;
}

function getDocumentPageRange(doc) {
    try {
        if (!doc || doc.pages.length == 0) return "";
        var labels = [];
        var seen = {};
        var dup = false;
        for (var p = 0; p < doc.pages.length; p++) {
            var lbl = "";
            try { lbl = doc.pages[p].name; } catch (eName) { lbl = ""; }
            if (lbl == "") lbl = String(p + 1);
            if (seen[lbl] !== undefined) dup = true;
            seen[lbl] = true;
            labels.push(lbl);
        }
        if (dup) return "+1-+" + doc.pages.length;
        if (labels.length == 1) return labels[0];
        return labels[0] + "-" + labels[labels.length - 1];
    } catch (e) {
        return "";
    }
}