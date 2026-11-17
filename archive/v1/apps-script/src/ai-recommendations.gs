const PHASE11_MANUAL_PROPOSED_CHANGES_ = {
  'prefer-notification': true,
  'prefer-to-respond': true
};

const PHASE11_AI_RECOMMENDATION_IMPORTERS_ = {
  newsSenders: function(row, importNote) {
    const result = upsertNewsSourcePhase10(row.sender, 'news', 'yes', importNote);
    return { outcome: 'applied', note: `applied via NewsSources row ${result.rowNumber}` };
  },
  newsExcludedSenders: function(row, importNote) {
    const result = upsertNewsSourcePhase10(row.sender, 'exclude', 'yes', importNote);
    return { outcome: 'applied', note: `applied via NewsSources row ${result.rowNumber}` };
  },
  forceCommercialSenders: function(row, importNote) {
    const result = upsertApprovedRulePhase10('commercial-sender', row.sender, 'add', 'yes', importNote);
    return { outcome: 'applied', note: `applied via ApprovedRules row ${result.rowNumber}` };
  },
  forceImportantSenders: function(row, importNote) {
    const result = upsertApprovedRulePhase10('important-sender', row.sender, 'add', 'yes', importNote);
    return { outcome: 'applied', note: `applied via ApprovedRules row ${result.rowNumber}` };
  },
  forceShippingSenders: function(row, importNote) {
    const result = upsertApprovedRulePhase10('shipping-sender', row.sender, 'add', 'yes', importNote);
    return { outcome: 'applied', note: `applied via ApprovedRules row ${result.rowNumber}` };
  },
  forceFyiSenders: function(row, importNote) {
    const result = upsertApprovedRulePhase10('fyi-sender', row.sender, 'add', 'yes', importNote);
    return { outcome: 'applied', note: `applied via ApprovedRules row ${result.rowNumber}` };
  },
  'historical-reclassification-only': function() {
    return { outcome: 'applied', note: 'operator accepted no runtime config change' };
  },
  'keep-review': function() {
    return { outcome: 'applied', note: 'operator accepted no runtime config change' };
  },
  none: function() {
    return { outcome: 'applied', note: 'operator accepted no runtime config change' };
  }
};

function syncApprovedAiRecommendationsPhase11() {
  const rows = readAiRecommendationsPhase11_();
  const approvedRows = rows.filter(row => row.status === 'approved');
  let appliedCount = 0;
  let manualPendingCount = 0;
  let skippedCount = 0;

  approvedRows.forEach(row => {
    if (requiresManualPhase11FollowThrough_(row.proposedChange)) {
      manualPendingCount += 1;
      appendAiRecommendationNote_(row.rowNumber, 'manual follow-through still required; no direct sheet import path yet');
      return;
    }

    const result = applyAiRecommendationPhase11_(row);
    if (result.outcome === 'applied') {
      setAiRecommendationStatusPhase11(row.rowNumber, 'applied', result.note);
      appliedCount += 1;
      return;
    }

    if (result.outcome === 'skipped') {
      setAiRecommendationStatusPhase11(row.rowNumber, 'skipped', result.note);
      skippedCount += 1;
      return;
    }

    manualPendingCount += 1;
    appendAiRecommendationNote_(row.rowNumber, result.note || 'manual follow-through still required');
  });

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'syncApprovedAiRecommendationsPhase11',
    processedThreads: approvedRows.length,
    itemCount: appliedCount,
    outcome: appliedCount ? 'ai-recommendations-applied' : (approvedRows.length ? 'ai-recommendations-manual-pending' : 'no-approved-ai-recommendations'),
    notes: `approved=${approvedRows.length}; applied=${appliedCount}; manual-pending=${manualPendingCount}; skipped=${skippedCount}`
  });

  return {
    approvedCount: approvedRows.length,
    appliedCount: appliedCount,
    manualPendingCount: manualPendingCount,
    skippedCount: skippedCount
  };
}

function readAiRecommendationsPhase11_() {
  const sheet = getOrCreateAiRecommendationsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 15).getDisplayValues();
  return values.map((row, index) => ({
    rowNumber: index + 2,
    phase: String(row[1] || '').trim(),
    sourceHelper: String(row[2] || '').trim(),
    candidateType: String(row[3] || '').trim(),
    sender: String(row[4] || '').trim().toLowerCase(),
    proposedChange: String(row[5] || '').trim(),
    confidence: String(row[6] || '').trim(),
    evidenceCount: row[7],
    currentState: String(row[8] || '').trim(),
    exampleSubject: String(row[9] || '').trim(),
    recommendedWorkflow: String(row[10] || '').trim(),
    operatorAction: String(row[11] || '').trim(),
    reasoning: String(row[12] || '').trim(),
    status: String(row[13] || '').trim().toLowerCase(),
    notes: String(row[14] || '').trim()
  }));
}

function requiresManualPhase11FollowThrough_(proposedChange) {
  const normalized = String(proposedChange || '').trim();
  return !!PHASE11_MANUAL_PROPOSED_CHANGES_[normalized];
}

function applyAiRecommendationPhase11_(row) {
  const sender = String(row && row.sender || '').trim().toLowerCase();
  const proposedChange = String(row && row.proposedChange || '').trim();
  const importNote = buildAiRecommendationImportNote_(row);
  const importer = PHASE11_AI_RECOMMENDATION_IMPORTERS_[proposedChange];

  if (!sender) {
    return { outcome: 'skipped', note: 'missing sender; could not apply recommendation' };
  }

  if (!importer) {
    return { outcome: 'manual-pending', note: `unsupported direct apply path for proposedChange=${proposedChange}` };
  }

  return importer(row, importNote);
}

function buildAiRecommendationImportNote_(row) {
  const parts = [
    'imported from AiRecommendations',
    row && row.sourceHelper ? `helper=${row.sourceHelper}` : '',
    row && row.candidateType ? `candidate=${row.candidateType}` : '',
    row && row.confidence ? `confidence=${row.confidence}` : ''
  ].filter(Boolean);
  return parts.join('; ');
}

function setAiRecommendationStatusPhase11(rowNumber, status, note) {
  const sheet = getOrCreateAiRecommendationsSheet_();
  const numericRow = Number(rowNumber);
  if (!Number.isFinite(numericRow) || numericRow < 2) {
    throw new Error(`Invalid AiRecommendations row: ${rowNumber}`);
  }

  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (!normalizedStatus) {
    throw new Error('Status is required');
  }

  sheet.getRange(numericRow, 14).setValue(normalizedStatus);
  if (note !== undefined && note !== null && String(note).trim()) {
    appendAiRecommendationNote_(numericRow, note);
  }

  const sender = String(sheet.getRange(numericRow, 5).getDisplayValue() || '').trim().toLowerCase();
  const proposedChange = String(sheet.getRange(numericRow, 6).getDisplayValue() || '').trim();

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'setAiRecommendationStatusPhase11',
    processedThreads: 1,
    itemCount: 1,
    outcome: `ai-recommendation-status-${normalizedStatus}`,
    notes: `row=${numericRow}; sender=${sender}; proposedChange=${proposedChange}`
  });

  return {
    rowNumber: numericRow,
    status: normalizedStatus,
    sender: sender,
    proposedChange: proposedChange
  };
}

function appendAiRecommendationNote_(rowNumber, note) {
  if (note === undefined || note === null || !String(note).trim()) return;
  const normalizedNote = String(note).trim();
  const sheet = getOrCreateAiRecommendationsSheet_();
  const noteCell = sheet.getRange(Number(rowNumber), 15);
  const existing = String(noteCell.getDisplayValue() || '').trim();
  if (existing.toLowerCase().indexOf(normalizedNote.toLowerCase()) !== -1) {
    return;
  }
  const appended = existing ? `${existing}; ${normalizedNote}` : normalizedNote;
  noteCell.setValue(appended);
}
