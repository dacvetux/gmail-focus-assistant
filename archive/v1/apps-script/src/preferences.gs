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
    sheet.getRange(2, 1, 12, 4).setValues([
      ['dryRun', 'true', 'Default dry-run mode for generic entrypoints', 'yes'],
      ['enableAiForReview', 'true', 'Allow Phase 4 AI review on ambiguous mail', 'yes'],
      ['maxThreads', '100', 'Default processing thread limit', 'yes'],
      ['digestThreadLimitPerSection', '8', 'Main digest items shown per section', 'yes'],
      ['newsDigestThreadLimit', '12', 'News digest items shown', 'yes'],
      ['digestRecipient', '', 'Optional recipient for live digest emails', 'yes'],
      ['newsWorkflowLabel', '', 'Optional workflow label for news items; leave blank to keep news separate from FYI/notification', 'yes'],
      ['automationHealthAlertEnabled', 'false', 'If true, send email when automation-health audit detects qualifying alerts', 'yes'],
      ['automationHealthAlertRecipient', '', 'Optional recipient for automation-health alert emails; leave blank to suppress sending', 'yes'],
      ['automationHealthAlertMinSeverity', 'warning', 'Minimum alert severity for email escalation: warning or error', 'yes'],
      ['logRotationEnabled', 'true', 'If true, archive old operational log rows out of the active workbook tabs during the Phase 10 loop', 'yes'],
      ['logRetentionDays', '7', 'How many days to keep in the active log tabs before rows move into *Archive sheets', 'yes']
    ]);
  }

  normalizePreferenceRowsPhase10_(sheet);

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
    sheet.getRange(2, 1, 9, 5).setValues([
      ['newsletters@email.reuters.com', 'sender', 'news', 'yes', 'Reuters news digest'],
      ['newsletters@e.economist.com', 'sender', 'news', 'yes', 'Economist newsletters'],
      ['noreply@e.economist.com', 'sender', 'news', 'yes', 'Economist mail'],
      ['tldrnewsletter.com', 'sender', 'news', 'yes', 'TLDR newsletters are read-later news, not commercial ads'],
      ['mail.telecompaper.com', 'sender', 'news', 'yes', 'Telecompaper industry news digests'],
      ['zeteo.com', 'sender', 'news', 'yes', 'Zeteo newsletters/news analysis'],
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

function upsertNewsSourcePhase10(source, action, enabled, notes) {
  const sheet = getOrCreateNewsSourcesSheet_();
  const normalizedSource = String(source || '').trim().toLowerCase();
  if (!normalizedSource) {
    throw new Error('News source is required');
  }

  const normalizedAction = String(action || 'news').trim().toLowerCase() || 'news';
  const normalizedEnabled = String(enabled === undefined ? 'yes' : enabled).trim().toLowerCase() || 'yes';
  const normalizedNotes = String(notes || '').trim();
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues() : [];
  let updatedRow = 0;

  values.forEach((row, index) => {
    if (updatedRow) return;
    const existingSource = String(row[0] || '').trim().toLowerCase();
    const existingType = String(row[1] || '').trim().toLowerCase();
    if (existingSource === normalizedSource && existingType === 'sender') {
      updatedRow = index + 2;
    }
  });

  if (updatedRow) {
    sheet.getRange(updatedRow, 1, 1, 5).setValues([[normalizedSource, 'sender', normalizedAction, normalizedEnabled, normalizedNotes]]);
  } else {
    sheet.appendRow([normalizedSource, 'sender', normalizedAction, normalizedEnabled, normalizedNotes]);
    updatedRow = sheet.getLastRow();
  }

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'upsertNewsSourcePhase10',
    processedThreads: 1,
    itemCount: 1,
    outcome: updatedRow === lastRow + 1 ? 'news-source-added' : 'news-source-updated',
    notes: `row=${updatedRow}; source=${normalizedSource}; action=${normalizedAction}; enabled=${normalizedEnabled}`
  });

  return {
    rowNumber: updatedRow,
    source: normalizedSource,
    action: normalizedAction,
    enabled: normalizedEnabled
  };
}

function upsertApprovedRulePhase10(category, target, action, approved, notes) {
  const sheet = getOrCreateApprovedRulesSheet_();
  const normalizedCategory = String(category || '').trim();
  const normalizedTarget = String(target || '').trim().toLowerCase();
  if (!normalizedCategory || !normalizedTarget) {
    throw new Error('Both category and target are required');
  }

  const normalizedAction = String(action || 'add').trim().toLowerCase() || 'add';
  const normalizedApproved = String(approved === undefined ? 'yes' : approved).trim().toLowerCase() || 'yes';
  const normalizedNotes = String(notes || '').trim();
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues() : [];
  let updatedRow = 0;

  values.forEach((row, index) => {
    if (updatedRow) return;
    const existingCategory = String(row[0] || '').trim();
    const existingTarget = String(row[1] || '').trim().toLowerCase();
    if (existingCategory === normalizedCategory && existingTarget === normalizedTarget) {
      updatedRow = index + 2;
    }
  });

  const rowValues = [[normalizedCategory, normalizedTarget, normalizedAction, normalizedApproved, 'phase10-manual', new Date(), normalizedNotes]];
  if (updatedRow) {
    sheet.getRange(updatedRow, 1, 1, 7).setValues(rowValues);
  } else {
    sheet.appendRow(rowValues[0]);
    updatedRow = sheet.getLastRow();
  }

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'upsertApprovedRulePhase10',
    processedThreads: 1,
    itemCount: 1,
    outcome: updatedRow === lastRow + 1 ? 'approved-rule-added' : 'approved-rule-updated',
    notes: `row=${updatedRow}; category=${normalizedCategory}; target=${normalizedTarget}; action=${normalizedAction}`
  });

  return {
    rowNumber: updatedRow,
    category: normalizedCategory,
    target: normalizedTarget,
    action: normalizedAction,
    approved: normalizedApproved
  };
}

function getOrCreateOperatorGuideSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('OperatorGuide');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('OperatorGuide');
  }

  const rows = [
    ['Section', 'What this sheet is for', 'How to use it', 'Allowed values / examples', 'Notes'],
    ['Preferences', 'Top-level runtime parameters', 'Edit Value and keep Enabled=yes for active settings', 'dryRun=true/false; maxThreads=100; newsWorkflowLabel=(blank)|3: notification|2: FYI; automationHealthAlertEnabled=true/false; logRotationEnabled=true/false; logRetentionDays=7', 'Use this for global behavior, not sender-specific tuning'],
    ['DigestSettings', 'Enable/disable digest types and per-digest limits', 'Set Enabled to yes/no and tune thread limits conservatively', 'morning, evening, news-morning, news-evening', 'If disabled, wrappers log digest-disabled instead of sending'],
    ['NewsSources', 'Explicit allow/exclude list for news senders', 'One sender per row; Action=news or exclude', 'Type=sender; Action=news|exclude; Enabled=yes|no', 'Use exclude for digest traffic that looks newsletter-like but should stay out'],
    ['TuningSuggestions', 'Review queue for proposed sender/routing changes', 'Change Status from new to approved/rejected/superseded after review', 'Status=new|approved|rejected|imported|already-imported|skipped|superseded', 'Approved rows can be imported into ApprovedRules'],
    ['TuningReviewQueue', 'Compact operator queue built from actionable TuningSuggestions rows', 'Refresh via rebuildTuningReviewQueuePhase10() or runPhase10ReviewLoopOptionA()', 'Shows only new/approved rows plus next-action guidance and source row links', 'Use this when you want the work queue without the full historical suggestion sheet'],
    ['ApprovedRules', 'Runtime rules already approved by the operator', 'One rule per row; keep Approved=yes for active rules', 'Category=shipping-sender/commercial-sender/important-sender/fyi-sender/notification-sender/news-sender/news-exclude-sender; Action=add|remove', 'fyi-sender and notification-sender add workflow-only routing without forcing a structural label'],
    ['ControlSurfaceStatus', 'Small operator dashboard for the current review/import state', 'Rebuild via rebuildControlSurfaceStatusPhase10() or runPhase10ReviewLoopOptionA()', 'Shows pending/new/approved/imported counts plus next-action guidance', 'Use this first before reviewing or importing'],
    ['ValidationStatus', 'Compact last-checkpoint view for the core dry-run validation loop', 'Refresh via runPhase10ValidationCheckpoint() for the fast default path or runPhase10ExtendedValidationCheckpoint() for the heavier AI/tuning path', 'Shows ok/error plus key result for the checks included in the most recent checkpoint run', 'Use the default checkpoint after normal changes and the extended checkpoint when you explicitly want deeper validation'],
    ['RecentRunSummary', 'Compact latest-run view for wrappers and Phase 10 helper actions', 'Refresh via rebuildRecentRunSummaryPhase10(), runPhase10ReviewLoopOptionA(), or runPhase10ValidationCheckpoint()', 'Shows latest local time, outcome, counts, and notes for key wrapper/helper entry points', 'Use this when you want a quick “did the last thing actually run?” answer without opening raw RunLog'],
    ['WorkflowAudit', 'Recent DecisionLog semantics audit for review/FYI/notification/news behavior', 'Refresh via rebuildWorkflowAuditPhase10() or runPhase10ValidationCheckpoint()', 'Shows whether recent rows match the intended workflow semantics model plus example rows', 'Use this when Phase 10 semantics feel blurry or after any routing/label change'],
    ['Log maintenance', 'Keep active operational logs small enough for fast operator use', 'Leave logRotationEnabled=true and tune logRetentionDays if the active workbook feels too heavy', 'rotateOperationalLogsPhase10(); active logs archive into DecisionLogArchive / RunLogArchive / DigestLogArchive / AutomationHealthLogArchive / DraftLogArchive / FollowUpLogArchive', 'Archive sheets retain older history while active log tabs stay focused on recent operations'],
    ['Workflow label semantics', 'Clarify when to use review vs FYI vs notification', 'Treat Review/Ambiguous as unresolved mail, FYI as intentionally informational, and notification as low-response transactional/system updates', 'Review/Ambiguous should stay workflow-blank; News/Digest can stay workflow-blank', 'Default news behavior should stay separate unless the operator explicitly wants FYI/notification'],
    ['Automation health alerts', 'Optional lightweight escalation for wrapper failures or missed schedules', 'Enable only if you want email alerts; blank recipient keeps the feature safely silent', 'automationHealthAlertEnabled=false by default; min severity=warning|error', 'Repeated identical alerts are deduplicated to avoid spam'],
    ['Recommended workflow', 'Use Sheets as the primary operator UI for now', '1) review ControlSurfaceStatus 2) review TuningReviewQueue 3) update source rows in TuningSuggestions as approved/rejected/superseded 4) run runPhase10ReviewLoopOptionA() 5) run runPhase10ValidationCheckpoint() 6) confirm ValidationStatus, RecentRunSummary, WorkflowAudit, TuningReviewQueue, and ControlSurfaceStatus updated 7) use archive sheets only when you need older log history', 'Option A now; Phase 12 HTML UI later', 'Use runPhase10ExtendedValidationCheckpoint() only when you explicitly want the heavier AI/tuning checks too.'],
    ['Fast commands', 'Exact helper functions for the operator loop', 'Use these when you want a quick refresh/import cycle without digging through code', 'rebuildControlSurfaceStatusPhase10(); rebuildTuningReviewQueuePhase10(); rebuildRecentRunSummaryPhase10(); rebuildWorkflowAuditPhase10(); rotateOperationalLogsPhase10(); runPhase10ReviewLoopOptionA(); runPhase10ValidationCheckpoint(); runPhase10ExtendedValidationCheckpoint(); refreshConfigFromPreferencesPhase10()', 'These are the main Option A operator commands today']
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
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'approved' || normalized === 'approve';
}

const APPROVED_RULE_CONFIG_FIELD_BY_CATEGORY_ = {
  'commercial-sender': 'forceCommercialSenders',
  'forceCommercialSenders': 'forceCommercialSenders',
  'important-sender': 'forceImportantSenders',
  'forceImportantSenders': 'forceImportantSenders',
  'shipping-sender': 'forceShippingSenders',
  'forceShippingSenders': 'forceShippingSenders',
  'fyi-sender': 'forceFyiSenders',
  'forceFyiSenders': 'forceFyiSenders',
  'notification-sender': 'forceNotificationSenders',
  'forceNotificationSenders': 'forceNotificationSenders',
  'news-sender': 'newsSenders',
  'newsSenders': 'newsSenders',
  'news-exclude-sender': 'newsExcludedSenders',
  'newsExcludedSenders': 'newsExcludedSenders'
};

function resolveApprovedRuleConfigField_(category) {
  const normalizedCategory = String(category || '').trim();
  return APPROVED_RULE_CONFIG_FIELD_BY_CATEGORY_[normalizedCategory] || '';
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

function applyPreferenceValueValidations_(sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
  values.forEach((row, index) => {
    const key = String(row[0] || '').trim();
    const rowNumber = index + 2;

    if (key === 'dryRun' || key === 'enableAiForReview' || key === 'automationHealthAlertEnabled' || key === 'logRotationEnabled') {
      setDropdownValidation_(sheet, rowNumber, 2, 1, ['true', 'false']);
      return;
    }

    if (key === 'newsWorkflowLabel') {
      setDropdownValidation_(sheet, rowNumber, 2, 1, ['', '3: notification', '2: FYI']);
      return;
    }

    if (key === 'automationHealthAlertMinSeverity') {
      setDropdownValidation_(sheet, rowNumber, 2, 1, ['warning', 'error']);
    }
  });
}

function getOptionalWorkflowPreferenceValue_(key, fallbackValue) {
  const map = readPreferencesMap_();
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    return fallbackValue;
  }

  const value = String(map[key] || '').trim();
  if (!value) return null;
  return value;
}
