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
  const important = GmailApp.search(`label:"${CONFIG.labels.toRespond}" ${options.query}`, 0, 20);
  const notifications = GmailApp.search(`label:"${CONFIG.labels.notification}" ${options.query}`, 0, 20);
  const fyi = GmailApp.search(`label:"${CONFIG.labels.fyi}" ${options.query}`, 0, 20);

  const sections = [];
  sections.push(renderDigestSection_('Needs response', important));
  sections.push(renderDigestSection_('Notifications', notifications));
  sections.push(renderDigestSection_('FYI', fyi));

  const summary = sections.filter(Boolean).join('\n\n').trim() || 'No notable items.';
  const itemCount = important.length + notifications.length + fyi.length;

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

function renderDigestSection_(title, threads) {
  if (!threads || !threads.length) return '';

  const lines = threads.slice(0, 10).map(thread => {
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
