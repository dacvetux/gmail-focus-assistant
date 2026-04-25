function generateMorningDigest() {
  return generateDigest_({
    type: 'morning',
    dryRun: CONFIG.dryRun,
    entryPointName: CONFIG.dryRun ? 'generateMorningDigestDryRun' : 'generateMorningDigestLive'
  });
}

function generateMorningDigestDryRun() {
  return generateDigest_({
    type: 'morning',
    dryRun: true,
    entryPointName: 'generateMorningDigestDryRun'
  });
}

function generateMorningDigestLive() {
  return generateDigest_({
    type: 'morning',
    dryRun: false,
    entryPointName: 'generateMorningDigestLive'
  });
}

function generateEveningDigest() {
  return generateDigest_({
    type: 'evening',
    dryRun: CONFIG.dryRun,
    entryPointName: CONFIG.dryRun ? 'generateEveningDigestDryRun' : 'generateEveningDigestLive'
  });
}

function generateEveningDigestDryRun() {
  return generateDigest_({
    type: 'evening',
    dryRun: true,
    entryPointName: 'generateEveningDigestDryRun'
  });
}

function generateEveningDigestLive() {
  return generateDigest_({
    type: 'evening',
    dryRun: false,
    entryPointName: 'generateEveningDigestLive'
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

function generateNewsDigestMorningDryRun() {
  return generateNewsDigest_({
    type: 'news-morning',
    dryRun: true,
    entryPointName: 'generateNewsDigestMorningDryRun'
  });
}

function generateNewsDigestMorningLive() {
  return generateNewsDigest_({
    type: 'news-morning',
    dryRun: false,
    entryPointName: 'generateNewsDigestMorningLive'
  });
}

function generateNewsDigestEveningDryRun() {
  return generateNewsDigest_({
    type: 'news-evening',
    dryRun: true,
    entryPointName: 'generateNewsDigestEveningDryRun'
  });
}

function generateNewsDigestEveningLive() {
  return generateNewsDigest_({
    type: 'news-evening',
    dryRun: false,
    entryPointName: 'generateNewsDigestEveningLive'
  });
}

function generateDigest_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const digestSettings = getDigestSetting_(options.type);

  if (!digestSettings.enabled) {
    const result = {
      type: options.type,
      mode: mode,
      itemCount: 0,
      summary: 'Digest disabled in DigestSettings.'
    };

    logRunSummary_({
      runType: 'digest',
      mode: mode,
      entryPoint: inferDigestEntryPoint_(options),
      processedThreads: 0,
      itemCount: 0,
      outcome: 'digest-disabled',
      notes: `disabled-by-setting; type=${options.type}`
    });

    return result;
  }

  const sections = buildDigestSections_(digestSettings.lookbackQuery, digestSettings.threadLimit);
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

  const result = {
    type: options.type,
    mode: mode,
    itemCount: itemCount,
    summary: summary
  };

  logRunSummary_({
    runType: 'digest',
    mode: mode,
    entryPoint: inferDigestEntryPoint_(options),
    processedThreads: itemCount,
    itemCount: itemCount,
    outcome: itemCount ? 'digest-items-found' : 'no-items',
    notes: buildDigestRunNotes_(sections)
  });

  return result;
}

function generateNewsDigest_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const digestSettings = getDigestSetting_(options.type);

  if (!digestSettings.enabled) {
    const result = {
      type: options.type,
      mode: mode,
      itemCount: 0,
      summary: 'Digest disabled in DigestSettings.'
    };

    logRunSummary_({
      runType: 'digest',
      mode: mode,
      entryPoint: options.entryPointName,
      processedThreads: 0,
      itemCount: 0,
      outcome: 'digest-disabled',
      notes: `disabled-by-setting; type=${options.type}`
    });

    return result;
  }

  const threads = selectNewsThreads_(digestSettings.lookbackQuery, digestSettings.threadLimit);
  const summary = renderDigestSection_('News digest', threads) || 'No notable news items.';
  const itemCount = threads.length;

  logDigestRun_(options.type, mode, summary, itemCount);

  if (!options.dryRun && CONFIG.digestRecipient) {
    const subjectPrefix = options.type === 'news-morning' ? 'Morning news digest' : 'Evening news digest';
    MailApp.sendEmail({
      to: CONFIG.digestRecipient,
      subject: `[Gmail Focus Assistant] ${subjectPrefix}`,
      body: summary
    });
  }

  const result = {
    type: options.type,
    mode: mode,
    itemCount: itemCount,
    summary: summary
  };

  logRunSummary_({
    runType: 'digest',
    mode: mode,
    entryPoint: options.entryPointName,
    processedThreads: itemCount,
    itemCount: itemCount,
    outcome: itemCount ? 'digest-items-found' : 'no-items',
    notes: itemCount ? `news-items=${itemCount}` : 'no news items found'
  });

  return result;
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

  const result = {
    type: 'follow-up',
    mode: mode,
    itemCount: staleThreads.length,
    summary: summary
  };

  logRunSummary_({
    runType: 'digest',
    mode: mode,
    entryPoint: options.dryRun ? 'generateFollowUpDigestPhase6DryRun' : 'generateFollowUpDigestPhase6Live',
    processedThreads: staleThreads.length,
    itemCount: staleThreads.length,
    outcome: staleThreads.length ? 'digest-items-found' : 'no-items',
    notes: staleThreads.length ? 'follow-up-only-digest' : 'no stale follow-up candidates'
  });

  return result;
}

function inferDigestEntryPoint_(options) {
  if (options && options.entryPointName) {
    return options.entryPointName;
  }

  if (options && options.type === 'morning') {
    return options.dryRun ? 'generateMorningDigestDryRun' : 'generateMorningDigestLive';
  }

  return options && options.dryRun ? 'generateEveningDigestDryRun' : 'generateEveningDigestLive';
}

function buildDigestRunNotes_(sections) {
  const notes = [];
  if (sections.toRespond.length) notes.push(`to-respond=${sections.toRespond.length}`);
  if (sections.notifications.length) notes.push(`notifications=${sections.notifications.length}`);
  if (sections.opportunities.length) notes.push(`opportunities=${sections.opportunities.length}`);
  if (sections.review.length) notes.push(`review=${sections.review.length}`);
  if (sections.followUpStale.length) notes.push(`followup-stale=${sections.followUpStale.length}`);
  if (!notes.length) notes.push('no digest sections populated');
  return notes.join('; ');
}

function buildDigestSections_(query, searchLimit) {
  const limit = searchLimit || CONFIG.digestSearchPool || 120;
  const effectiveQuery = query || 'newer_than:1d';
  const candidates = GmailApp.search(`${CONFIG.query} ${effectiveQuery}`, 0, limit);
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

    if (decision.label === CONFIG.labels.newsDigest) {
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

function selectNewsThreads_(query, searchLimit) {
  const limit = searchLimit || CONFIG.digestSearchPool || 120;
  const effectiveQuery = query || 'newer_than:1d';
  const candidates = GmailApp.search(`${CONFIG.query} ${effectiveQuery}`, 0, limit);
  const newsThreads = [];
  const seen = new Set();

  candidates.forEach(thread => {
    const decision = classifyThread_(thread);
    if (decision.action !== 'label' || decision.label !== CONFIG.labels.newsDigest) return;
    const id = thread.getId();
    if (seen.has(id)) return;
    seen.add(id);
    newsThreads.push(thread);
  });

  return prioritizeThreads_(newsThreads).slice(0, CONFIG.newsDigestThreadLimit || 12);
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
