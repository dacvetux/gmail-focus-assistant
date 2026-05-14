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
