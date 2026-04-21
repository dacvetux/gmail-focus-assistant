function classifyThread_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const haystack = `${from} ${subject}`;

  if (hasAnyLabel_(labels, CONFIG.preserveLabels) || hasAnyLabel_(labels, CONFIG.preserveSystemLabels)) {
    return { action: 'preserve', reason: 'preserve label present' };
  }

  if (matchesAny_(haystack, CONFIG.financePatterns)) {
    return { action: 'label', label: CONFIG.labels.importantFinance, archive: false, reason: 'finance pattern' };
  }

  if (matchesAny_(haystack, CONFIG.shippingPatterns)) {
    return { action: 'label', label: CONFIG.labels.importantShipping, archive: false, reason: 'shipping pattern' };
  }

  if (matchesAny_(haystack, CONFIG.calendarPatterns)) {
    return { action: 'label', label: CONFIG.labels.importantCalendar, archive: false, reason: 'calendar pattern' };
  }

  if (matchesAny_(haystack, CONFIG.opportunityPatterns)) {
    return { action: 'label', label: CONFIG.labels.importantOpportunities, archive: false, reason: 'opportunity pattern' };
  }

  if (containsAny_(haystack, CONFIG.neverArchiveSenders)) {
    return { action: 'label', label: CONFIG.labels.importantServices, archive: false, reason: 'important sender/domain' };
  }

  if (matchesAny_(haystack, CONFIG.newsletterPatterns)) {
    return { action: 'label', label: CONFIG.labels.commercialNewsletters, archive: true, reason: 'newsletter pattern' };
  }

  if (matchesAny_(haystack, CONFIG.adPatterns)) {
    return { action: 'label', label: CONFIG.labels.commercialAds, archive: true, reason: 'ad pattern' };
  }

  if (matchesAny_(haystack, CONFIG.campaignPatterns)) {
    return { action: 'label', label: CONFIG.labels.commercialCampaigns, archive: true, reason: 'campaign pattern' };
  }

  if (labels.includes('CATEGORY_PROMOTIONS')) {
    return { action: 'label', label: CONFIG.labels.commercialAds, archive: true, reason: 'gmail promotions category fallback' };
  }

  return { action: 'label', label: CONFIG.labels.review, archive: false, reason: 'no confident rule match' };
}

function matchesAny_(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function containsAny_(text, snippets) {
  return snippets.some(snippet => text.includes(snippet));
}

function hasAnyLabel_(labels, expected) {
  return expected.some(name => labels.includes(name));
}
