function setupControlSurfacePhase10() {
  const spreadsheet = getLogSpreadsheet_();
  getOrCreatePreferencesSheet_();
  getOrCreateDigestSettingsSheet_();
  getOrCreateNewsSourcesSheet_();
  getOrCreateApprovedRulesSheet_();
  getOrCreateTuningSuggestionsSheet_();
  getOrCreateTuningReviewQueueSheet_();
  getOrCreateOperatorGuideSheet_();
  getOrCreateControlSurfaceStatusSheet_();
  getOrCreateValidationStatusSheet_();
  getOrCreateRecentRunSummarySheet_();
  getOrCreateWorkflowAuditSheet_();
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
  getOrCreateTuningReviewQueueSheet_();
  getOrCreateOperatorGuideSheet_();
  getOrCreateControlSurfaceStatusSheet_();
  getOrCreateValidationStatusSheet_();
  getOrCreateRecentRunSummarySheet_();
  getOrCreateWorkflowAuditSheet_();

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

function getOrCreateValidationStatusSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('ValidationStatus');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('ValidationStatus');
  }

  ensureValidationStatusHeader_(sheet);
  return sheet;
}

function getOrCreateRecentRunSummarySheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('RecentRunSummary');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('RecentRunSummary');
  }

  ensureRecentRunSummaryHeader_(sheet);
  return sheet;
}

function getOrCreateTuningReviewQueueSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('TuningReviewQueue');

  if (!sheet) {
    try {
      sheet = spreadsheet.insertSheet('TuningReviewQueue');
    } catch (error) {
      if (!/already exists/i.test(String(error && error.message ? error.message : error))) {
        throw error;
      }
      sheet = spreadsheet.getSheetByName('TuningReviewQueue') || spreadsheet.getSheets().find(candidate => candidate.getName() === 'TuningReviewQueue');
      if (!sheet) throw error;
    }
  }

  ensureTuningReviewQueueHeader_(sheet);
  return sheet;
}

function getOrCreateWorkflowAuditSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('WorkflowAudit');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('WorkflowAudit');
  }

  ensureWorkflowAuditHeader_(sheet);
  return sheet;
}

function applyControlSurfaceOptionAUx_() {
  const preferencesSheet = getOrCreatePreferencesSheet_();
  const digestSettingsSheet = getOrCreateDigestSettingsSheet_();
  const newsSourcesSheet = getOrCreateNewsSourcesSheet_();
  const approvedRulesSheet = getOrCreateApprovedRulesSheet_();
  const tuningSuggestionsSheet = getOrCreateTuningSuggestionsSheet_();
  const tuningReviewQueueSheet = getOrCreateTuningReviewQueueSheet_();
  const operatorGuideSheet = getOrCreateOperatorGuideSheet_();
  const controlSurfaceStatusSheet = getOrCreateControlSurfaceStatusSheet_();
  const validationStatusSheet = getOrCreateValidationStatusSheet_();
  const recentRunSummarySheet = getOrCreateRecentRunSummarySheet_();
  const workflowAuditSheet = getOrCreateWorkflowAuditSheet_();

  let validationsApplied = 0;
  validationsApplied += configurePreferencesSheetUx_(preferencesSheet);
  validationsApplied += configureDigestSettingsSheetUx_(digestSettingsSheet);
  validationsApplied += configureNewsSourcesSheetUx_(newsSourcesSheet);
  validationsApplied += configureApprovedRulesSheetUx_(approvedRulesSheet);
  validationsApplied += configureTuningSuggestionsSheetUx_(tuningSuggestionsSheet);
  validationsApplied += configureTuningReviewQueueSheetUx_(tuningReviewQueueSheet);
  styleControlSurfaceSheet_(operatorGuideSheet, [140, 260, 320, 320, 260]);
  styleControlSurfaceSheet_(controlSurfaceStatusSheet, [180, 180, 420, 420]);
  rebuildControlSurfaceStatusSheet_(controlSurfaceStatusSheet);
  rebuildTuningReviewQueueSheet_(tuningReviewQueueSheet);
  configureValidationStatusSheetUx_(validationStatusSheet);
  configureRecentRunSummarySheetUx_(recentRunSummarySheet);
  rebuildRecentRunSummarySheet_(recentRunSummarySheet);
  configureWorkflowAuditSheetUx_(workflowAuditSheet);
  rebuildWorkflowAuditSheet_(workflowAuditSheet);

  return {
    sheetsReady: ['Preferences', 'DigestSettings', 'NewsSources', 'ApprovedRules', 'TuningSuggestions', 'TuningReviewQueue', 'OperatorGuide', 'ControlSurfaceStatus', 'ValidationStatus', 'RecentRunSummary', 'WorkflowAudit'],
    sheetCount: 11,
    validationsApplied: validationsApplied + 3,
    guideUpdated: true,
    notes: `Option A UX prepared across 11 sheets; validations-applied=${validationsApplied + 3}`
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
  applyPreferenceValueValidations_(sheet);
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
    'notification-sender',
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

function ensureTuningReviewQueueHeader_(sheet) {
  if (!sheet) return;
  const header = [['Queue Status', 'Next Action', 'Suggestion Category', 'Suggested Change', 'Target', 'Evidence', 'Confidence', 'Example Subject', 'Source Row', 'Notes']];
  sheet.getRange(1, 1, 1, header[0].length).setValues(header);
}

function configureTuningReviewQueueSheetUx_(sheet) {
  ensureTuningReviewQueueHeader_(sheet);
  styleControlSurfaceSheet_(sheet, [120, 180, 220, 220, 220, 90, 100, 320, 90, 420]);
  setHeaderNotes_(sheet, {
    1: 'Current actionable queue state copied from TuningSuggestions.',
    2: 'What the operator should do next for this row.',
    3: 'Suggestion family generated by the tuner.',
    4: 'Recommended config/routing change.',
    5: 'Usually the sender/domain fragment under review.',
    6: 'How many supporting examples were seen.',
    7: 'Heuristic confidence only.',
    8: 'Representative subject for quick scanning.',
    9: 'Original row number in TuningSuggestions to edit.',
    10: 'Existing notes/provenance carried over from the source row.'
  });
  return 1;
}

function ensureValidationStatusHeader_(sheet) {
  if (!sheet) return;
  const header = [['Check Key', 'Check', 'Status', 'Key Result', 'Notes', 'Last Run']];
  sheet.getRange(1, 1, 1, header[0].length).setValues(header);
}

function configureValidationStatusSheetUx_(sheet) {
  ensureValidationStatusHeader_(sheet);
  styleControlSurfaceSheet_(sheet, [220, 220, 100, 160, 420, 150]);
  setHeaderNotes_(sheet, {
    1: 'Stable internal check identifier.',
    2: 'Human-readable validation step.',
    3: 'ok or error.',
    4: 'Compact primary result to scan quickly.',
    5: 'Extra notes or failure detail.',
    6: 'When this row was last refreshed.'
  });
  return 1;
}

function ensureRecentRunSummaryHeader_(sheet) {
  if (!sheet) return;
  const header = [['Run Family', 'Latest Local Time', 'Entry Point', 'Outcome', 'Processed Threads', 'Primary Count', 'Notes', 'Operator Action']];
  sheet.getRange(1, 1, 1, header[0].length).setValues(header);
}

function configureRecentRunSummarySheetUx_(sheet) {
  ensureRecentRunSummaryHeader_(sheet);
  styleControlSurfaceSheet_(sheet, [220, 160, 220, 180, 140, 120, 420, 320]);
  setHeaderNotes_(sheet, {
    1: 'Operator-facing summary group for the latest relevant run.',
    2: 'Latest local timestamp seen in RunLog for this group.',
    3: 'Exact entry point from RunLog.',
    4: 'Latest recorded outcome, or stale/missing when the view thinks attention is needed.',
    5: 'Processed Threads from the latest run.',
    6: 'Primary Count from the latest run.',
    7: 'Latest notes captured in RunLog.',
    8: 'Suggested next operator action based on the latest outcome.'
  });
  return 1;
}

function ensureWorkflowAuditHeader_(sheet) {
  if (!sheet) return;
  const header = [['Audit Key', 'Status', 'Count', 'Example', 'Notes', 'Last Updated']];
  sheet.getRange(1, 1, 1, header[0].length).setValues(header);
}

function configureWorkflowAuditSheetUx_(sheet) {
  ensureWorkflowAuditHeader_(sheet);
  styleControlSurfaceSheet_(sheet, [220, 120, 90, 420, 420, 150]);
  setHeaderNotes_(sheet, {
    1: 'Stable audit row identifier.',
    2: 'ok, warning, or info.',
    3: 'Recent DecisionLog count for this bucket.',
    4: 'One representative recent row for operator context.',
    5: 'Why this matters or what to do next.',
    6: 'When the audit was last rebuilt.'
  });
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
