function classifyThread_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const subjectHaystack = `${from}\n${subject}`;
  const workflowHaystack = `${from}\n${subject}\n${((lastMessage && lastMessage.getPlainBody()) || '').slice(0, 1200).toLowerCase()}`;

  if (hasAnyLabel_(labels, CONFIG.preserveLabels) || hasAnyLabel_(labels, CONFIG.preserveSystemLabels)) {
    return buildDecision_('preserve', null, false, 'preserve label present', null);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceReviewSenders)) {
    return buildDecision_('label', CONFIG.labels.review, false, 'forced review sender override', CONFIG.labels.fyi);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceImportantSenders)) {
    return classifyForcedImportant_(subjectHaystack, workflowHaystack);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceCalendarSenders) || matchesAny_(subjectHaystack, CONFIG.calendarPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantCalendar, false, containsAny_(subjectHaystack, CONFIG.forceCalendarSenders) ? 'forced calendar sender override' : 'calendar pattern', CONFIG.labels.toRespond);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceShippingSenders) || matchesAny_(subjectHaystack, CONFIG.shippingPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantShipping, false, containsAny_(subjectHaystack, CONFIG.forceShippingSenders) ? 'forced shipping sender override' : 'shipping pattern', CONFIG.labels.notification);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceCommercialSenders)) {
    return classifyForcedCommercial_(subjectHaystack);
  }

  if (isNewsThread_(from, subjectHaystack)) {
    return buildDecision_('label', CONFIG.labels.newsDigest, false, 'news pattern', CONFIG.newsWorkflowLabel || CONFIG.labels.fyi);
  }

  if (containsAny_(subjectHaystack, CONFIG.forceFyiSenders || [])) {
    return buildDecision_('label', CONFIG.labels.fyi, false, 'forced FYI sender override', null);
  }

  if (matchesAny_(subjectHaystack, CONFIG.financePatterns)) {
    return buildDecision_('label', CONFIG.labels.importantFinance, false, 'finance pattern', CONFIG.labels.notification);
  }

  if (matchesAny_(subjectHaystack, CONFIG.opportunityResponsePatterns)) {
    return buildDecision_('label', CONFIG.labels.importantOpportunities, false, 'opportunity response pattern', CONFIG.labels.toRespond);
  }

  if (isOpportunitySender_(from) || matchesAny_(subjectHaystack, CONFIG.opportunityPatterns)) {
    return buildDecision_('label', CONFIG.labels.importantOpportunities, false, 'opportunity pattern', inferOpportunityWorkflowLabel_(from, subjectHaystack));
  }

  if (containsAny_(subjectHaystack, CONFIG.neverArchiveSenders)) {
    return buildDecision_('label', CONFIG.labels.importantServices, false, 'important sender/domain', inferWorkflowLabel_(workflowHaystack) || CONFIG.labels.notification);
  }

  if (matchesAny_(subjectHaystack, CONFIG.newsletterPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialNewsletters, true, 'newsletter pattern', null);
  }

  if (matchesAny_(subjectHaystack, CONFIG.adPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialAds, true, 'ad pattern', null);
  }

  if (matchesAny_(subjectHaystack, CONFIG.campaignPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialCampaigns, true, 'campaign pattern', null);
  }

  if (labels.includes('CATEGORY_PROMOTIONS')) {
    return buildDecision_('label', CONFIG.labels.commercialAds, true, 'gmail promotions category fallback', null);
  }

  return buildDecision_('label', CONFIG.labels.review, false, 'no confident rule match', inferWorkflowLabel_(workflowHaystack) || CONFIG.labels.fyi);
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

function inferOpportunityWorkflowLabel_(from, subjectHaystack) {
  if (containsAny_(from, CONFIG.opportunityFyiSenders)) {
    return CONFIG.labels.fyi;
  }

  if (matchesAny_(subjectHaystack, CONFIG.opportunityResponsePatterns)) {
    return CONFIG.labels.toRespond;
  }

  return CONFIG.labels.toRespond;
}

function classifyForcedImportant_(subjectHaystack, workflowHaystack) {
  if (matchesAny_(subjectHaystack, CONFIG.financePatterns)) {
    return buildDecision_('label', CONFIG.labels.importantFinance, false, 'forced important sender override', CONFIG.labels.notification);
  }

  return buildDecision_('label', CONFIG.labels.importantServices, false, 'forced important sender override', inferWorkflowLabel_(workflowHaystack) || CONFIG.labels.notification);
}

function classifyForcedCommercial_(subjectHaystack) {
  if (matchesAny_(subjectHaystack, CONFIG.campaignPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialCampaigns, true, 'forced commercial sender override', null);
  }

  if (matchesAny_(subjectHaystack, CONFIG.adPatterns)) {
    return buildDecision_('label', CONFIG.labels.commercialAds, true, 'forced commercial sender override', null);
  }

  return buildDecision_('label', CONFIG.labels.commercialNewsletters, true, 'forced commercial sender override', null);
}

function isOpportunitySender_(from) {
  return [
    'jobs@mail.xing.com',
    'jobs-noreply@linkedin.com',
    'jobalerts-noreply@linkedin.com',
    'news@email.experteer.com',
    'job.karriere.at',
    'experteer',
    'recruit',
    'headhunter',
    'a1.at'
  ].some(snippet => from.includes(snippet));
}

function isNewsThread_(from, subjectHaystack) {
  if (containsAny_(from, CONFIG.newsExcludedSenders || [])) {
    return false;
  }

  return containsAny_(from, CONFIG.newsSenders || []) || matchesAny_(subjectHaystack, CONFIG.newsPatterns || []);
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
  return snippets.some(snippet => text && text.includes(snippet));
}

function hasAnyLabel_(labels, expected) {
  return expected.some(name => labels.includes(name));
}
