function classifyThread_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const haystack = `${from} ${subject}`;

  if (labels.some(name => CONFIG.preserveLabels.includes(name))) {
    return { action: 'preserve', reason: 'preserve label present' };
  }

  if (/substack|newsletter|digest|tldr|reuters/.test(haystack)) {
    return { action: 'label', label: CONFIG.labels.commercialNewsletters, archive: true, reason: 'newsletter pattern' };
  }

  if (/sale|discount|deal|% off|shop now|wishlist is now on sale/.test(haystack)) {
    return { action: 'label', label: CONFIG.labels.commercialAds, archive: true, reason: 'ad pattern' };
  }

  if (/bandsintown|ticketmaster|netflix|event|tour|launch/.test(haystack)) {
    return { action: 'label', label: CONFIG.labels.commercialCampaigns, archive: true, reason: 'campaign pattern' };
  }

  if (/invoice|payment|receipt|statement|bill/.test(haystack)) {
    return { action: 'label', label: CONFIG.labels.importantFinance, archive: false, reason: 'finance pattern' };
  }

  if (/tracking|shipped|delivered|customs|package/.test(haystack)) {
    return { action: 'label', label: CONFIG.labels.importantShipping, archive: false, reason: 'shipping pattern' };
  }

  return { action: 'review', label: CONFIG.labels.review, archive: false, reason: 'no confident rule match' };
}
