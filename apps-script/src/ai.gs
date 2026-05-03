function classifyWithAI_(thread) {
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = (lastMessage && lastMessage.getFrom()) || '';
  const subject = (lastMessage && lastMessage.getSubject()) || '';
  const body = ((lastMessage && lastMessage.getPlainBody()) || '').slice(0, CONFIG.aiMaxBodyChars || 2500);

  const prompt = [
    'You are classifying a Gmail thread for a rules-first inbox assistant.',
    'Return JSON only.',
    'Decide one structuralLabel from:',
    [
      CONFIG.labels.review,
      CONFIG.labels.importantServices,
      CONFIG.labels.importantFinance,
      CONFIG.labels.importantShipping,
      CONFIG.labels.importantCalendar,
      CONFIG.labels.importantOpportunities,
      CONFIG.labels.commercialNewsletters,
      CONFIG.labels.commercialAds,
      CONFIG.labels.commercialCampaigns
    ].join(', '),
    'Decide one workflowLabel from:',
    [CONFIG.labels.toRespond, CONFIG.labels.fyi, CONFIG.labels.notification].join(', '),
    'Workflow label may be omitted/null for purely ambiguous review items.',
    'Use FYI only for intentionally informational mail; do not use FYI just because something is ambiguous.',
    'Return keys: structuralLabel, workflowLabel, archive, confidence, reason.',
    'Use archive=true only for clearly commercial non-essential mail.',
    'If uncertain, prefer Review/Ambiguous with no workflowLabel and archive=false.',
    '',
    `From: ${from}`,
    `Subject: ${subject}`,
    'Body:',
    body
  ].join('\n');

  try {
    const raw = callGeminiJson_(prompt);
    const parsed = JSON.parse(raw);
    const structuralLabel = sanitizeAiStructuralLabel_(parsed.structuralLabel);
    const workflowLabel = normalizeAiWorkflowLabel_(structuralLabel, parsed.workflowLabel);
    const archive = Boolean(parsed.archive) && isCommercialLabel_(structuralLabel);
    const confidence = normalizeAiConfidence_(parsed.confidence);
    const reason = parsed.reason ? String(parsed.reason).slice(0, 240) : 'ai classification';

    return {
      action: 'label',
      label: structuralLabel,
      workflowLabel: workflowLabel,
      archive: archive,
      reason: `ai suggestion: ${reason}`,
      aiConfidence: confidence
    };
  } catch (error) {
    return {
      action: 'label',
      label: CONFIG.labels.review,
      workflowLabel: null,
      archive: false,
      reason: `ai fallback: ${error.message}`,
      aiConfidence: null
    };
  }
}

function generateAiRecommendationsPhase11() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const candidateSummary = buildPhase11AiRecommendationCandidates_(6);

  if (!candidateSummary.candidates.length) {
    logRunSummary_({
      runType: 'ai-assist',
      mode: 'internal',
      entryPoint: 'generateAiRecommendationsPhase11',
      processedThreads: candidateSummary.scannedRows,
      itemCount: 0,
      outcome: 'phase11-ai-no-candidates',
      notes: `scanned=${candidateSummary.scannedRows}; lookback=${candidateSummary.lookbackRows}`
    });

    return {
      scannedRows: candidateSummary.scannedRows,
      lookbackRows: candidateSummary.lookbackRows,
      candidateCount: 0,
      writtenCount: 0,
      recommendations: []
    };
  }

  const prompt = buildPhase11AiRecommendationsPrompt_(candidateSummary.candidates);
  const raw = callGeminiJson_(prompt);
  const parsed = JSON.parse(raw);
  const normalizedRecommendations = sanitizePhase11AiRecommendations_(parsed && parsed.recommendations, candidateSummary.candidates);
  const rows = normalizedRecommendations.map(entry => buildAiRecommendationRow_(entry, 'generateAiRecommendationsPhase11'));
  const flushSummary = flushAiRecommendations_(rows);

  logRunSummary_({
    runType: 'ai-assist',
    mode: 'internal',
    entryPoint: 'generateAiRecommendationsPhase11',
    processedThreads: candidateSummary.scannedRows,
    itemCount: flushSummary.insertedCount + flushSummary.refreshedCount,
    outcome: normalizedRecommendations.length
      ? (flushSummary.insertedCount ? 'phase11-ai-recommendations-written' : 'phase11-ai-recommendations-refreshed')
      : 'phase11-ai-empty-output',
    notes: `candidates=${candidateSummary.candidates.length}; inserted=${flushSummary.insertedCount}; refreshed=${flushSummary.refreshedCount}; skipped=${flushSummary.skippedCount}; model-output=${normalizedRecommendations.length}; lookback=${candidateSummary.lookbackRows}`
  });

  return {
    scannedRows: candidateSummary.scannedRows,
    lookbackRows: candidateSummary.lookbackRows,
    candidateCount: candidateSummary.candidates.length,
    writtenCount: flushSummary.insertedCount,
    refreshedCount: flushSummary.refreshedCount,
    recommendations: normalizedRecommendations
  };
}

function generateAiNewsSourceRecommendationsPhase11() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const candidateSummary = buildPhase11AiNewsSourceCandidates_(6);

  if (!candidateSummary.candidates.length) {
    logRunSummary_({
      runType: 'ai-assist',
      mode: 'internal',
      entryPoint: 'generateAiNewsSourceRecommendationsPhase11',
      processedThreads: candidateSummary.scannedRows,
      itemCount: 0,
      outcome: 'phase11-ai-news-no-candidates',
      notes: `scanned=${candidateSummary.scannedRows}; include=${candidateSummary.includeCount}; exclude=${candidateSummary.excludeCount}`
    });

    return {
      scannedRows: candidateSummary.scannedRows,
      candidateCount: 0,
      writtenCount: 0,
      recommendations: []
    };
  }

  const prompt = buildPhase11AiNewsRecommendationsPrompt_(candidateSummary.candidates);
  const raw = callGeminiJson_(prompt);
  const parsed = JSON.parse(raw);
  const normalizedRecommendations = sanitizePhase11AiNewsRecommendations_(parsed && parsed.recommendations, candidateSummary.candidates);
  const rows = normalizedRecommendations.map(entry => buildAiRecommendationRow_(entry, 'generateAiNewsSourceRecommendationsPhase11'));
  const flushSummary = flushAiRecommendations_(rows);

  logRunSummary_({
    runType: 'ai-assist',
    mode: 'internal',
    entryPoint: 'generateAiNewsSourceRecommendationsPhase11',
    processedThreads: candidateSummary.scannedRows,
    itemCount: flushSummary.insertedCount + flushSummary.refreshedCount,
    outcome: normalizedRecommendations.length
      ? (flushSummary.insertedCount ? 'phase11-ai-news-written' : 'phase11-ai-news-refreshed')
      : 'phase11-ai-news-empty-output',
    notes: `candidates=${candidateSummary.candidates.length}; inserted=${flushSummary.insertedCount}; refreshed=${flushSummary.refreshedCount}; skipped=${flushSummary.skippedCount}; include=${candidateSummary.includeCount}; exclude=${candidateSummary.excludeCount}`
  });

  return {
    scannedRows: candidateSummary.scannedRows,
    candidateCount: candidateSummary.candidates.length,
    writtenCount: flushSummary.insertedCount,
    refreshedCount: flushSummary.refreshedCount,
    recommendations: normalizedRecommendations
  };
}

function generateAiWorkflowRecommendationsPhase11() {
  refreshConfigFromPreferencesPhase10_({ suppressLog: true });
  const candidateSummary = buildPhase11AiWorkflowCandidates_(6);

  if (!candidateSummary.candidates.length) {
    logRunSummary_({
      runType: 'ai-assist',
      mode: 'internal',
      entryPoint: 'generateAiWorkflowRecommendationsPhase11',
      processedThreads: candidateSummary.scannedRows,
      itemCount: 0,
      outcome: 'phase11-ai-workflow-no-candidates',
      notes: `scanned=${candidateSummary.scannedRows}; lookback=${candidateSummary.lookbackRows}`
    });

    return {
      scannedRows: candidateSummary.scannedRows,
      lookbackRows: candidateSummary.lookbackRows,
      candidateCount: 0,
      writtenCount: 0,
      recommendations: []
    };
  }

  const prompt = buildPhase11AiWorkflowRecommendationsPrompt_(candidateSummary.candidates);
  const raw = callGeminiJson_(prompt);
  const parsed = JSON.parse(raw);
  const normalizedRecommendations = sanitizePhase11AiWorkflowRecommendations_(parsed && parsed.recommendations, candidateSummary.candidates);
  const rows = normalizedRecommendations.map(entry => buildAiRecommendationRow_(entry, 'generateAiWorkflowRecommendationsPhase11'));
  const flushSummary = flushAiRecommendations_(rows);

  logRunSummary_({
    runType: 'ai-assist',
    mode: 'internal',
    entryPoint: 'generateAiWorkflowRecommendationsPhase11',
    processedThreads: candidateSummary.scannedRows,
    itemCount: flushSummary.insertedCount + flushSummary.refreshedCount,
    outcome: normalizedRecommendations.length
      ? (flushSummary.insertedCount ? 'phase11-ai-workflow-written' : 'phase11-ai-workflow-refreshed')
      : 'phase11-ai-workflow-empty-output',
    notes: `candidates=${candidateSummary.candidates.length}; inserted=${flushSummary.insertedCount}; refreshed=${flushSummary.refreshedCount}; skipped=${flushSummary.skippedCount}; lookback=${candidateSummary.lookbackRows}`
  });

  return {
    scannedRows: candidateSummary.scannedRows,
    lookbackRows: candidateSummary.lookbackRows,
    candidateCount: candidateSummary.candidates.length,
    writtenCount: flushSummary.insertedCount,
    refreshedCount: flushSummary.refreshedCount,
    recommendations: normalizedRecommendations
  };
}

function buildPhase11AiRecommendationCandidates_(maxCandidates) {
  const lookbackRows = CONFIG.tuningSuggestionLookbackRows || 500;
  const rows = readRecentDecisionRows_(lookbackRows);
  const approvedRules = readApprovedRules_();
  const newsConfig = readNewsSourceConfig_();
  const bySender = new Map();

  rows.forEach(row => {
    const senderKey = extractSenderKey_(row.from);
    if (!senderKey) return;

    if (!bySender.has(senderKey)) {
      bySender.set(senderKey, {
        sender: senderKey,
        totalCount: 0,
        reviewCount: 0,
        fyiCount: 0,
        notificationCount: 0,
        newsCount: 0,
        toRespondCount: 0,
        otherCount: 0,
        examples: [],
        labelCounts: {},
        latestTimestamp: null
      });
    }

    const entry = bySender.get(senderKey);
    const labels = String(row.appliedLabels || '').trim();
    entry.totalCount += 1;
    entry.labelCounts[labels] = (entry.labelCounts[labels] || 0) + 1;
    if (isReviewLabelSet_(labels)) entry.reviewCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.fyi)) entry.fyiCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.notification)) entry.notificationCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.newsDigest)) entry.newsCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.toRespond)) entry.toRespondCount += 1;
    if (!labels) entry.otherCount += 1;

    if (row.timestamp instanceof Date && (!entry.latestTimestamp || entry.latestTimestamp.getTime() < row.timestamp.getTime())) {
      entry.latestTimestamp = row.timestamp;
    }

    if (entry.examples.length < 4) {
      entry.examples.push({
        from: String(row.from || '').trim(),
        subject: String(row.subject || '').trim(),
        reason: String(row.reason || '').trim(),
        labels: labels,
        archived: String(row.archived || '').trim(),
        timestamp: formatTuningSuggestionTimestamp_(row.timestamp)
      });
    }
  });

  const candidates = [];

  bySender.forEach(entry => {
    const representative = entry.examples[0] || {};
    const alreadyCoveredByRule = isSenderAlreadyCoveredByApprovedRules_(entry.sender, approvedRules);
    const alreadyCoveredByRuntime = isSenderCoveredByRuntimeOverride_(entry.sender);
    const alreadyNews = containsAny_(entry.sender, newsConfig.senders || []);
    const alreadyExcluded = containsAny_(entry.sender, newsConfig.excludedSenders || []);
    const mixedLabelFamilies = countNonZeroValues_([
      entry.reviewCount,
      entry.fyiCount,
      entry.notificationCount,
      entry.newsCount,
      entry.toRespondCount
    ]);
    const currentState = buildPhase11CandidateCurrentState_(entry, alreadyCoveredByRule, alreadyCoveredByRuntime, alreadyNews, alreadyExcluded);
    const looksNewsCandidate = isLikelyNewsIncludeCandidate_(entry, representative) || isLikelyNewsExcludeCandidate_(entry, representative);

    if (shouldIncludePhase11ReviewLeakCandidate_(entry, representative, {
      alreadyCoveredByRule: alreadyCoveredByRule,
      alreadyCoveredByRuntime: alreadyCoveredByRuntime,
      alreadyNews: alreadyNews,
      alreadyExcluded: alreadyExcluded,
      looksNewsCandidate: looksNewsCandidate
    })) {
      candidates.push({
        sender: entry.sender,
        candidateType: 'review-leak',
        evidenceCount: entry.reviewCount,
        currentState: currentState,
        sampleSubject: representative.subject || '',
        sampleReason: representative.reason || '',
        sampleLabels: representative.labels || '',
        examples: entry.examples,
        score: entry.reviewCount * 10 + mixedLabelFamilies
      });
    }

    if (shouldIncludePhase11WorkflowMixedCandidate_(entry, representative, mixedLabelFamilies, {
      alreadyCoveredByRuntime: alreadyCoveredByRuntime,
      alreadyNews: alreadyNews,
      alreadyExcluded: alreadyExcluded,
      looksNewsCandidate: looksNewsCandidate
    })) {
      candidates.push({
        sender: entry.sender,
        candidateType: 'workflow-mixed',
        evidenceCount: entry.totalCount,
        currentState: currentState,
        sampleSubject: representative.subject || '',
        sampleReason: representative.reason || '',
        sampleLabels: representative.labels || '',
        examples: entry.examples,
        score: mixedLabelFamilies * 5 + entry.totalCount + entry.reviewCount * 3
      });
    }
  });

  const deduped = [];
  const seenSenders = new Set();
  candidates
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0) || String(left.sender || '').localeCompare(String(right.sender || '')))
    .forEach(candidate => {
      if (seenSenders.has(candidate.sender)) return;
      seenSenders.add(candidate.sender);
      deduped.push(candidate);
    });

  return {
    scannedRows: rows.length,
    lookbackRows: lookbackRows,
    candidates: deduped.slice(0, maxCandidates || 6)
  };
}

function buildPhase11AiNewsSourceCandidates_(maxCandidates) {
  const summary = inspectNewsSourceCandidatesPhase10();
  const includeCandidates = (summary.includeCandidates || []).map(candidate => ({
    sender: String(candidate.sender || '').trim().toLowerCase(),
    candidateType: 'news-source-include',
    evidenceCount: Number(candidate.reviewCount || candidate.totalCount || 0),
    currentState: buildPhase11NewsCurrentState_(candidate),
    sampleSubject: candidate.exampleSubject || '',
    sampleReason: candidate.exampleReason || '',
    sampleLabels: '',
    examples: [{
      subject: candidate.exampleSubject || '',
      reason: candidate.exampleReason || '',
      labels: ''
    }],
    score: Number(candidate.reviewCount || 0) * 8 + Number(candidate.totalCount || 0) * 2,
    proposedActionHint: 'newsSenders'
  }));

  const excludeCandidates = (summary.excludeCandidates || []).map(candidate => ({
    sender: String(candidate.sender || '').trim().toLowerCase(),
    candidateType: 'news-source-exclude',
    evidenceCount: Number(candidate.newsCount || candidate.totalCount || 0),
    currentState: buildPhase11NewsCurrentState_(candidate),
    sampleSubject: candidate.exampleSubject || '',
    sampleReason: candidate.exampleReason || '',
    sampleLabels: '',
    examples: [{
      subject: candidate.exampleSubject || '',
      reason: candidate.exampleReason || '',
      labels: ''
    }],
    score: Number(candidate.newsCount || 0) * 8 + Number(candidate.totalCount || 0) * 2,
    proposedActionHint: 'newsExcludedSenders'
  }));

  const candidates = includeCandidates.concat(excludeCandidates)
    .filter(candidate => shouldIncludePhase11NewsCandidate_(candidate))
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0) || String(left.sender || '').localeCompare(String(right.sender || '')))
    .slice(0, maxCandidates || 6);

  return {
    scannedRows: Number(summary.scannedRows || 0),
    includeCount: includeCandidates.length,
    excludeCount: excludeCandidates.length,
    candidates: candidates
  };
}

function buildPhase11AiWorkflowCandidates_(maxCandidates) {
  const lookbackRows = CONFIG.tuningSuggestionLookbackRows || 500;
  const rows = readRecentDecisionRows_(lookbackRows);
  const newsConfig = readNewsSourceConfig_();
  const approvedRules = readApprovedRules_();
  const bySender = new Map();

  rows.forEach(row => {
    const senderKey = extractSenderKey_(row.from);
    if (!senderKey) return;

    if (!bySender.has(senderKey)) {
      bySender.set(senderKey, {
        sender: senderKey,
        totalCount: 0,
        reviewCount: 0,
        fyiCount: 0,
        notificationCount: 0,
        toRespondCount: 0,
        newsCount: 0,
        examples: []
      });
    }

    const entry = bySender.get(senderKey);
    const labels = String(row.appliedLabels || '').trim();
    entry.totalCount += 1;
    if (isReviewLabelSet_(labels)) entry.reviewCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.fyi)) entry.fyiCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.notification)) entry.notificationCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.toRespond)) entry.toRespondCount += 1;
    if (hasAppliedLabel_(labels, CONFIG.labels.newsDigest)) entry.newsCount += 1;

    if (entry.examples.length < 4) {
      entry.examples.push({
        from: String(row.from || '').trim(),
        subject: String(row.subject || '').trim(),
        reason: String(row.reason || '').trim(),
        labels: labels,
        archived: String(row.archived || '').trim(),
        timestamp: formatTuningSuggestionTimestamp_(row.timestamp)
      });
    }
  });

  const candidates = [];

  bySender.forEach(entry => {
    const representative = entry.examples[0] || {};
    const currentState = buildPhase11CandidateCurrentState_(
      entry,
      isSenderAlreadyCoveredByApprovedRules_(entry.sender, approvedRules),
      isSenderCoveredByRuntimeOverride_(entry.sender),
      containsAny_(entry.sender, newsConfig.senders || []),
      containsAny_(entry.sender, newsConfig.excludedSenders || [])
    );

    const workflowCandidate = inferPhase11WorkflowCandidate_(entry, representative);
    if (!workflowCandidate) return;
    if (shouldSuppressPhase11WorkflowSemanticsCandidate_(entry, representative)) return;

    candidates.push({
      sender: entry.sender,
      candidateType: workflowCandidate.candidateType,
      evidenceCount: workflowCandidate.evidenceCount,
      currentState: currentState,
      sampleSubject: representative.subject || '',
      sampleReason: representative.reason || '',
      sampleLabels: representative.labels || '',
      examples: entry.examples,
      score: workflowCandidate.score,
      proposedActionHint: workflowCandidate.proposedActionHint,
      workflowTargetHint: workflowCandidate.workflowTargetHint
    });
  });

  return {
    scannedRows: rows.length,
    lookbackRows: lookbackRows,
    candidates: candidates
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0) || String(left.sender || '').localeCompare(String(right.sender || '')))
      .slice(0, maxCandidates || 6)
  };
}

function buildPhase11CandidateCurrentState_(entry, alreadyCoveredByRule, alreadyCoveredByRuntime, alreadyNews, alreadyExcluded) {
  const flags = [];
  if (alreadyCoveredByRule) flags.push('approved-rule-covered');
  if (alreadyCoveredByRuntime) flags.push('runtime-covered');
  if (alreadyNews) flags.push('news-source');
  if (alreadyExcluded) flags.push('news-excluded');

  return [
    `review=${entry.reviewCount}`,
    `fyi=${entry.fyiCount}`,
    `notification=${entry.notificationCount}`,
    `news=${entry.newsCount}`,
    `toRespond=${entry.toRespondCount}`,
    flags.length ? `flags=${flags.join('|')}` : 'flags=none'
  ].join('; ');
}

function buildPhase11NewsCurrentState_(candidate) {
  const flags = [];
  if (candidate.alreadyNews) flags.push('news-source');
  if (candidate.alreadyExcluded) flags.push('news-excluded');

  return [
    `review=${Number(candidate.reviewCount || 0)}`,
    `news=${Number(candidate.newsCount || 0)}`,
    `total=${Number(candidate.totalCount || 0)}`,
    flags.length ? `flags=${flags.join('|')}` : 'flags=none'
  ].join('; ');
}

function shouldIncludePhase11ReviewLeakCandidate_(entry, representative, state) {
  const settings = state || {};
  if (!entry.reviewCount) return false;
  if (settings.alreadyCoveredByRule || settings.alreadyCoveredByRuntime) return false;
  if (settings.looksNewsCandidate || settings.alreadyNews || settings.alreadyExcluded) return false;
  if (looksSocialActivitySuggestion_(entry, representative)) return false;
  if (entry.reviewCount >= 2) return true;
  return looksStrongCommercialSuggestion_(entry, representative) ||
    looksStrongServiceNotificationSuggestion_(entry, representative) ||
    looksMarketplaceTransactionalSuggestion_(representative) ||
    looksFinanceSuggestion_(representative) ||
    looksShippingSuggestion_(representative);
}

function shouldIncludePhase11WorkflowMixedCandidate_(entry, representative, mixedLabelFamilies, state) {
  const settings = state || {};
  if (mixedLabelFamilies < 2 || entry.totalCount < 3) return false;
  if (settings.alreadyCoveredByRuntime) return false;
  if (settings.looksNewsCandidate || settings.alreadyNews || settings.alreadyExcluded) return false;
  if (looksSocialActivitySuggestion_(entry, representative)) return false;
  if (looksCommercialSuggestion_(representative) || looksStrongCommercialSuggestion_(entry, representative)) return false;
  return entry.reviewCount > 0 || entry.fyiCount > 0 || entry.notificationCount > 0;
}

function shouldIncludePhase11NewsCandidate_(candidate) {
  if (!candidate || !candidate.sender) return false;
  if ((candidate.candidateType === 'news-source-include' || candidate.candidateType === 'news-source-exclude') && Number(candidate.evidenceCount || 0) < 2) {
    return false;
  }
  return true;
}

function inferPhase11WorkflowCandidate_(entry, representative) {
  const reviewOnlyCount = Math.max(0, Number(entry.reviewCount || 0) - Number(entry.fyiCount || 0));
  const representativeWorkflow = inferWorkflowLabelFromExample_(entry, representative);

  if (representativeWorkflow === CONFIG.labels.fyi && reviewOnlyCount >= 2) {
    return {
      candidateType: 'workflow-fyi-candidate',
      evidenceCount: reviewOnlyCount,
      score: reviewOnlyCount * 9 + Number(entry.totalCount || 0),
      proposedActionHint: 'forceFyiSenders',
      workflowTargetHint: 'fyi'
    };
  }

  if (representativeWorkflow === CONFIG.labels.notification && reviewOnlyCount >= 2) {
    return {
      candidateType: 'workflow-notification-candidate',
      evidenceCount: reviewOnlyCount,
      score: reviewOnlyCount * 9 + Number(entry.totalCount || 0),
      proposedActionHint: 'prefer-notification',
      workflowTargetHint: 'notification'
    };
  }

  if (representativeWorkflow === CONFIG.labels.toRespond && reviewOnlyCount >= 2) {
    return {
      candidateType: 'workflow-to-respond-candidate',
      evidenceCount: reviewOnlyCount,
      score: reviewOnlyCount * 10 + Number(entry.totalCount || 0),
      proposedActionHint: 'prefer-to-respond',
      workflowTargetHint: 'to-respond'
    };
  }

  if (entry.totalCount >= 3) {
    const dominantWorkflow = inferDominantWorkflowState_(entry);
    if (dominantWorkflow && entry.reviewCount >= 1) {
      return {
        candidateType: 'workflow-mixed-semantics',
        evidenceCount: entry.totalCount,
        score: Number(entry.totalCount || 0) * 5 + Number(entry.reviewCount || 0) * 3,
        proposedActionHint: dominantWorkflow === CONFIG.labels.fyi
          ? 'forceFyiSenders'
          : dominantWorkflow === CONFIG.labels.notification
            ? 'prefer-notification'
            : 'prefer-to-respond',
        workflowTargetHint: normalizePhase11WorkflowHint_(dominantWorkflow)
      };
    }
  }

  return null;
}

function shouldSuppressPhase11WorkflowSemanticsCandidate_(entry, representative) {
  if (entry.newsCount > 0) return true;
  if (looksCommercialSuggestion_(representative) || looksStrongCommercialSuggestion_(entry, representative)) return true;
  if (isLikelyNewsIncludeCandidate_(entry, representative) || isLikelyNewsExcludeCandidate_(entry, representative)) return true;
  if (looksSocialActivitySuggestion_(entry, representative)) return true;
  return false;
}

function inferWorkflowLabelFromExample_(entry, representative) {
  const haystack = `${entry.sender || ''}\n${representative.subject || ''}\n${representative.reason || ''}`.toLowerCase();

  if (matchesAny_(haystack, CONFIG.responsePatterns) || /reply requested|action required|confirm|please respond|interview|meeting|availability/i.test(haystack)) {
    return CONFIG.labels.toRespond;
  }

  if (
    looksShippingSuggestion_(representative) ||
    looksFinanceSuggestion_(representative) ||
    looksMarketplaceTransactionalSuggestion_(representative) ||
    looksServiceNotificationSuggestion_(representative) ||
    looksStrongServiceNotificationSuggestion_(entry, representative) ||
    matchesAny_(haystack, CONFIG.notificationPatterns)
  ) {
    return CONFIG.labels.notification;
  }

  if (looksLowPriorityFyiSuggestion_(entry, representative, Number(entry.reviewCount || 0)) || matchesAny_(haystack, CONFIG.fyiPatterns)) {
    return CONFIG.labels.fyi;
  }

  return null;
}

function inferDominantWorkflowState_(entry) {
  const ranked = [
    { label: CONFIG.labels.toRespond, count: Number(entry.toRespondCount || 0) },
    { label: CONFIG.labels.notification, count: Number(entry.notificationCount || 0) },
    { label: CONFIG.labels.fyi, count: Number(entry.fyiCount || 0) }
  ].sort((left, right) => right.count - left.count);

  if (!ranked[0] || ranked[0].count < 2) return null;
  return ranked[0].label;
}

function normalizePhase11WorkflowHint_(label) {
  if (label === CONFIG.labels.toRespond) return 'to-respond';
  if (label === CONFIG.labels.notification) return 'notification';
  if (label === CONFIG.labels.fyi) return 'fyi';
  return 'review';
}

function looksSocialActivitySuggestion_(entry, representative) {
  const haystack = `${entry.sender || ''}\n${entry.examples && entry.examples[0] ? entry.examples[0].from || '' : ''}\n${representative.subject || ''}\n${representative.reason || ''}`.toLowerCase();
  return /(messages-noreply@linkedin\.com|notifications-noreply@linkedin\.com|news@mail\.xing\.com|noticed you|profile|messaging digest|kudos|followers|connections|network)/i.test(haystack);
}

function countNonZeroValues_(values) {
  return (values || []).filter(value => Number(value || 0) > 0).length;
}

function buildPhase11AiNewsRecommendationsPrompt_(candidates) {
  return [
    'You are helping a rules-first Gmail assistant operator review potential NewsSources changes.',
    'Return JSON only.',
    'Use this schema: {"recommendations":[{"sender":"...","candidateType":"...","proposedChange":"newsSenders|newsExcludedSenders|historical-reclassification-only|none","confidence":"high|medium|low","reasoning":"...","notes":"..."}]}',
    'Rules:',
    '- this is review-first only; do not mutate live behavior',
    '- choose newsSenders only for genuine curated news/newsletter sources worth putting into News/Digest',
    '- choose newsExcludedSenders only when something currently treated as news should stay out of News/Digest',
    '- choose historical-reclassification-only if the sender already seems configured correctly and the issue is mainly old mailbox state',
    '- choose none when the evidence is weak or mixed',
    '',
    'Candidates:',
    JSON.stringify(candidates, null, 2)
  ].join('\n');
}

function buildPhase11AiWorkflowRecommendationsPrompt_(candidates) {
  return [
    'You are helping a rules-first Gmail assistant operator review workflow-semantics drift for recurring senders.',
    'Return JSON only.',
    'Use this schema: {"recommendations":[{"sender":"...","candidateType":"...","proposedChange":"forceFyiSenders|prefer-notification|prefer-to-respond|keep-review|historical-reclassification-only|none","confidence":"high|medium|low","reasoning":"...","notes":"..."}]}',
    'Rules:',
    '- this is review-first only; do not mutate live behavior',
    '- use forceFyiSenders only for recurring low-priority informational mail that should reliably land in FYI',
    '- use prefer-notification for recurring service/status/transactional mail that should likely route with notification semantics',
    '- use prefer-to-respond for recurring mail where the operator likely wants response-oriented handling',
    '- use keep-review when review-only still looks correct and the sender should remain ambiguous',
    '- use historical-reclassification-only if the main issue seems to be older mailbox state rather than a future-rule change',
    '- use none when evidence is weak or mixed',
    '',
    'Candidates:',
    JSON.stringify(candidates, null, 2)
  ].join('\n');
}

function buildPhase11AiRecommendationsPrompt_(candidates) {
  return [
    'You are helping a rules-first Gmail assistant operator review potential Phase 11 AI recommendations.',
    'Return JSON only.',
    'Use this schema: {"recommendations":[{"sender":"...","candidateType":"...","proposedChange":"...","confidence":"high|medium|low","reasoning":"...","notes":"..."}]}',
    'Allowed proposedChange values:',
    ['forceCommercialSenders', 'forceImportantSenders', 'forceShippingSenders', 'forceFyiSenders', 'newsSenders', 'newsExcludedSenders', 'historical-reclassification-only', 'none'].join(', '),
    'Rules:',
    '- prefer recommendation-first behavior; do not suggest automatic mutation',
    '- if the sender already looks covered and the issue seems like old mailbox state, use historical-reclassification-only',
    '- use none when the evidence is too weak or mixed to justify a recommendation',
    '- prefer forceImportantSenders for service/account/security traffic',
    '- prefer newsSenders/newsExcludedSenders only for genuine curated-news boundary cases',
    '- prefer forceCommercialSenders only for obvious commercial/promotional senders',
    '',
    'Candidates:',
    JSON.stringify(candidates, null, 2)
  ].join('\n');
}

function sanitizePhase11AiRecommendations_(recommendations, candidates) {
  const allowedChanges = [
    'forceCommercialSenders',
    'forceImportantSenders',
    'forceShippingSenders',
    'forceFyiSenders',
    'newsSenders',
    'newsExcludedSenders',
    'historical-reclassification-only',
    'none'
  ];
  const candidateMap = new Map((candidates || []).map(candidate => [candidate.sender, candidate]));

  return (Array.isArray(recommendations) ? recommendations : [])
    .map(entry => {
      const sender = String(entry && entry.sender || '').trim().toLowerCase();
      if (!candidateMap.has(sender)) return null;

      const candidate = candidateMap.get(sender);
      const proposedChange = allowedChanges.includes(entry.proposedChange) ? entry.proposedChange : 'none';
      const confidence = ['high', 'medium', 'low'].includes(String(entry.confidence || '').trim().toLowerCase())
        ? String(entry.confidence || '').trim().toLowerCase()
        : 'low';

      return {
        sender: sender,
        candidateType: candidate.candidateType,
        proposedChange: proposedChange,
        confidence: confidence,
        evidenceCount: candidate.evidenceCount,
        currentState: candidate.currentState,
        exampleSubject: candidate.sampleSubject,
        recommendedWorkflow: candidate.workflowTargetHint || '',
        operatorAction: buildPhase11OperatorAction_(candidate, proposedChange),
        reasoning: truncatePhase11Text_(entry.reasoning, 300) || 'ai recommendation',
        notes: truncatePhase11Text_(entry.notes, 220)
      };
    })
    .filter(Boolean);
}

function sanitizePhase11AiNewsRecommendations_(recommendations, candidates) {
  const allowedChanges = ['newsSenders', 'newsExcludedSenders', 'historical-reclassification-only', 'none'];
  const candidateMap = new Map((candidates || []).map(candidate => [candidate.sender, candidate]));

  return (Array.isArray(recommendations) ? recommendations : [])
    .map(entry => {
      const sender = String(entry && entry.sender || '').trim().toLowerCase();
      if (!candidateMap.has(sender)) return null;

      const candidate = candidateMap.get(sender);
      const proposedChange = allowedChanges.includes(entry.proposedChange) ? entry.proposedChange : 'none';
      const confidence = ['high', 'medium', 'low'].includes(String(entry.confidence || '').trim().toLowerCase())
        ? String(entry.confidence || '').trim().toLowerCase()
        : 'low';

      return {
        sender: sender,
        candidateType: candidate.candidateType,
        proposedChange: proposedChange,
        confidence: confidence,
        evidenceCount: candidate.evidenceCount,
        currentState: candidate.currentState,
        exampleSubject: candidate.sampleSubject,
        recommendedWorkflow: candidate.workflowTargetHint || '',
        operatorAction: buildPhase11OperatorAction_(candidate, proposedChange),
        reasoning: truncatePhase11Text_(entry.reasoning, 300) || 'ai news-source recommendation',
        notes: truncatePhase11Text_(entry.notes, 220)
      };
    })
    .filter(Boolean);
}

function sanitizePhase11AiWorkflowRecommendations_(recommendations, candidates) {
  const allowedChanges = ['forceFyiSenders', 'prefer-notification', 'prefer-to-respond', 'keep-review', 'historical-reclassification-only', 'none'];
  const candidateMap = new Map((candidates || []).map(candidate => [candidate.sender, candidate]));

  return (Array.isArray(recommendations) ? recommendations : [])
    .map(entry => {
      const sender = String(entry && entry.sender || '').trim().toLowerCase();
      if (!candidateMap.has(sender)) return null;

      const candidate = candidateMap.get(sender);
      const proposedChange = allowedChanges.includes(entry.proposedChange) ? entry.proposedChange : 'none';
      const confidence = ['high', 'medium', 'low'].includes(String(entry.confidence || '').trim().toLowerCase())
        ? String(entry.confidence || '').trim().toLowerCase()
        : 'low';

      return {
        sender: sender,
        candidateType: candidate.candidateType,
        proposedChange: proposedChange,
        confidence: confidence,
        evidenceCount: candidate.evidenceCount,
        currentState: candidate.currentState,
        exampleSubject: candidate.sampleSubject,
        recommendedWorkflow: candidate.workflowTargetHint || '',
        operatorAction: buildPhase11OperatorAction_(candidate, proposedChange),
        reasoning: truncatePhase11Text_(entry.reasoning, 300) || 'ai workflow recommendation',
        notes: truncatePhase11Text_(entry.notes, 220)
      };
    })
    .filter(Boolean);
}

function truncatePhase11Text_(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildPhase11OperatorAction_(candidate, proposedChange) {
  const action = String(proposedChange || '').trim();
  if (!action || action === 'none' || action === 'keep-review') {
    return 'review evidence and leave runtime unchanged unless the operator strongly disagrees with current behavior';
  }

  if (action === 'historical-reclassification-only') {
    return 'keep runtime/config as-is; consider targeted historical reclassification only';
  }

  if (action === 'newsSenders' || action === 'newsExcludedSenders') {
    return 'review in AiRecommendations, then add/update the sender in NewsSources if approved';
  }

  if (action === 'forceCommercialSenders' || action === 'forceImportantSenders' || action === 'forceShippingSenders' || action === 'forceFyiSenders') {
    return 'review in AiRecommendations, then convert to an explicit approved rule or config override if accepted';
  }

  if (action === 'prefer-notification' || action === 'prefer-to-respond') {
    return 'review in AiRecommendations, then decide whether to express this through sender overrides, pattern tuning, or an approved rule';
  }

  return 'review manually before any config or historical changes';
}

function buildAiRecommendationRow_(entry, sourceHelper) {
  return [[
    new Date(),
    'Phase 11',
    sourceHelper || '',
    entry.candidateType || '',
    entry.sender || '',
    entry.proposedChange || '',
    entry.confidence || '',
    entry.evidenceCount === undefined ? '' : entry.evidenceCount,
    entry.currentState || '',
    entry.exampleSubject || '',
    entry.recommendedWorkflow || '',
    entry.operatorAction || '',
    entry.reasoning || '',
    'new',
    entry.notes || ''
  ]][0];
}

function callGeminiJson_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('missing GEMINI_API_KEY');

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.aiModel}:generateContent?key=${apiKey}`,
    {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(`gemini http ${code}: ${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text);
  const candidate = payload.candidates && payload.candidates[0];
  const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
  const result = part && part.text;
  if (!result) throw new Error('empty gemini response');
  return result;
}

function sanitizeAiStructuralLabel_(value) {
  const allowed = [
    CONFIG.labels.review,
    CONFIG.labels.importantServices,
    CONFIG.labels.importantFinance,
    CONFIG.labels.importantShipping,
    CONFIG.labels.importantCalendar,
    CONFIG.labels.importantOpportunities,
    CONFIG.labels.commercialNewsletters,
    CONFIG.labels.commercialAds,
    CONFIG.labels.commercialCampaigns
  ];
  return allowed.includes(value) ? value : CONFIG.labels.review;
}

function sanitizeAiWorkflowLabel_(value) {
  const allowed = [CONFIG.labels.toRespond, CONFIG.labels.fyi, CONFIG.labels.notification];
  return allowed.includes(value) ? value : null;
}

function normalizeAiWorkflowLabel_(structuralLabel, value) {
  if (isCommercialLabel_(structuralLabel)) {
    return null;
  }

  if (structuralLabel === CONFIG.labels.review) {
    return null;
  }

  return sanitizeAiWorkflowLabel_(value);
}

function normalizeAiConfidence_(value) {
  const confidence = Number(value);
  if (Number.isNaN(confidence)) {
    return null;
  }

  if (confidence < 0) return 0;
  if (confidence > 1) return 1;
  return confidence;
}

function isCommercialLabel_(label) {
  return CONFIG.commercialLabels.includes(label);
}
