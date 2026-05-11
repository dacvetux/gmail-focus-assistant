function generateDraftRepliesDryRun() {
  return generateDraftReplies_({
    dryRun: true,
    maxThreads: CONFIG.draftDailyLimit || 10
  });
}

function generateDraftRepliesDebugDryRun() {
  return generateDraftReplies_({
    dryRun: true,
    maxThreads: CONFIG.draftDailyLimit || 10,
    allowDebugBypass: true
  });
}

function generateDraftRepliesLive() {
  return generateDraftReplies_({
    dryRun: false,
    maxThreads: CONFIG.draftDailyLimit || 10
  });
}

function generateDraftForThreadIdDryRun_(threadId) {
  return generateDraftRepliesForThreadIds_([threadId], {
    dryRun: true
  });
}

function generateDraftForThreadIdLive_(threadId) {
  return generateDraftRepliesForThreadIds_([threadId], {
    dryRun: false
  });
}

function generateDraftRepliesForToRespondLabelDryRun_() {
  return generateDraftRepliesForLabelQuery_(`label:"${CONFIG.labels.toRespond}"`, {
    dryRun: true,
    maxThreads: CONFIG.draftDailyLimit || 10,
    requireStrictCandidate: false
  });
}

function generateDraftRepliesForToRespondLabelLive_() {
  return generateDraftRepliesForLabelQuery_(`label:"${CONFIG.labels.toRespond}"`, {
    dryRun: false,
    maxThreads: CONFIG.draftDailyLimit || 10,
    requireStrictCandidate: false
  });
}

function generateDraftRepliesForQueryDryRun_(query) {
  return generateDraftRepliesForQuery_(query, {
    dryRun: true,
    maxThreads: CONFIG.draftDailyLimit || 10,
    requireStrictCandidate: false
  });
}

function generateDraftRepliesForQueryLive_(query) {
  return generateDraftRepliesForQuery_(query, {
    dryRun: false,
    maxThreads: CONFIG.draftDailyLimit || 10,
    requireStrictCandidate: false
  });
}

function generateDraftReplies_(options) {
  const threads = selectDraftCandidateThreads_(options);
  const rows = [];
  let createdCount = 0;
  const mode = options.dryRun ? 'dry-run' : 'live';

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
      mode,
      '',
      '',
      '',
      'No candidate threads found for draft generation.',
      'no'
    ]);
  }

  flushDraftLog_(rows);

  const summary = {
    processedThreads: threads.length,
    createdDrafts: createdCount,
    mode: mode
  };

  logRunSummary_({
    runType: 'phase5-drafts',
    mode: mode,
    entryPoint: options.allowDebugBypass ? 'generateDraftRepliesPhase5DebugDryRun' : (options.dryRun ? 'generateDraftRepliesPhase5DryRun' : 'generateDraftRepliesPhase5Live'),
    processedThreads: threads.length,
    itemCount: createdCount,
    outcome: inferDraftRunOutcome_(options, createdCount),
    notes: buildDraftRunNotes_(options, threads.length, createdCount, rows)
  });

  return summary;
}

function generateDraftRepliesForThreadIds_(threadIds, options) {
  const rows = [];
  let createdCount = 0;
  const mode = options.dryRun ? 'dry-run' : 'live';

  (threadIds || [])
    .map(getThreadByIdSafe_)
    .filter(Boolean)
    .forEach(thread => {
      const result = buildDraftForThread_(thread, Object.assign({}, options, {
        forceDraftMode: 'required'
      }));
      rows.push(result.logRow);
      if (result.created) {
        createdCount += 1;
      }
    });

  if (!rows.length) {
    rows.push([
      new Date(),
      mode,
      '',
      '',
      '',
      'No valid thread ids found for on-demand draft generation.',
      'no'
    ]);
  }

  flushDraftLog_(rows);

  const summary = {
    processedThreads: rows.length,
    createdDrafts: createdCount,
    mode: mode
  };

  logRunSummary_({
    runType: 'phase5-drafts',
    mode: mode,
    entryPoint: options.dryRun ? 'generateDraftForThreadIdPhase5DryRun' : 'generateDraftForThreadIdPhase5Live',
    processedThreads: rows.length,
    itemCount: createdCount,
    outcome: inferDraftRunOutcome_(options, createdCount),
    notes: rows.length ? 'thread-id-mode' : 'no valid thread ids resolved'
  });

  return summary;
}

function generateDraftRepliesForLabelQuery_(labelQuery, options) {
  const lookbackDays = CONFIG.draftSearchLookbackDays || 14;
  const maxThreads = options.maxThreads || CONFIG.draftDailyLimit || 10;
  const query = `${labelQuery} newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`;
  const threads = dedupeThreads_(GmailApp.search(query, 0, Math.max(30, maxThreads * 4)))
    .filter(thread => options.requireStrictCandidate === false ? true : isStrictDraftCandidate_(thread))
    .sort((a, b) => getThreadSortKey_(b) - getThreadSortKey_(a))
    .slice(0, maxThreads);

  return processOnDemandDraftThreads_(threads, options, 'No candidate threads found for on-demand label-based draft generation.');
}

function generateDraftRepliesForQuery_(query, options) {
  const maxThreads = options.maxThreads || CONFIG.draftDailyLimit || 10;
  const threads = dedupeThreads_(GmailApp.search(query, 0, Math.max(30, maxThreads * 4)))
    .filter(thread => options.requireStrictCandidate === false ? true : isStrictDraftCandidate_(thread))
    .sort((a, b) => getThreadSortKey_(b) - getThreadSortKey_(a))
    .slice(0, maxThreads);

  return processOnDemandDraftThreads_(threads, options, 'No candidate threads found for on-demand query-based draft generation.');
}

function processOnDemandDraftThreads_(threads, options, emptyMessage) {
  const rows = [];
  let createdCount = 0;
  const mode = options.dryRun ? 'dry-run' : 'live';

  threads.forEach(thread => {
    const result = buildDraftForThread_(thread, Object.assign({}, options, {
      forceDraftMode: 'required'
    }));
    rows.push(result.logRow);
    if (result.created) {
      createdCount += 1;
    }
  });

  if (!rows.length) {
    rows.push([
      new Date(),
      mode,
      '',
      '',
      '',
      emptyMessage,
      'no'
    ]);
  }

  flushDraftLog_(rows);

  const summary = {
    processedThreads: threads.length,
    createdDrafts: createdCount,
    mode: mode
  };

  logRunSummary_({
    runType: 'phase5-drafts',
    mode: mode,
    entryPoint: inferOnDemandDraftEntryPoint_(options, emptyMessage),
    processedThreads: threads.length,
    itemCount: createdCount,
    outcome: inferDraftRunOutcome_(options, createdCount),
    notes: buildDraftRunNotes_(options, threads.length, createdCount, rows)
  });

  return summary;
}

function inferDraftRunOutcome_(options, createdCount) {
  if (!createdCount) {
    return 'no-drafts';
  }

  return options && options.dryRun ? 'drafts-produced-for-review' : 'drafts-generated';
}

function selectDraftCandidateThreads_(options) {
  const maxThreads = options.maxThreads || CONFIG.draftDailyLimit || 10;

  if (options.allowDebugBypass && CONFIG.debugSampleThreads && CONFIG.debugSampleThreads.length) {
    return CONFIG.debugSampleThreads
      .map(getThreadByIdSafe_)
      .filter(Boolean)
      .slice(0, maxThreads);
  }

  const lookbackDays = CONFIG.draftSearchLookbackDays || 14;
  const poolLimit = Math.max(60, maxThreads * 8);
  const queries = [
    `in:inbox newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`,
    `label:"${CONFIG.labels.toRespond}" newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`,
    `label:"${CONFIG.labels.importantServices}" newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`,
    `label:"${CONFIG.labels.importantCalendar}" newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`,
    `label:"${CONFIG.labels.importantOpportunities}" newer_than:${lookbackDays}d -in:drafts -label:TRASH -label:SPAM`
  ];

  const pooledThreads = queries.flatMap(query => {
    try {
      return GmailApp.search(query, 0, poolLimit);
    } catch (error) {
      return [];
    }
  });

  return dedupeThreads_(pooledThreads)
    .filter(thread => {
      if (options.allowDebugBypass && hasDebugFilters_() && threadMatchesDebugFilters_(thread)) {
        return true;
      }
      return isStrictDraftCandidate_(thread);
    })
    .filter(thread => threadMatchesDebugFilters_(thread))
    .sort((a, b) => getThreadSortKey_(b) - getThreadSortKey_(a))
    .slice(0, maxThreads);
}

function inferOnDemandDraftEntryPoint_(options, emptyMessage) {
  if ((emptyMessage || '').includes('label-based')) {
    return options.dryRun ? 'generateDraftRepliesForToRespondLabelPhase5DryRun' : 'generateDraftRepliesForToRespondLabelPhase5Live';
  }

  return options.dryRun ? 'generateDraftRepliesForQueryPhase5DryRun' : 'generateDraftRepliesForQueryPhase5Live';
}

function buildDraftRunNotes_(options, threadCount, createdCount, rows) {
  const notes = [];
  if (options.allowDebugBypass) notes.push('debug-bypass');
  if (options.requireStrictCandidate === false) notes.push('strict-gate-bypassed');
  if (hasDebugFilters_()) notes.push('debug-filters-active');
  if (!threadCount) notes.push('no candidate threads resolved');
  if (threadCount && !createdCount) notes.push('threads processed but no draft created');
  if ((rows || []).some(row => String(row[5] || '').startsWith('ERROR:'))) notes.push('errors present in DraftLog');
  return notes.join('; ');
}

function isStrictDraftCandidate_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const managedLabels = new Set(labels);
  const decision = classifyThread_(thread);
  const lastMessage = getLastMessageSafe_(thread);
  if (!lastMessage) {
    return false;
  }
  const from = ((lastMessage && lastMessage.getFrom()) || '').toLowerCase();
  const subject = ((lastMessage && lastMessage.getSubject()) || '').toLowerCase();
  const haystack = `${from}\n${subject}`;

  if (isNoReplySender_(from)) {
    return false;
  }

  if (containsAny_(haystack, CONFIG.draftExcludedSenders) || matchesAny_(haystack, CONFIG.draftExcludedSubjectPatterns)) {
    return false;
  }

  if (isCommercialLabel_(decision.label)) {
    return false;
  }

  if (decision.workflowLabel === CONFIG.labels.notification) {
    return false;
  }

  if (managedLabels.has(CONFIG.labels.toRespond)) {
    return true;
  }

  if (decision.label === CONFIG.labels.importantCalendar && decision.workflowLabel === CONFIG.labels.toRespond) {
    return true;
  }

  if (decision.label === CONFIG.labels.importantServices && decision.workflowLabel === CONFIG.labels.toRespond) {
    return true;
  }

  if (decision.label === CONFIG.labels.importantOpportunities && decision.workflowLabel === CONFIG.labels.toRespond && !isOpportunityBroadcastSender_(from)) {
    return true;
  }

  return false;
}

function buildDraftForThread_(thread, options) {
  const lastMessage = getLastMessageSafe_(thread);
  if (!lastMessage) {
    return {
      created: false,
      logRow: [
        new Date(),
        options.dryRun ? 'dry-run' : 'live',
        thread.getId(),
        '',
        '',
        'SKIPPED: could not read latest message for thread.',
        'no'
      ]
    };
  }

  const from = (lastMessage && lastMessage.getFrom()) || '';
  const subject = (lastMessage && lastMessage.getSubject()) || '';
  const subjectHaystack = `${from}\n${subject}`.toLowerCase();
  const body = ((lastMessage && lastMessage.getPlainBody()) || '').slice(0, CONFIG.draftMaxBodyChars || 4000);
  const draftMode = options.forceDraftMode || getDraftGenerationMode_(thread);

  if (isNoReplySender_(from)) {
    return {
      created: false,
      logRow: [
        new Date(),
        options.dryRun ? 'dry-run' : 'live',
        thread.getId(),
        from,
        subject,
        'SKIPPED: sender appears to be no-reply/noreply, so no reply draft was generated.',
        'no'
      ]
    };
  }

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

  const prompt = buildDraftPrompt_(from, subject, body, draftMode);

  try {
    const draftBody = callDraftModelText_(prompt).trim();
    if (draftMode === 'optional' && draftBody === 'NO_DRAFT') {
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

function buildDraftPrompt_(from, subject, body, draftMode) {
  const lines = [
    CONFIG.draftInstructions,
    '',
    'Keep it concise unless the email clearly needs more detail.',
    'If the sender is asking a question, answer only from the provided context.',
    'If the thread looks like scheduling or coordination, propose a simple next step.'
  ];

  if (draftMode === 'required') {
    lines.push('A reply is clearly needed. Write the best draft reply now.');
  } else {
    lines.push('Write a reply draft to the latest email in this thread only if a reply is genuinely appropriate.');
    lines.push('If no reply is genuinely needed, return exactly: NO_DRAFT.');
  }

  lines.push(
    '',
    `From: ${from}`,
    `Subject: ${subject}`,
    'Latest email body:',
    body
  );

  return lines.join('\n');
}

function getDraftGenerationMode_(thread) {
  const labels = thread.getLabels().map(label => label.getName());
  const managedLabels = new Set(labels);
  const decision = classifyThread_(thread);

  if (
    managedLabels.has(CONFIG.labels.toRespond) ||
    decision.workflowLabel === CONFIG.labels.toRespond ||
    (decision.label === CONFIG.labels.importantServices && decision.workflowLabel === CONFIG.labels.toRespond) ||
    (decision.label === CONFIG.labels.importantCalendar && decision.workflowLabel === CONFIG.labels.toRespond)
  ) {
    return 'required';
  }

  return 'optional';
}

function callDraftModelText_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('missing GEMINI_API_KEY');

  const models = [CONFIG.draftModel].concat(CONFIG.draftFallbackModels || []).filter(Boolean);
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

      lastError = new Error(`draft model ${model} http ${code}: ${text.slice(0, 300)}`);
      if (!CONFIG.draftRetryableStatusCodes.includes(code) || attempt === 1) {
        break;
      }

      Utilities.sleep(1500);
    }
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

function isNoReplySender_(from) {
  return isNoReplyLikeSenderText_(from);
}

function isOpportunityBroadcastSender_(from) {
  return [
    'jobs@mail.xing.com',
    'jobs-listings@linkedin.com',
    'jobs-noreply@linkedin.com',
    'jobalerts-noreply@linkedin.com',
    'news@email.experteer.com',
    'job.karriere.at'
  ].some(snippet => from.includes(snippet));
}

function getLastMessageSafe_(thread) {
  try {
    const messages = thread.getMessages();
    if (!messages || !messages.length) return null;
    return messages[messages.length - 1] || null;
  } catch (error) {
    return null;
  }
}

function getThreadByIdSafe_(threadId) {
  try {
    return GmailApp.getThreadById(threadId);
  } catch (error) {
    return null;
  }
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
