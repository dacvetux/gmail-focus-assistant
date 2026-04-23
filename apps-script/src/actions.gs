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

function getLogSpreadsheet_() {
  if (!CONFIG.logSpreadsheetId) {
    throw new Error('CONFIG.logSpreadsheetId must be set before running logging.');
  }

  return SpreadsheetApp.openById(CONFIG.logSpreadsheetId);
}
