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
  const rows = normalizedRecommendations.map(buildAiRecommendationRow_);
  flushAiRecommendations_(rows);

  logRunSummary_({
    runType: 'ai-assist',
    mode: 'internal',
    entryPoint: 'generateAiRecommendationsPhase11',
    processedThreads: candidateSummary.scannedRows,
    itemCount: normalizedRecommendations.length,
    outcome: normalizedRecommendations.length ? 'phase11-ai-recommendations-written' : 'phase11-ai-empty-output',
    notes: `candidates=${candidateSummary.candidates.length}; written=${normalizedRecommendations.length}; lookback=${candidateSummary.lookbackRows}`
  });

  return {
    scannedRows: candidateSummary.scannedRows,
    lookbackRows: candidateSummary.lookbackRows,
    candidateCount: candidateSummary.candidates.length,
    writtenCount: normalizedRecommendations.length,
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
  const rows = normalizedRecommendations.map(buildAiRecommendationRow_);
  flushAiRecommendations_(rows);

  logRunSummary_({
    runType: 'ai-assist',
    mode: 'internal',
    entryPoint: 'generateAiNewsSourceRecommendationsPhase11',
    processedThreads: candidateSummary.scannedRows,
    itemCount: normalizedRecommendations.length,
    outcome: normalizedRecommendations.length ? 'phase11-ai-news-written' : 'phase11-ai-news-empty-output',
    notes: `candidates=${candidateSummary.candidates.length}; written=${normalizedRecommendations.length}; include=${candidateSummary.includeCount}; exclude=${candidateSummary.excludeCount}`
  });

  return {
    scannedRows: candidateSummary.scannedRows,
    candidateCount: candidateSummary.candidates.length,
    writtenCount: normalizedRecommendations.length,
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
        reasoning: truncatePhase11Text_(entry.reasoning, 300) || 'ai news-source recommendation',
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

function buildAiRecommendationRow_(entry) {
  return [[
    new Date(),
    'Phase 11',
    entry.candidateType || '',
    entry.sender || '',
    entry.proposedChange || '',
    entry.confidence || '',
    entry.evidenceCount === undefined ? '' : entry.evidenceCount,
    entry.currentState || '',
    entry.exampleSubject || '',
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
