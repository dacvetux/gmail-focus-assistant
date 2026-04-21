function processInboxFocusPhase1() {
  return processInboxFocusWithOptions_({
    dryRun: CONFIG.dryRun,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase1DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase1Live() {
  return processInboxFocusWithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase2() {
  return processInboxFocusWithOptions_({
    dryRun: CONFIG.dryRun,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase2DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase2Live() {
  return processInboxFocusWithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads
  });
}

function validatePhases1And2DryRun() {
  return processInboxFocusWithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads,
    validationMode: true
  });
}

function processInboxFocusWithOptions_(options) {
  const threads = selectThreadsForProcessing_(options);
  const logRows = [];
  const previousDryRun = CONFIG.dryRun;

  CONFIG.dryRun = Boolean(options.dryRun);

  try {
    for (const thread of threads) {
      const decision = classifyThread_(thread);
      const result = applyDecision_(thread, decision);
      logDecision_(logRows, thread, decision, result);
    }

    flushDecisionLog_(logRows);
  } finally {
    CONFIG.dryRun = previousDryRun;
  }

  return {
    processedThreads: threads.length,
    mode: options.dryRun ? 'dry-run' : 'live'
  };
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
