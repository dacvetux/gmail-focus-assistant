function buildDigestSummary_(items) {
  return items.map(item => `- [${item.label || 'Unlabeled'}] ${item.from}: ${item.subject}`).join('\n');
}
