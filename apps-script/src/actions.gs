function getOrCreateLabel_(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}

function applyDecision_(thread, decision) {
  if (!decision || decision.action === 'preserve') {
    return { appliedLabels: [], archived: false, mode: CONFIG.dryRun ? 'dry-run' : 'live' };
  }

  const labelsToApply = [];
  if (decision.label) labelsToApply.push(decision.label);
  if (decision.workflowLabel) labelsToApply.push(decision.workflowLabel);

  if (CONFIG.dryRun) {
    return {
      appliedLabels: labelsToApply,
      archived: Boolean(decision.archive),
      mode: 'dry-run'
    };
  }

  clearManagedDecisionLabels_(thread, labelsToApply);

  labelsToApply.forEach(name => {
    getOrCreateLabel_(name).addToThread(thread);
  });

  if (decision.archive) {
    thread.moveToArchive();
  }

  return {
    appliedLabels: labelsToApply,
    archived: Boolean(decision.archive),
    mode: 'live'
  };
}

function clearManagedDecisionLabels_(thread, labelsToKeep) {
  const keep = new Set(labelsToKeep || []);
  thread.getLabels().forEach(label => {
    const name = label.getName();
    if (CONFIG.decisionLabels.includes(name) && !keep.has(name)) {
      thread.removeLabel(label);
    }
  });
}

function logDecision_(rows, thread, decision, result) {
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  rows.push([
    new Date(),
    result.mode || '',
    thread.getId(),
    (lastMessage && lastMessage.getFrom()) || '',
    (lastMessage && lastMessage.getSubject()) || '',
    decision.reason || '',
    (result.appliedLabels || []).join(', '),
    result.archived ? 'yes' : 'no',
    decision.aiConfidence === null || decision.aiConfidence === undefined ? '' : decision.aiConfidence
  ]);
}

function flushDecisionLog_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreateDecisionLogSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreateDecisionLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('DecisionLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('DecisionLog');
    sheet.getRange(1, 1, 1, 9).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Reason',
      'Applied Labels',
      'Archived',
      'AI Confidence'
    ]]);
  }

  return sheet;
}

function getOrCreateFollowUpLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('FollowUpLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('FollowUpLog');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Current Labels',
      'Last Message Date',
      'Last Message Sender Type',
      'Days Since Last Message',
      'Suggested Status',
      'Reason'
    ]]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Current Labels',
      'Last Message Date',
      'Last Message Sender Type',
      'Days Since Last Message',
      'Suggested Status',
      'Reason'
    ]]);
    return sheet;
  }

  const header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 10)).getValues()[0];
  if (header[10] !== 'Reason') {
    sheet.insertColumnAfter(10);
    sheet.getRange(1, 11).setValue('Reason');
  }

  return sheet;
}

function flushFollowUpLog_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreateFollowUpLogSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreateDigestLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('DigestLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('DigestLog');
    sheet.getRange(1, 1, 1, 5).setValues([[
      'Timestamp',
      'Digest Type',
      'Mode',
      'Summary',
      'Item Count'
    ]]);
  }

  return sheet;
}

function logDigestRun_(digestType, mode, summary, itemCount) {
  const sheet = getOrCreateDigestLogSheet_();
  const row = [[new Date(), digestType, mode, summary, itemCount]];
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, 1, row[0].length).setValues(row);
}

function getOrCreateRunLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('RunLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('RunLog');
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Timestamp',
      'Run Type',
      'Mode',
      'Entry Point',
      'Processed Threads',
      'Primary Count',
      'Outcome',
      'Notes'
    ]]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Timestamp',
      'Run Type',
      'Mode',
      'Entry Point',
      'Processed Threads',
      'Primary Count',
      'Outcome',
      'Notes'
    ]]);
    return sheet;
  }

  const header = sheet.getRange(1, 1, 1, 8).getValues()[0];
  if (header[5] !== 'Primary Count') {
    sheet.getRange(1, 6).setValue('Primary Count');
  }

  return sheet;
}

function getOrCreateTuningSuggestionsSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('TuningSuggestions');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('TuningSuggestions');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Category',
      'Suggested Change',
      'Target',
      'Evidence Count',
      'Confidence',
      'Example From',
      'Example Subject',
      'Reason',
      'Status',
      'Notes'
    ]]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Category',
      'Suggested Change',
      'Target',
      'Evidence Count',
      'Confidence',
      'Example From',
      'Example Subject',
      'Reason',
      'Status',
      'Notes'
    ]]);
    return sheet;
  }

  const header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 11)).getValues()[0];
  if (header[6] !== 'Example From') {
    sheet.insertColumnAfter(6);
    sheet.getRange(1, 7).setValue('Example From');
    sheet.getRange(1, 8).setValue('Example Subject');
    sheet.getRange(1, 9).setValue('Reason');
    sheet.getRange(1, 10).setValue('Status');
    sheet.getRange(1, 11).setValue('Notes');
  }

  return sheet;
}

function flushTuningSuggestions_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreateTuningSuggestionsSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreateAiRecommendationsSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('AiRecommendations');
  const header = [[
    'Timestamp',
    'Phase',
    'Source Helper',
    'Candidate Type',
    'Sender',
    'Proposed Change',
    'Confidence',
    'Evidence Count',
    'Current State',
    'Example Subject',
    'Recommended Workflow',
    'Operator Action',
    'Reasoning',
    'Status',
    'Notes'
  ]];

  if (!sheet) {
    sheet = spreadsheet.insertSheet('AiRecommendations');
    sheet.getRange(1, 1, 1, header[0].length).setValues(header);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, header[0].length).setValues(header);
    return sheet;
  }

  const existingHeader = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 12)).getDisplayValues()[0];
  if (existingHeader[2] !== 'Source Helper' || existingHeader[10] !== 'Recommended Workflow' || existingHeader[11] !== 'Operator Action' || existingHeader[14] !== 'Notes') {
    if (sheet.getLastColumn() < header[0].length) {
      sheet.insertColumnsAfter(sheet.getLastColumn(), header[0].length - sheet.getLastColumn());
    }

    if (sheet.getLastRow() > 1 && existingHeader[2] === 'Candidate Type') {
      const lastRow = sheet.getLastRow();
      const oldValues = sheet.getRange(2, 1, lastRow - 1, Math.min(12, sheet.getLastColumn())).getValues();
      const migratedValues = oldValues.map(row => ([
        row[0],
        row[1],
        '',
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[8],
        '',
        '',
        row[9],
        row[10],
        row[11]
      ]));
      sheet.getRange(2, 1, lastRow - 1, header[0].length).clearContent();
      sheet.getRange(2, 1, migratedValues.length, header[0].length).setValues(migratedValues);
    }

    sheet.getRange(1, 1, 1, header[0].length).setValues(header);
  }

  return sheet;
}

function flushAiRecommendations_(rows) {
  if (!rows.length) {
    return {
      insertedCount: 0,
      refreshedCount: 0,
      skippedCount: 0
    };
  }

  const sheet = getOrCreateAiRecommendationsSheet_();
  const openIndex = buildOpenAiRecommendationIndex_(sheet);
  const newRows = [];
  let refreshedCount = 0;
  let skippedCount = 0;

  rows.forEach(row => {
    const rowKey = buildAiRecommendationQueueKey_(row);
    if (!rowKey) {
      skippedCount += 1;
      return;
    }

    const existingRowNumber = openIndex[rowKey];
    if (existingRowNumber) {
      sheet.getRange(existingRowNumber, 1, 1, row.length).setValues([[
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[8],
        row[9],
        row[10],
        row[11],
        row[12],
        sheet.getRange(existingRowNumber, 14).getValue() || 'new',
        mergeAiRecommendationNotes_(sheet.getRange(existingRowNumber, 15).getValue(), row[14], 'refreshed duplicate open recommendation')
      ]]);
      refreshedCount += 1;
      return;
    }

    newRows.push(row);
    openIndex[rowKey] = sheet.getLastRow() + newRows.length;
  });

  if (newRows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return {
    insertedCount: newRows.length,
    refreshedCount: refreshedCount,
    skippedCount: skippedCount
  };
}

function buildOpenAiRecommendationIndex_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, 15).getDisplayValues();
  const index = {};

  values.forEach((row, offset) => {
    const status = String(row[13] || '').trim().toLowerCase();
    if (isTerminalAiRecommendationStatus_(status)) return;

    const rowKey = buildAiRecommendationQueueKey_(row);
    if (!rowKey) return;
    index[rowKey] = offset + 2;
  });

  return index;
}

function buildAiRecommendationQueueKey_(row) {
  if (!row || row.length < 6) return '';
  const sourceHelper = String(row[2] || '').trim().toLowerCase();
  const candidateType = String(row[3] || '').trim().toLowerCase();
  const sender = String(row[4] || '').trim().toLowerCase();
  const proposedChange = String(row[5] || '').trim().toLowerCase();
  if (!sourceHelper || !candidateType || !sender || !proposedChange) return '';
  return [sourceHelper, candidateType, sender, proposedChange].join('||');
}

function isTerminalAiRecommendationStatus_(status) {
  return [
    'rejected',
    'skipped',
    'superseded',
    'imported',
    'already-imported',
    'applied',
    'done',
    'closed'
  ].includes(String(status || '').trim().toLowerCase());
}

function mergeAiRecommendationNotes_(existingNotes, incomingNotes, suffix) {
  const parts = [];
  const existing = String(existingNotes || '').trim();
  const incoming = String(incomingNotes || '').trim();
  const trailing = String(suffix || '').trim();

  if (existing) parts.push(existing);
  if (incoming && incoming !== existing) parts.push(incoming);
  if (trailing && parts.join('; ').toLowerCase().indexOf(trailing.toLowerCase()) === -1) {
    parts.push(trailing);
  }

  return parts.join('; ');
}

function getOrCreateAutomationHealthLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('AutomationHealthLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('AutomationHealthLog');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Severity',
      'Function Name',
      'Scheduled Local',
      'Status',
      'Expected Count',
      'Completed Count',
      'Failed Count',
      'Skipped Count',
      'Matched Run Local',
      'Notes'
    ]]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Severity',
      'Function Name',
      'Scheduled Local',
      'Status',
      'Expected Count',
      'Completed Count',
      'Failed Count',
      'Skipped Count',
      'Matched Run Local',
      'Notes'
    ]]);
  }

  return sheet;
}

function logAutomationHealthRows_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreateAutomationHealthLogSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function logRunSummary_(entry) {
  const sheet = getOrCreateRunLogSheet_();
  const row = [[
    new Date(),
    entry.runType || '',
    entry.mode || '',
    entry.entryPoint || '',
    entry.processedThreads === undefined ? '' : entry.processedThreads,
    entry.itemCount === undefined ? '' : entry.itemCount,
    entry.outcome || '',
    entry.notes || ''
  ]];
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, 1, row[0].length).setValues(row);
}

function rotateOperationalLogsPhase10() {
  const config = getPhase10LogRotationConfig_();
  const specs = buildPhase10LogRotationSpecs_();

  if (!config.enabled) {
    logRunSummary_({
      runType: 'control-surface',
      mode: 'internal',
      entryPoint: 'rotateOperationalLogsPhase10',
      processedThreads: specs.length,
      itemCount: 0,
      outcome: 'log-rotation-disabled',
      notes: `retention-days=${config.retentionDays}`
    });

    return {
      enabled: false,
      retentionDays: config.retentionDays,
      scannedSheets: specs.length,
      rotatedSheets: 0,
      archivedRows: 0,
      sheets: []
    };
  }

  const summaries = specs.map(spec => rotateLogSheetByRetention_(spec, config.retentionDays));
  const archivedRows = summaries.reduce((sum, summary) => sum + summary.archivedRows, 0);
  const rotatedSheets = summaries.filter(summary => summary.archivedRows > 0).length;

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rotateOperationalLogsPhase10',
    processedThreads: specs.length,
    itemCount: archivedRows,
    outcome: archivedRows ? 'logs-rotated' : 'logs-unchanged',
    notes: `retention-days=${config.retentionDays}; rotated-sheets=${rotatedSheets}`
  });

  return {
    enabled: true,
    retentionDays: config.retentionDays,
    scannedSheets: specs.length,
    rotatedSheets: rotatedSheets,
    archivedRows: archivedRows,
    sheets: summaries
  };
}

function buildPhase10LogRotationSpecs_() {
  return [
    { sheetName: 'DecisionLog', getSheet: getOrCreateDecisionLogSheet_ },
    { sheetName: 'RunLog', getSheet: getOrCreateRunLogSheet_ },
    { sheetName: 'DigestLog', getSheet: getOrCreateDigestLogSheet_ },
    { sheetName: 'AutomationHealthLog', getSheet: getOrCreateAutomationHealthLogSheet_ },
    { sheetName: 'DraftLog', getSheet: getOrCreateDraftLogSheet_ },
    { sheetName: 'FollowUpLog', getSheet: getOrCreateFollowUpLogSheet_ }
  ];
}

function getPhase10LogRotationConfig_() {
  const enabled = isAffirmativeFlag_(getPreferenceValue_('logRotationEnabled', true));
  const rawRetentionDays = Number(getPreferenceValue_('logRetentionDays', 7));
  const retentionDays = rawRetentionDays > 0 ? Math.floor(rawRetentionDays) : 7;

  return {
    enabled: enabled,
    retentionDays: retentionDays
  };
}

function rotateLogSheetByRetention_(spec, retentionDays) {
  const sheet = spec.getSheet();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const summary = {
    sheetName: spec.sheetName,
    archiveSheetName: `${spec.sheetName}Archive`,
    archivedRows: 0,
    retainedRows: Math.max(0, lastRow - 1),
    oldestArchived: '',
    newestArchived: ''
  };

  if (lastRow <= 1 || lastColumn <= 0) {
    return summary;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let contiguousArchiveCount = 0;

  for (let index = 0; index < values.length; index += 1) {
    const timestamp = coerceLogTimestamp_(values[index][0]);
    if (!timestamp) break;
    if (timestamp.getTime() >= cutoff.getTime()) break;
    contiguousArchiveCount += 1;
  }

  if (!contiguousArchiveCount) {
    return summary;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues();
  const archiveSheet = getOrCreateLogArchiveSheet_(summary.archiveSheetName, headers);
  const archivedRows = values.slice(0, contiguousArchiveCount);
  const archiveStartRow = archiveSheet.getLastRow() + 1;
  archiveSheet.getRange(archiveStartRow, 1, archivedRows.length, archivedRows[0].length).setValues(archivedRows);
  sheet.deleteRows(2, contiguousArchiveCount);

  summary.archivedRows = contiguousArchiveCount;
  summary.retainedRows = Math.max(0, sheet.getLastRow() - 1);
  summary.oldestArchived = formatLogRotationTimestamp_(archivedRows[0][0]);
  summary.newestArchived = formatLogRotationTimestamp_(archivedRows[archivedRows.length - 1][0]);
  return summary;
}

function getOrCreateLogArchiveSheet_(sheetName, headers) {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  const headerRow = headers && headers.length ? headers : [[]];
  const headerWidth = headerRow[0].length;

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (headerWidth && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headerWidth).setValues(headerRow);
  } else if (headerWidth && sheet.getLastRow() >= 1) {
    const existingHeader = sheet.getRange(1, 1, 1, headerWidth).getValues();
    if (JSON.stringify(existingHeader[0]) !== JSON.stringify(headerRow[0])) {
      sheet.getRange(1, 1, 1, headerWidth).setValues(headerRow);
    }
  }

  return sheet;
}

function coerceLogTimestamp_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (value === '' || value === null || value === undefined) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatLogRotationTimestamp_(value) {
  const timestamp = coerceLogTimestamp_(value);
  if (!timestamp) return '';
  return Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function getLogSpreadsheet_() {
  if (!CONFIG.logSpreadsheetId) {
    throw new Error('CONFIG.logSpreadsheetId must be set before running logging.');
  }

  return SpreadsheetApp.openById(CONFIG.logSpreadsheetId);
}
