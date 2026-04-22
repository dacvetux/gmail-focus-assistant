function generateDraftRepliesDryRun() {
  return generateDraftReplies_({
    dryRun: true,
    maxThreads: CONFIG.draftDailyLimit || 10
  });
}

function generateDraftRepliesLive() {
  return generateDraftReplies_({
    dryRun: false,
    maxThreads: CONFIG.draftDailyLimit || 10
  });
}

function generateDraftReplies_(options) {
  const threads = selectDraftCandidateThreads_(options);
  const rows = [];
  let createdCount = 0;

  threads.forEach(thread => {
    const result = buildDraftForThread_(thread, options);
    rows.push(result.logRow);
    if (result.created) {
      createdCount += 1;
    }
  });

  if (!rows.length) {
    rows.push([
      new Date(),
      options.dryRun ? 'dry-run' : 'live',
      '',
      '',
      '',
      'No candidate threads found for draft generation.',
      'no'
    ]);
  }

  flushDraftLog_(rows);

  return {
    processedThreads: threads.length,
    createdDrafts: createdCount,
    mode: options.dryRun ? 'dry-run' : 'live'
  };
}

function selectDraftCandidateThreads_(options) {
  const lookbackDays = CONFIG.draftSearchLookbackDays || 14;
  const maxThreads = options.maxThreads || CONFIG.draftDailyLimit || 10;
  const baseQuery = `in:inbox newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`;
  const pool = GmailApp.search(baseQuery, 0, Math.max(60, maxThreads * 8));

  return prioritizeDraftCandidateThreads_(pool)
    .filter(thread => threadMatchesDebugFilters_(thread))
    .slice(0, maxThreads);
}

function prioritizeDraftCandidateThreads_(threads) {
  return dedupeThreads_(threads)
    .map(thread => ({ thread: thread, score: getDraftCandidateScore_(thread) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || getThreadSortKey_(b.thread) - getThreadSortKey_(a.thread))
    .map(item => item.thread);
}

function getDraftCandidateScore_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const managedLabels = new Set(labels);
  const decision = classifyThread_(thread);
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const haystack = `${from}\n${subject}`;
  let score = 0;

  if (containsAny_(haystack, CONFIG.draftExcludedSenders) || matchesAny_(haystack, CONFIG.draftExcludedSubjectPatterns)) {
    return -100;
  }

  if (isCommercialLabel_(decision.label)) {
    return -100;
  }

  if (decision.workflowLabel === CONFIG.labels.notification) {
    return -20;
  }

  const looksHumanish = !/no-reply|noreply|newsletter|notifications?/.test(from);
  const explicitlyActionable = managedLabels.has(CONFIG.labels.toRespond) || decision.workflowLabel === CONFIG.labels.toRespond;
  const importantActionable = decision.label === CONFIG.labels.importantCalendar || decision.label === CONFIG.labels.importantServices;

  if (!explicitlyActionable && !importantActionable && !looksHumanish) {
    return -50;
  }

  if (managedLabels.has(CONFIG.labels.toRespond)) score += 12;
  if (managedLabels.has(CONFIG.labels.importantCalendar)) score += 6;
  if (managedLabels.has(CONFIG.labels.importantServices)) score += 5;
  if (managedLabels.has(CONFIG.labels.review)) score += 1;

  if (decision.workflowLabel === CONFIG.labels.toRespond) score += 10;
  if (decision.label === CONFIG.labels.importantCalendar) score += 6;
  if (decision.label === CONFIG.labels.importantServices) score += 5;
  if (decision.label === CONFIG.labels.review) score += 1;
  if (decision.label === CONFIG.labels.importantOpportunities) score -= 5;

  if (looksHumanish) score += 4;
  if (/reply|respond|confirm|available|consent|approve|meet|schedule/.test(subject)) score += 4;

  return score;
}

function buildDraftForThread_(thread, options) {
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = (lastMessage && lastMessage.getFrom()) || '';
  const subject = (lastMessage && lastMessage.getSubject()) || '';
  const subjectHaystack = `${from}\n${subject}`.toLowerCase();
  const body = ((lastMessage && lastMessage.getPlainBody()) || '').slice(0, CONFIG.draftMaxBodyChars || 4000);

  if (containsAny_(subjectHaystack, CONFIG.draftExcludedSenders) || matchesAny_(subjectHaystack, CONFIG.draftExcludedSubjectPatterns)) {
    return {
      created: false,
      logRow: [
        new Date(),
        options.dryRun ? 'dry-run' : 'live',
        thread.getId(),
        from,
        subject,
        'SKIPPED: excluded sender or subject pattern for draft generation.',
        'no'
      ]
    };
  }

  const prompt = [
    CONFIG.draftInstructions,
    '',
    'Write a reply draft to the latest email in this thread only if a reply is genuinely appropriate.',
    'Keep it concise unless the email clearly needs more detail.',
    'If the sender is asking a question, answer only from the provided context.',
    'If the thread looks like scheduling or coordination, propose a simple next step.',
    'If no reply is genuinely needed, return exactly: NO_DRAFT.',
    '',
    `From: ${from}`,
    `Subject: ${subject}`,
    'Latest email body:',
    body
  ].join('\n');

  try {
    const draftBody = callDraftModelText_(prompt).trim();
    if (draftBody === 'NO_DRAFT') {
      return {
        created: false,
        logRow: [
          new Date(),
          options.dryRun ? 'dry-run' : 'live',
          thread.getId(),
          from,
          subject,
          'SKIPPED: model determined no reply draft is appropriate.',
          'no'
        ]
      };
    }

    const normalizedBody = normalizeDraftBody_(draftBody);

    if (!options.dryRun) {
      const replyTo = extractReplyAddress_(lastMessage);
      GmailApp.createDraft(replyTo, `Re: ${stripRePrefix_(subject)}`, normalizedBody);
    }

    return {
      created: true,
      logRow: [
        new Date(),
        options.dryRun ? 'dry-run' : 'live',
        thread.getId(),
        from,
        subject,
        normalizedBody,
        options.dryRun ? 'no' : 'yes'
      ]
    };
  } catch (error) {
    return {
      created: false,
      logRow: [
        new Date(),
        options.dryRun ? 'dry-run' : 'live',
        thread.getId(),
        from,
        subject,
        `ERROR: ${error.message}`,
        'no'
      ]
    };
  }
}

function callDraftModelText_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('missing GEMINI_API_KEY');

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.draftModel}:generateContent?key=${apiKey}`,
      {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'text/plain'
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
    if (code >= 200 && code < 300) {
      const payload = JSON.parse(text);
      const candidate = payload.candidates && payload.candidates[0];
      const parts = candidate && candidate.content && candidate.content.parts;
      const result = parts && parts.map(part => part.text || '').join('').trim();
      if (!result) throw new Error('empty draft response');
      return result;
    }

    lastError = new Error(`draft model http ${code}: ${text.slice(0, 300)}`);
    if (!CONFIG.draftRetryableStatusCodes.includes(code) || attempt === 1) {
      throw lastError;
    }

    Utilities.sleep(1500);
  }

  throw lastError || new Error('unknown draft model error');
}

function normalizeDraftBody_(text) {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function stripRePrefix_(subject) {
  return String(subject || '').replace(/^\s*re:\s*/i, '').trim() || '(no subject)';
}

function extractReplyAddress_(message) {
  const replyTo = (message && (message.getReplyTo && message.getReplyTo())) || '';
  const from = (message && message.getFrom && message.getFrom()) || '';
  const source = replyTo || from;
  const match = source.match(/<([^>]+)>/);
  return match ? match[1] : source.replace(/^[^\s<]+\s*/, '').trim();
}

function getOrCreateDraftLogSheet_() {
  const spreadsheet = getLogSpreadsheet_();
  let sheet = spreadsheet.getSheetByName('DraftLog');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('DraftLog');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Timestamp',
      'Mode',
      'Thread ID',
      'From',
      'Subject',
      'Draft Body',
      'Draft Created'
    ]]);
  }

  return sheet;
}

function flushDraftLog_(rows) {
  if (!rows.length) return;

  const sheet = getOrCreateDraftLogSheet_();
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}
