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

function generateTuningSuggestionsPhase9_(options) {
  const rows = readRecentDecisionRows_(CONFIG.tuningSuggestionLookbackRows || 500);
  const suggestions = [];
  const bySender = new Map();

  rows.forEach(row => {
    const from = (row.from || '').trim();
    const subject = (row.subject || '').trim();
    const reason = (row.reason || '').trim();
    const labels = (row.appliedLabels || '').trim();
    const archived = (row.archived || '').trim();
    const timestamp = (row.timestamp || '').trim();
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

    if (labels === 'Review/Ambiguous, 2: FYI' && entry.reviewExamples.length < 3) {
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
    const reviewCount = entry.labelCounts['Review/Ambiguous, 2: FYI'] || 0;
    const representative = entry.reviewExamples[0] || entry;

    if (!reviewCount) {
      return;
    }

    if (
      (reviewCount >= 2 || looksClearCommercialSenderSuggestion_(entry)) &&
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

    if (looksServiceNotificationSuggestion_(representative)) {
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

  if (!suggestions.length) {
    suggestions.push(buildTuningSuggestionRow_({
      category: 'no-suggestions',
      suggestedChange: 'none',
      target: '',
      evidenceCount: 0,
      confidence: 'low',
      exampleFrom: '',
      exampleSubject: '',
      reason: 'No suggestion candidates found in recent decision rows.',
      notes: ''
    }));
  }

  flushTuningSuggestions_(suggestions);

  logRunSummary_({
    runType: 'tuning-suggestions',
    mode: options.dryRun ? 'dry-run' : 'live',
    entryPoint: options.dryRun ? 'generateTuningSuggestionsPhase9DryRun' : 'generateTuningSuggestionsPhase9Live',
    processedThreads: rows.length,
    itemCount: suggestions.filter(row => row[1] !== 'no-suggestions').length,
    outcome: suggestions[0][1] === 'no-suggestions' ? 'no-suggestions' : 'suggestions-generated',
    notes: `rows-scanned=${rows.length}; lookback-rows=${CONFIG.tuningSuggestionLookbackRows || 500}`
  });

  return {
    mode: options.dryRun ? 'dry-run' : 'live',
    scannedRows: rows.length,
    suggestionCount: suggestions.filter(row => row[1] !== 'no-suggestions').length
  };
}

function readRecentDecisionRows_(maxRows) {
  const sheet = getOrCreateDecisionLogSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const effectiveMaxRows = Math.max(1, maxRows || 200);
  const startRow = Math.max(2, lastRow - (effectiveMaxRows - 1));
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 8).getDisplayValues();

  return values.map(row => ({
    timestamp: row[0],
    mode: row[1],
    threadId: row[2],
    from: row[3],
    subject: row[4],
    reason: row[5],
    appliedLabels: row[6],
    archived: row[7]
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
  return /(sale|discount|offer|shop|gift|newsletter|promo|marketing|favor\?|geschenke|privoščite|limited edition|available now|coming soon|launch|out now)/i.test(haystack);
}

function looksClearCommercialSenderSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(marketing@|newsletter@|promo|shop|store|music experience|narwal|warner music|substack)/i.test(haystack);
}

function looksShippingSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(delivery|tracking|shipment|package|dostavi|express one|sendung|paket)/i.test(haystack);
}

function looksFinanceSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(invoice|receipt|billing|payment|rechnung|buchung|račun|kartice|card block|bank|paylivery)/i.test(haystack);
}

function looksServiceNotificationSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(myfritz|monthly report|monatlicher bericht|service report|device report|geräte|fritz|business profile|are you open on|zavarovalnica|obvestilo|insurance|account update|profile)/i.test(haystack);
}

function looksLowPriorityFyiSuggestion_(entry, representative, reviewCount) {
  if (reviewCount < 2) {
    return false;
  }

  const haystack = `${entry.from}\n${representative.subject}\n${representative.reason}`.toLowerCase();
  return /(ollama|openai|developer program|build better|now available|now supports|introducing|spotlight on|release|product update|feature update|roundup|digest)/i.test(haystack);
}

function buildSuggestionNotes_(options, entry, reviewCount) {
  const mode = options.dryRun ? 'dry-run' : 'live';
  const seenModes = Object.keys(entry.modes || {}).join(', ') || mode;
  return `generated in ${mode} suggestion mode; review-count=${reviewCount}; seen-modes=${seenModes}`;
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
