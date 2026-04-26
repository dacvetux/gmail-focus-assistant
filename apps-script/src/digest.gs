function generateMorningDigest() {
  return generateDigest_({
    type: 'morning',
    dryRun: CONFIG.dryRun,
    entryPointName: CONFIG.dryRun ? 'generateMorningDigestDryRun' : 'generateMorningDigestLive'
  });
}

function generateMorningDigestFromLogsDryRun() {
  return generateLogBackedDigest_({
    type: 'morning-log',
    sourceType: 'main',
    dryRun: true,
    entryPointName: 'generateMorningDigestFromLogsDryRun'
  });
}

function generateMorningDigestFromLogsLive() {
  return generateLogBackedDigest_({
    type: 'morning-log',
    sourceType: 'main',
    dryRun: false,
    entryPointName: 'generateMorningDigestFromLogsLive'
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

function generateEveningDigestFromLogsDryRun() {
  return generateLogBackedDigest_({
    type: 'evening-log',
    sourceType: 'main',
    dryRun: true,
    entryPointName: 'generateEveningDigestFromLogsDryRun'
  });
}

function generateEveningDigestFromLogsLive() {
  return generateLogBackedDigest_({
    type: 'evening-log',
    sourceType: 'main',
    dryRun: false,
    entryPointName: 'generateEveningDigestFromLogsLive'
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

function generateNewsDigestMorningFromLogsDryRun() {
  return generateLogBackedDigest_({
    type: 'news-morning-log',
    sourceType: 'news',
    dryRun: true,
    entryPointName: 'generateNewsDigestMorningFromLogsDryRun'
  });
}

function generateNewsDigestMorningFromLogsLive() {
  return generateLogBackedDigest_({
    type: 'news-morning-log',
    sourceType: 'news',
    dryRun: false,
    entryPointName: 'generateNewsDigestMorningFromLogsLive'
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

function generateNewsDigestEveningFromLogsDryRun() {
  return generateLogBackedDigest_({
    type: 'news-evening-log',
    sourceType: 'news',
    dryRun: true,
    entryPointName: 'generateNewsDigestEveningFromLogsDryRun'
  });
}

function generateNewsDigestEveningFromLogsLive() {
  return generateLogBackedDigest_({
    type: 'news-evening-log',
    sourceType: 'news',
    dryRun: false,
    entryPointName: 'generateNewsDigestEveningFromLogsLive'
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
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
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
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
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

function generateLogBackedDigest_(options) {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const mode = options.dryRun ? 'dry-run' : 'live';
  const windowConfig = getDigestWindowConfig_(options.type);
  const rows = readDecisionRowsForWindow_(windowConfig.start, windowConfig.end);
  const summaryData = buildLogBackedDigestSummary_(rows, options);
  const summary = summaryData.summary;
  const itemCount = summaryData.itemCount;

  logDigestRun_(options.type, mode, summary, itemCount);

  if (!options.dryRun && CONFIG.digestRecipient) {
    MailApp.sendEmail({
      to: CONFIG.digestRecipient,
      subject: `[Gmail Focus Assistant] ${buildLogDigestSubject_(options.type)}`,
      body: summary
    });
  }

  logRunSummary_({
    runType: 'digest-log-window',
    mode: mode,
    entryPoint: options.entryPointName,
    processedThreads: rows.length,
    itemCount: itemCount,
    outcome: itemCount ? 'digest-items-found' : 'no-items',
    notes: buildLogDigestRunNotes_(summaryData, windowConfig)
  });

  return {
    type: options.type,
    mode: mode,
    itemCount: itemCount,
    scannedRows: rows.length,
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

function readDecisionRowsForWindow_(startDate, endDate) {
  return dedupeDecisionRowsByLatestThread_(readRecentDecisionRows_(1000).filter(row => {
    const timestamp = coerceLogDate_(row.timestamp);
    if (!timestamp) return false;
    return timestamp >= startDate && timestamp < endDate;
  }));
}

function buildLogBackedDigestSummary_(rows, options) {
  const sourceType = options.sourceType || 'main';
  const sections = {
    toRespond: [],
    notifications: [],
    opportunities: [],
    review: [],
    news: []
  };

  rows.forEach(row => {
    const entry = {
      from: row.from,
      subject: row.subject,
      timestamp: row.timestamp,
      labels: row.appliedLabels,
      archived: row.archived,
      reason: row.reason,
      threadId: row.threadId
    };

    if (sourceType === 'news') {
      if ((row.appliedLabels || '').includes(CONFIG.labels.newsDigest)) {
        sections.news.push(entry);
      }
      return;
    }

    if ((row.appliedLabels || '').includes(CONFIG.labels.newsDigest)) {
      return;
    }

    if ((row.appliedLabels || '').includes(CONFIG.labels.toRespond)) {
      sections.toRespond.push(entry);
      return;
    }

    if (
      (row.appliedLabels || '').includes(CONFIG.labels.notification) ||
      (row.appliedLabels || '').includes(CONFIG.labels.importantShipping) ||
      (row.appliedLabels || '').includes(CONFIG.labels.importantFinance) ||
      (row.appliedLabels || '').includes(CONFIG.labels.importantServices) ||
      (row.appliedLabels || '').includes(CONFIG.labels.importantCalendar)
    ) {
      sections.notifications.push(entry);
      return;
    }

    if ((row.appliedLabels || '').includes(CONFIG.labels.importantOpportunities)) {
      sections.opportunities.push(entry);
      return;
    }

    if ((row.appliedLabels || '').includes(CONFIG.labels.review)) {
      sections.review.push(entry);
    }
  });

  if (sourceType === 'news') {
    const summary = renderLogDigestSection_('News digest', sections.news) || 'No notable news items in this window.';
    return {
      summary: summary,
      itemCount: sections.news.length,
      sections: sections
    };
  }

  const renderedSections = [
    renderLogDigestSection_('Needs response', sections.toRespond),
    renderLogDigestSection_('Important notifications', sections.notifications),
    renderLogDigestSection_('Opportunities', sections.opportunities),
    renderLogDigestSection_('Review later', sections.review)
  ];

  return {
    summary: renderedSections.filter(Boolean).join('\n\n').trim() || 'No notable items in this window.',
    itemCount: sections.toRespond.length + sections.notifications.length + sections.opportunities.length + sections.review.length,
    sections: sections
  };
}

function renderLogDigestSection_(title, entries) {
  if (!entries || !entries.length) return '';

  const limit = CONFIG.digestThreadLimitPerSection || 8;
  const sorted = dedupeRenderedDigestEntries_(entries).sort((a, b) => {
    const aTime = coerceLogDate_(a.timestamp);
    const bTime = coerceLogDate_(b.timestamp);
    return (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0);
  });

  const lines = sorted.slice(0, limit).map(entry => `- ${compactSender_(entry.from || 'Unknown sender')}: ${entry.subject || '(No subject)'}`);
  const hiddenCount = Math.max(0, sorted.length - lines.length);
  if (hiddenCount > 0) lines.push(`- … and ${hiddenCount} more`);

  return `${title} (${sorted.length})\n${lines.join('\n')}`;
}

function buildLogDigestSubject_(digestType) {
  return `${digestType.replace(/-/g, ' ')} digest`;
}

function buildLogDigestRunNotes_(summaryData, windowConfig) {
  const notes = [];
  notes.push(`window-label=${windowConfig.label}`);
  notes.push(`window-start-local=${formatWindowDateLocal_(windowConfig.start)}`);
  notes.push(`window-end-local=${formatWindowDateLocal_(windowConfig.end)}`);
  notes.push(`window-start-utc=${windowConfig.start.toISOString()}`);
  notes.push(`window-end-utc=${windowConfig.end.toISOString()}`);

  const sections = summaryData.sections || {};
  if (sections.toRespond && sections.toRespond.length) notes.push(`to-respond=${sections.toRespond.length}`);
  if (sections.notifications && sections.notifications.length) notes.push(`notifications=${sections.notifications.length}`);
  if (sections.opportunities && sections.opportunities.length) notes.push(`opportunities=${sections.opportunities.length}`);
  if (sections.review && sections.review.length) notes.push(`review=${sections.review.length}`);
  if (sections.news && sections.news.length) notes.push(`news=${sections.news.length}`);
  if (notes.length === 2) notes.push('no digest sections populated');

  return notes.join('; ');
}

function getDigestWindowConfig_(digestType) {
  const now = new Date();

  if ((digestType || '').includes('morning')) {
    const end = new Date(now);
    end.setHours(7, 30, 0, 0);
    if (now < end) {
      end.setDate(end.getDate() - 1);
    }

    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    start.setHours(19, 0, 0, 0);
    return { start: start, end: end, label: 'evening-to-morning' };
  }

  const end = new Date(now);
  end.setHours(19, 0, 0, 0);
  if (now < end) {
    end.setDate(end.getDate() - 1);
  }

  const start = new Date(end);
  start.setHours(7, 30, 0, 0);
  return { start: start, end: end, label: 'morning-to-evening' };
}

function coerceLogDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value;
  }

  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
}

function dedupeDecisionRowsByLatestThread_(rows) {
  const byKey = new Map();

  (rows || []).forEach(row => {
    const dedupeKey = buildDecisionRowDedupeKey_(row);
    const timestamp = coerceLogDate_(row.timestamp);

    if (!byKey.has(dedupeKey)) {
      byKey.set(dedupeKey, row);
      return;
    }

    const existing = byKey.get(dedupeKey);
    const existingTimestamp = coerceLogDate_(existing.timestamp);
    if (!existingTimestamp || (timestamp && timestamp > existingTimestamp)) {
      byKey.set(dedupeKey, row);
    }
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = coerceLogDate_(a.timestamp);
    const bTime = coerceLogDate_(b.timestamp);
    return (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0);
  });
}

function buildDecisionRowDedupeKey_(row) {
  if (row && row.threadId) {
    return `thread:${row.threadId}`;
  }

  const from = normalizeDigestKeyPart_(row && row.from);
  const subject = normalizeDigestKeyPart_(row && row.subject);
  return `fallback:${from}|${subject}`;
}

function normalizeDigestKeyPart_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatWindowDateLocal_(date) {
  if (!date) return '';

  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
}

function dedupeRenderedDigestEntries_(entries) {
  const byKey = new Map();

  (entries || []).forEach(entry => {
    const dedupeKey = buildRenderedDigestEntryKey_(entry);
    const timestamp = coerceLogDate_(entry && entry.timestamp);

    if (!byKey.has(dedupeKey)) {
      byKey.set(dedupeKey, entry);
      return;
    }

    const existing = byKey.get(dedupeKey);
    const existingTimestamp = coerceLogDate_(existing && existing.timestamp);
    if (!existingTimestamp || (timestamp && timestamp > existingTimestamp)) {
      byKey.set(dedupeKey, entry);
    }
  });

  return Array.from(byKey.values());
}

function buildRenderedDigestEntryKey_(entry) {
  if (entry && entry.threadId) {
    return `thread:${entry.threadId}`;
  }

  return `display:${normalizeDigestKeyPart_(compactSender_((entry && entry.from) || ''))}|${normalizeDigestKeyPart_(entry && entry.subject)}`;
}
