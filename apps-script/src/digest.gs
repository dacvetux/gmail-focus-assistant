function generateMorningDigest() {
  return generateDigest_({
    type: 'morning',
    dryRun: CONFIG.dryRun,
    query: 'newer_than:1d'
  });
}

function generateEveningDigest() {
  return generateDigest_({
    type: 'evening',
    dryRun: CONFIG.dryRun,
    query: 'newer_than:1d'
  });
}

function generateDigest_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const toRespond = GmailApp.search(`label:"${CONFIG.labels.toRespond}" ${options.query}`, 0, 20);
  const notifications = GmailApp.search(`label:"${CONFIG.labels.notification}" ${options.query}`, 0, 20);
  const shipping = GmailApp.search(`label:"${CONFIG.labels.importantShipping}" ${options.query}`, 0, 20);
  const finance = GmailApp.search(`label:"${CONFIG.labels.importantFinance}" ${options.query}`, 0, 20);
  const opportunities = GmailApp.search(`label:"${CONFIG.labels.importantOpportunities}" ${options.query}`, 0, 20);
  const review = GmailApp.search(`label:"${CONFIG.labels.review}" ${options.query}`, 0, 20);

  const sections = [];
  sections.push(renderDigestSection_('Needs response', prioritizeThreads_(toRespond)));
  sections.push(renderDigestSection_('Important notifications', prioritizeThreads_(notifications.concat(shipping, finance))));
  sections.push(renderDigestSection_('Opportunities', prioritizeThreads_(opportunities)));
  sections.push(renderDigestSection_('Review later', prioritizeThreads_(review)));

  const summary = sections.filter(Boolean).join('\n\n').trim() || 'No notable items.';
  const itemCount = toRespond.length + notifications.length + shipping.length + finance.length + opportunities.length + review.length;

  logDigestRun_(options.type, mode, summary, itemCount);

  if (!options.dryRun && CONFIG.digestRecipient) {
    MailApp.sendEmail({
      to: CONFIG.digestRecipient,
      subject: `[Gmail Focus Assistant] ${capitalize_(options.type)} digest`,
      body: summary
    });
  }

  return {
    type: options.type,
    mode: mode,
    itemCount: itemCount,
    summary: summary
  };
}

function prioritizeThreads_(threads) {
  const unique = dedupeThreads_(threads || []);
  return unique.sort((a, b) => getThreadSortKey_(b) - getThreadSortKey_(a));
}

function dedupeThreads_(threads) {
  const seen = new Set();
  const result = [];

  threads.forEach(thread => {
    const id = thread.getId();
    if (!seen.has(id)) {
      seen.add(id);
      result.push(thread);
    }
  });

  return result;
}

function getThreadSortKey_(thread) {
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  return new Date(lastMessage.getDate()).getTime();
}

function renderDigestSection_(title, threads) {
  if (!threads || !threads.length) return '';

  const lines = threads.slice(0, 8).map(thread => {
    const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
    const from = (lastMessage && lastMessage.getFrom()) || 'Unknown sender';
    const subject = (lastMessage && lastMessage.getSubject()) || '(No subject)';
    return `- ${from}: ${subject}`;
  });

  return `${title}\n${lines.join('\n')}`;
}

function capitalize_(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
