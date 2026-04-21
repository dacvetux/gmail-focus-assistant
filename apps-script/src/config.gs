const CONFIG = {
  labels: {
    toRespond: '1: to respond',
    fyi: '2: FYI',
    notification: '3: notification',
    awaitingReply: '6: awaiting reply',
    actioned: '7: actioned',
    review: 'Review/Ambiguous',
    importantServices: 'Important/Services',
    importantFinance: 'Important/Finance',
    importantShipping: 'Important/Shipping',
    importantCalendar: 'Important/Calendar',
    importantOpportunities: 'Important/Opportunities',
    commercialNewsletters: 'Commercial/Newsletters',
    commercialAds: 'Commercial/Ads',
    commercialCampaigns: 'Commercial/Campaigns'
  },
  preserveLabels: [
    'IMPORTANT',
    'STARRED',
    'Osebno',
    '1: to respond',
    '2: FYI',
    '3: notification',
    '5: meeting update',
    '6: awaiting reply',
    '7: actioned'
  ],
  commercialArchiveLabels: [
    'Commercial/Newsletters',
    'Commercial/Ads',
    'Commercial/Campaigns'
  ],
  query: 'in:inbox newer_than:7d -label:TRASH -label:SPAM'
};
