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
  const threads = GmailApp.search(CONFIG.draftSearchQuery, 0, options.maxThreads || CONFIG.draftDailyLimit || 10)
    .filter(thread => threadMatchesDebugFilters_(thread));

  const rows = [];
  let createdCount = 0;

  threads.forEach(thread => {
    const result = buildDraftForThread_(thread, options);
    rows.push(result.logRow);
    if (result.created) {
      createdCount += 1;
    }
  });

  flushDraftLog_(rows);

  return {
    processedThreads: threads.length,
    createdDrafts: createdCount,
    mode: options.dryRun ? 'dry-run' : 'live'
  };
}

function buildDraftForThread_(thread, options) {
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];
  const from = (lastMessage && lastMessage.getFrom()) || '';
  const subject = (lastMessage && lastMessage.getSubject()) || '';
  const body = ((lastMessage && lastMessage.getPlainBody()) || '').slice(0, CONFIG.draftMaxBodyChars || 4000);

  const prompt = [
    CONFIG.draftInstructions,
    '',
    'Write a reply draft to the latest email in this thread.',
    'Keep it concise unless the email clearly needs more detail.',
    'If the sender is asking a question, answer only from the provided context.',
    'If the thread looks like a scheduling or coordination email, propose a simple next step.',
    '',
    `From: ${from}`,
    `Subject: ${subject}`,
    'Latest email body:',
    body
  ].join('\n');

  try {
    const draftBody = callDraftModelText_(prompt).trim();
    const normalizedBody = normalizeDraftBody_(draftBody);

    if (!options.dryRun) {
      GmailApp.createDraft(thread.getMessages()[0].getFrom(), `Re: ${stripRePrefix_(subject)}`, normalizedBody, {
        threadId: thread.getId()
      });
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

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.draftModel}:generateContent?key=${apiKey}`,
    {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        generationConfig: {
          temperature: 0.3,
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
  if (code < 200 || code >= 300) {
    throw new Error(`draft model http ${code}: ${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text);
  const candidate = payload.candidates && payload.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const result = parts && parts.map(part => part.text || '').join('').trim();
  if (!result) throw new Error('empty draft response');
  return result;
}

function normalizeDraftBody_(text) {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function stripRePrefix_(subject) {
  return String(subject || '').replace(/^\s*re:\s*/i, '').trim() || '(no subject)';
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
