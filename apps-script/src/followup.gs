function trackAwaitingRepliesPhase6DryRun_() {
  return trackAwaitingRepliesPhase6_({
    dryRun: true
  });
}

function trackAwaitingRepliesPhase6Live_() {
  return trackAwaitingRepliesPhase6_({
    dryRun: false
  });
}

function trackAwaitingRepliesForQueryPhase6DryRun_(query) {
  return trackAwaitingRepliesPhase6_({
    dryRun: true,
    query: query,
    forceIncludeQueryMatches: true
  });
}

function trackAwaitingRepliesForQueryPhase6Live_(query) {
  return trackAwaitingRepliesPhase6_({
    dryRun: false,
    query: query,
    forceIncludeQueryMatches: true
  });
}

function trackAwaitingRepliesPhase6_(options) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const threads = selectAwaitingReplyThreads_(options);
  const rows = [];

  threads.forEach(thread => {
    const analysis = analyzeAwaitingReplyThread_(thread, options);
    if (!analysis) return;

    if (!options.dryRun && analysis.shouldEnsureAwaitingReplyLabel) {
      ensureAwaitingReplyLabel_(thread);
    }

    rows.push([
      new Date(),
      mode,
      thread.getId(),
      analysis.from,
      analysis.subject,
      analysis.currentLabels.join(', '),
      analysis.lastMessageDate,
      analysis.lastMessageSenderType,
      analysis.daysSinceLastMessage,
      analysis.suggestedStatus,
      analysis.reason
    ]);
  });

  if (!rows.length) {
    rows.push([
      new Date(),
      mode,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'no-awaiting-reply-candidates',
      options.query ? 'No threads matched the Phase 6 query/input pool.' : 'No threads found in awaiting-reply input pool.'
    ]);
  }

  flushFollowUpLog_(rows);

  return {
    mode: mode,
    processedThreads: threads.length,
    staleCount: rows.filter(row => row[9] === 'waiting-stale').length
  };
}

function selectAwaitingReplyThreads_(options) {
  const lookbackDays = CONFIG.followUpLookbackDays || 30;
  const defaultQuery = `label:"${CONFIG.labels.awaitingReply}" newer_than:${lookbackDays}d -label:TRASH -label:SPAM`;
  const searchQuery = options && options.query ? options.query : defaultQuery;
  const limit = (options && options.maxThreads) || CONFIG.maxThreads || 100;
  return dedupeThreads_(GmailApp.search(searchQuery, 0, limit));
}

function analyzeAwaitingReplyThread_(thread, options) {
  const messages = getMessagesSafe_(thread);
  if (!messages.length) return null;

  const labels = thread.getLabels().map(label => label.getName());
  const subject = getThreadSubjectSafe_(thread, messages);
  const lastMessage = messages[messages.length - 1];
  const lastMessageDate = getMessageDateSafe_(lastMessage);
  const daysSinceLastMessage = lastMessageDate ? daysSince_(lastMessageDate) : '';
  const lastMeaningful = getLastMeaningfulMessage_(messages);

  if (!lastMeaningful) {
    return {
      from: (lastMessage.getFrom && lastMessage.getFrom()) || '',
      subject,
      currentLabels: labels,
      lastMessageDate,
      lastMessageSenderType: classifySenderType_((lastMessage.getFrom && lastMessage.getFrom()) || ''),
      daysSinceLastMessage,
      suggestedStatus: 'skipped',
      shouldEnsureAwaitingReplyLabel: false,
      reason: 'No meaningful message found in thread.'
    };
  }

  const lastMeaningfulFrom = (lastMeaningful.getFrom && lastMeaningful.getFrom()) || '';
  const lastMessageSenderType = classifySenderType_(lastMeaningfulFrom);
  const hasAwaitingReplyLabel = labels.includes(CONFIG.labels.awaitingReply);
  const closedLabelNames = [CONFIG.labels.actioned, CONFIG.labels.fyi, CONFIG.labels.notification];
  const isClearlyClosed = labels.some(label => closedLabelNames.includes(label));
  const forcedQueryMode = Boolean(options && options.forceIncludeQueryMatches);

  let suggestedStatus = 'waiting-fresh';
  let shouldEnsureAwaitingReplyLabel = false;
  let reason = '';

  if (isClearlyClosed) {
    suggestedStatus = 'closed-or-replied';
    reason = 'Thread already carries a closing/non-waiting workflow label.';
  } else if (lastMessageSenderType !== 'user') {
    suggestedStatus = 'closed-or-replied';
    reason = 'Latest meaningful message is from the external side.';
  } else if (daysSinceLastMessage === '') {
    suggestedStatus = 'skipped';
    reason = 'Could not determine age of latest message.';
  } else if (daysSinceLastMessage >= (CONFIG.followUpStaleDays || 5)) {
    suggestedStatus = 'waiting-stale';
    reason = `User sent the latest meaningful message ${daysSinceLastMessage} days ago.`;
  } else {
    suggestedStatus = 'waiting-fresh';
    reason = `User sent the latest meaningful message ${daysSinceLastMessage} days ago.`;
  }

  if (!hasAwaitingReplyLabel && forcedQueryMode && suggestedStatus !== 'closed-or-replied' && suggestedStatus !== 'skipped') {
    shouldEnsureAwaitingReplyLabel = true;
    reason += ' Query-mode candidate is missing the awaiting-reply label.';
  } else if (!hasAwaitingReplyLabel && !forcedQueryMode) {
    suggestedStatus = 'skipped';
    reason = 'Thread is not labeled awaiting reply.';
  }

  return {
    from: lastMeaningfulFrom,
    subject,
    currentLabels: labels,
    lastMessageDate,
    lastMessageSenderType,
    daysSinceLastMessage,
    suggestedStatus,
    shouldEnsureAwaitingReplyLabel,
    reason
  };
}

function ensureAwaitingReplyLabel_(thread) {
  const labelNames = thread.getLabels().map(label => label.getName());
  if (!labelNames.includes(CONFIG.labels.awaitingReply)) {
    getOrCreateLabel_(CONFIG.labels.awaitingReply).addToThread(thread);
  }
}

function classifySenderType_(from) {
  return isUserAddress_(from) ? 'user' : 'external';
}

function isUserAddress_(from) {
  const normalized = String(from || '').toLowerCase();
  return (CONFIG.myAddresses || []).some(address => normalized.includes(String(address).toLowerCase()));
}

function getMessagesSafe_(thread) {
  try {
    return thread.getMessages() || [];
  } catch (error) {
    return [];
  }
}

function getThreadSubjectSafe_(thread, messages) {
  const lastMessage = messages && messages.length ? messages[messages.length - 1] : null;
  if (lastMessage && lastMessage.getSubject) {
    return lastMessage.getSubject() || '';
  }
  try {
    return thread.getFirstMessageSubject() || '';
  } catch (error) {
    return '';
  }
}

function getLastMeaningfulMessage_(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (isMeaningfulMessage_(message)) {
      return message;
    }
  }
  return null;
}

function isMeaningfulMessage_(message) {
  if (!message) return false;

  const subject = (message.getSubject && message.getSubject()) || '';
  const from = (message.getFrom && message.getFrom()) || '';
  const body = ((message.getPlainBody && message.getPlainBody()) || '').trim();
  const combined = `${subject}\n${from}\n${body}`.toLowerCase();

  if (!combined) return false;

  if (matchesAny_(combined, CONFIG.followUpMeaninglessPatterns || [])) {
    return false;
  }

  return body.length >= (CONFIG.followUpMeaningfulBodyMinChars || 20) || /\S/.test(subject);
}

function getMessageDateSafe_(message) {
  try {
    return (message && message.getDate && message.getDate()) || null;
  } catch (error) {
    return null;
  }
}

function daysSince_(date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - new Date(date).getTime()) / msPerDay);
}
