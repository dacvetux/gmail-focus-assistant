function runPhase10ReviewLoopOptionA() {
  const syncSummary = syncApprovedRulesFromTuningSuggestionsPhase10();
  const aiSyncSummary = syncApprovedAiRecommendationsPhase11();
  const refreshSummary = refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const logRotationSummary = rotateOperationalLogsPhase10();
  const tuningReviewQueueSummary = rebuildTuningReviewQueueSheet_(getOrCreateTuningReviewQueueSheet_());
  const statusSummary = rebuildControlSurfaceStatusPhase10();
  const importedCount = syncSummary.importedCount + aiSyncSummary.appliedCount;

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'runPhase10ReviewLoopOptionA',
    processedThreads: statusSummary.tuningSummary.totalRows + statusSummary.aiRecommendationsSummary.totalRows,
    itemCount: importedCount,
    outcome: importedCount ? 'review-loop-applied' : 'review-loop-no-imports',
    notes: `tuning-approved-pending=${statusSummary.tuningSummary.approved}; tuning-imported=${syncSummary.importedCount}; ai-approved-pending=${statusSummary.aiRecommendationsSummary.approved}; ai-applied=${aiSyncSummary.appliedCount}; ai-manual-pending=${aiSyncSummary.manualPendingCount}; approved-rules-configured=${refreshSummary.approvedRulesConfigured}; archived-log-rows=${logRotationSummary.archivedRows}`
  });

  const recentRunSummary = rebuildRecentRunSummarySheet_(getOrCreateRecentRunSummarySheet_());

  return {
    syncSummary: syncSummary,
    aiSyncSummary: aiSyncSummary,
    refreshSummary: refreshSummary,
    logRotationSummary: logRotationSummary,
    tuningReviewQueueSummary: tuningReviewQueueSummary,
    recentRunSummary: recentRunSummary,
    statusSummary: statusSummary
  };
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

function rebuildControlSurfaceStatusPhase10() {
  const sheet = getOrCreateControlSurfaceStatusSheet_();
  const summary = rebuildControlSurfaceStatusSheet_(sheet);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'rebuildControlSurfaceStatusPhase10',
    processedThreads: summary.tuningSummary.totalRows + summary.aiRecommendationsSummary.totalRows,
    itemCount: summary.tuningSummary.pending + summary.aiRecommendationsSummary.approvedAutoApplyCount + summary.aiRecommendationsSummary.approvedManualCount,
    outcome: 'status-refreshed',
    notes: `tuning-pending=${summary.tuningSummary.pending}; ai-new=${summary.aiRecommendationsSummary.newCount}; ai-approved-auto=${summary.aiRecommendationsSummary.approvedAutoApplyCount}; ai-approved-manual=${summary.aiRecommendationsSummary.approvedManualCount}; approved-rules=${summary.approvedRulesSummary.totalRows}`
  });

  return summary;
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

function analyzeHistoricalClassificationPhase10(startDate, topN, minSenderCount) {
  const threshold = coerceHistoricalAnalysisDate_(startDate || '2026-01-01');
  const summary = buildHistoricalClassificationSummary_(threshold, topN || 12, minSenderCount || 4);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'analyzeHistoricalClassificationPhase10',
    processedThreads: summary.rowsAnalyzed,
    itemCount: summary.senderCount,
    outcome: 'historical-classification-analysis',
    notes: `start=${Utilities.formatDate(threshold, Session.getScriptTimeZone(), 'yyyy-MM-dd')}; mixed=${summary.mixedSenders.length}`
  });

  return summary;
}

function analyzeMailboxHistoryPhase10(startDate, maxThreads, topN, minSenderCount) {
  const threshold = coerceHistoricalAnalysisDate_(startDate || '2026-01-01');
  const summary = buildMailboxHistorySummary_(threshold, maxThreads || 4000, topN || 12, minSenderCount || 5);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'analyzeMailboxHistoryPhase10',
    processedThreads: summary.threadsAnalyzed,
    itemCount: summary.senderCount,
    outcome: summary.truncated ? 'mailbox-history-analysis-truncated' : 'mailbox-history-analysis',
    notes: `start=${summary.startDate}; fetched=${summary.threadsAnalyzed}; mixed=${summary.mixedSenders.length}`
  });

  return summary;
}

function analyzeMailboxHistoryByBucketPhase10(startDate, perBucketMax, topN, minSenderCount) {
  const threshold = coerceHistoricalAnalysisDate_(startDate || '2026-01-01');
  const summary = buildMailboxHistoryByBucketSummary_(threshold, perBucketMax || 250, topN || 10, minSenderCount || 3);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'analyzeMailboxHistoryByBucketPhase10',
    processedThreads: summary.totalThreadsSampled,
    itemCount: summary.mixedSenders.length,
    outcome: 'mailbox-history-bucket-analysis',
    notes: `start=${summary.startDate}; sampled=${summary.totalThreadsSampled}; mixed=${summary.mixedSenders.length}`
  });

  return summary;
}

function inspectMailboxHistoryBucketPhase10(bucketName, startDate, perBucketMax, topN, minSenderCount) {
  const threshold = coerceHistoricalAnalysisDate_(startDate || '2026-01-01');
  const summary = buildMailboxHistoryByBucketSummary_(threshold, perBucketMax || 50, topN || 8, minSenderCount || 2);
  const bucket = String(bucketName || '').trim();
  if (!summary.bucketSamples[bucket]) {
    throw new Error(`Unknown bucket: ${bucket}`);
  }
  return summary.bucketSamples[bucket];
}

function inspectMailboxHistorySenderPhase10(senderQuery, startDate, maxThreads) {
  const normalizedSenderQuery = String(senderQuery || '').trim();
  if (!normalizedSenderQuery) {
    throw new Error('Sender query is required');
  }

  const threshold = coerceHistoricalAnalysisDate_(startDate || '2026-01-01');
  const summary = buildMailboxHistorySenderSummary_(normalizedSenderQuery, threshold, maxThreads || 50);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'inspectMailboxHistorySenderPhase10',
    processedThreads: summary.sampledThreads,
    itemCount: Object.keys(summary.bucketCounts).length,
    outcome: summary.sampledThreads ? 'mailbox-history-sender-inspected' : 'mailbox-history-sender-empty',
    notes: `sender=${normalizedSenderQuery}; start=${summary.startDate}; sampled=${summary.sampledThreads}`
  });

  return summary;
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

function coerceHistoricalAnalysisDate_(value) {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (String(parsed) === 'Invalid Date') {
    throw new Error(`Invalid start date: ${value}`);
  }
  return parsed;
}

function buildHistoricalClassificationSummary_(startDate, topN, minSenderCount) {
  const rows = readDecisionRowsSinceDate_(startDate);
  const senderMap = {};
  const bucketCounts = {};
  const monthlyCounts = {};

  rows.forEach(row => {
    const sender = extractSenderKey_(row.from) || String(row.from || '').trim().toLowerCase() || '(unknown)';
    const bucket = classifyDecisionRowBucket_(row);
    const month = row.timestamp instanceof Date ? Utilities.formatDate(row.timestamp, Session.getScriptTimeZone(), 'yyyy-MM') : 'unknown';

    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    monthlyCounts[month] = monthlyCounts[month] || {};
    monthlyCounts[month][bucket] = (monthlyCounts[month][bucket] || 0) + 1;

    if (!senderMap[sender]) {
      senderMap[sender] = {
        sender: sender,
        total: 0,
        buckets: {},
        examples: {},
        latestTimestamp: null
      };
    }

    const entry = senderMap[sender];
    entry.total += 1;
    entry.buckets[bucket] = (entry.buckets[bucket] || 0) + 1;
    if (!entry.examples[bucket]) {
      entry.examples[bucket] = truncateRunNote_(String(row.subject || '').trim(), 140);
    }
    if (row.timestamp instanceof Date && (!entry.latestTimestamp || entry.latestTimestamp.getTime() < row.timestamp.getTime())) {
      entry.latestTimestamp = row.timestamp;
    }
  });

  const senders = Object.keys(senderMap).map(key => {
    const entry = senderMap[key];
    const bucketNames = Object.keys(entry.buckets).sort((left, right) => entry.buckets[right] - entry.buckets[left]);
    const dominantBucket = bucketNames[0] || 'other';
    const semanticBuckets = bucketNames.filter(name => entry.buckets[name] > 0);
    return {
      sender: entry.sender,
      total: entry.total,
      dominantBucket: dominantBucket,
      dominantCount: entry.buckets[dominantBucket] || 0,
      bucketMix: bucketNames.map(name => ({ bucket: name, count: entry.buckets[name], sampleSubject: entry.examples[name] || '' })),
      latestTimestamp: entry.latestTimestamp ? formatControlSurfaceTimestamp_(entry.latestTimestamp) : '',
      mixed: semanticBuckets.length > 1
    };
  }).sort((left, right) => right.total - left.total);

  const filteredSenders = senders.filter(entry => entry.total >= minSenderCount);
  const topByBucket = ['review-only', 'explicit-fyi', 'notification', 'news-blank', 'news-with-workflow', 'to-respond', 'important', 'commercial', 'other']
    .reduce((result, bucket) => {
      result[bucket] = filteredSenders
        .filter(entry => entry.dominantBucket === bucket)
        .slice(0, topN);
      return result;
    }, {});

  const mixedSenders = filteredSenders
    .filter(entry => entry.mixed)
    .slice(0, topN);

  return {
    startDate: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    rowsAnalyzed: rows.length,
    senderCount: senders.length,
    bucketCounts: bucketCounts,
    monthlyCounts: monthlyCounts,
    topByBucket: topByBucket,
    mixedSenders: mixedSenders,
    notes: buildHistoricalClassificationNotes_(bucketCounts, mixedSenders)
  };
}

function readDecisionRowsSinceDate_(startDate) {
  const sheet = getOrCreateDecisionLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return values.map(row => ({
    timestamp: row[0],
    mode: String(row[1] || ''),
    threadId: String(row[2] || ''),
    from: String(row[3] || ''),
    subject: String(row[4] || ''),
    reason: String(row[5] || ''),
    appliedLabels: String(row[6] || ''),
    archived: String(row[7] || '')
  })).filter(row => row.timestamp instanceof Date && row.timestamp.getTime() >= startDate.getTime());
}

function classifyDecisionRowBucket_(row) {
  const labels = String(row.appliedLabels || '');
  if (hasAppliedLabel_(labels, CONFIG.labels.toRespond)) return 'to-respond';
  if (hasAppliedLabel_(labels, CONFIG.labels.notification)) return hasAppliedLabel_(labels, CONFIG.labels.newsDigest) ? 'news-with-workflow' : 'notification';
  if (hasAppliedLabel_(labels, CONFIG.labels.fyi)) return hasAppliedLabel_(labels, CONFIG.labels.newsDigest) ? 'news-with-workflow' : 'explicit-fyi';
  if (hasExactAppliedLabels_(labels, [CONFIG.labels.review])) return 'review-only';
  if (hasAppliedLabel_(labels, CONFIG.labels.newsDigest)) return 'news-blank';
  if (hasAnyAppliedLabel_(labels, [CONFIG.labels.importantServices, CONFIG.labels.importantFinance, CONFIG.labels.importantShipping, CONFIG.labels.importantCalendar, CONFIG.labels.importantOpportunities])) return 'important';
  if (hasAnyAppliedLabel_(labels, [CONFIG.labels.commercialNewsletters, CONFIG.labels.commercialAds, CONFIG.labels.commercialCampaigns])) return 'commercial';
  return 'other';
}

function buildHistoricalClassificationNotes_(bucketCounts, mixedSenders) {
  const notes = [];
  if ((bucketCounts['review-only'] || 0) > (bucketCounts['explicit-fyi'] || 0) * 2) {
    notes.push('Review-only volume is much higher than explicit FYI volume; there may still be senders that deserve clearer FYI/notification/news treatment.');
  }
  if (mixedSenders.length) {
    notes.push('Mixed senders are the best place to inspect for missing sender-specific rules or inconsistent semantics.');
  }
  if ((bucketCounts['news-with-workflow'] || 0) > 0) {
    notes.push('There are still news rows carrying workflow labels; verify those were intentional rather than semantic drift.');
  }
  return notes;
}

function buildMailboxHistorySummary_(startDate, maxThreads, topN, minSenderCount) {
  const query = `after:${Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy/MM/dd')} -in:trash -in:spam`;
  const pageSize = 100;
  const senderMap = {};
  const bucketCounts = {};
  const monthlyCounts = {};
  let offset = 0;
  let threadsAnalyzed = 0;
  let fetched = [];
  let truncated = false;

  while (threadsAnalyzed < maxThreads) {
    fetched = GmailApp.search(query, offset, Math.min(pageSize, maxThreads - threadsAnalyzed));
    if (!fetched.length) break;

    fetched.forEach(thread => {
      const labels = thread.getLabels().map(label => label.getName());
      const bucket = classifyMailboxLabelBucket_(labels);
      const sender = extractSenderKey_(selectRepresentativeMessageForHistory_(thread).getFrom()) || '(unknown)';
      const lastDate = thread.getLastMessageDate();
      const month = lastDate instanceof Date ? Utilities.formatDate(lastDate, Session.getScriptTimeZone(), 'yyyy-MM') : 'unknown';
      const subject = String(thread.getFirstMessageSubject() || '').trim();

      bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
      monthlyCounts[month] = monthlyCounts[month] || {};
      monthlyCounts[month][bucket] = (monthlyCounts[month][bucket] || 0) + 1;

      if (!senderMap[sender]) {
        senderMap[sender] = {
          sender: sender,
          total: 0,
          buckets: {},
          examples: {},
          latestTimestamp: null
        };
      }

      const entry = senderMap[sender];
      entry.total += 1;
      entry.buckets[bucket] = (entry.buckets[bucket] || 0) + 1;
      if (!entry.examples[bucket]) entry.examples[bucket] = truncateRunNote_(subject, 140);
      if (lastDate instanceof Date && (!entry.latestTimestamp || entry.latestTimestamp.getTime() < lastDate.getTime())) {
        entry.latestTimestamp = lastDate;
      }
    });

    threadsAnalyzed += fetched.length;
    offset += fetched.length;
    if (fetched.length < pageSize) break;
  }

  if (threadsAnalyzed >= maxThreads && fetched.length === pageSize) {
    truncated = true;
  }

  const senders = Object.keys(senderMap).map(key => finalizeMailboxHistorySenderEntry_(senderMap[key]))
    .sort((left, right) => right.total - left.total);

  const filteredSenders = senders.filter(entry => entry.total >= minSenderCount);
  const topByBucket = ['review-only', 'explicit-fyi', 'notification', 'news-blank', 'news-with-workflow', 'to-respond', 'important', 'commercial', 'other']
    .reduce((result, bucket) => {
      result[bucket] = filteredSenders.filter(entry => entry.dominantBucket === bucket).slice(0, topN);
      return result;
    }, {});

  const mixedSenders = filteredSenders.filter(entry => entry.mixed).slice(0, topN);

  return {
    startDate: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    query: query,
    truncated: truncated,
    threadsAnalyzed: threadsAnalyzed,
    senderCount: senders.length,
    bucketCounts: bucketCounts,
    monthlyCounts: monthlyCounts,
    topByBucket: topByBucket,
    mixedSenders: mixedSenders,
    notes: buildHistoricalClassificationNotes_(bucketCounts, mixedSenders)
  };
}

function buildMailboxHistoryByBucketSummary_(startDate, perBucketMax, topN, minSenderCount) {
  const bucketQueries = getMailboxHistoryBucketQueries_(startDate);
  const senderMap = {};
  const bucketSamples = {};
  let totalThreadsSampled = 0;

  bucketQueries.forEach(definition => {
    const threads = GmailApp.search(definition.query, 0, perBucketMax);
    totalThreadsSampled += threads.length;
    bucketSamples[definition.bucket] = {
      query: definition.query,
      sampledThreads: threads.length,
      topSenders: []
    };

    threads.forEach(thread => {
      const sender = extractSenderKey_(selectRepresentativeMessageForHistory_(thread).getFrom()) || '(unknown)';
      const subject = String(thread.getFirstMessageSubject() || '').trim();
      const lastDate = thread.getLastMessageDate();

      if (!senderMap[sender]) {
        senderMap[sender] = {
          sender: sender,
          total: 0,
          buckets: {},
          examples: {},
          latestTimestamp: null
        };
      }

      const entry = senderMap[sender];
      entry.total += 1;
      entry.buckets[definition.bucket] = (entry.buckets[definition.bucket] || 0) + 1;
      if (!entry.examples[definition.bucket]) entry.examples[definition.bucket] = truncateRunNote_(subject, 140);
      if (lastDate instanceof Date && (!entry.latestTimestamp || entry.latestTimestamp.getTime() < lastDate.getTime())) {
        entry.latestTimestamp = lastDate;
      }
    });
  });

  const senders = Object.keys(senderMap).map(key => finalizeMailboxHistorySenderEntry_(senderMap[key]))
    .sort((left, right) => right.total - left.total);

  bucketQueries.forEach(definition => {
    bucketSamples[definition.bucket].topSenders = senders
      .filter(entry => (entry.bucketMix.find(item => item.bucket === definition.bucket) || {}).count >= minSenderCount)
      .sort((left, right) => {
        const leftCount = (left.bucketMix.find(item => item.bucket === definition.bucket) || {}).count || 0;
        const rightCount = (right.bucketMix.find(item => item.bucket === definition.bucket) || {}).count || 0;
        return rightCount - leftCount;
      })
      .slice(0, topN)
      .map(entry => ({
        sender: entry.sender,
        count: (entry.bucketMix.find(item => item.bucket === definition.bucket) || {}).count || 0,
        sampleSubject: (entry.bucketMix.find(item => item.bucket === definition.bucket) || {}).sampleSubject || '',
        latestTimestamp: entry.latestTimestamp,
        mixed: entry.mixed
      }));
  });

  const mixedSenders = senders.filter(entry => entry.mixed && entry.total >= minSenderCount).slice(0, topN);

  return {
    startDate: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    perBucketMax: perBucketMax,
    totalThreadsSampled: totalThreadsSampled,
    bucketSamples: bucketSamples,
    mixedSenders: mixedSenders,
    notes: [
      'Bucket queries sample current mailbox labels directly, so this is better for January-forward semantics than DecisionLog alone.',
      'Mixed senders appearing across review/FYI/notification/news are the main rule-tuning candidates.'
    ]
  };
}

function buildMailboxHistorySenderSummary_(senderQuery, startDate, maxThreads) {
  const normalizedSender = String(senderQuery || '').trim().toLowerCase();
  const after = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const query = `after:${after} -in:trash -in:spam from:"${normalizedSender.replace(/"/g, '\\"')}"`;
  const threads = GmailApp.search(query, 0, maxThreads);
  const bucketCounts = {};
  const examples = [];

  threads.forEach(thread => {
    const labels = thread.getLabels().map(label => label.getName());
    const bucket = classifyMailboxLabelBucket_(labels);
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    examples.push({
      subject: String(thread.getFirstMessageSubject() || '').trim(),
      from: thread.getMessages().length ? String(thread.getMessages()[0].getFrom() || '') : '',
      bucket: bucket,
      labels: labels,
      lastDate: formatControlSurfaceTimestamp_(thread.getLastMessageDate()),
      messageCount: thread.getMessageCount()
    });
  });

  return {
    startDate: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    senderQuery: normalizedSender,
    query: query,
    sampledThreads: threads.length,
    bucketCounts: bucketCounts,
    examples: examples.slice(0, 25),
    notes: threads.length
      ? ['Use these examples to decide whether the sender needs a stronger explicit sender rule or only a targeted historical reclassification pass.']
      : ['No matching mailbox threads were found for this sender query in the requested date window.']
  };
}

function getMailboxHistoryBucketQueries_(startDate) {
  const after = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const q = query => `after:${after} -in:trash -in:spam ${query}`;
  return [
    { bucket: 'review-only', query: q(`label:"${CONFIG.labels.review}" -label:"${CONFIG.labels.fyi}" -label:"${CONFIG.labels.notification}" -label:"${CONFIG.labels.newsDigest}" -label:"${CONFIG.labels.toRespond}"`) },
    { bucket: 'explicit-fyi', query: q(`label:"${CONFIG.labels.fyi}"`) },
    { bucket: 'notification', query: q(`label:"${CONFIG.labels.notification}"`) },
    { bucket: 'news-blank', query: q(`label:"${CONFIG.labels.newsDigest}" -label:"${CONFIG.labels.fyi}" -label:"${CONFIG.labels.notification}" -label:"${CONFIG.labels.toRespond}" -label:"${CONFIG.labels.review}"`) },
    { bucket: 'to-respond', query: q(`label:"${CONFIG.labels.toRespond}"`) },
    { bucket: 'important', query: q(`{label:"${CONFIG.labels.importantServices}" OR label:"${CONFIG.labels.importantFinance}" OR label:"${CONFIG.labels.importantShipping}" OR label:"${CONFIG.labels.importantCalendar}" OR label:"${CONFIG.labels.importantOpportunities}"}`) },
    { bucket: 'commercial', query: q(`{label:"${CONFIG.labels.commercialNewsletters}" OR label:"${CONFIG.labels.commercialAds}" OR label:"${CONFIG.labels.commercialCampaigns}"}`) }
  ];
}

function finalizeMailboxHistorySenderEntry_(entry) {
  const bucketNames = Object.keys(entry.buckets).sort((left, right) => entry.buckets[right] - entry.buckets[left]);
  const dominantBucket = bucketNames[0] || 'other';
  return {
    sender: entry.sender,
    total: entry.total,
    dominantBucket: dominantBucket,
    dominantCount: entry.buckets[dominantBucket] || 0,
    bucketMix: bucketNames.map(name => ({ bucket: name, count: entry.buckets[name], sampleSubject: entry.examples[name] || '' })),
    latestTimestamp: entry.latestTimestamp ? formatControlSurfaceTimestamp_(entry.latestTimestamp) : '',
    mixed: bucketNames.length > 1
  };
}

function selectRepresentativeMessageForHistory_(thread) {
  const messages = thread.getMessages();
  return messages && messages.length ? messages[0] : thread.getMessages()[thread.getMessageCount() - 1];
}

function classifyMailboxLabelBucket_(labels) {
  const labelString = (labels || []).join(', ');
  return classifyDecisionRowBucket_({ appliedLabels: labelString });
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

function rebuildControlSurfaceStatusSheet_(sheet) {
  const tuningSummary = summarizeTuningSuggestions_();
  const aiSummary = summarizeAiRecommendations_();
  const approvedRulesSummary = summarizeApprovedRules_();
  const automationHealthSummary = summarizeAutomationHealthStatus_();
  const workflowSummary = summarizeWorkflowHealthForStatus_();
  const checkpointSummary = summarizeCheckpointRunStatus_();
  const logRotationSummary = summarizeLogRotationStatusPhase10_();
  const nextAction = buildControlSurfaceNextAction_(tuningSummary, aiSummary, workflowSummary, checkpointSummary);
  const newsWorkflowLabel = CONFIG.newsWorkflowLabel ? CONFIG.newsWorkflowLabel : '(blank)';
  const operatorStep1 = aiSummary.newCount
    ? 'review AiRecommendations'
    : tuningSummary.newCount
      ? 'review TuningReviewQueue'
      : 'check ControlSurfaceStatus';
  const operatorStep1Action = aiSummary.newCount
    ? 'Open AiRecommendations first, then mark rows approved/rejected/superseded when you agree or disagree.'
    : tuningSummary.newCount
      ? 'Open TuningReviewQueue, then update the referenced source rows in TuningSuggestions as approved, rejected, or superseded.'
      : 'No fresh review work right now; use this sheet as the quick system overview.';
  const importPending = tuningSummary.approved || aiSummary.approvedAutoApplyCount;
  const operatorStep2 = importPending
    ? 'run review/import loop'
    : aiSummary.approvedManualCount
      ? 'manual Phase 11 follow-through pending'
      : 'no import work pending';
  const operatorStep2Action = importPending
    ? 'Run runPhase10ReviewLoopOptionA() to import approved tuning rows plus directly-applicable approved AiRecommendations, then refresh runtime.'
    : aiSummary.approvedManualCount
      ? 'One or more approved AiRecommendations still need manual follow-through (for example prefer-notification / prefer-to-respond guidance).'
      : 'Import step is clear right now.';

  const rows = [
    ['Metric', 'Value', 'Meaning', 'Next action'],
    ['last-updated', formatControlSurfaceTimestamp_(new Date()), 'When this dashboard was last rebuilt', nextAction],
    ['operator-step-1', operatorStep1, 'First operator action in the current Sheets loop', operatorStep1Action],
    ['operator-step-2', operatorStep2, 'Second operator action after review', operatorStep2Action],
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
    ['tuning-new-actionable', tuningSummary.newCount, 'Real suggestions not yet reviewed', tuningSummary.newCount ? 'Review these in TuningSuggestions / TuningReviewQueue.' : ''],
    ['tuning-no-suggestions-placeholders', tuningSummary.noSuggestionsOpen, 'Informational no-suggestions rows retained as queue anchors, not real review work', ''],
    ['tuning-approved-pending-import', tuningSummary.approved, 'Suggestions marked approved and ready to import into ApprovedRules', tuningSummary.approved ? 'Run runPhase10ReviewLoopOptionA() to import and refresh runtime.' : ''],
    ['tuning-rejected', tuningSummary.rejected, 'Suggestions explicitly rejected by operator review', ''],
    ['tuning-imported', tuningSummary.imported, 'Suggestions already imported into ApprovedRules', ''],
    ['tuning-superseded-or-reclassified', tuningSummary.superseded, 'Suggestions intentionally replaced by a better decision/path', ''],
    ['ai-total-rows', aiSummary.totalRows, 'Total non-header rows currently in AiRecommendations', ''],
    ['ai-new-actionable', aiSummary.newCount, 'AI recommendations not yet reviewed by the operator', aiSummary.newCount ? 'Review these in AiRecommendations.' : ''],
    ['ai-approved-auto-apply', aiSummary.approvedAutoApplyCount, 'Approved AI recommendations that the review loop can apply directly into NewsSources or ApprovedRules', aiSummary.approvedAutoApplyCount ? 'Run runPhase10ReviewLoopOptionA() to apply these.' : ''],
    ['ai-approved-manual-follow-through', aiSummary.approvedManualCount, 'Approved AI recommendations that still need manual judgment because no direct import path exists yet', aiSummary.approvedManualCount ? 'Handle these manually before closing them out.' : ''],
    ['ai-applied', aiSummary.applied, 'AI recommendations already applied or explicitly closed with no runtime change', ''],
    ['ai-rejected', aiSummary.rejected, 'AI recommendations explicitly rejected by the operator', ''],
    ['ai-superseded-or-skipped', aiSummary.superseded + aiSummary.skipped, 'AI recommendations intentionally replaced, skipped, or otherwise closed without apply', ''],
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
    aiRecommendationsSummary: aiSummary,
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

function summarizeAiRecommendations_() {
  const rows = readAiRecommendationsPhase11_();
  const summary = {
    totalRows: rows.length,
    newCount: 0,
    approved: 0,
    approvedAutoApplyCount: 0,
    approvedManualCount: 0,
    applied: 0,
    rejected: 0,
    superseded: 0,
    skipped: 0
  };

  rows.forEach(row => {
    const status = String(row.status || '').trim().toLowerCase() || 'new';
    if (status === 'new') {
      summary.newCount += 1;
      return;
    }
    if (status === 'approved') {
      summary.approved += 1;
      if (requiresManualPhase11FollowThrough_(row.proposedChange)) {
        summary.approvedManualCount += 1;
      } else {
        summary.approvedAutoApplyCount += 1;
      }
      return;
    }
    if (status === 'applied' || status === 'imported' || status === 'already-imported' || status === 'done' || status === 'closed') {
      summary.applied += 1;
      return;
    }
    if (status === 'rejected') {
      summary.rejected += 1;
      return;
    }
    if (status === 'skipped') {
      summary.skipped += 1;
      return;
    }
    if (status === 'superseded') {
      summary.superseded += 1;
      return;
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

function buildControlSurfaceNextAction_(tuningSummary, aiSummary) {
  if (arguments.length > 2) {
    const workflowSummary = arguments[2] || {};
    const checkpointSummary = arguments[3] || {};
    if (workflowSummary.warningCount) {
      return `WorkflowAudit is showing ${workflowSummary.warningCount} warning bucket(s); inspect semantics before treating the system as settled.`;
    }
    if (checkpointSummary && checkpointSummary.needsAttention) {
      return checkpointSummary.nextAction;
    }
  }
  if (aiSummary && aiSummary.approvedAutoApplyCount) {
    return `There are ${aiSummary.approvedAutoApplyCount} approved AiRecommendations ready for direct apply.`;
  }
  if (tuningSummary.approved) {
    return `There are ${tuningSummary.approved} approved tuning suggestions waiting for import.`;
  }
  if (aiSummary && aiSummary.approvedManualCount) {
    return `There are ${aiSummary.approvedManualCount} approved AiRecommendations that still need manual follow-through.`;
  }
  if (aiSummary && aiSummary.newCount) {
    return `There are ${aiSummary.newCount} new AiRecommendations waiting for review.`;
  }
  if (tuningSummary.newCount) {
    return `There are ${tuningSummary.newCount} new tuning suggestions waiting for review.`;
  }
  if (tuningSummary.noSuggestionsOpen) {
    return 'No actionable tuning suggestions right now.';
  }
  return 'No pending review/import work right now.';
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
