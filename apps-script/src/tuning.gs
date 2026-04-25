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
  const rows = readRecentDecisionRows_();
  const suggestions = [];
  const bySender = new Map();

  rows.forEach(row => {
    const from = (row.from || '').trim();
    const subject = (row.subject || '').trim();
    const reason = (row.reason || '').trim();
    const labels = (row.appliedLabels || '').trim();
    const archived = (row.archived || '').trim();
    const senderKey = extractSenderKey_(from);
    if (!senderKey) return;

    if (!bySender.has(senderKey)) {
      bySender.set(senderKey, {
        count: 0,
        from,
        subject,
        labels,
        reason,
        archived
      });
    }

    const entry = bySender.get(senderKey);
    entry.count += 1;
    if (!entry.subject && subject) entry.subject = subject;
    if (!entry.labels && labels) entry.labels = labels;
    if (!entry.reason && reason) entry.reason = reason;
    if (!entry.from && from) entry.from = from;
    if (!entry.archived && archived) entry.archived = archived;
  });

  bySender.forEach((entry, senderKey) => {
    if (
      entry.count >= 2 &&
      entry.labels === 'Review/Ambiguous, 2: FYI' &&
      looksCommercialSuggestion_(entry)
    ) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'commercial-override-candidate',
        suggestedChange: 'add to forceCommercialSenders',
        target: senderKey,
        evidenceCount: entry.count,
        confidence: 'medium',
        exampleFrom: entry.from,
        exampleSubject: entry.subject,
        reason: entry.reason || 'repeated review-bucket commercial-looking mail',
        notes: options.dryRun ? 'generated in dry-run suggestion mode' : 'generated in live suggestion mode'
      }));
      return;
    }

    if (
      entry.count >= 1 &&
      entry.labels === 'Review/Ambiguous, 2: FYI' &&
      looksShippingSuggestion_(entry)
    ) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'shipping-pattern-candidate',
        suggestedChange: 'promote to shipping/notification handling',
        target: senderKey,
        evidenceCount: entry.count,
        confidence: 'medium',
        exampleFrom: entry.from,
        exampleSubject: entry.subject,
        reason: entry.reason || 'shipping-like mail still landing in review',
        notes: 'check forceShippingSenders or shippingPatterns'
      }));
      return;
    }

    if (
      entry.count >= 1 &&
      entry.labels === 'Review/Ambiguous, 2: FYI' &&
      looksFinanceSuggestion_(entry)
    ) {
      suggestions.push(buildTuningSuggestionRow_({
        category: 'finance-pattern-candidate',
        suggestedChange: 'promote to finance/notification handling',
        target: senderKey,
        evidenceCount: entry.count,
        confidence: 'medium',
        exampleFrom: entry.from,
        exampleSubject: entry.subject,
        reason: entry.reason || 'finance-like mail still landing in review',
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
    notes: `rows-scanned=${rows.length}`
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
  return /(sale|discount|offer|shop|gift|newsletter|promo|marketing|favor\?|geschenke|privoščite)/i.test(haystack);
}

function looksShippingSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(delivery|tracking|shipment|package|dostavi|express one|sendung|paket)/i.test(haystack);
}

function looksFinanceSuggestion_(entry) {
  const haystack = `${entry.from}\n${entry.subject}`.toLowerCase();
  return /(invoice|receipt|billing|payment|račun|kartice|card block|bank)/i.test(haystack);
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
