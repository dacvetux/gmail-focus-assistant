function getOrCreateLabel_(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}

function applyDecision_(thread, decision) {
  if (!decision || decision.action === 'preserve') {
    return { appliedLabel: null, archived: false, mode: CONFIG.dryRun ? 'dry-run' : 'live' };
  }

  if (CONFIG.dryRun) {
    return {
      appliedLabel: decision.label || null,
      archived: Boolean(decision.archive),
      mode: 'dry-run'
    };
  }

  if (decision.label) {
    getOrCreateLabel_(decision.label).addToThread(thread);
  }

  if (decision.archive) {
    thread.moveToArchive();
  }

  return {
    appliedLabel: decision.label || null,
    archived: Boolean(decision.archive),
    mode: 'live'
  };
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
    result.appliedLabel || '',
    result.archived ? 'yes' : 'no'
  ]);
}

function flushDecisionLog_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreatePhase1LogSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreatePhase1LogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('Phase1Log');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('Phase1Log');
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Reason',
      'Applied Label',
      'Archived'
    ]]);
  }

  return sheet;
}

function getLogSpreadsheet_() {
  if (!CONFIG.logSpreadsheetId) {
    throw new Error('CONFIG.logSpreadsheetId must be set before running Phase 1 logging.');
  }

  return SpreadsheetApp.openById(CONFIG.logSpreadsheetId);
}
