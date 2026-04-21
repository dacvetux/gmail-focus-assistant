function processInboxFocusPhase1() {
  return processInboxFocusPhase1WithOptions_({
    dryRun: CONFIG.dryRun,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase1DryRun() {
  return processInboxFocusPhase1WithOptions_({
    dryRun: true,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase1Live() {
  return processInboxFocusPhase1WithOptions_({
    dryRun: false,
    maxThreads: CONFIG.maxThreads
  });
}

function processInboxFocusPhase1WithOptions_(options) {
  const threads = GmailApp.search(CONFIG.query, 0, options.maxThreads || CONFIG.maxThreads);
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
