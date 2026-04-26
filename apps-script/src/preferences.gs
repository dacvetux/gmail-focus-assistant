function setupControlSurfacePhase10() {
  const spreadsheet = getLogSpreadsheet_();
  getOrCreatePreferencesSheet_();
  getOrCreateDigestSettingsSheet_();
  getOrCreateNewsSourcesSheet_();
  getOrCreateApprovedRulesSheet_();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'setupControlSurfacePhase10',
    processedThreads: 0,
    itemCount: 4,
    outcome: 'sheets-ready',
    notes: 'Preferences, DigestSettings, NewsSources, ApprovedRules ensured'
  });

  return {
    spreadsheetId: spreadsheet.getId(),
    sheetsReady: ['Preferences', 'DigestSettings', 'NewsSources', 'ApprovedRules']
  };
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
    sheet.getRange(2, 1, 1, 7).setValues([['forceShippingSenders', 'willhaben.at', 'add', 'yes', 'seeded', new Date(), 'Marketplace / PayLivery transactional mail should route to shipping']]);
    return sheet;
  }

  if (sheet.getLastRow() === 1) {
    sheet.getRange(2, 1, 1, 7).setValues([['forceShippingSenders', 'willhaben.at', 'add', 'yes', 'seeded', new Date(), 'Marketplace / PayLivery transactional mail should route to shipping']]);
  }

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

function appendUniqueConfigValue_(fieldName, value) {
  if (!fieldName || !value) return false;
  if (!Array.isArray(CONFIG[fieldName])) return false;
  if (CONFIG[fieldName].includes(value)) return false;
  CONFIG[fieldName].push(value);
  return true;
}

function applyApprovedRulesToConfig_() {
  const allowedCategories = [
    'forceCommercialSenders',
    'forceImportantSenders',
    'forceShippingSenders',
    'forceFyiSenders',
    'newsSenders',
    'newsExcludedSenders'
  ];

  const rows = readApprovedRules_();
  let appliedCount = 0;

  rows.forEach(row => {
    if (!row.category || !row.target) return;
    if (!allowedCategories.includes(row.category)) return;
    if (row.action && row.action !== 'add') return;
    if (row.approved && row.approved !== 'yes' && row.approved !== 'true' && row.approved !== '1') return;

    if (appendUniqueConfigValue_(row.category, row.target)) {
      appliedCount += 1;
    }
  });

  return {
    appliedCount: appliedCount,
    approvedCount: rows.filter(row => row.approved === 'yes' || row.approved === 'true' || row.approved === '1').length
  };
}

function mapTuningSuggestionCategoryToApprovedRule_(category) {
  switch (category) {
    case 'commercial-override-candidate':
      return 'forceCommercialSenders';
    case 'important-service-candidate':
      return 'forceImportantSenders';
    case 'low-priority-fyi-sender-candidate':
      return 'forceFyiSenders';
    case 'shipping-pattern-candidate':
    case 'marketplace-shipping-candidate':
      return 'forceShippingSenders';
    case 'finance-pattern-candidate':
      return 'forceImportantSenders';
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

    if (status !== 'approved') return;
    if (!approvedCategory || !target) {
      tuningSheet.getRange(index + 2, 10).setValue('skipped');
      skippedCount += 1;
      return;
    }

    const key = `${approvedCategory}::${target}`;
    if (existingKeys[key]) {
      tuningSheet.getRange(index + 2, 10).setValue('already-imported');
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
      notes || `Imported from tuning suggestion category ${category}`
    ]);
    tuningSheet.getRange(index + 2, 10).setValue('imported');
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
