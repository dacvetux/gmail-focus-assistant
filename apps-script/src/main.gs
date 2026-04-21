function processInboxFocusPhase1() {
  const threads = GmailApp.search(CONFIG.query, 0, CONFIG.maxThreads);
  const logRows = [];

  for (const thread of threads) {
    const decision = classifyThread_(thread);
    const result = applyDecision_(thread, decision);
    logDecision_(logRows, thread, decision, result);
  }

  flushDecisionLog_(logRows);
}
