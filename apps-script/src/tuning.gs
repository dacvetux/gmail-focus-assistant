function generateTuningSuggestionsPhase9DryRun() {
  return generateTuningSuggestionsPhase9_({
    dryRun: true
  });
}

function generateTuningSuggestionsPhase9Live() {
  return generateTuningSuggestionsPhase9_({
    dryRun: false
  });
}

function inspectNewsSourceCandidatesPhase10() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const rows = readRecentDecisionRows_(CONFIG.tuningSuggestionLookbackRows || 500);
  const newsConfig = readNewsSourceConfig_();
  const approvedRules = readApprovedRules_();
  const bySender = new Map();

  rows.forEach(row => {
    const from = (row.from || '').trim();
    const subject = (row.subject || '').trim();
    const reason = (row.reason || '').trim();
    const labels = (row.appliedLabels || '').trim();
    const senderKey = extractSenderKey_(from);
    if (!senderKey) return;

    if (!bySender.has(senderKey)) {
      bySender.set(senderKey, {
        sender: senderKey,
        from: from,
        subject: subject,
        reason: reason,
        totalCount: 0,
        reviewCount: 0,
        newsCount: 0,
        labels: {},
        examples: []
      });
    }

    const entry = bySender.get(senderKey);
    entry.totalCount += 1;
    entry.labels[labels] = (entry.labels[labels] || 0) + 1;
    if (isReviewLabelSet_(labels)) entry.reviewCount += 1;
    if (String(labels).split(',').map(value => value.trim()).includes(CONFIG.labels.newsDigest)) entry.newsCount += 1;
    if (!entry.subject && subject) entry.subject = subject;
    if (!entry.reason && reason) entry.reason = reason;
    if (entry.examples.length < 3) {
      entry.examples.push({ subject: subject, reason: reason, labels: labels });
    }
  });

  const includeCandidates = [];
  const excludeCandidates = [];

  bySender.forEach(entry => {
    const representative = entry.examples[0] || entry;
    const alreadyNews = containsAny_(entry.sender, newsConfig.senders || []);
    const alreadyExcluded = containsAny_(entry.sender, newsConfig.excludedSenders || []);
    const alreadyCoveredByRule = isSenderAlreadyCoveredByApprovedRules_(entry.sender, approvedRules);
    const alreadyCoveredByRuntimeOverride = isSenderCoveredByRuntimeOverride_(entry.sender);

    if (!alreadyNews && !alreadyExcluded && !alreadyCoveredByRule && !alreadyCoveredByRuntimeOverride && isLikelyNewsIncludeCandidate_(entry, representative)) {
      includeCandidates.push(buildNewsSourceCandidateResult_(entry, representative, 'news', alreadyNews, alreadyExcluded));
    }

    if (alreadyNews && isLikelyNewsExcludeCandidate_(entry, representative)) {
      excludeCandidates.push(buildNewsSourceCandidateResult_(entry, representative, 'exclude', alreadyNews, alreadyExcluded));
    }
  });

  includeCandidates.sort((a, b) => Number(b.reviewCount || 0) - Number(a.reviewCount || 0) || String(a.sender || '').localeCompare(String(b.sender || '')));
  excludeCandidates.sort((a, b) => Number(b.newsCount || 0) - Number(a.newsCount || 0) || String(a.sender || '').localeCompare(String(b.sender || '')));

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'inspectNewsSourceCandidatesPhase10',
    processedThreads: rows.length,
    itemCount: includeCandidates.length + excludeCandidates.length,
    outcome: includeCandidates.length || excludeCandidates.length ? 'news-candidates-found' : 'no-news-candidates',
    notes: `includes=${includeCandidates.length}; excludes=${excludeCandidates.length}; lookback=${rows.length}`
  });

  return {
    scannedRows: rows.length,
    includeCandidates: includeCandidates,
    excludeCandidates: excludeCandidates
  };
}

function generateTuningSuggestionsPhase9_(options) {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const rows = readRecentDecisionRows_(CONFIG.tuningSuggestionLookbackRows || 500);
  const suggestions = [];
  const bySender = new Map();
  const approvedRules = readApprovedRules_();

  rows.forEach(row => {
    const from = (row.from || '').trim();
    const subject = (row.subject || '').trim();
    const reason = (row.reason || '').trim();
    const labels = (row.appliedLabels || '').trim();
    const archived = (row.archived || '').trim();
    const timestamp = formatTuningSuggestionTimestamp_(row.timestamp);
    const senderKey = extractSenderKey_(from);
    if (!senderKey) return;

    if (!bySender.has(senderKey)) {
      bySender.set(senderKey, {
        count: 0,
        from,
        subject,
        labels,
        reason,
        archived,
        timestamp,
        modes: {},
        labelCounts: {},
        reviewExamples: []
      });
    }

    const entry = bySender.get(senderKey);
    entry.count += 1;
    entry.modes[row.mode || 'unknown'] = true;
    entry.labelCounts[labels] = (entry.labelCounts[labels] || 0) + 1;
    if (!entry.subject && subject) entry.subject = subject;
    if (!entry.labels && labels) entry.labels = labels;
    if (!entry.reason && reason) entry.reason = reason;
    if (!entry.from && from) entry.from = from;
    if (!entry.archived && archived) entry.archived = archived;
    if (!entry.timestamp && timestamp) entry.timestamp = timestamp;

    if (isReviewLabelSet_(labels) && entry.reviewExamples.length < 3) {
      entry.reviewExamples.push({
        from: from,
        subject: subject,
        reason: reason,
        timestamp: timestamp,
        mode: row.mode || ''
      });
    }
  });

  bySender.forEach((entry, senderKey) => {
    const reviewCount = countReviewLabelRows_(entry.labelCounts);
    const representative = entry.reviewExamples[0] || entry;

    if (!reviewCount) {
      return;
    }

    if (isSenderAlreadyCoveredByApprovedRules_(senderKey, approvedRules)) {
      return;
    }

    if (
      (reviewCount >= 2 || looksStrongCommercialSuggestion_(entry, representative)) &&
      looksCommercialSuggestion_(representative)
    ) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'commercial-override-candidate',
        suggestedChange: 'add to forceCommercialSenders',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: reviewCount >= 2 ? 'medium' : 'high',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'review-bucket commercial-looking mail',
        notes: buildSuggestionNotes_(options, entry, reviewCount)
      }));
      return;
    }

    if (looksStrongServiceNotificationSuggestion_(entry, representative)) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'important-service-candidate',
        suggestedChange: 'add to forceImportantSenders',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: 'high',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'service/account-style mail still landing in review',
        notes: buildSuggestionNotes_(options, entry, reviewCount)
      }));
      return;
    }

    if (looksLowPriorityFyiSuggestion_(entry, representative, reviewCount)) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'low-priority-fyi-sender-candidate',
        suggestedChange: 'add to forceFyiSenders',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: reviewCount >= 3 ? 'high' : 'medium',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'recurring informational mail still landing in review',
        notes: buildSuggestionNotes_(options, entry, reviewCount)
      }));
      return;
    }

    if (looksMarketplaceTransactionalSuggestion_(representative)) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'marketplace-shipping-candidate',
        suggestedChange: 'add to forceShippingSenders',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: 'high',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'marketplace transactional mail should route to shipping/notification handling',
        notes: buildSuggestionNotes_(options, entry, reviewCount)
      }));
      return;
    }

    if (looksShippingSuggestion_(representative)) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'shipping-pattern-candidate',
        suggestedChange: 'promote to shipping/notification handling',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: 'medium',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'shipping-like mail still landing in review',
        notes: 'check forceShippingSenders or shippingPatterns'
      }));
      return;
    }

    if (looksFinanceSuggestion_(representative)) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'finance-pattern-candidate',
        suggestedChange: 'promote to finance/notification handling',
        target: senderKey,
        evidenceCount: reviewCount,
        confidence: 'medium',
        exampleFrom: representative.from,
        exampleSubject: representative.subject,
        reason: representative.reason || 'finance-like mail still landing in review',
        notes: 'check forceImportantSenders or financePatterns'
      }));
      return;
    }
  });

  const hadSuggestionRows = suggestions.length > 0;
  if (!hadSuggestionRows) {
    if (shouldAppendNoSuggestionsRow_()) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'no-suggestions',
        suggestedChange: 'none',
        target: '',
        evidenceCount: 0,
        confidence: 'low',
        exampleFrom: '',
        exampleSubject: '',
        reason: 'No suggestion candidates found in recent decision rows.',
        notes: 'suppressed-repeat=no'
      }));
    }
  }

  flushTuningSuggestionsDeduped_(suggestions);

  logRunSummary_({
    runType: 'tuning-suggestions',
    mode: options.dryRun ? 'dry-run' : 'live',
    entryPoint: options.dryRun ? 'generateTuningSuggestionsPhase9DryRun' : 'generateTuningSuggestionsPhase9Live',
    processedThreads: rows.length,
    itemCount: suggestions.filter(row => row[1] !== 'no-suggestions').length,
    outcome: hadSuggestionRows ? 'suggestions-generated' : 'no-suggestions',
    notes: `rows-scanned=${rows.length}; lookback-rows=${CONFIG.tuningSuggestionLookbackRows || 500}; no-suggestion-row-appended=${suggestions.some(row => row[1] === 'no-suggestions') ? 'yes' : 'no'}`
  });

  return {
    mode: options.dryRun ? 'dry-run' : 'live',
    scannedRows: rows.length,
    suggestionCount: suggestions.filter(row => row[1] !== 'no-suggestions').length
  };
}

function pruneTuningSuggestionsQueuePhase10() {
  const sheet = getOrCreateTuningSuggestionsSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    logRunSummary_({
      runType: 'control-surface',
      mode: 'internal',
      entryPoint: 'pruneTuningSuggestionsQueuePhase10',
      processedThreads: 0,
      itemCount: 0,
      outcome: 'queue-empty',
      notes: 'No tuning suggestions rows to prune'
    });
    return { prunedCount: 0, retainedNoSuggestionsCount: 0 };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 11).getDisplayValues();
  let retainedNoSuggestionsCount = 0;
  let prunedCount = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const category = String(row[1] || '').trim().toLowerCase();
    const status = String(row[9] || '').trim().toLowerCase();
    const notes = String(row[10] || '').trim();

    if (category !== 'no-suggestions') {
      return;
    }

    if (retainedNoSuggestionsCount === 0 && (!status || status === 'new')) {
      retainedNoSuggestionsCount += 1;
      if (!notes.includes('queue-anchor')) {
        sheet.getRange(rowNumber, 11).setValue(notes ? `${notes}; queue-anchor` : 'queue-anchor');
      }
      return;
    }

    sheet.getRange(rowNumber, 10).setValue('skipped');
    if (!notes.includes('pruned duplicate no-suggestions row')) {
      sheet.getRange(rowNumber, 11).setValue(notes ? `${notes}; pruned duplicate no-suggestions row` : 'pruned duplicate no-suggestions row');
    }
    prunedCount += 1;
  });

  logRunSummary_({
    runType: 'control-surface',
    mode: 'internal',
    entryPoint: 'pruneTuningSuggestionsQueuePhase10',
    processedThreads: values.length,
    itemCount: prunedCount,
    outcome: prunedCount ? 'queue-pruned' : 'queue-already-clean',
    notes: `pruned=${prunedCount}; retained-no-suggestions=${retainedNoSuggestionsCount}`
  });

  return {
    prunedCount: prunedCount,
    retainedNoSuggestionsCount: retainedNoSuggestionsCount
  };
}

function readRecentDecisionRows_(maxRows) {
  const sheet = getOrCreateDecisionLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const effectiveMaxRows = Math.max(1, maxRows || 200);
  const startRow = Math.max(2, lastRow - (effectiveMaxRows - 1));
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 8).getValues();

  return values.map(row => ({
    timestamp: row[0],
    mode: String(row[1] || ''),
    threadId: String(row[2] || ''),
    from: String(row[3] || ''),
    subject: String(row[4] || ''),
    reason: String(row[5] || ''),
    appliedLabels: String(row[6] || ''),
    archived: String(row[7] || '')
  }));
}

function extractSenderKey_(from) {
  const normalized = String(from || '').toLowerCase();
  const match = normalized.match(/<([^>]+)>/);
  if (match && match[1]) return match[1];
  if (normalized.includes('@')) return normalized;
  return '';
}

function looksCommercialSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(sale|discount|offer|shop|gift|newsletter|promo|marketing|favor\?|geschenke|privoščite|limited edition|available now|coming soon|launch|out now|everyday essentials|najbolj priljubljeni izdelki|popular products|new arrivals|collection|up to [0-9]+%|% )/i.test(haystack);
}

function looksClearCommercialSenderSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(marketing@|newsletter@|promo|shop|store|music experience|narwal|warner music|substack)/i.test(haystack);
}

function looksStrongCommercialSuggestion_(entry, representative) {
  const haystack = `${entry.from}\n${representative.subject}\n${representative.reason}`.toLowerCase();
  if (looksClearCommercialSenderSuggestion_(entry)) return true;
  return /(news@news\.|club@|support@brandyourself|intersport|66north|conrad|warnerrecords|weekend vibe|shop now)/i.test(haystack);
}

function looksShippingSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(delivery|tracking|shipment|package|dostavi|express one|sendung|paket|paylivery|willhaben)/i.test(haystack);
}

function looksFinanceSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(invoice|receipt|billing|payment|rechnung|račun|kartice|card block|bank)/i.test(haystack);
}

function looksMarketplaceTransactionalSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(willhaben|paylivery|marketplace|classifieds)/i.test(haystack);
}

function looksServiceNotificationSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(myfritz|monthly report|monatlicher bericht|service report|device report|geräte|fritz|business profile|are you open on|zavarovalnica|obvestilo|insurance|account update|profile)/i.test(haystack);
}

function looksStrongServiceNotificationSuggestion_(entry, representative) {
  if (looksServiceNotificationSuggestion_(representative)) return true;
  const haystack = `${entry.from}\n${representative.subject}\n${representative.reason}`.toLowerCase();
  return /(security alert|status\.incident|families-noreply@google\.com|accounts\.google\.com|sparkassepay|important notice|pomembno obvestilo)/i.test(haystack);
}

function looksLowPriorityFyiSuggestion_(entry, representative, reviewCount) {
  if (reviewCount < 2 && !looksStrongLowPriorityFyiSuggestion_(entry, representative)) {
    return false;
  }

  const haystack = `${entry.from}\n${representative.subject}\n${representative.reason}`.toLowerCase();
  return /(ollama|openai|developer program|build better|now available|now supports|introducing|spotlight on|release|product update|feature update|roundup|digest)/i.test(haystack);
}

function looksStrongLowPriorityFyiSuggestion_(entry, representative) {
  const haystack = `${entry.from}\n${representative.subject}\n${representative.reason}`.toLowerCase();
  return /(hello@ollama\.com|newsletter|digest|spotlight on|roundup|weekly|daily|techcrunch|reuters|economist)/i.test(haystack);
}

function buildSuggestionNotes_(options, entry, reviewCount) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const seenModes = Object.keys(entry.modes || {}).join(', ') || mode;
  return `generated in ${mode} suggestion mode; review-count=${reviewCount}; seen-modes=${seenModes}`;
}

function formatTuningSuggestionTimestamp_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  return String(value || '').trim();
}

function isLikelyNewsIncludeCandidate_(entry, representative) {
  const haystack = buildNewsCandidateHaystack_(entry, representative);
  if (!haystack) return false;
  if (entry.newsCount > 0) return false;
  if (looksCommercialSuggestion_(representative) || looksStrongCommercialSuggestion_(entry, representative)) return false;
  if (looksShippingSuggestion_(representative) || looksFinanceSuggestion_(representative) || looksMarketplaceTransactionalSuggestion_(representative)) return false;
  if (looksServiceNotificationSuggestion_(representative) || looksStrongServiceNotificationSuggestion_(entry, representative)) return false;
  if (/(job alert|recruiting season|recommended jobs|companies are looking for candidates|messaging digest|kudos|liked your|notifications-noreply@linkedin\.com|mailrobot@mail\.xing\.com)/i.test(haystack)) return false;
  const strongSignal = /(newsletter|digest|roundup|daily|weekly|briefing|morning brief|evening brief|techcrunch|reuters|economist|financial times|ft\.com|bloomberg|the information|ted conferences via linkedin|via linkedin)/i.test(haystack);
  if (!strongSignal) return false;
  return entry.reviewCount >= 1 || /(newsletter|digest|roundup|daily|weekly)/i.test(haystack);
}

function isLikelyNewsExcludeCandidate_(entry, representative) {
  const haystack = buildNewsCandidateHaystack_(entry, representative);
  if (!haystack) return false;
  return /(messaging digest|job alert|recruiting season|recommended jobs|companies are looking for candidates|kudos|liked your|notifications-noreply@linkedin\.com|mailrobot@mail\.xing\.com)/i.test(haystack);
}

function buildNewsCandidateHaystack_(entry, representative) {
  return `${entry.from || ''}\n${entry.sender || ''}\n${representative.subject || entry.subject || ''}\n${representative.reason || entry.reason || ''}`.toLowerCase();
}

function buildNewsSourceCandidateResult_(entry, representative, action, alreadyNews, alreadyExcluded) {
  return {
    sender: entry.sender,
    proposedAction: action,
    reviewCount: entry.reviewCount,
    newsCount: entry.newsCount,
    totalCount: entry.totalCount,
    exampleSubject: representative.subject || entry.subject || '',
    exampleReason: representative.reason || entry.reason || '',
    alreadyNews: alreadyNews,
    alreadyExcluded: alreadyExcluded
  };
}

function isSenderCoveredByRuntimeOverride_(senderKey) {
  if (!senderKey) return false;
  return containsAny_(senderKey, CONFIG.forceCommercialSenders || []) ||
    containsAny_(senderKey, CONFIG.forceImportantSenders || []) ||
    containsAny_(senderKey, CONFIG.forceShippingSenders || []) ||
    containsAny_(senderKey, CONFIG.forceFyiSenders || []) ||
    containsAny_(senderKey, CONFIG.forceReviewSenders || []);
}

function isSenderAlreadyCoveredByApprovedRules_(senderKey, approvedRules) {
  if (!senderKey) return false;
  const normalized = String(senderKey || '').trim().toLowerCase();
  return (approvedRules || []).some(rule => {
    if (!isAffirmativeFlag_(rule.approved)) return false;
    const target = String(rule.target || '').trim().toLowerCase();
    if (!target) return false;
    return normalized === target || normalized.endsWith(`@${target}`) || normalized.endsWith(`.${target}`) || normalized.includes(target);
  });
}

function isReviewLabelSet_(labels) {
  const normalized = String(labels || '').trim();
  return normalized === 'Review/Ambiguous' || normalized === 'Review/Ambiguous, 2: FYI';
}

function countReviewLabelRows_(labelCounts) {
  const counts = labelCounts || {};
  return Number(counts['Review/Ambiguous'] || 0) + Number(counts['Review/Ambiguous, 2: FYI'] || 0);
}

function buildTuningSuggestionRow_(entry) {
  return [[
    new Date(),
    entry.category || '',
    entry.suggestedChange || '',
    entry.target || '',
    entry.evidenceCount === undefined ? '' : entry.evidenceCount,
    entry.confidence || '',
    entry.exampleFrom || '',
    entry.exampleSubject || '',
    entry.reason || '',
    'new',
    entry.notes || ''
  ]][0];
}

function shouldAppendNoSuggestionsRow_() {
  const sheet = getOrCreateTuningSuggestionsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return true;

  const scanCount = Math.min(25, lastRow - 1);
  const values = sheet.getRange(lastRow - scanCount + 1, 2, scanCount, 10).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const row = values[i];
    const category = String(row[0] || '').trim().toLowerCase();
    const status = String(row[8] || '').trim().toLowerCase();
    if (category === 'no-suggestions' && (!status || status === 'new')) {
      return false;
    }
  }

  return true;
}

function flushTuningSuggestionsDeduped_(rows) {
  if (!rows.length) return;

  const filtered = rows.filter(row => {
    if (String(row[1] || '').trim().toLowerCase() !== 'no-suggestions') return true;
    return shouldAppendNoSuggestionsRow_();
  });

  if (!filtered.length) return;
  flushTuningSuggestions_(filtered);
}
