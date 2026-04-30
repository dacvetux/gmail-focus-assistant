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

function runPhase10ReviewLoopOptionA() {
  const syncSummary = syncApprovedRulesFromTuningSuggestionsPhase10();
  const refreshSummary = refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const logRotationSummary = rotateOperationalLogsPhase10();
  const tuningReviewQueueSummary = rebuildTuningReviewQueueSheet_(getOrCreateTuningReviewQueueSheet_());
  const statusSummary = rebuildControlSurfaceStatusPhase10();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'runPhase10ReviewLoopOptionA',
    processedThreads: statusSummary.tuningSummary.totalRows,
    itemCount: syncSummary.importedCount,
    outcome: syncSummary.importedCount ? 'review-loop-applied' : 'review-loop-no-imports',
    notes: `approved-pending=${statusSummary.tuningSummary.approved}; imported=${syncSummary.importedCount}; approved-rules-configured=${refreshSummary.approvedRulesConfigured}; archived-log-rows=${logRotationSummary.archivedRows}`
  });

  const recentRunSummary = rebuildRecentRunSummarySheet_(getOrCreateRecentRunSummarySheet_());

  return {
    syncSummary: syncSummary,
    refreshSummary: refreshSummary,
    logRotationSummary: logRotationSummary,
    tuningReviewQueueSummary: tuningReviewQueueSummary,
    recentRunSummary: recentRunSummary,
    statusSummary: statusSummary
  };
}

function runPhase10ValidationCheckpoint() {
  return runPhase10ValidationCheckpointInternal_({
    entryPoint: 'runPhase10ValidationCheckpoint',
    checks: [
      { key: 'phase1-dry-run', label: 'Phase 1 dry-run', runner: processInboxFocusPhase1DryRun },
      { key: 'morning-digest-dry-run', label: 'Morning digest dry-run', runner: generateMorningDigestDryRun },
      { key: 'news-morning-digest-dry-run', label: 'News morning digest dry-run', runner: generateNewsDigestMorningDryRun }
    ]
  });
}

function runPhase10ExtendedValidationCheckpoint() {
  return runPhase10ValidationCheckpointInternal_({
    entryPoint: 'runPhase10ExtendedValidationCheckpoint',
    checks: [
      { key: 'phase1-dry-run', label: 'Phase 1 dry-run', runner: processInboxFocusPhase1DryRun },
      { key: 'phase4-ai-review-dry-run', label: 'Phase 4 AI review dry-run', runner: processInboxFocusPhase4AiReviewDryRun },
      { key: 'morning-digest-dry-run', label: 'Morning digest dry-run', runner: generateMorningDigestDryRun },
      { key: 'news-morning-digest-dry-run', label: 'News morning digest dry-run', runner: generateNewsDigestMorningDryRun },
      { key: 'tuning-suggestions-dry-run', label: 'Tuning suggestions dry-run', runner: generateTuningSuggestionsPhase9DryRun }
    ]
  });
}

function runPhase10ValidationCheckpointInternal_(options) {
  const entryPoint = options && options.entryPoint ? options.entryPoint : 'runPhase10ValidationCheckpoint';
  const checks = options && options.checks ? options.checks : [];
  const refreshSummary = refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const logRotationSummary = rotateOperationalLogsPhase10();

  const rows = [];
  const passedChecks = [];
  const failedChecks = [];
  let successCount = 0;
  let failureCount = 0;

  checks.forEach(check => {
    try {
      const result = check.runner();
      const summary = summarizeValidationCheckpointResult_(result);
      rows.push([
        check.key,
        check.label,
        'ok',
        summary.primaryValue,
        summary.notes,
        formatControlSurfaceTimestamp_(new Date())
      ]);
      passedChecks.push({
        key: check.key,
        label: check.label,
        primaryValue: summary.primaryValue,
        notes: summary.notes
      });
      successCount += 1;
    } catch (error) {
      const message = truncateRunNote_(error && error.message ? error.message : String(error), 300);
      rows.push([
        check.key,
        check.label,
        'error',
        '',
        message,
        formatControlSurfaceTimestamp_(new Date())
      ]);
      failedChecks.push({
        key: check.key,
        label: check.label,
        message: message
      });
      failureCount += 1;
    }
  });

  const validationSummary = rebuildValidationStatusSheet_(getOrCreateValidationStatusSheet_(), rows);
  const tuningReviewQueueSummary = rebuildTuningReviewQueueSheet_(getOrCreateTuningReviewQueueSheet_());
  const workflowAuditSummary = rebuildWorkflowAuditSheet_(getOrCreateWorkflowAuditSheet_());

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: entryPoint,
    processedThreads: checks.length,
    itemCount: successCount,
    outcome: failureCount ? 'validation-checkpoint-failed' : 'validation-checkpoint-ok',
    notes: `success=${successCount}; failed=${failureCount}; workflow-warning=${workflowAuditSummary.warningCount}; approved-rules-configured=${refreshSummary.approvedRulesConfigured}; archived-log-rows=${logRotationSummary.archivedRows}`
  });

  const recentRunSummary = rebuildRecentRunSummarySheet_(getOrCreateRecentRunSummarySheet_());
  const statusSummary = rebuildControlSurfaceStatusPhase10();

  return {
    refreshSummary: refreshSummary,
    logRotationSummary: logRotationSummary,
    validationSummary: validationSummary,
    tuningReviewQueueSummary: tuningReviewQueueSummary,
    recentRunSummary: recentRunSummary,
    workflowAuditSummary: workflowAuditSummary,
    statusSummary: statusSummary,
    passedChecks: passedChecks,
    failedChecks: failedChecks,
    entryPoint: entryPoint
  };
}

function rebuildWorkflowAuditPhase10() {
  const summary = rebuildWorkflowAuditSheet_(getOrCreateWorkflowAuditSheet_());

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rebuildWorkflowAuditPhase10',
    processedThreads: summary.rowsScanned,
    itemCount: summary.warningCount,
    outcome: summary.warningCount ? 'workflow-audit-warning' : 'workflow-audit-ok',
    notes: `rows=${summary.rowsScanned}; warnings=${summary.warningCount}; review-only=${summary.reviewOnlyCount}; notification=${summary.notificationCount}`
  });

  return summary;
}

function rebuildTuningReviewQueuePhase10() {
  const summary = rebuildTuningReviewQueueSheet_(getOrCreateTuningReviewQueueSheet_());

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rebuildTuningReviewQueuePhase10',
    processedThreads: summary.totalRows,
    itemCount: summary.actionableRows,
    outcome: summary.actionableRows ? 'tuning-review-queue-ready' : 'tuning-review-queue-empty',
    notes: `actionable=${summary.actionableRows}; new=${summary.newRows}; approved=${summary.approvedRows}`
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
    ['ApprovedRules', 'Runtime rules already approved by the operator', 'One rule per row; keep Approved=yes for active rules', 'Category=shipping-sender/commercial-sender/important-sender/fyi-sender/news-sender/news-exclude-sender; Action=add|remove', 'fyi-sender adds workflow-only FYI routing for intentionally informational senders'],
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

function getOrCreateControlSurfaceStatusSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('ControlSurfaceStatus');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('ControlSurfaceStatus');
  }

  rebuildControlSurfaceStatusSheet_(sheet);
  return sheet;
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

function rebuildControlSurfaceStatusPhase10() {
  const sheet = getOrCreateControlSurfaceStatusSheet_();
  const summary = rebuildControlSurfaceStatusSheet_(sheet);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rebuildControlSurfaceStatusPhase10',
    processedThreads: summary.tuningSummary.totalRows,
    itemCount: summary.tuningSummary.pending,
    outcome: 'status-refreshed',
    notes: `pending=${summary.tuningSummary.pending}; approved=${summary.tuningSummary.approved}; approved-rules=${summary.approvedRulesSummary.totalRows}`
  });

  return summary;
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

function summarizeValidationCheckpointResult_(result) {
  if (!result) {
    return { primaryValue: '', notes: 'no result returned' };
  }

  if (Object.prototype.hasOwnProperty.call(result, 'processedThreads')) {
    const primaryParts = [`processed=${result.processedThreads}`];
    if (Object.prototype.hasOwnProperty.call(result, 'itemCount')) primaryParts.push(`items=${result.itemCount}`);
    const notes = [result.outcome || '', result.summary || '', result.notes || ''].filter(Boolean).join('; ');
    return {
      primaryValue: primaryParts.join('; '),
      notes: truncateRunNote_(notes, 300)
    };
  }

  if (Object.prototype.hasOwnProperty.call(result, 'itemCount')) {
    const primaryParts = [`items=${result.itemCount}`];
    if (result.type) primaryParts.push(`type=${result.type}`);
    const notes = [result.summary || '', result.mode || '', result.outcome || ''].filter(Boolean).join('; ');
    return {
      primaryValue: primaryParts.join('; '),
      notes: truncateRunNote_(notes, 300)
    };
  }

  if (Object.prototype.hasOwnProperty.call(result, 'suggestionCount')) {
    return {
      primaryValue: `suggestions=${result.suggestionCount}`,
      notes: truncateRunNote_(`rows-scanned=${result.scannedRows || ''}; mode=${result.mode || ''}`, 300)
    };
  }

  return {
    primaryValue: truncateRunNote_(JSON.stringify(result).slice(0, 120), 120),
    notes: 'generic result summary'
  };
}

function rebuildValidationStatusSheet_(sheet, rows) {
  ensureValidationStatusHeader_(sheet);
  const values = rows && rows.length ? rows : [];
  const maxRowsToClear = Math.max(sheet.getLastRow() - 1, values.length, 1);
  sheet.getRange(2, 1, maxRowsToClear, 6).clearContent();
  if (values.length) {
    sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
  }
  configureValidationStatusSheetUx_(sheet);

  const failedRows = values.filter(row => row[2] === 'error').map(row => ({
    key: row[0],
    check: row[1],
    notes: row[4]
  }));

  return {
    totalChecks: values.length,
    successCount: values.filter(row => row[2] === 'ok').length,
    failureCount: failedRows.length,
    failedChecks: failedRows
  };
}

function rebuildRecentRunSummaryPhase10() {
  const summary = rebuildRecentRunSummarySheet_(getOrCreateRecentRunSummarySheet_());

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rebuildRecentRunSummaryPhase10',
    processedThreads: summary.totalFamilies,
    itemCount: summary.missingFamilies,
    outcome: summary.missingFamilies ? 'recent-run-summary-warning' : 'recent-run-summary-ok',
    notes: `families=${summary.totalFamilies}; missing=${summary.missingFamilies}; stale=${summary.staleFamilies}`
  });

  return summary;
}

function rebuildWorkflowAuditSheet_(sheet) {
  ensureWorkflowAuditHeader_(sheet);
  const snapshot = buildWorkflowAuditSnapshot_();
  const now = snapshot.lastUpdated;

  const values = [
    ['last-updated', 'info', '', '', 'When this workflow semantics audit was rebuilt.', now],
    ['rows-scanned', snapshot.rowsScanned ? 'info' : 'warning', snapshot.rowsScanned, '', snapshot.rowsScanned ? 'Recent DecisionLog rows inspected for workflow semantics drift.' : 'No recent DecisionLog rows found; run a dry-run or live processing pass first.', now],
    ['review-only', 'info', snapshot.reviewOnly.count, snapshot.reviewOnly.example, 'Expected baseline for unresolved ambiguous mail: review-only and workflow-blank.', now],
    ['legacy-review-plus-fyi', snapshot.legacyReviewFyi.count ? 'warning' : 'ok', snapshot.legacyReviewFyi.count, snapshot.legacyReviewFyi.example, snapshot.legacyReviewFyi.count ? 'Older `Review/Ambiguous, 2: FYI` shape still appeared in recent logs; review whether a remaining path still emits it.' : 'No recent legacy review+FYI rows found.', now],
    ['explicit-fyi', 'info', snapshot.explicitFyi.count, snapshot.explicitFyi.example, 'FYI should be intentional informational routing, not generic ambiguity fallback.', now],
    ['notification', 'info', snapshot.notification.count, snapshot.notification.example, 'Notification should capture low-response transactional/system/status updates.', now],
    ['news-blank-workflow', snapshot.newsBlank.count ? 'ok' : 'info', snapshot.newsBlank.count, snapshot.newsBlank.example, 'Default healthy shape when News/Digest stays separate from workflow labels.', now],
    ['news-with-workflow', snapshot.newsWithWorkflow.count && !CONFIG.newsWorkflowLabel ? 'warning' : 'info', snapshot.newsWithWorkflow.count, snapshot.newsWithWorkflow.example, CONFIG.newsWorkflowLabel ? `News workflow label is intentionally set to ${CONFIG.newsWorkflowLabel}.` : 'Should usually stay at zero unless the operator intentionally enabled a news workflow label.', now],
    ['archived-review', snapshot.archivedReview.count ? 'warning' : 'ok', snapshot.archivedReview.count, snapshot.archivedReview.example, snapshot.archivedReview.count ? 'Review/Ambiguous rows were archived recently; confirm this is intentional rather than hiding unresolved mail.' : 'No recent archived review rows found.', now]
  ];

  const maxRowsToClear = Math.max(sheet.getLastRow() - 1, values.length, 1);
  sheet.getRange(2, 1, maxRowsToClear, 6).clearContent();
  sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
  configureWorkflowAuditSheetUx_(sheet);

  return {
    rowsScanned: snapshot.rowsScanned,
    reviewOnlyCount: snapshot.reviewOnly.count,
    legacyReviewFyiCount: snapshot.legacyReviewFyi.count,
    explicitFyiCount: snapshot.explicitFyi.count,
    notificationCount: snapshot.notification.count,
    newsBlankCount: snapshot.newsBlank.count,
    newsWithWorkflowCount: snapshot.newsWithWorkflow.count,
    archivedReviewCount: snapshot.archivedReview.count,
    warningCount: values.filter(row => row[1] === 'warning').length
  };
}

function buildWorkflowAuditSnapshot_() {
  const rows = readRecentDecisionRows_(200);
  return {
    rowsScanned: rows.length,
    lastUpdated: formatControlSurfaceTimestamp_(new Date()),
    reviewOnly: summarizeWorkflowAuditBucket_(rows, row => hasExactAppliedLabels_(row.appliedLabels, [CONFIG.labels.review])),
    legacyReviewFyi: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.review) && hasAppliedLabel_(row.appliedLabels, CONFIG.labels.fyi)),
    explicitFyi: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.fyi) && !hasAppliedLabel_(row.appliedLabels, CONFIG.labels.review)),
    notification: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.notification)),
    newsBlank: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.newsDigest) && !hasAnyAppliedLabel_(row.appliedLabels, [CONFIG.labels.toRespond, CONFIG.labels.fyi, CONFIG.labels.notification])),
    newsWithWorkflow: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.newsDigest) && hasAnyAppliedLabel_(row.appliedLabels, [CONFIG.labels.toRespond, CONFIG.labels.fyi, CONFIG.labels.notification])),
    archivedReview: summarizeWorkflowAuditBucket_(rows, row => hasAppliedLabel_(row.appliedLabels, CONFIG.labels.review) && String(row.archived || '').trim().toLowerCase() === 'yes')
  };
}

function rebuildTuningReviewQueueSheet_(sheet) {
  ensureTuningReviewQueueHeader_(sheet);
  const queueRows = readTuningReviewQueueRows_();
  const values = queueRows.length ? queueRows : [[
    'info',
    'No actionable tuning suggestions right now.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Review queue is clear; generate new suggestions or continue validation work.'
  ]];

  const maxRowsToClear = Math.max(sheet.getLastRow() - 1, values.length, 1);
  sheet.getRange(2, 1, maxRowsToClear, 10).clearContent();
  sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
  configureTuningReviewQueueSheetUx_(sheet);

  const summary = summarizeTuningReviewQueueRows_(queueRows);
  return summary;
}

function readTuningReviewQueueRows_() {
  const sheet = getOrCreateTuningSuggestionsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 11).getDisplayValues();
  const queueRows = [];

  values.forEach((row, index) => {
    const status = String(row[9] || '').trim().toLowerCase() || 'new';
    if (status !== 'new' && status !== 'approved') return;
    const category = String(row[1] || '').trim().toLowerCase();
    if (category === 'no-suggestions') return;

    queueRows.push([
      status,
      status === 'approved' ? 'Run runPhase10ReviewLoopOptionA() to import this approved row.' : 'Review in TuningSuggestions and mark approved/rejected/superseded.',
      row[1] || '',
      row[2] || '',
      row[3] || '',
      row[4] || '',
      row[5] || '',
      row[7] || '',
      index + 2,
      row[10] || ''
    ]);
  });

  return queueRows.sort((left, right) => {
    const leftPriority = left[0] === 'approved' ? 0 : 1;
    const rightPriority = right[0] === 'approved' ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    const leftEvidence = Number(left[5] || 0);
    const rightEvidence = Number(right[5] || 0);
    if (leftEvidence !== rightEvidence) return rightEvidence - leftEvidence;
    return String(left[4] || '').localeCompare(String(right[4] || ''));
  });
}

function summarizeTuningReviewQueueRows_(rows) {
  return {
    totalRows: (rows || []).length,
    actionableRows: (rows || []).length,
    approvedRows: (rows || []).filter(row => row[0] === 'approved').length,
    newRows: (rows || []).filter(row => row[0] === 'new').length
  };
}

function inspectTuningReviewQueuePhase10() {
  const rows = readTuningReviewQueueRows_();
  return {
    totalRows: rows.length,
    actionableRows: rows.map(row => ({
      status: row[0],
      nextAction: row[1],
      category: row[2],
      suggestedChange: row[3],
      target: row[4],
      evidenceCount: row[5],
      confidence: row[6],
      exampleSubject: row[7],
      sourceRow: row[8],
      notes: row[9]
    }))
  };
}

function inspectRecentDecisionRowsPhase10(senderQueries, maxRows) {
  const queries = Array.isArray(senderQueries)
    ? senderQueries.map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
    : [String(senderQueries || '').trim().toLowerCase()].filter(Boolean);
  const rows = readRecentDecisionRows_(maxRows || 200);
  const matches = rows.filter(row => {
    const from = String(row.from || '').toLowerCase();
    const subject = String(row.subject || '').toLowerCase();
    return queries.some(query => from.includes(query) || subject.includes(query));
  }).slice(-25).map(row => ({
    timestamp: formatTuningSuggestionTimestamp_(row.timestamp),
    from: row.from,
    subject: row.subject,
    appliedLabels: row.appliedLabels,
    reason: row.reason,
    archived: row.archived
  }));

  return {
    queries: queries,
    scannedRows: rows.length,
    matchCount: matches.length,
    matches: matches
  };
}

function inspectLogRotationControlSurfacePhase10() {
  const preferenceKeys = ['logRotationEnabled', 'logRetentionDays'];
  const statusKeys = ['log-rotation-last-status', 'log-rotation-retention-days', 'phase10-last-checkpoint'];
  const preferences = readNamedPreferenceRowsPhase10_(preferenceKeys);
  const controlSurfaceRows = readNamedControlSurfaceRowsPhase10_(statusKeys);
  const latestByEntryPoint = readLatestRunLogEntriesByEntryPoint_();
  const latestCheckpoint = pickLatestRunEntry_([
    latestByEntryPoint.runPhase10ValidationCheckpoint,
    latestByEntryPoint.runPhase10ExtendedValidationCheckpoint
  ]);
  const recentRunRows = [
    buildRecentRunSummaryRow_({ label: 'Phase 10 log rotation', staleHours: 72 }, latestByEntryPoint.rotateOperationalLogsPhase10),
    buildRecentRunSummaryRow_({ label: 'Phase 10 validation checkpoint', staleHours: 72 }, latestCheckpoint)
  ].map(row => ({
    family: row[0],
    latestLocal: row[1],
    entryPoint: row[2],
    status: row[3],
    processedThreads: row[4],
    primaryCount: row[5],
    notes: row[6],
    nextAction: row[7]
  }));

  const archiveHealth = buildPhase10LogRotationSpecs_().map(spec => {
    const activeSheet = spec.getSheet();
    const archiveName = `${spec.sheetName}Archive`;
    const archiveSheet = getLogSpreadsheet_().getSheetByName(archiveName);
    return {
      sheetName: spec.sheetName,
      activeRows: Math.max(0, activeSheet.getLastRow() - 1),
      archiveSheetName: archiveName,
      archiveExists: Boolean(archiveSheet),
      archiveRows: archiveSheet ? Math.max(0, archiveSheet.getLastRow() - 1) : 0
    };
  });

  return {
    preferences: preferences,
    controlSurfaceRows: controlSurfaceRows,
    recentRunRows: recentRunRows,
    latestRunLog: {
      rotateOperationalLogsPhase10: formatRunLogInspectionEntry_(latestByEntryPoint.rotateOperationalLogsPhase10),
      runPhase10ValidationCheckpoint: formatRunLogInspectionEntry_(latestCheckpoint)
    },
    archiveHealth: archiveHealth
  };
}

function readNamedPreferenceRowsPhase10_(keys) {
  const wanted = new Set((keys || []).map(key => String(key || '').trim()).filter(Boolean));
  const sheet = getOrCreatePreferencesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1 || !wanted.size) return [];

  return sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues()
    .filter(row => wanted.has(String(row[0] || '').trim()))
    .map(row => ({
      key: row[0] || '',
      value: row[1] || '',
      description: row[2] || '',
      enabled: row[3] || ''
    }));
}

function readNamedControlSurfaceRowsPhase10_(keys) {
  const wanted = new Set((keys || []).map(key => String(key || '').trim()).filter(Boolean));
  const sheet = getOrCreateControlSurfaceStatusSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1 || !wanted.size) return [];

  return sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues()
    .filter(row => wanted.has(String(row[0] || '').trim()))
    .map(row => ({
      metric: row[0] || '',
      value: row[1] || '',
      meaning: row[2] || '',
      nextAction: row[3] || ''
    }));
}

function formatRunLogInspectionEntry_(entry) {
  if (!entry) return null;
  return {
    timestamp: formatControlSurfaceTimestamp_(entry.timestamp),
    entryPoint: entry.entryPoint,
    outcome: entry.outcome,
    processedThreads: entry.processedThreads,
    primaryCount: entry.primaryCount,
    notes: entry.notes
  };
}

function setTuningSuggestionStatusPhase10(rowNumber, status, note) {
  const sheet = getOrCreateTuningSuggestionsSheet_();
  const numericRow = Number(rowNumber);
  if (!Number.isFinite(numericRow) || numericRow < 2) {
    throw new Error(`Invalid tuning suggestion row: ${rowNumber}`);
  }

  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (!normalizedStatus) {
    throw new Error('Status is required');
  }

  sheet.getRange(numericRow, 10).setValue(normalizedStatus);
  if (note !== undefined && note !== null && String(note).trim()) {
    const noteCell = sheet.getRange(numericRow, 11);
    const existing = String(noteCell.getDisplayValue() || '').trim();
    const appended = existing ? `${existing}; ${String(note).trim()}` : String(note).trim();
    noteCell.setValue(appended);
  }

  const category = String(sheet.getRange(numericRow, 2).getDisplayValue() || '').trim();
  const target = String(sheet.getRange(numericRow, 4).getDisplayValue() || '').trim();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'setTuningSuggestionStatusPhase10',
    processedThreads: 1,
    itemCount: 1,
    outcome: `tuning-status-${normalizedStatus}`,
    notes: `row=${numericRow}; category=${category}; target=${target}`
  });

  return {
    rowNumber: numericRow,
    status: normalizedStatus,
    category: category,
    target: target
  };
}

function rebuildRecentRunSummarySheet_(sheet) {
  ensureRecentRunSummaryHeader_(sheet);
  const latestByEntryPoint = readLatestRunLogEntriesByEntryPoint_();
  const families = buildRecentRunSummaryFamilies_();
  const rows = families.map(family => {
    const match = family.entryPoints.map(entryPoint => latestByEntryPoint[entryPoint]).find(Boolean);
    return buildRecentRunSummaryRow_(family, match);
  });

  const values = rows.length ? rows : [[
    'info',
    '',
    '',
    'no-runlog-data',
    '',
    '',
    'RunLog has no non-header rows yet.',
    'Run a dry-run, review loop, validation checkpoint, or wrapper before using this sheet.'
  ]];

  const maxRowsToClear = Math.max(sheet.getLastRow() - 1, values.length, 1);
  sheet.getRange(2, 1, maxRowsToClear, 8).clearContent();
  sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
  configureRecentRunSummarySheetUx_(sheet);

  return {
    totalFamilies: rows.length,
    missingFamilies: rows.filter(row => row[3] === 'missing').length,
    staleFamilies: rows.filter(row => row[3] === 'stale').length
  };
}

function summarizeWorkflowAuditBucket_(rows, predicate) {
  const matches = (rows || []).filter(row => predicate(row));
  return {
    count: matches.length,
    example: formatWorkflowAuditExample_(matches[0])
  };
}

function formatWorkflowAuditExample_(row) {
  if (!row) return '';
  const from = truncateRunNote_(String(row.from || '').trim(), 80);
  const subject = truncateRunNote_(String(row.subject || '').trim(), 120);
  if (from && subject) return `${from} — ${subject}`;
  return from || subject || '';
}

function buildRecentRunSummaryFamilies_() {
  return [
    { label: 'Phase 10 review loop', entryPoints: ['runPhase10ReviewLoopOptionA'], staleHours: 72 },
    { label: 'Phase 10 validation checkpoint', entryPoints: ['runPhase10ValidationCheckpoint'], staleHours: 72 },
    { label: 'Phase 10 log rotation', entryPoints: ['rotateOperationalLogsPhase10'], staleHours: 72 },
    { label: 'Automation health audit', entryPoints: ['runAutomationHealthAuditWrapper', 'auditAutomationHealth'], staleHours: 36 },
    { label: 'Frequent processing wrapper', entryPoints: ['runFrequentProcessingLiveWrapper'], staleHours: 18 },
    { label: 'Morning main digest wrapper', entryPoints: ['runMorningMainDigestLiveWrapper'], staleHours: 36 },
    { label: 'Evening main digest wrapper', entryPoints: ['runEveningMainDigestLiveWrapper'], staleHours: 36 },
    { label: 'Morning news digest wrapper', entryPoints: ['runMorningNewsDigestLiveWrapper'], staleHours: 36 },
    { label: 'Evening news digest wrapper', entryPoints: ['runEveningNewsDigestLiveWrapper'], staleHours: 36 }
  ];
}

function buildRecentRunSummaryRow_(family, run) {
  if (!run) {
    return [
      family.label,
      '',
      '',
      'missing',
      '',
      '',
      'No RunLog entry found for this run family yet.',
      'Run or wait for this helper/wrapper, then confirm it logs successfully.'
    ];
  }

  const stale = isRecentRunSummaryStale_(run.timestamp, family.staleHours);
  return [
    family.label,
    formatControlSurfaceTimestamp_(run.timestamp),
    run.entryPoint,
    stale ? 'stale' : (run.outcome || 'ok'),
    run.processedThreads === undefined ? '' : run.processedThreads,
    run.primaryCount === undefined ? '' : run.primaryCount,
    stale ? `Last run is older than ${family.staleHours}h. ${run.notes || ''}`.trim() : (run.notes || ''),
    stale ? 'Review trigger schedule / recent activity if this should have run more recently.' : buildRecentRunSummaryAction_(run)
  ];
}

function buildRecentRunSummaryAction_(run) {
  const outcome = String(run && run.outcome || '').trim().toLowerCase();
  if (!outcome) return 'Review raw RunLog row if this result feels unclear.';
  if (outcome.indexOf('failed') !== -1 || outcome.indexOf('error') !== -1) {
    return 'Inspect RunLog notes and the related sheet/log before trusting this area.';
  }
  if (outcome.indexOf('warning') !== -1 || outcome.indexOf('skipped') !== -1 || outcome.indexOf('missing') !== -1 || outcome.indexOf('disabled') !== -1) {
    return 'Inspect recent automation/control-surface state and decide whether intervention is needed.';
  }
  if (outcome.indexOf('no-imports') !== -1 || outcome.indexOf('no-approved') !== -1 || outcome.indexOf('empty') !== -1) {
    return 'No action needed unless you expected work here.';
  }
  return 'Looks healthy; only dig deeper if another sheet suggests drift.';
}

function isRecentRunSummaryStale_(timestamp, staleHours) {
  if (!(timestamp instanceof Date) || !Number.isFinite(staleHours)) return false;
  return (new Date().getTime() - timestamp.getTime()) > staleHours * 60 * 60 * 1000;
}

function readLatestRunLogEntriesByEntryPoint_() {
  const sheet = getOrCreateRunLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const latestByEntryPoint = {};

  values.forEach(row => {
    const entryPoint = String(row[3] || '').trim();
    const timestamp = row[0];
    if (!entryPoint || !(timestamp instanceof Date)) return;
    const current = latestByEntryPoint[entryPoint];
    if (!current || current.timestamp.getTime() < timestamp.getTime()) {
      latestByEntryPoint[entryPoint] = {
        timestamp: timestamp,
        runType: String(row[1] || '').trim(),
        mode: String(row[2] || '').trim(),
        entryPoint: entryPoint,
        processedThreads: row[4],
        primaryCount: row[5],
        outcome: String(row[6] || '').trim(),
        notes: String(row[7] || '').trim()
      };
    }
  });

  return latestByEntryPoint;
}

function pickLatestRunEntry_(entries) {
  return (entries || []).filter(entry => entry && entry.timestamp instanceof Date)
    .reduce((latest, entry) => {
      if (!latest || latest.timestamp.getTime() < entry.timestamp.getTime()) return entry;
      return latest;
    }, null);
}

function hasAppliedLabel_(appliedLabels, labelName) {
  if (!labelName) return false;
  return String(appliedLabels || '').split(',').map(entry => entry.trim()).filter(Boolean).includes(labelName);
}

function hasAnyAppliedLabel_(appliedLabels, labelNames) {
  return (labelNames || []).some(labelName => hasAppliedLabel_(appliedLabels, labelName));
}

function hasExactAppliedLabels_(appliedLabels, expectedLabels) {
  const actual = String(appliedLabels || '').split(',').map(entry => entry.trim()).filter(Boolean);
  const expected = (expectedLabels || []).filter(Boolean);
  if (actual.length !== expected.length) return false;
  return expected.every(labelName => actual.includes(labelName));
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

function rebuildControlSurfaceStatusSheet_(sheet) {
  const tuningSummary = summarizeTuningSuggestions_();
  const approvedRulesSummary = summarizeApprovedRules_();
  const automationHealthSummary = summarizeAutomationHealthStatus_();
  const workflowSummary = summarizeWorkflowHealthForStatus_();
  const checkpointSummary = summarizeCheckpointRunStatus_();
  const logRotationSummary = summarizeLogRotationStatusPhase10_();
  const nextAction = buildControlSurfaceNextAction_(tuningSummary, workflowSummary, checkpointSummary);
  const newsWorkflowLabel = CONFIG.newsWorkflowLabel ? CONFIG.newsWorkflowLabel : '(blank)';

  const rows = [
    ['Metric', 'Value', 'Meaning', 'Next action'],
    ['last-updated', formatControlSurfaceTimestamp_(new Date()), 'When this dashboard was last rebuilt', nextAction],
    ['operator-step-1', tuningSummary.newCount ? 'review TuningReviewQueue' : 'check ControlSurfaceStatus', 'First operator action in the Phase 10 loop', tuningSummary.newCount ? 'Open TuningReviewQueue, then update the referenced source rows in TuningSuggestions as approved, rejected, or superseded.' : 'No fresh review work right now; use this sheet as the quick system overview.'],
    ['operator-step-2', tuningSummary.approved ? 'run review/import loop' : 'no import work pending', 'Second operator action after review', tuningSummary.approved ? 'Run runPhase10ReviewLoopOptionA() to import approved suggestions and refresh runtime.' : 'Import step is clear right now.'],
    ['operator-step-3', 'refresh + validate', 'Final operator action after changes', 'Run runPhase10ValidationCheckpoint() for the fast confidence pass, then use runPhase10ExtendedValidationCheckpoint() only when you want the heavier AI/tuning checks too.'],
    ['workflow-review-default', 'Review/Ambiguous', 'Ambiguous mail should stay review-only and workflow-blank unless another rule classifies it more confidently', 'Use this as the baseline mental model for operator review'],
    ['workflow-fyi-default', 'explicit only', 'FYI should be assigned intentionally for informational mail, not inferred from generic ambiguity', 'Use ApprovedRules fyi-sender or explicit model output when you really want FYI.'],
    ['workflow-news-label', newsWorkflowLabel, 'Current workflow label applied to News/Digest items; blank keeps news separate from FYI/notification', CONFIG.newsWorkflowLabel ? 'Keep only if this is an intentional operator choice.' : 'Recommended default: leave blank unless you explicitly want FYI/notification on news.'],
    ['workflow-audit-warnings', workflowSummary.warningCount, 'How many recent workflow-semantics warning buckets are currently active', workflowSummary.warningCount ? workflowSummary.nextAction : 'No current semantics drift warnings surfaced by WorkflowAudit.'],
    ['workflow-legacy-review-plus-fyi', workflowSummary.legacyReviewFyiCount, 'Recent rows that still used the old Review + FYI combined shape', workflowSummary.legacyReviewFyiCount ? 'Inspect WorkflowAudit and the example row to find the remaining path.' : 'Healthy: no recent legacy review+FYI rows.'],
    ['workflow-news-with-workflow', workflowSummary.newsWithWorkflowCount, 'Recent news rows that also carried a workflow label', workflowSummary.newsWithWorkflowCount && !CONFIG.newsWorkflowLabel ? 'Inspect WorkflowAudit unless this was an explicit operator choice.' : 'Healthy unless you intentionally configured newsWorkflowLabel.'],
    ['workflow-archived-review', workflowSummary.archivedReviewCount, 'Recent Review/Ambiguous rows that were archived', workflowSummary.archivedReviewCount ? 'Confirm archived review rows were truly intentional.' : 'Healthy: no recent archived review rows.'],
    ['phase10-last-checkpoint', checkpointSummary.value, 'Latest recorded Phase 10 checkpoint outcome from RunLog', checkpointSummary.nextAction],
    ['log-rotation-last-status', logRotationSummary.status, 'Latest operational-log rotation outcome recorded in RunLog', logRotationSummary.nextAction],
    ['log-rotation-retention-days', logRotationSummary.retentionDays, 'Current active-log retention window from Preferences', logRotationSummary.retentionHint],
    ['automation-health-last-status', automationHealthSummary.status, 'Latest recorded automation-health outcome from AutomationHealthLog', automationHealthSummary.nextAction],
    ['automation-health-last-alert-time', automationHealthSummary.timestamp, 'When the latest automation-health row was logged', ''],
    ['automation-health-alert-email', automationHealthSummary.alertEmailStatus, 'Whether email escalation is enabled/configured in Preferences', automationHealthSummary.alertEmailNextAction],
    ['tuning-total-rows', tuningSummary.totalRows, 'Total non-header rows currently in TuningSuggestions', ''],
    ['tuning-new-actionable', tuningSummary.newCount, 'Real suggestions not yet reviewed', tuningSummary.newCount ? 'Review these first in TuningSuggestions.' : ''],
    ['tuning-no-suggestions-placeholders', tuningSummary.noSuggestionsOpen, 'Informational no-suggestions rows retained as queue anchors, not real review work', ''],
    ['tuning-approved-pending-import', tuningSummary.approved, 'Suggestions marked approved and ready to import into ApprovedRules', tuningSummary.approved ? 'Run runPhase10ReviewLoopOptionA() to import and refresh runtime.' : ''],
    ['tuning-rejected', tuningSummary.rejected, 'Suggestions explicitly rejected by operator review', ''],
    ['tuning-imported', tuningSummary.imported, 'Suggestions already imported into ApprovedRules', ''],
    ['tuning-superseded-or-reclassified', tuningSummary.superseded, 'Suggestions intentionally replaced by a better decision/path', ''],
    ['approved-rules-total', approvedRulesSummary.totalRows, 'Total rows in ApprovedRules', ''],
    ['approved-rules-active', approvedRulesSummary.activeRows, 'Rows currently enabled for runtime use', ''],
    ['review-loop-state', nextAction, 'Simple operator-oriented status message', 'Use this as the default starting point for Option A workflow']
  ];

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(2, 2, rows.length - 1, 1).setNumberFormat('@');
  styleControlSurfaceSheet_(sheet, [220, 140, 360, 420]);
  setHeaderNotes_(sheet, {
    1: 'Status metric or queue label.',
    2: 'Current value observed in the workbook.',
    3: 'What the metric means operationally.',
    4: 'Recommended next operator action.'
  });

  return {
    tuningSummary: {
      totalRows: tuningSummary.totalRows,
      pending: tuningSummary.newCount + tuningSummary.approved,
      approved: tuningSummary.approved,
      imported: tuningSummary.imported,
      rejected: tuningSummary.rejected,
      superseded: tuningSummary.superseded,
      newCount: tuningSummary.newCount,
      noSuggestionsOpen: tuningSummary.noSuggestionsOpen
    },
    approvedRulesSummary: approvedRulesSummary,
    nextAction: nextAction
  };
}

function summarizeTuningSuggestions_() {
  const sheet = getOrCreateTuningSuggestionsSheet_();
  const lastRow = sheet.getLastRow();
  const summary = {
    totalRows: Math.max(0, lastRow - 1),
    newCount: 0,
    noSuggestionsOpen: 0,
    approved: 0,
    rejected: 0,
    imported: 0,
    superseded: 0,
    alreadyImported: 0,
    skipped: 0
  };

  if (lastRow <= 1) return summary;

  const values = sheet.getRange(2, 2, lastRow - 1, 9).getDisplayValues();
  values.forEach(row => {
    const category = String(row[0] || '').trim().toLowerCase();
    const normalizedStatus = String(row[8] || '').trim().toLowerCase();
    if (!normalizedStatus || normalizedStatus === 'new') {
      if (category === 'no-suggestions') {
        summary.noSuggestionsOpen += 1;
        return;
      }
      summary.newCount += 1;
      return;
    }
    if (normalizedStatus === 'approved') {
      summary.approved += 1;
      return;
    }
    if (normalizedStatus === 'rejected') {
      summary.rejected += 1;
      return;
    }
    if (normalizedStatus === 'imported') {
      summary.imported += 1;
      return;
    }
    if (normalizedStatus === 'already-imported') {
      summary.alreadyImported += 1;
      return;
    }
    if (normalizedStatus === 'skipped') {
      summary.skipped += 1;
      return;
    }
    if (normalizedStatus === 'superseded' || normalizedStatus === 'reclassified-shipping') {
      summary.superseded += 1;
    }
  });

  return summary;
}

function summarizeApprovedRules_() {
  const rows = readApprovedRules_();
  return {
    totalRows: rows.length,
    activeRows: rows.filter(row => isAffirmativeFlag_(row.approved)).length
  };
}

function summarizeAutomationHealthStatus_() {
  const prefMap = readPreferencesMap_();
  const alertEnabled = /^(true|yes|1)$/i.test(String(prefMap.automationHealthAlertEnabled || '').trim());
  const alertRecipient = String(prefMap.automationHealthAlertRecipient || '').trim();
  const minSeverity = String(prefMap.automationHealthAlertMinSeverity || 'warning').trim().toLowerCase() || 'warning';
  const latest = readLatestAutomationHealthRow_();

  const alertEmailStatus = alertEnabled
    ? (alertRecipient ? `enabled -> ${alertRecipient}` : 'enabled but no recipient configured')
    : 'disabled';

  return {
    status: latest ? `${latest.severity || 'info'} / ${latest.status || 'unknown'}` : 'no-audit-data-yet',
    timestamp: latest ? latest.timestamp : '',
    nextAction: latest && latest.status !== 'healthy' ? 'Review AutomationHealthLog and recent RunLog rows.' : 'Healthy or no recent alerts logged.',
    alertEmailStatus: `${alertEmailStatus}; min-severity=${minSeverity}`,
    alertEmailNextAction: alertEnabled
      ? (alertRecipient ? 'Email escalation is armed for qualifying alerts.' : 'Set automationHealthAlertRecipient to actually send alert emails.')
      : 'Set automationHealthAlertEnabled=true only if you want email escalation.'
  };
}

function summarizeLogRotationStatusPhase10_() {
  const latest = readLatestRunLogEntriesByEntryPoint_().rotateOperationalLogsPhase10;
  const retentionDays = Number(getPreferenceValue_('logRetentionDays', 7)) || 7;
  const enabled = isAffirmativeFlag_(getPreferenceValue_('logRotationEnabled', true));

  if (!enabled) {
    return {
      status: 'disabled',
      retentionDays: retentionDays,
      retentionHint: 'Set logRotationEnabled=true to keep active log sheets compact.',
      nextAction: 'Log rotation is disabled; enable it if active log tabs start feeling heavy.'
    };
  }

  if (!latest) {
    return {
      status: 'no-rotation-run-yet',
      retentionDays: retentionDays,
      retentionHint: `Active logs keep the last ${retentionDays} day(s) before archiving to *Archive sheets.`,
      nextAction: 'Run rotateOperationalLogsPhase10() once or use the normal Phase 10 loop to seed the first archive pass.'
    };
  }

  return {
    status: latest.outcome || 'unknown',
    retentionDays: retentionDays,
    retentionHint: `Active logs keep the last ${retentionDays} day(s) before archiving to *Archive sheets.`,
    nextAction: latest.primaryCount ? `Last rotation archived ${latest.primaryCount} row(s).` : 'No old rows needed archiving in the latest pass.'
  };
}

function readLatestAutomationHealthRow_() {
  const sheet = getOrCreateAutomationHealthLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const row = sheet.getRange(lastRow, 1, 1, 11).getDisplayValues()[0];
  return {
    timestamp: row[0] || '',
    severity: row[1] || '',
    functionName: row[2] || '',
    scheduledLocal: row[3] || '',
    status: row[4] || '',
    notes: row[10] || ''
  };
}

function buildControlSurfaceNextAction_(tuningSummary) {
  if (arguments.length > 1) {
    const workflowSummary = arguments[1] || {};
    const checkpointSummary = arguments[2] || {};
    if (workflowSummary.warningCount) {
      return `WorkflowAudit is showing ${workflowSummary.warningCount} warning bucket(s); inspect semantics before treating the system as settled.`;
    }
    if (checkpointSummary && checkpointSummary.needsAttention) {
      return checkpointSummary.nextAction;
    }
  }
  if (tuningSummary.approved) {
    return `There are ${tuningSummary.approved} approved suggestions waiting for import.`;
  }
  if (tuningSummary.newCount) {
    return `There are ${tuningSummary.newCount} new suggestions waiting for review.`;
  }
  if (tuningSummary.noSuggestionsOpen) {
    return 'No actionable tuning suggestions right now.';
  }
  return 'No pending review/import work right now.';
}

function summarizeWorkflowHealthForStatus_() {
  const snapshot = buildWorkflowAuditSnapshot_();
  const warningCount = [
    snapshot.legacyReviewFyi.count ? 1 : 0,
    snapshot.newsWithWorkflow.count && !CONFIG.newsWorkflowLabel ? 1 : 0,
    snapshot.archivedReview.count ? 1 : 0,
    snapshot.rowsScanned ? 0 : 1
  ].reduce((sum, value) => sum + value, 0);

  return {
    rowsScanned: snapshot.rowsScanned,
    warningCount: warningCount,
    legacyReviewFyiCount: snapshot.legacyReviewFyi.count,
    newsWithWorkflowCount: snapshot.newsWithWorkflow.count,
    archivedReviewCount: snapshot.archivedReview.count,
    nextAction: !snapshot.rowsScanned
      ? 'Run a dry-run or live processing pass, then rebuild WorkflowAudit.'
      : 'Open WorkflowAudit for the representative row examples and confirm the remaining semantics drift is intentional.'
  };
}

function summarizeCheckpointRunStatus_() {
  const latestByEntryPoint = readLatestRunLogEntriesByEntryPoint_();
  const latest = pickLatestRunEntry_([
    latestByEntryPoint.runPhase10ValidationCheckpoint,
    latestByEntryPoint.runPhase10ExtendedValidationCheckpoint
  ]);
  if (!latest) {
    return {
      value: 'no-checkpoint-yet',
      nextAction: 'Run runPhase10ValidationCheckpoint() after meaningful control-surface changes.',
      needsAttention: true
    };
  }

  const outcome = String(latest.outcome || '').trim();
  const notes = String(latest.notes || '').trim();
  const value = `${formatControlSurfaceTimestamp_(latest.timestamp)} — ${outcome || 'unknown'}`;

  if (/failed|error/i.test(outcome)) {
    return {
      value: value,
      nextAction: notes ? `Latest checkpoint failed: ${truncateRunNote_(notes, 180)}` : 'Latest checkpoint failed; inspect ValidationStatus and RunLog.',
      needsAttention: true
    };
  }

  return {
    value: value,
    nextAction: notes ? `Latest checkpoint notes: ${truncateRunNote_(notes, 180)}` : 'Latest checkpoint looks healthy.',
    needsAttention: false
  };
}

function formatControlSurfaceTimestamp_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
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
  CONFIG.newsWorkflowLabel = getOptionalWorkflowPreferenceValue_('newsWorkflowLabel', CONFIG.newsWorkflowLabel);
  CONFIG.automationHealthAlertEnabled = getPreferenceValue_('automationHealthAlertEnabled', CONFIG.automationHealthAlertEnabled);
  CONFIG.automationHealthAlertRecipient = getPreferenceValue_('automationHealthAlertRecipient', CONFIG.automationHealthAlertRecipient);
  CONFIG.automationHealthAlertMinSeverity = getPreferenceValue_('automationHealthAlertMinSeverity', CONFIG.automationHealthAlertMinSeverity);

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
      itemCount: 14 + approvedRulesSummary.appliedCount,
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
    automationHealthAlertEnabled: CONFIG.automationHealthAlertEnabled,
    automationHealthAlertRecipient: CONFIG.automationHealthAlertRecipient,
    automationHealthAlertMinSeverity: CONFIG.automationHealthAlertMinSeverity,
    newsSenders: CONFIG.newsSenders,
    newsExcludedSenders: CONFIG.newsExcludedSenders,
    approvedRulesApplied: approvedRulesSummary.appliedCount,
    approvedRulesConfigured: approvedRulesSummary.approvedCount
  };
}

function normalizePreferenceRowsPhase10_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const range = sheet.getRange(2, 1, lastRow - 1, 4);
  const values = range.getDisplayValues();
  let changed = false;

  values.forEach(row => {
    const key = String(row[0] || '').trim();
    if (key === 'newsWorkflowLabel') {
      row[2] = 'Optional workflow label for news items; leave blank to keep news separate from FYI/notification';
      if (String(row[1] || '').trim() === '2: FYI') {
        row[1] = '';
      }
      changed = true;
      return;
    }

    if (key === 'automationHealthAlertEnabled') {
      row[2] = 'If true, send email when automation-health audit detects qualifying alerts';
      if (!String(row[1] || '').trim()) {
        row[1] = 'false';
      }
      changed = true;
      return;
    }

    if (key === 'automationHealthAlertRecipient') {
      row[2] = 'Optional recipient for automation-health alert emails; leave blank to suppress sending';
      changed = true;
      return;
    }

    if (key === 'automationHealthAlertMinSeverity') {
      row[2] = 'Minimum alert severity for email escalation: warning or error';
      if (!String(row[1] || '').trim()) {
        row[1] = 'warning';
      }
      changed = true;
      return;
    }

    if (key === 'logRotationEnabled') {
      row[2] = 'If true, archive old operational log rows out of the active workbook tabs during the Phase 10 loop';
      if (!String(row[1] || '').trim()) {
        row[1] = 'true';
      }
      changed = true;
      return;
    }

    if (key === 'logRetentionDays') {
      row[2] = 'How many days to keep in the active log tabs before rows move into *Archive sheets';
      if (!String(row[1] || '').trim()) {
        row[1] = '7';
      }
      changed = true;
    }
  });

  if (changed) {
    range.setValues(values);
  }

  ensurePreferenceRowExists_(sheet, 'automationHealthAlertEnabled', 'false', 'If true, send email when automation-health audit detects qualifying alerts', 'yes');
  ensurePreferenceRowExists_(sheet, 'automationHealthAlertRecipient', '', 'Optional recipient for automation-health alert emails; leave blank to suppress sending', 'yes');
  ensurePreferenceRowExists_(sheet, 'automationHealthAlertMinSeverity', 'warning', 'Minimum alert severity for email escalation: warning or error', 'yes');
  ensurePreferenceRowExists_(sheet, 'logRotationEnabled', 'true', 'If true, archive old operational log rows out of the active workbook tabs during the Phase 10 loop', 'yes');
  ensurePreferenceRowExists_(sheet, 'logRetentionDays', '7', 'How many days to keep in the active log tabs before rows move into *Archive sheets', 'yes');
}

function ensurePreferenceRowExists_(sheet, key, value, description, enabled) {
  if (!sheet || !key) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    sheet.getRange(2, 1, 1, 4).setValues([[key, value, description, enabled || 'yes']]);
    return;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
  const existingIndex = values.findIndex(row => String(row[0] || '').trim() === key);
  if (existingIndex >= 0) {
    const rowNumber = existingIndex + 2;
    sheet.getRange(rowNumber, 3).setValue(description);
    if (!String(sheet.getRange(rowNumber, 4).getDisplayValue() || '').trim()) {
      sheet.getRange(rowNumber, 4).setValue(enabled || 'yes');
    }
    return;
  }

  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[key, value, description, enabled || 'yes']]);
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
