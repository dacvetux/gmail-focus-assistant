function setupControlSurfacePhase10() {
  const spreadsheet = getLogSpreadsheet_();
  getOrCreatePreferencesSheet_();
  getOrCreateDigestSettingsSheet_();
  getOrCreateNewsSourcesSheet_();
  getOrCreateApprovedRulesSheet_();
  getOrCreateTuningSuggestionsSheet_();
  getOrCreateOperatorGuideSheet_();
  const uxSummary = applyControlSurfaceOptionAUx_();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'setupControlSurfacePhase10',
    processedThreads: 0,
    itemCount: uxSummary.sheetCount,
    outcome: 'sheets-ready',
    notes: uxSummary.notes
  });

  return {
    spreadsheetId: spreadsheet.getId(),
    sheetsReady: uxSummary.sheetsReady,
    validationsApplied: uxSummary.validationsApplied,
    guideUpdated: uxSummary.guideUpdated
  };
}

function upgradeControlSurfacePhase10OptionA() {
  getOrCreatePreferencesSheet_();
  getOrCreateDigestSettingsSheet_();
  getOrCreateNewsSourcesSheet_();
  getOrCreateApprovedRulesSheet_();
  getOrCreateTuningSuggestionsSheet_();
  getOrCreateOperatorGuideSheet_();

  const summary = applyControlSurfaceOptionAUx_();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'upgradeControlSurfacePhase10OptionA',
    processedThreads: 0,
    itemCount: summary.validationsApplied,
    outcome: 'option-a-ux-ready',
    notes: summary.notes
  });

  return summary;
}

function getPreferenceValue_(key, fallbackValue) {
  const map = readPreferencesMap_();
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    return fallbackValue;
  }

  return coercePreferenceValue_(map[key], fallbackValue);
}

function readPreferencesMap_() {
  const sheet = getOrCreatePreferencesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
  const result = {};
  values.forEach(row => {
    const key = (row[0] || '').trim();
    const value = row[1];
    const enabled = String(row[3] || '').trim().toLowerCase();
    if (!key) return;
    if (enabled && enabled !== 'yes' && enabled !== 'true' && enabled !== '1') return;
    result[key] = value;
  });
  return result;
}

function coercePreferenceValue_(value, fallbackValue) {
  if (typeof fallbackValue === 'boolean') {
    return /^(true|yes|1)$/i.test(String(value || '').trim());
  }

  if (typeof fallbackValue === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
  }

  return value === '' || value === null || value === undefined ? fallbackValue : value;
}

function getOrCreatePreferencesSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('Preferences');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('Preferences');
    sheet.getRange(1, 1, 1, 4).setValues([['Key', 'Value', 'Description', 'Enabled']]);
    sheet.getRange(2, 1, 7, 4).setValues([
      ['dryRun', 'true', 'Default dry-run mode for generic entrypoints', 'yes'],
      ['enableAiForReview', 'true', 'Allow Phase 4 AI review on ambiguous mail', 'yes'],
      ['maxThreads', '100', 'Default processing thread limit', 'yes'],
      ['digestThreadLimitPerSection', '8', 'Main digest items shown per section', 'yes'],
      ['newsDigestThreadLimit', '12', 'News digest items shown', 'yes'],
      ['digestRecipient', '', 'Optional recipient for live digest emails', 'yes'],
      ['newsWorkflowLabel', '2: FYI', 'Workflow label used for news items', 'yes']
    ]);
  }

  return sheet;
}

function getOrCreateDigestSettingsSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('DigestSettings');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('DigestSettings');
    sheet.getRange(1, 1, 1, 5).setValues([['Digest Type', 'Enabled', 'Lookback Query', 'Thread Limit', 'Notes']]);
    sheet.getRange(2, 1, 4, 5).setValues([
      ['morning', 'yes', 'newer_than:1d', '8', 'Main action digest'],
      ['evening', 'yes', 'newer_than:1d', '8', 'Main action digest'],
      ['news-morning', 'yes', 'newer_than:1d', '12', 'News digest'],
      ['news-evening', 'yes', 'newer_than:1d', '12', 'News digest']
    ]);
  }

  return sheet;
}

function getOrCreateNewsSourcesSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('NewsSources');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('NewsSources');
    sheet.getRange(1, 1, 1, 5).setValues([['Source', 'Type', 'Action', 'Enabled', 'Notes']]);
    sheet.getRange(2, 1, 6, 5).setValues([
      ['newsletters@email.reuters.com', 'sender', 'news', 'yes', 'Reuters news digest'],
      ['newsletters@e.economist.com', 'sender', 'news', 'yes', 'Economist newsletters'],
      ['noreply@e.economist.com', 'sender', 'news', 'yes', 'Economist mail'],
      ['newsletters-noreply@linkedin.com', 'sender', 'news', 'yes', 'Publisher/newsletter traffic via LinkedIn'],
      ['news@mail.xing.com', 'sender', 'news', 'yes', 'XING news digests'],
      ['messaging-digest-noreply@linkedin.com', 'sender', 'exclude', 'yes', 'Not news; LinkedIn messaging digest']
    ]);
  }

  return sheet;
}

function getOrCreateApprovedRulesSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('ApprovedRules');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('ApprovedRules');
    sheet.getRange(1, 1, 1, 7).setValues([['Category', 'Target', 'Action', 'Approved', 'Applied In Code', 'Added On', 'Notes']]);
    sheet.getRange(2, 1, 1, 7).setValues([['shipping-sender', 'willhaben.at', 'add', 'yes', 'seeded', new Date(), 'Marketplace / PayLivery transactional mail should route to shipping']]);
    return sheet;
  }

  if (sheet.getLastRow() === 1) {
    sheet.getRange(2, 1, 1, 7).setValues([['shipping-sender', 'willhaben.at', 'add', 'yes', 'seeded', new Date(), 'Marketplace / PayLivery transactional mail should route to shipping']]);
  }

  return sheet;
}

function getOrCreateOperatorGuideSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('OperatorGuide');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('OperatorGuide');
  }

  const rows = [
    ['Section', 'What this sheet is for', 'How to use it', 'Allowed values / examples', 'Notes'],
    ['Preferences', 'Top-level runtime parameters', 'Edit Value and keep Enabled=yes for active settings', 'dryRun=true/false; maxThreads=100', 'Use this for global behavior, not sender-specific tuning'],
    ['DigestSettings', 'Enable/disable digest types and per-digest limits', 'Set Enabled to yes/no and tune thread limits conservatively', 'morning, evening, news-morning, news-evening', 'If disabled, wrappers log digest-disabled instead of sending'],
    ['NewsSources', 'Explicit allow/exclude list for news senders', 'One sender per row; Action=news or exclude', 'Type=sender; Action=news|exclude; Enabled=yes|no', 'Use exclude for digest traffic that looks newsletter-like but should stay out'],
    ['TuningSuggestions', 'Review queue for proposed sender/routing changes', 'Change Status from new to approved/rejected/superseded after review', 'Status=new|approved|rejected|imported|already-imported|skipped|superseded', 'Approved rows can be imported into ApprovedRules'],
    ['ApprovedRules', 'Runtime rules already approved by the operator', 'One rule per row; keep Approved=yes for active rules', 'Category=shipping-sender/commercial-sender/important-sender/fyi-sender/news-sender/news-exclude-sender; Action=add|remove', 'This is the live Option A control surface that affects runtime config'],
    ['Recommended workflow', 'Use Sheets as the primary operator UI for now', '1) review TuningSuggestions 2) mark approved/rejected 3) run syncApprovedRulesFromTuningSuggestionsPhase10 4) refresh config / let wrappers refresh automatically', 'Option A now; Option B HTML UI later', 'Only move to the HTML phase once this workflow feels ~90% finalized']
  ];

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  styleControlSurfaceSheet_(sheet, [140, 260, 320, 320, 260]);
  return sheet;
}

function readApprovedRules_() {
  const sheet = getOrCreateApprovedRulesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
  return values.map((row, index) => ({
    rowNumber: index + 2,
    category: String(row[0] || '').trim(),
    target: String(row[1] || '').trim().toLowerCase(),
    action: String(row[2] || '').trim().toLowerCase(),
    approved: String(row[3] || '').trim().toLowerCase(),
    appliedInCode: String(row[4] || '').trim(),
    addedOn: row[5],
    notes: String(row[6] || '').trim()
  }));
}

function isAffirmativeFlag_(value) {
  return !value || value === 'yes' || value === 'true' || value === '1' || value === 'approved' || value === 'approve';
}

function resolveApprovedRuleConfigField_(category) {
  switch (String(category || '').trim()) {
    case 'commercial-sender':
    case 'forceCommercialSenders':
      return 'forceCommercialSenders';
    case 'important-sender':
    case 'forceImportantSenders':
      return 'forceImportantSenders';
    case 'shipping-sender':
    case 'forceShippingSenders':
      return 'forceShippingSenders';
    case 'fyi-sender':
    case 'forceFyiSenders':
      return 'forceFyiSenders';
    case 'news-sender':
    case 'newsSenders':
      return 'newsSenders';
    case 'news-exclude-sender':
    case 'newsExcludedSenders':
      return 'newsExcludedSenders';
    default:
      return '';
  }
}

function appendUniqueConfigValue_(fieldName, value) {
  if (!fieldName || !value) return false;
  if (!Array.isArray(CONFIG[fieldName])) return false;
  if (CONFIG[fieldName].includes(value)) return false;
  CONFIG[fieldName].push(value);
  return true;
}

function removeConfigValue_(fieldName, value) {
  if (!fieldName || !value) return false;
  if (!Array.isArray(CONFIG[fieldName])) return false;
  const originalLength = CONFIG[fieldName].length;
  CONFIG[fieldName] = CONFIG[fieldName].filter(entry => entry !== value);
  return CONFIG[fieldName].length !== originalLength;
}

function applyApprovedRuleAction_(fieldName, action, target) {
  if (action === 'remove' || action === 'delete') {
    return removeConfigValue_(fieldName, target);
  }

  return appendUniqueConfigValue_(fieldName, target);
}

function applyApprovedRulesToConfig_() {
  const rows = readApprovedRules_();
  let appliedCount = 0;

  rows.forEach(row => {
    const fieldName = resolveApprovedRuleConfigField_(row.category);
    if (!fieldName || !row.target) return;
    if (row.action && row.action !== 'add' && row.action !== 'remove' && row.action !== 'delete') return;
    if (!isAffirmativeFlag_(row.approved)) return;

    if (applyApprovedRuleAction_(fieldName, row.action || 'add', row.target)) {
      appliedCount += 1;
    }
  });

  return {
    appliedCount: appliedCount,
    approvedCount: rows.filter(row => isAffirmativeFlag_(row.approved)).length
  };
}

function mapTuningSuggestionCategoryToApprovedRule_(category) {
  switch (category) {
    case 'commercial-override-candidate':
      return 'commercial-sender';
    case 'important-service-candidate':
      return 'important-sender';
    case 'low-priority-fyi-sender-candidate':
      return 'fyi-sender';
    case 'shipping-pattern-candidate':
    case 'marketplace-shipping-candidate':
      return 'shipping-sender';
    case 'finance-pattern-candidate':
      return 'important-sender';
    default:
      return '';
  }
}

function syncApprovedRulesFromTuningSuggestionsPhase10() {
  const tuningSheet = getOrCreateTuningSuggestionsSheet_();
  const approvedRulesSheet = getOrCreateApprovedRulesSheet_();
  const tuningLastRow = tuningSheet.getLastRow();
  const existingRules = readApprovedRules_();
  const existingKeys = {};
  existingRules.forEach(row => {
    existingKeys[`${row.category}::${row.target}`] = true;
  });

  if (tuningLastRow <= 1) {
    logRunSummary_({
      runType: 'control-surface',
      mode: 'internal',
      entryPoint: 'syncApprovedRulesFromTuningSuggestionsPhase10',
      processedThreads: 0,
      itemCount: 0,
      outcome: 'no-approved-suggestions',
      notes: 'TuningSuggestions contains no reviewable rows'
    });

    return {
      importedCount: 0,
      skippedCount: 0
    };
  }

  const tuningValues = tuningSheet.getRange(2, 1, tuningLastRow - 1, 11).getDisplayValues();
  const rowsToAppend = [];
  let importedCount = 0;
  let skippedCount = 0;

  tuningValues.forEach((row, index) => {
    const category = String(row[1] || '').trim();
    const target = String(row[3] || '').trim().toLowerCase();
    const status = String(row[9] || '').trim().toLowerCase();
    const notes = String(row[10] || '').trim();
    const approvedCategory = mapTuningSuggestionCategoryToApprovedRule_(category);
    const rowNumber = index + 2;
    const importNotePrefix = `Imported ${new Date().toISOString().slice(0, 10)} from tuning suggestion category ${category}`;

    if (!isAffirmativeFlag_(status)) return;
    if (!approvedCategory || !target) {
      tuningSheet.getRange(rowNumber, 10).setValue('skipped');
      tuningSheet.getRange(rowNumber, 11).setValue(notes ? `${notes}; unsupported approved action` : 'unsupported approved action');
      skippedCount += 1;
      return;
    }

    const key = `${approvedCategory}::${target}`;
    if (existingKeys[key]) {
      tuningSheet.getRange(rowNumber, 10).setValue('already-imported');
      tuningSheet.getRange(rowNumber, 11).setValue(notes ? `${notes}; already imported into ApprovedRules` : 'already imported into ApprovedRules');
      skippedCount += 1;
      return;
    }

    rowsToAppend.push([
      approvedCategory,
      target,
      'add',
      'yes',
      'runtime',
      new Date(),
      notes ? `${notes}; ${importNotePrefix}` : importNotePrefix
    ]);
    tuningSheet.getRange(rowNumber, 10).setValue('imported');
    tuningSheet.getRange(rowNumber, 11).setValue(notes ? `${notes}; imported into ApprovedRules` : 'imported into ApprovedRules');
    existingKeys[key] = true;
    importedCount += 1;
  });

  if (rowsToAppend.length) {
    approvedRulesSheet.getRange(approvedRulesSheet.getLastRow() + 1, 1, rowsToAppend.length, 7).setValues(rowsToAppend);
  }

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'syncApprovedRulesFromTuningSuggestionsPhase10',
    processedThreads: tuningLastRow - 1,
    itemCount: importedCount,
    outcome: importedCount ? 'approved-suggestions-imported' : 'no-approved-suggestions',
    notes: `imported=${importedCount}; skipped=${skippedCount}`
  });

  return {
    importedCount: importedCount,
    skippedCount: skippedCount
  };
}

function applyControlSurfaceOptionAUx_() {
  const preferencesSheet = getOrCreatePreferencesSheet_();
  const digestSettingsSheet = getOrCreateDigestSettingsSheet_();
  const newsSourcesSheet = getOrCreateNewsSourcesSheet_();
  const approvedRulesSheet = getOrCreateApprovedRulesSheet_();
  const tuningSuggestionsSheet = getOrCreateTuningSuggestionsSheet_();
  const operatorGuideSheet = getOrCreateOperatorGuideSheet_();

  let validationsApplied = 0;
  validationsApplied += configurePreferencesSheetUx_(preferencesSheet);
  validationsApplied += configureDigestSettingsSheetUx_(digestSettingsSheet);
  validationsApplied += configureNewsSourcesSheetUx_(newsSourcesSheet);
  validationsApplied += configureApprovedRulesSheetUx_(approvedRulesSheet);
  validationsApplied += configureTuningSuggestionsSheetUx_(tuningSuggestionsSheet);
  styleControlSurfaceSheet_(operatorGuideSheet, [140, 260, 320, 320, 260]);

  return {
    sheetsReady: ['Preferences', 'DigestSettings', 'NewsSources', 'ApprovedRules', 'TuningSuggestions', 'OperatorGuide'],
    sheetCount: 6,
    validationsApplied: validationsApplied,
    guideUpdated: true,
    notes: `Option A UX prepared across 6 sheets; validations-applied=${validationsApplied}`
  };
}

function configurePreferencesSheetUx_(sheet) {
  styleControlSurfaceSheet_(sheet, [220, 160, 380, 100]);
  setHeaderNotes_(sheet, {
    1: 'Stable config key read by runtime refresh.',
    2: 'Editable value. Booleans accept true/false/yes/no. Numbers accept numeric text.',
    3: 'Why this setting exists and how it affects behavior.',
    4: 'Only enabled rows are applied at runtime.'
  });

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  setDropdownValidation_(sheet, 2, 4, rowCount, ['yes', 'no']);
  return 1;
}

function configureDigestSettingsSheetUx_(sheet) {
  styleControlSurfaceSheet_(sheet, [150, 100, 260, 120, 320]);
  setHeaderNotes_(sheet, {
    1: 'Canonical digest type. Keep existing values unless code adds a new digest.',
    2: 'Set to yes/no to allow or disable this digest type.',
    3: 'Optional Gmail search hint retained for operator context.',
    4: 'Per-digest thread limit override. Leave blank to fall back to config.',
    5: 'Human notes for why this digest is enabled or constrained.'
  });

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  setDropdownValidation_(sheet, 2, 2, rowCount, ['yes', 'no']);
  return 1;
}

function configureNewsSourcesSheetUx_(sheet) {
  styleControlSurfaceSheet_(sheet, [260, 100, 120, 100, 320]);
  setHeaderNotes_(sheet, {
    1: 'Sender email/domain fragment used for news routing.',
    2: 'Currently only sender rows are supported.',
    3: 'news = include in news lane, exclude = explicitly keep out of news lane.',
    4: 'Only enabled rows are applied at runtime.',
    5: 'Short explanation for future review.'
  });

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  setDropdownValidation_(sheet, 2, 2, rowCount, ['sender']);
  setDropdownValidation_(sheet, 2, 3, rowCount, ['news', 'exclude']);
  setDropdownValidation_(sheet, 2, 4, rowCount, ['yes', 'no']);
  return 3;
}

function configureApprovedRulesSheetUx_(sheet) {
  styleControlSurfaceSheet_(sheet, [180, 220, 120, 110, 130, 120, 360]);
  setHeaderNotes_(sheet, {
    1: 'Operator-friendly rule category. These map into runtime config arrays.',
    2: 'Usually a sender/domain fragment to add or remove.',
    3: 'add = include in runtime config; remove = subtract from runtime config.',
    4: 'Only affirmative values are applied at runtime. Prefer yes/no for clarity.',
    5: 'Trace whether the row was seeded, imported, or added manually.',
    6: 'Date the rule was created or imported.',
    7: 'Context, rationale, or provenance for future review.'
  });

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  setDropdownValidation_(sheet, 2, 1, rowCount, [
    'shipping-sender',
    'commercial-sender',
    'important-sender',
    'fyi-sender',
    'news-sender',
    'news-exclude-sender'
  ]);
  setDropdownValidation_(sheet, 2, 3, rowCount, ['add', 'remove']);
  setDropdownValidation_(sheet, 2, 4, rowCount, ['yes', 'no']);
  normalizeBlankCellRange_(sheet, 2, 3, 'add');
  return 3;
}

function configureTuningSuggestionsSheetUx_(sheet) {
  styleControlSurfaceSheet_(sheet, [120, 210, 220, 220, 120, 100, 240, 280, 320, 140, 360]);
  setHeaderNotes_(sheet, {
    2: 'Suggestion family generated from recent evidence.',
    3: 'Human-readable recommendation. This is not applied automatically.',
    4: 'Usually the sender/domain to review.',
    5: 'How many supporting review-bucket examples were seen.',
    6: 'Heuristic confidence only; still requires operator judgment.',
    7: 'Representative From field from the evidence set.',
    8: 'Representative subject from the evidence set.',
    9: 'Reason the suggestion exists.',
    10: 'Operator workflow state. Move from new -> approved/rejected/superseded.',
    11: 'Freeform operator notes plus import provenance.'
  });

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  setDropdownValidation_(sheet, 2, 10, rowCount, [
    'new',
    'approved',
    'rejected',
    'imported',
    'already-imported',
    'skipped',
    'superseded',
    'reclassified-shipping'
  ]);
  normalizeBlankCellRange_(sheet, 2, 10, 'new');
  return 1;
}

function styleControlSurfaceSheet_(sheet, widths) {
  if (!sheet) return;
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn() || widths.length).setFontWeight('bold').setBackground('#d9ead3');
  (widths || []).forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
}

function setHeaderNotes_(sheet, notesByColumn) {
  Object.keys(notesByColumn || {}).forEach(key => {
    const column = Number(key);
    if (!Number.isFinite(column) || column < 1) return;
    sheet.getRange(1, column).setNote(notesByColumn[key]);
  });
}

function setDropdownValidation_(sheet, startRow, column, rowCount, values) {
  if (!sheet || !values || !values.length) return;
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(startRow, column, rowCount, 1).setDataValidation(validation);
}

function normalizeBlankCellRange_(sheet, startRow, column, defaultValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const range = sheet.getRange(startRow, column, lastRow - startRow + 1, 1);
  const values = range.getDisplayValues();
  let changed = false;

  values.forEach(row => {
    if (!String(row[0] || '').trim()) {
      row[0] = defaultValue;
      changed = true;
    }
  });

  if (changed) {
    range.setValues(values);
  }
}

function readDigestSettingsMap_() {
  const sheet = getOrCreateDigestSettingsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues();
  const result = {};

  values.forEach(row => {
    const digestType = (row[0] || '').trim();
    const enabled = String(row[1] || '').trim().toLowerCase();
    const lookbackQuery = (row[2] || '').trim();
    const threadLimit = Number(row[3]);
    const notes = (row[4] || '').trim();

    if (!digestType) return;

    result[digestType] = {
      enabled: !enabled || enabled === 'yes' || enabled === 'true' || enabled === '1',
      lookbackQuery: lookbackQuery || 'newer_than:1d',
      threadLimit: Number.isFinite(threadLimit) && threadLimit > 0 ? threadLimit : null,
      notes: notes
    };
  });

  return result;
}

function getDigestSetting_(digestType) {
  const settings = readDigestSettingsMap_();
  return settings[digestType] || {
    enabled: true,
    lookbackQuery: 'newer_than:1d',
    threadLimit: null,
    notes: ''
  };
}

function readNewsSourceConfig_() {
  const sheet = getOrCreateNewsSourcesSheet_();
  const lastRow = sheet.getLastRow();
  const fallback = {
    senders: (CONFIG.newsSenders || []).slice(),
    excludedSenders: (CONFIG.newsExcludedSenders || []).slice()
  };

  if (lastRow <= 1) return fallback;

  const values = sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues();
  const senders = [];
  const excludedSenders = [];

  values.forEach(row => {
    const source = String(row[0] || '').trim().toLowerCase();
    const type = String(row[1] || '').trim().toLowerCase();
    const action = String(row[2] || '').trim().toLowerCase();
    const enabled = String(row[3] || '').trim().toLowerCase();

    if (!source || type !== 'sender') return;
    if (enabled && enabled !== 'yes' && enabled !== 'true' && enabled !== '1') return;

    if (action === 'exclude') {
      excludedSenders.push(source);
      return;
    }

    if (action === 'news') {
      senders.push(source);
    }
  });

  return {
    senders: senders.length ? senders : fallback.senders,
    excludedSenders: excludedSenders.length ? excludedSenders : fallback.excludedSenders
  };
}

function refreshConfigFromPreferencesPhase10() {
  return refreshConfigFromPreferencesPhase10_();
}

function refreshConfigFromPreferencesPhase10_(options) {
  const settings = options || {};
  CONFIG.dryRun = getPreferenceValue_('dryRun', CONFIG.dryRun);
  CONFIG.enableAiForReview = getPreferenceValue_('enableAiForReview', CONFIG.enableAiForReview);
  CONFIG.maxThreads = getPreferenceValue_('maxThreads', CONFIG.maxThreads);
  CONFIG.digestThreadLimitPerSection = getPreferenceValue_('digestThreadLimitPerSection', CONFIG.digestThreadLimitPerSection);
  CONFIG.newsDigestThreadLimit = getPreferenceValue_('newsDigestThreadLimit', CONFIG.newsDigestThreadLimit);
  CONFIG.digestRecipient = getPreferenceValue_('digestRecipient', CONFIG.digestRecipient);
  CONFIG.newsWorkflowLabel = getPreferenceValue_('newsWorkflowLabel', CONFIG.newsWorkflowLabel);

  const newsConfig = readNewsSourceConfig_();
  CONFIG.newsSenders = newsConfig.senders;
  CONFIG.newsExcludedSenders = newsConfig.excludedSenders;

  const approvedRulesSummary = applyApprovedRulesToConfig_();

  if (!settings.suppressLog) {
    logRunSummary_({
      runType: 'control-surface',
      mode: 'internal',
      entryPoint: 'refreshConfigFromPreferencesPhase10',
      processedThreads: 0,
      itemCount: 9 + approvedRulesSummary.appliedCount,
      outcome: 'preferences-loaded',
      notes: `Loaded preferences plus news sources (${CONFIG.newsSenders.length} includes, ${CONFIG.newsExcludedSenders.length} excludes); approved-rules-applied=${approvedRulesSummary.appliedCount}`
    });
  }

  return {
    dryRun: CONFIG.dryRun,
    enableAiForReview: CONFIG.enableAiForReview,
    maxThreads: CONFIG.maxThreads,
    digestThreadLimitPerSection: CONFIG.digestThreadLimitPerSection,
    newsDigestThreadLimit: CONFIG.newsDigestThreadLimit,
    digestRecipient: CONFIG.digestRecipient,
    newsWorkflowLabel: CONFIG.newsWorkflowLabel,
    newsSenders: CONFIG.newsSenders,
    newsExcludedSenders: CONFIG.newsExcludedSenders,
    approvedRulesApplied: approvedRulesSummary.appliedCount,
    approvedRulesConfigured: approvedRulesSummary.approvedCount
  };
}
