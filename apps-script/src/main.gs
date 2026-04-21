function processInboxFocusPhase1() {
  const threads = GmailApp.search(CONFIG.query, 0, 100);

  for (const thread of threads) {
    const decision = classifyThread_(thread);
    applyDecision_(thread, decision);
  }
}
