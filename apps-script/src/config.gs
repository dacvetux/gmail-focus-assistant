const CONFIG = {
  query: 'in:inbox newer_than:7d -label:TRASH -label:SPAM',
  maxThreads: 100,
  labels: {
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
    '7: actioned',
    'Important/Services',
    'Important/Finance',
    'Important/Shipping',
    'Important/Calendar',
    'Important/Opportunities'
  ],
  preserveSystemLabels: [
    'CATEGORY_PERSONAL'
  ],
  commercialLabels: [
    'Commercial/Newsletters',
    'Commercial/Ads',
    'Commercial/Campaigns'
  ],
  neverArchiveSenders: [
    'incident.io',
    'post.at',
    'ezdrav.si',
    'nlb.si',
    'paypal.com',
    'github.com',
    'google.com',
    'gmail.com',
    'qmedis.eu'
  ],
  financePatterns: [
    /invoice/i,
    /payment/i,
    /receipt/i,
    /statement/i,
    /bill\b/i,
    /order confirmation/i
  ],
  shippingPatterns: [
    /tracking/i,
    /shipped/i,
    /delivered/i,
    /customs/i,
    /package/i,
    /shipment/i,
    /parcel/i
  ],
  calendarPatterns: [
    /calendar/i,
    /invitation/i,
    /invite/i,
    /meeting update/i,
    /accepted:/i,
    /declined:/i,
    /tentative:/i
  ],
  opportunityPatterns: [
    /job alert/i,
    /jobs?/i,
    /career/i,
    /opportunit/i,
    /recruit/i,
    /cv/i,
    /position/i,
    /apply/i
  ],
  newsletterPatterns: [
    /substack/i,
    /newsletter/i,
    /digest/i,
    /roundup/i,
    /briefing/i,
    /tldr/i,
    /reuters/i,
    /telecompaper/i,
    /economist/i
  ],
  adPatterns: [
    /sale/i,
    /discount/i,
    /deal/i,
    /offer/i,
    /coupon/i,
    /save now/i,
    /shop now/i,
    /% off/i,
    /free shipping/i,
    /wishlist is now on sale/i,
    /last chance/i
  ],
  campaignPatterns: [
    /bandsintown/i,
    /ticketmaster/i,
    /members\.netflix\.com/i,
    /festival/i,
    /tour/i,
    /event/i,
    /launch/i,
    /new single/i,
    /screening/i,
    /tickets? available/i
  ]
};
