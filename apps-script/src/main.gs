const AUTOMATION_TRIGGER_SPECS = [
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 6, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 8, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 10, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 12, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 14, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 16, minute: 30 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 19, minute: 0 },
  { functionName: 'runFrequentProcessingLiveWrapper', hour: 22, minute: 0 },
  { functionName: 'runMorningMainDigestLiveWrapper', hour: 7, minute: 30 },
  { functionName: 'runMorningNewsDigestLiveWrapper', hour: 7, minute: 35 },
  { functionName: 'runAutomationHealthAuditWrapper', hour: 8, minute: 45 },
  { functionName: 'runEveningMainDigestLiveWrapper', hour: 19, minute: 5 },
  { functionName: 'runEveningNewsDigestLiveWrapper', hour: 19, minute: 10 },
  { functionName: 'runAutomationHealthAuditWrapper', hour: 19, minute: 20 },
  { functionName: 'runAutomationHealthAuditWrapper', hour: 22, minute: 20 }
];

const AUTOMATION_AUDIT_ALLOWED_DELAY_MINUTES = 45;
const AUTOMATION_AUDIT_DUE_GRACE_MINUTES = 15;

function processInboxFocusPhase1() {
  return processInboxFocusWithOptions_({
    dryRun: CONFIG.dryRun,
    maxThreads: CONFIG.maxThreads,
    entryPointName: CONFIG.dryRun ? 'processInboxFocusPhase1DryRun' : 'processInboxFocusPhase1Live'
  });
}

function installAutomationTriggers() {
  const deletedCount = deleteAutomationTriggers_();
  const created = AUTOMATION_TRIGGER_SPECS.map(spec => createDailyAutomationTrigger_(spec));

  logRunSummary_({
    runType: 'automation-triggers',
    mode: 'internal',
    entryPoint: 'installAutomationTriggers',
    processedThreads: 0,
    itemCount: created.length,
    outcome: 'installed',
    notes: `deleted-existing=${deletedCount}; created=${created.length}`
  });

  return {
    deletedExisting: deletedCount,
    createdCount: created.length,
    triggers: created
  };
}

function deleteAutomationTriggers() {
  const deletedCount = deleteAutomationTriggers_();

  logRunSummary_({
    runType: 'automation-triggers',
    mode: 'internal',
    entryPoint: 'deleteAutomationTriggers',
    processedThreads: 0,
    itemCount: deletedCount,
    outcome: deletedCount ? 'deleted' : 'no-managed-triggers',
    notes: `deleted=${deletedCount}`
  });

  return {
    deletedCount: deletedCount
  };
}

function listAutomationTriggers() {
  const triggers = listManagedAutomationTriggers_();

  logRunSummary_({
    runType: 'automation-triggers',
    mode: 'internal',
    entryPoint: 'listAutomationTriggers',
    processedThreads: 0,
    itemCount: triggers.length,
    outcome: 'listed',
    notes: `managed-triggers=${triggers.length}`
  });

  return triggers;
}

function runFrequentProcessingLiveWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runFrequentProcessingLiveWrapper',
    lockKey: 'runFrequentProcessingLiveWrapper',
    action: function() {
      return processInboxFocusPhase2Live();
    }
  });
}

function runMorningMainDigestLiveWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runMorningMainDigestLiveWrapper',
    lockKey: 'runMorningMainDigestLiveWrapper',
    action: function() {
      return generateMorningDigestFromLogsLive();
    }
  });
}

function runEveningMainDigestLiveWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runEveningMainDigestLiveWrapper',
    lockKey: 'runEveningMainDigestLiveWrapper',
    action: function() {
      return generateEveningDigestFromLogsLive();
    }
  });
}

function runMorningNewsDigestLiveWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runMorningNewsDigestLiveWrapper',
    lockKey: 'runMorningNewsDigestLiveWrapper',
    action: function() {
      return generateNewsDigestMorningFromLogsLive();
    }
  });
}

function runEveningNewsDigestLiveWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runEveningNewsDigestLiveWrapper',
    lockKey: 'runEveningNewsDigestLiveWrapper',
    action: function() {
      return generateNewsDigestEveningFromLogsLive();
    }
  });
}

function runAutomationHealthAuditWrapper() {
  return runAutomationWrapper_({
    wrapperName: 'runAutomationHealthAuditWrapper',
    lockKey: 'runAutomationHealthAuditWrapper',
    action: function() {
      return auditAutomationHealth();
    }
  });
}

function repairRecentFyiMislabelsLive() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const fyiLabel = GmailApp.getUserLabelByName(CONFIG.labels.fyi);
  const threads = fyiLabel ? fyiLabel.getThreads(0, 100) : [];
  let reviewedCount = 0;
  let changedCount = 0;
  const changedRows = [];

  threads.forEach(thread => {
    const labels = getSafeLabelNames_(thread);
    if (!labels.includes(CONFIG.labels.fyi)) {
      return;
    }

    reviewedCount += 1;
    const decision = classifyThread_(thread, { ignoreManagedDecisionLabels: true });
    const stillFyi = decision.workflowLabel === CONFIG.labels.fyi || decision.label === CONFIG.labels.fyi;
    const shouldKeepAsIs = decision.action === 'preserve' || stillFyi;
    if (shouldKeepAsIs) {
      return;
    }

    const result = applyDecision_(thread, decision);
    changedCount += 1;
    logDecision_(changedRows, thread, decision, result);
  });

  flushDecisionLog_(changedRows);

  logRunSummary_({
    runType: 'control-surface',
    mode: 'live',
    entryPoint: 'repairRecentFyiMislabelsLive',
    processedThreads: reviewedCount,
    itemCount: changedCount,
    outcome: changedCount ? 'fyi-mislabels-corrected' : 'no-fyi-corrections-needed',
    notes: `reviewed=${reviewedCount}; corrected=${changedCount}`
  });

  return {
    reviewedCount: reviewedCount,
    correctedCount: changedCount
  };
}

function auditAutomationHealth() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const timezone = Session.getScriptTimeZone();
  const now = new Date();
  const todayKey = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
  const summary = analyzeAutomationHealth_(now, timezone);

  const rows = summary.alerts.length ? summary.alerts.map(alert => ([
    new Date(),
    alert.severity,
    alert.functionName,
    alert.scheduledLocal || '',
    alert.status,
    alert.expectedCount,
    alert.completedCount,
    alert.failedCount,
    alert.skippedCount,
    alert.matchedRunLocal || '',
    alert.notes || ''
  ])) : [[
    new Date(),
    'info',
    '',
    '',
    'healthy',
    summary.expectedDueCount,
    summary.completedMatchCount,
    summary.failedCount,
    summary.skippedCount,
    '',
    `No missing or late wrappers detected for ${todayKey}`
  ]];

  logAutomationHealthRows_(rows);
  const alertDelivery = maybeSendAutomationHealthAlert_(summary, timezone, todayKey);

  logRunSummary_({
    runType: 'automation-health',
    mode: 'internal',
    entryPoint: 'auditAutomationHealth',
    processedThreads: summary.expectedDueCount,
    itemCount: summary.alerts.length,
    outcome: summary.alerts.length ? 'alerts-detected' : 'healthy',
    notes: `expected-due=${summary.expectedDueCount}; matched=${summary.completedMatchCount}; failed=${summary.failedCount}; skipped=${summary.skippedCount}; alert-delivery=${alertDelivery.outcome}`
  });

  return {
    date: todayKey,
    expectedDueCount: summary.expectedDueCount,
    completedMatchCount: summary.completedMatchCount,
    failedCount: summary.failedCount,
    skippedCount: summary.skippedCount,
    alertCount: summary.alerts.length,
    alerts: summary.alerts,
    alertDelivery: alertDelivery
  };
}

function maybeSendAutomationHealthAlert_(summary, timezone, todayKey) {
  if (!summary || !summary.alerts || !summary.alerts.length) {
    return { outcome: 'no-alerts', sent: false };
  }

  if (!CONFIG.automationHealthAlertEnabled) {
    return { outcome: 'disabled', sent: false };
  }

  if (!CONFIG.automationHealthAlertRecipient) {
    return { outcome: 'missing-recipient', sent: false };
  }

  const minSeverity = String(CONFIG.automationHealthAlertMinSeverity || 'warning').trim().toLowerCase() || 'warning';
  const eligibleAlerts = summary.alerts.filter(alert => meetsAutomationHealthSeverityThreshold_(alert.severity, minSeverity));
  if (!eligibleAlerts.length) {
    return { outcome: 'below-threshold', sent: false, minSeverity: minSeverity };
  }

  const signature = buildAutomationHealthAlertSignature_(eligibleAlerts, todayKey);
  const props = PropertiesService.getScriptProperties();
  const signatureKey = 'AUTOMATION_HEALTH_LAST_ALERT_SIGNATURE';
  if (props.getProperty(signatureKey) === signature) {
    return { outcome: 'duplicate-suppressed', sent: false, minSeverity: minSeverity };
  }

  MailApp.sendEmail({
    to: CONFIG.automationHealthAlertRecipient,
    subject: `[Focuna - Gmail Assistant] Automation health alert (${eligibleAlerts.length})`,
    body: buildAutomationHealthAlertEmailBody_(eligibleAlerts, summary, timezone, todayKey)
  });
  props.setProperty(signatureKey, signature);

  return {
    outcome: 'sent',
    sent: true,
    recipient: CONFIG.automationHealthAlertRecipient,
    minSeverity: minSeverity,
    alertCount: eligibleAlerts.length
  };
}

function meetsAutomationHealthSeverityThreshold_(severity, minSeverity) {
  const rank = { info: 0, warning: 1, error: 2 };
  return (rank[String(severity || 'info').toLowerCase()] || 0) >= (rank[String(minSeverity || 'warning').toLowerCase()] || 1);
}

function buildAutomationHealthAlertSignature_(alerts, todayKey) {
  return [todayKey].concat((alerts || []).map(alert => [alert.severity, alert.functionName, alert.status, alert.scheduledLocal, alert.failedCount, alert.skippedCount].join('|'))).join('||');
}

function buildAutomationHealthAlertEmailBody_(alerts, summary, timezone, todayKey) {
  const lines = [
    `Automation health alerts for ${todayKey}`,
    '',
    `Expected due wrappers: ${summary.expectedDueCount}`,
    `Matched wrappers: ${summary.completedMatchCount}`,
    `Failed wrappers: ${summary.failedCount}`,
    `Skipped-overlap wrappers: ${summary.skippedCount}`,
    '',
    'Alerts:'
  ];

  (alerts || []).forEach(alert => {
    lines.push(`- [${String(alert.severity || '').toUpperCase()}] ${alert.functionName} :: ${alert.status}`);
    if (alert.scheduledLocal) lines.push(`  scheduled: ${alert.scheduledLocal}`);
    if (alert.matchedRunLocal) lines.push(`  nearest run: ${alert.matchedRunLocal}`);
    if (alert.notes) lines.push(`  notes: ${alert.notes}`);
  });

  lines.push('');
  lines.push(`Timezone: ${timezone}`);
  lines.push('Review AutomationHealthLog and RunLog for details.');
  return lines.join('\n');
}

function processInboxFocusPhase1DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads,
    entryPointName: 'processInboxFocusPhase1DryRun'
  });
}

function processInboxFocusPhase1Live() {
  return processInboxFocusWithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads,
    entryPointName: 'processInboxFocusPhase1Live'
  });
}

function processInboxFocusPhase2() {
  return processInboxFocusWithOptions_({
    dryRun: CONFIG.dryRun,
    maxThreads: CONFIG.maxThreads,
    entryPointName: CONFIG.dryRun ? 'processInboxFocusPhase2DryRun' : 'processInboxFocusPhase2Live'
  });
}

function processInboxFocusPhase2DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads,
    entryPointName: 'processInboxFocusPhase2DryRun'
  });
}

function processInboxFocusPhase2Live() {
  return processInboxFocusWithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads,
    entryPointName: 'processInboxFocusPhase2Live'
  });
}

function validatePhases1And2DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads,
    validationMode: true,
    entryPointName: 'validatePhases1And2DryRun'
  });
}

function processInboxFocusPhase4AiReviewDryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads,
    validationMode: true,
    enableAiReview: true,
    entryPointName: 'processInboxFocusPhase4AiReviewDryRun'
  });
}

function processInboxFocusPhase4AiReviewLive() {
  return processInboxFocusWithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads,
    enableAiReview: true,
    entryPointName: 'processInboxFocusPhase4AiReviewLive'
  });
}

function generateDraftRepliesPhase5DryRun() {
  return generateDraftRepliesDryRun();
}

function generateDraftRepliesPhase5DebugDryRun() {
  return generateDraftRepliesDebugDryRun();
}

function generateDraftRepliesPhase5Live() {
  return generateDraftRepliesLive();
}

function generateDraftForThreadIdPhase5DryRun(threadId) {
  return generateDraftForThreadIdDryRun_(threadId);
}

function generateDraftForThreadIdPhase5Live(threadId) {
  return generateDraftForThreadIdLive_(threadId);
}

function generateDraftRepliesForToRespondLabelPhase5DryRun() {
  return generateDraftRepliesForToRespondLabelDryRun_();
}

function generateDraftRepliesForToRespondLabelPhase5Live() {
  return generateDraftRepliesForToRespondLabelLive_();
}

function generateDraftRepliesForQueryPhase5DryRun(query) {
  return generateDraftRepliesForQueryDryRun_(query);
}

function generateDraftRepliesForQueryPhase5Live(query) {
  return generateDraftRepliesForQueryLive_(query);
}

function trackAwaitingRepliesPhase6DryRun() {
  return trackAwaitingRepliesPhase6DryRun_();
}

function trackAwaitingRepliesPhase6Live() {
  return trackAwaitingRepliesPhase6Live_();
}

function trackAwaitingRepliesForQueryPhase6DryRun(query) {
  return trackAwaitingRepliesForQueryPhase6DryRun_(query);
}

function trackAwaitingRepliesForQueryPhase6Live(query) {
  return trackAwaitingRepliesForQueryPhase6Live_(query);
}

function generateFollowUpDigestPhase6DryRun() {
  return generateFollowUpDigestPhase6_({
    dryRun: true
  });
}

function generateFollowUpDigestPhase6Live() {
  return generateFollowUpDigestPhase6_({
    dryRun: false
  });
}

function processInboxFocusWithOptions_(options) {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const threads = selectThreadsForProcessing_(options);
  const logRows = [];
  const previousDryRun = CONFIG.dryRun;
  const mode = options.dryRun ? 'dry-run' : 'live';

  CONFIG.dryRun = Boolean(options.dryRun);

  try {
    let aiCount = 0;

    for (const thread of threads) {
      let decision = classifyThread_(thread);

      if (
        options.enableAiReview &&
        CONFIG.enableAiForReview &&
        decision.action === 'label' &&
        decision.label === CONFIG.labels.review &&
        aiCount < (CONFIG.aiDailyLimit || 15)
      ) {
        const aiDecision = classifyWithAI_(thread);
        if (aiDecision) {
          decision = aiDecision;
        }
        aiCount += 1;
      }

      const result = applyDecision_(thread, decision);
      logDecision_(logRows, thread, decision, result);
    }

    flushDecisionLog_(logRows);
  } finally {
    CONFIG.dryRun = previousDryRun;
  }

  const summary = {
    processedThreads: threads.length,
    mode: mode
  };

  logRunSummary_({
    runType: options.enableAiReview ? 'phase4-ai-review' : 'phase1-2-processing',
    mode: mode,
    entryPoint: inferProcessingEntryPoint_(options),
    processedThreads: threads.length,
    itemCount: logRows.length,
    outcome: threads.length ? 'processed' : 'no-candidates',
    notes: buildProcessingRunNotes_(options, threads.length, logRows.length)
  });

  return summary;
}

function inferProcessingEntryPoint_(options) {
  if (options && options.entryPointName) {
    return options.entryPointName;
  }

  if (options.enableAiReview) {
    return options.dryRun ? 'processInboxFocusPhase4AiReviewDryRun' : 'processInboxFocusPhase4AiReviewLive';
  }

  if (options.validationMode) {
    return 'validatePhases1And2DryRun';
  }

  return options.dryRun ? 'processInboxFocusPhase1DryRun' : 'processInboxFocusPhase1Live';
}

function buildProcessingRunNotes_(options, threadCount, rowCount) {
  const notes = [];
  if (options.validationMode) notes.push('validation-mode');
  if (options.enableAiReview) notes.push('ai-review-enabled');
  if (hasDebugFilters_()) notes.push('debug-filters-active');
  if (!threadCount) notes.push('search returned no candidate threads');
  if (threadCount && !rowCount) notes.push('no decision rows recorded');
  return notes.join('; ');
}

function selectThreadsForProcessing_(options) {
  const threads = GmailApp.search(CONFIG.query, 0, options.maxThreads || CONFIG.maxThreads);
  return threads.filter(thread => threadMatchesDebugFilters_(thread));
}

function threadMatchesDebugFilters_(thread) {
  if (!hasDebugFilters_()) return true;

  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const threadId = thread.getId();

  if (CONFIG.debugSampleThreads.length && CONFIG.debugSampleThreads.includes(threadId)) {
    return true;
  }

  if (CONFIG.debugSenderIncludes.length && CONFIG.debugSenderIncludes.some(value => from.includes(value.toLowerCase()))) {
    return true;
  }

  if (CONFIG.debugSubjectIncludes.length && CONFIG.debugSubjectIncludes.some(value => subject.includes(value.toLowerCase()))) {
    return true;
  }

  return false;
}

function hasDebugFilters_() {
  return CONFIG.debugSampleThreads.length || CONFIG.debugSenderIncludes.length || CONFIG.debugSubjectIncludes.length;
}

function runAutomationWrapper_(options) {
  const wrapperName = options.wrapperName || 'runAutomationWrapper';
  const lock = LockService.getScriptLock();
  const startedAt = new Date();

  if (!lock.tryLock(1000)) {
    logRunSummary_({
      runType: 'automation-wrapper',
      mode: 'internal',
      entryPoint: wrapperName,
      processedThreads: 0,
      itemCount: 0,
      outcome: 'skipped-overlap',
      notes: 'lock-busy'
    });

    return {
      wrapperName: wrapperName,
      outcome: 'skipped-overlap'
    };
  }

  try {
    refreshConfigFromPreferencesPhase10();
    const result = options.action ? options.action() : null;
    const durationMs = new Date().getTime() - startedAt.getTime();

    logRunSummary_({
      runType: 'automation-wrapper',
      mode: 'internal',
      entryPoint: wrapperName,
      processedThreads: 0,
      itemCount: 1,
      outcome: 'completed',
      notes: `duration-ms=${durationMs}`
    });

    return result;
  } catch (error) {
    logRunSummary_({
      runType: 'automation-wrapper',
      mode: 'internal',
      entryPoint: wrapperName,
      processedThreads: 0,
      itemCount: 0,
      outcome: 'failed',
      notes: truncateRunNote_(error && error.message ? error.message : String(error), 400)
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function truncateRunNote_(value, maxLength) {
  const text = String(value || '');
  const limit = maxLength || 400;
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 1)) + '…';
}

function createDailyAutomationTrigger_(spec) {
  ScriptApp.newTrigger(spec.functionName)
    .timeBased()
    .everyDays(1)
    .atHour(spec.hour)
    .nearMinute(spec.minute)
    .create();

  return {
    functionName: spec.functionName,
    hour: spec.hour,
    minute: spec.minute
  };
}

function deleteAutomationTriggers_() {
  const managedNames = getManagedAutomationFunctionNames_();
  let deletedCount = 0;

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (managedNames.indexOf(trigger.getHandlerFunction()) === -1) {
      return;
    }

    ScriptApp.deleteTrigger(trigger);
    deletedCount += 1;
  });

  return deletedCount;
}

function listManagedAutomationTriggers_() {
  const managedNames = getManagedAutomationFunctionNames_();

  return ScriptApp.getProjectTriggers()
    .filter(trigger => managedNames.indexOf(trigger.getHandlerFunction()) !== -1)
    .map(trigger => ({
      functionName: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType()),
      triggerSource: String(trigger.getTriggerSource()),
      uniqueId: trigger.getUniqueId ? trigger.getUniqueId() : ''
    }));
}

function getManagedAutomationFunctionNames_() {
  const names = {};
  AUTOMATION_TRIGGER_SPECS.forEach(spec => {
    names[spec.functionName] = true;
  });
  return Object.keys(names);
}

function analyzeAutomationHealth_(now, timezone) {
  const runRows = readTodayAutomationWrapperRunRows_(now, timezone);
  const completedByFunction = {};
  const failedCounts = {};
  const skippedCounts = {};

  runRows.forEach(row => {
    const name = row.entryPoint;
    if (!completedByFunction[name]) completedByFunction[name] = [];
    if (row.outcome === 'completed') {
      completedByFunction[name].push({
        timestamp: row.timestamp,
        matched: false
      });
    }
    if (row.outcome === 'failed') {
      failedCounts[name] = (failedCounts[name] || 0) + 1;
    }
    if (row.outcome === 'skipped-overlap') {
      skippedCounts[name] = (skippedCounts[name] || 0) + 1;
    }
  });

  Object.keys(completedByFunction).forEach(name => {
    completedByFunction[name].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  });

  const alerts = [];
  let expectedDueCount = 0;
  let completedMatchCount = 0;
  const dueCutoff = new Date(now.getTime() - AUTOMATION_AUDIT_DUE_GRACE_MINUTES * 60 * 1000);
  const earliestLeadMs = 20 * 60 * 1000;
  const latestLagMs = AUTOMATION_AUDIT_ALLOWED_DELAY_MINUTES * 60 * 1000;

  AUTOMATION_TRIGGER_SPECS.forEach(spec => {
    if (spec.functionName === 'runAutomationHealthAuditWrapper') {
      return;
    }

    const scheduled = buildTodayLocalDate_(now, timezone, spec.hour, spec.minute);
    if (scheduled.getTime() > dueCutoff.getTime()) {
      return;
    }

    expectedDueCount += 1;
    const candidates = completedByFunction[spec.functionName] || [];
    const match = candidates.find(candidate => {
      if (candidate.matched) return false;
      const delta = candidate.timestamp.getTime() - scheduled.getTime();
      return delta >= -earliestLeadMs && delta <= latestLagMs;
    });

    if (match) {
      match.matched = true;
      completedMatchCount += 1;
      return;
    }

    const nearestRun = findNearestAutomationRun_(candidates, scheduled);
    const totalCompletedCount = candidates.length;
    const hadLateRun = Boolean(nearestRun);

    alerts.push({
      severity: 'warning',
      functionName: spec.functionName,
      scheduledLocal: formatLocalDateTime_(scheduled, timezone),
      matchedRunLocal: nearestRun ? formatLocalDateTime_(nearestRun.timestamp, timezone) : '',
      status: hadLateRun ? 'late-run' : 'missing-run',
      expectedCount: 1,
      completedCount: totalCompletedCount,
      failedCount: failedCounts[spec.functionName] || 0,
      skippedCount: skippedCounts[spec.functionName] || 0,
      notes: hadLateRun
        ? `Nearest completed wrapper run was outside the ${AUTOMATION_AUDIT_ALLOWED_DELAY_MINUTES}-minute schedule window`
        : `No completed wrapper run matched within ${AUTOMATION_AUDIT_ALLOWED_DELAY_MINUTES} minutes of schedule`
    });
  });

  Object.keys(failedCounts).forEach(name => {
    if (!failedCounts[name]) return;
    alerts.push({
      severity: 'error',
      functionName: name,
      scheduledLocal: '',
      matchedRunLocal: '',
      status: 'failed-run',
      expectedCount: 0,
      completedCount: 0,
      failedCount: failedCounts[name] || 0,
      skippedCount: skippedCounts[name] || 0,
      notes: 'At least one automation wrapper run failed today'
    });
  });

  Object.keys(skippedCounts).forEach(name => {
    if (!skippedCounts[name]) return;
    alerts.push({
      severity: 'warning',
      functionName: name,
      scheduledLocal: '',
      matchedRunLocal: '',
      status: 'skipped-overlap',
      expectedCount: 0,
      completedCount: 0,
      failedCount: failedCounts[name] || 0,
      skippedCount: skippedCounts[name] || 0,
      notes: 'At least one automation wrapper run skipped due to lock overlap'
    });
  });

  return {
    expectedDueCount: expectedDueCount,
    completedMatchCount: completedMatchCount,
    failedCount: sumObjectValues_(failedCounts),
    skippedCount: sumObjectValues_(skippedCounts),
    alerts: alerts
  };
}

function readTodayAutomationWrapperRunRows_(now, timezone) {
  const sheet = getOrCreateRunLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const todayKey = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return values.map(row => ({
    timestamp: row[0],
    runType: String(row[1] || ''),
    mode: String(row[2] || ''),
    entryPoint: String(row[3] || ''),
    outcome: String(row[6] || ''),
    notes: String(row[7] || '')
  })).filter(row => {
    return row.runType === 'automation-wrapper' &&
      row.mode === 'internal' &&
      row.timestamp instanceof Date &&
      Utilities.formatDate(row.timestamp, timezone, 'yyyy-MM-dd') === todayKey;
  });
}

function buildTodayLocalDate_(now, timezone, hour, minute) {
  const parts = Utilities.formatDate(now, timezone, 'yyyy-MM-dd').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), hour, minute || 0, 0, 0);
}

function formatLocalDateTime_(date, timezone) {
  return Utilities.formatDate(date, timezone, 'yyyy-MM-dd HH:mm');
}

function findNearestAutomationRun_(candidates, scheduled) {
  if (!candidates || !candidates.length) return null;

  let best = null;
  let bestDelta = null;
  candidates.forEach(candidate => {
    const delta = Math.abs(candidate.timestamp.getTime() - scheduled.getTime());
    if (best === null || delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  });

  return best;
}

function sumObjectValues_(obj) {
  return Object.keys(obj || {}).reduce((sum, key) => sum + Number(obj[key] || 0), 0);
}
