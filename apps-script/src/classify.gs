function classifyThread_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const snippet = ((lastMessage && lastMessage.getPlainBody()) || '').slice(0, 2000).toLowerCase();
  const haystack = `${from}\n${subject}\n${snippet}`;

  if (hasAnyLabel_(labels, CONFIG.preserveLabels) || hasAnyLabel_(labels, CONFIG.preserveSystemLabels)) {
    return buildDecision_('preserve', null, false, 'preserve label present', null);
  }

  if (matchesAny_(haystack, CONFIG.financePatterns)) {
    return buildDecision_('label', CONFIG.labels.importantFinance, false, 'finance pattern', CONFIG.labels.notification);
  }

  if (matchesAny_(haystack, CONFIG.shippingPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantShipping, false, 'shipping pattern', CONFIG.labels.notification);
  }

  if (matchesAny_(haystack, CONFIG.calendarPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantCalendar, false, 'calendar pattern', CONFIG.labels.toRespond);
  }

  if (matchesAny_(haystack, CONFIG.opportunityPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantOpportunities, false, 'opportunity pattern', CONFIG.labels.fyi);
  }

  if (containsAny_(haystack, CONFIG.neverArchiveSenders)) {
    return buildDecision_('label', CONFIG.labels.importantServices, false, 'important sender/domain', inferWorkflowLabel_(haystack));
  }

  if (matchesAny_(haystack, CONFIG.newsletterPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialNewsletters, true, 'newsletter pattern', null);
  }

  if (matchesAny_(haystack, CONFIG.adPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialAds, true, 'ad pattern', null);
  }

  if (matchesAny_(haystack, CONFIG.campaignPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialCampaigns, true, 'campaign pattern', null);
  }

  if (labels.includes('CATEGORY_PROMOTIONS')) {
    return buildDecision_('label', CONFIG.labels.commercialAds, true, 'gmail promotions category fallback', null);
  }

  return buildDecision_('label', CONFIG.labels.review, false, 'no confident rule match', inferWorkflowLabel_(haystack) || CONFIG.labels.fyi);
}

function inferWorkflowLabel_(haystack) {
  if (matchesAny_(haystack, CONFIG.responsePatterns)) {
    return CONFIG.labels.toRespond;
  }

  if (matchesAny_(haystack, CONFIG.notificationPatterns)) {
    return CONFIG.labels.notification;
  }

  if (matchesAny_(haystack, CONFIG.fyiPatterns)) {
    return CONFIG.labels.fyi;
  }

  return null;
}

function buildDecision_(action, label, archive, reason, workflowLabel) {
  return {
    action: action,
    label: label,
    archive: archive,
    reason: reason,
    workflowLabel: workflowLabel || null
  };
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
