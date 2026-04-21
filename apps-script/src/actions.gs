function getOrCreateLabel_(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}

function applyDecision_(thread, decision) {
  if (!decision || decision.action === 'preserve') return;

  if (decision.label) {
    getOrCreateLabel_(decision.label).addToThread(thread);
  }

  if (decision.archive) {
    thread.moveToArchive();
  }
}
