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
  { functionName: 'runEveningMainDigestLiveWrapper', hour: 19, minute: 5 },
  { functionName: 'runEveningNewsDigestLiveWrapper', hour: 19, minute: 10 }
];

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

