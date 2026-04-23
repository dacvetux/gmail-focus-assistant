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

function generateDigest_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const sections = buildDigestSections_(options.query);
  const renderedSections = [
    renderDigestSection_('Needs response', sections.toRespond),
    renderDigestSection_('Important notifications', sections.notifications),
    renderDigestSection_('Opportunities', sections.opportunities),
    renderDigestSection_('Review later', sections.review),
    renderFollowUpDigestSection_(sections.followUpStale)
  ];

  const summary = renderedSections.filter(Boolean).join('\n\n').trim() || 'No notable items.';
  const itemCount = sections.toRespond.length + sections.notifications.length + sections.opportunities.length + sections.review.length + sections.followUpStale.length;

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

function generateFollowUpDigestPhase6_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const staleThreads = selectStaleAwaitingReplyThreads_();
  const summary = renderFollowUpDigestSection_(staleThreads) || 'No stale follow-up candidates.';

  logDigestRun_('follow-up', mode, summary, staleThreads.length);

  if (!options.dryRun && CONFIG.digestRecipient) {
    MailApp.sendEmail({
      to: CONFIG.digestRecipient,
      subject: '[Gmail Focus Assistant] Follow-up digest',
      body: summary
    });
  }

  return {
    type: 'follow-up',
    mode: mode,
    itemCount: staleThreads.length,
    summary: summary
  };
}

function buildDigestSections_(query) {
  const limit = CONFIG.digestSearchPool || 120;
  const candidates = GmailApp.search(`${CONFIG.query} ${query}`, 0, limit);
  const seen = new Set();
  const sections = {
    toRespond: [],
    notifications: [],
    opportunities: [],
    review: [],
    followUpStale: []
  };

  candidates.forEach(thread => {
    const decision = classifyThread_(thread);
    if (decision.action !== 'label') return;

    const id = thread.getId();
    if (seen.has(id)) return;
    seen.add(id);

    if (decision.workflowLabel === CONFIG.labels.toRespond) {
      sections.toRespond.push(thread);
      return;
    }

    if (
      decision.label === CONFIG.labels.importantShipping ||
      decision.label === CONFIG.labels.importantFinance ||
      decision.label === CONFIG.labels.importantServices ||
      decision.label === CONFIG.labels.importantCalendar ||
      decision.workflowLabel === CONFIG.labels.notification
    ) {
      sections.notifications.push(thread);
      return;
    }

    if (decision.label === CONFIG.labels.importantOpportunities) {
      sections.opportunities.push(thread);
      return;
    }

    if (decision.label === CONFIG.labels.review) {
      sections.review.push(thread);
    }
  });

  sections.followUpStale = selectStaleAwaitingReplyThreads_();

  return {
    toRespond: prioritizeThreads_(sections.toRespond),
    notifications: prioritizeThreads_(sections.notifications),
    opportunities: prioritizeThreads_(sections.opportunities),
    review: prioritizeThreads_(sections.review),
    followUpStale: prioritizeThreads_(sections.followUpStale)
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

  const lines = threads.slice(0, CONFIG.digestThreadLimitPerSection || 8).map(thread => {
    const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
    const from = compactSender_((lastMessage && lastMessage.getFrom()) || 'Unknown sender');
    const subject = (lastMessage && lastMessage.getSubject()) || '(No subject)';
    return `- ${from}: ${subject}`;
  });

  const hiddenCount = Math.max(0, threads.length - lines.length);
  if (hiddenCount > 0) {
    lines.push(`- … and ${hiddenCount} more`);
  }

  return `${title} (${threads.length})\n${lines.join('\n')}`;
}

function renderFollowUpDigestSection_(threads) {
  if (!threads || !threads.length) return '';

  const lines = threads.slice(0, CONFIG.digestThreadLimitPerSection || 8).map(thread => {
    const analysis = analyzeAwaitingReplyThread_(thread, {});
    const from = compactSender_((analysis && analysis.from) || 'Unknown sender');
    const subject = (analysis && analysis.subject) || '(No subject)';
    const age = analysis && analysis.daysSinceLastMessage !== '' ? `${analysis.daysSinceLastMessage}d` : '?d';
    return `- ${from}: ${subject} (${age})`;
  });

  const hiddenCount = Math.max(0, threads.length - lines.length);
  if (hiddenCount > 0) {
    lines.push(`- … and ${hiddenCount} more`);
  }

  return `Awaiting reply - stale (${threads.length})\n${lines.join('\n')}`;
}

function selectStaleAwaitingReplyThreads_() {
  return selectAwaitingReplyThreads_({
    maxThreads: CONFIG.digestSearchPool || 120
  }).filter(thread => {
    const analysis = analyzeAwaitingReplyThread_(thread, {});
    return analysis && analysis.suggestedStatus === 'waiting-stale';
  });
}

function compactSender_(from) {
  return from
    .replace(/\s*<[^>]+>/, '')
    .replace(/^"|"$/g, '')
    .trim();
}

function capitalize_(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
