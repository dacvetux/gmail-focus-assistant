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

  if (structuralLabel === CONFIG.labels.review && !value) {
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
