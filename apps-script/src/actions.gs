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
    result.archived ? 'yes' : 'no'
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
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Reason',
      'Applied Labels',
      'Archived'
    ]]);
  }

  return sheet;
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

function getLogSpreadsheet_() {
  if (!CONFIG.logSpreadsheetId) {
    throw new Error('CONFIG.logSpreadsheetId must be set before running logging.');
  }

  return SpreadsheetApp.openById(CONFIG.logSpreadsheetId);
}
