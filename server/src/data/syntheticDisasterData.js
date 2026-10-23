/**
 * Deterministic Synthetic Disaster Dataset for SignalTrace Phase 2 / 4.1
 *
 * All records are fictional and clearly labelled as synthetic.
 * These records support testing verification logic:
 * - Scenario A: Claim consistent with an official report (Verified)
 * - Scenario B: Two authoritative sources contradicting an inflated claim (Conflicting)
 *   atom-002-1: Inflated magnitude contradicted (Conflicting)
 *   atom-002-2: Casualty/damage detail — no evidence linked (Unverified) [material detail rule]
 * - Scenario C: Old evacuation alert superseded by newer cancellation bulletin (Outdated)
 * - Scenario D: Claim asserting a fire at Shimla — authority explicitly denies Shimla impact (Conflicting)
 * - Scenario E: Rumor of dam breach with zero corroborating official reports (Unverified)
 * - Scenario F: Multiple atomic claims in one post — mixed verdicts (Verified + Conflicting)
 * - Scenario G: Same atomic claim has both supporting AND contradicting evidence (Conflicting precedes Verified)
 *              Second atom has only supporting evidence for event location, not for specific claimed toll (Unverified)
 */

export const syntheticIncidents = [
  // Scenario A: Teesta River Flood
  {
    syntheticId: 'synth-incident-001',
    sourceReportId: 'CWC-SYNTH-2026-FL01',
    sourceName: 'Central Water Commission (Synthetic)',
    sourceType: 'official_agency',
    sourceUrl: 'https://synthetic.cwc.gov.example/bulletins/2026/FL01',
    eventType: 'flood',
    title: '[SYNTHETIC] Teesta River Severe Flood Advisory - Jalpaiguri Sector',
    description:
      'River Teesta at Domohani (Jalpaiguri district) has exceeded the Extreme Danger Level by 0.42m due to torrential catchment rainfall. Embankment overtopping reported in low-lying villages.',
    severity: 'severe',
    geographicInfo: {
      locationName: 'Domohani, Jalpaiguri',
      adminRegion: 'West Bengal',
      country: 'India',
      coordinates: { latitude: 26.542, longitude: 88.719 },
      affectedRadiusKm: 25,
      affectedAreaDescription: 'Low-lying riparian agricultural zones in Domohani and Jalpaiguri Sadar block'
    },
    publishedAt: new Date('2026-10-21T04:30:00.000Z'),
    updatedAtSource: new Date('2026-10-21T06:00:00.000Z'),
    eventOccurredAt: new Date('2026-10-21T03:45:00.000Z'),
    retrievedAt: new Date('2026-10-21T06:15:00.000Z'),
    rawPayload: { gaugeReadingMeters: 86.25, dangerLevelMeters: 85.83, flowTrend: 'rising' },
    isSynthetic: true
  },

  // Scenario B - Source 1: USGS Earthquake Report
  {
    syntheticId: 'synth-incident-002',
    sourceReportId: 'USGS-SYNTH-2026-EQ44',
    sourceName: 'USGS Earthquake Hazards Program (Synthetic)',
    sourceType: 'geological_survey',
    sourceUrl: 'https://synthetic.usgs.example/earthquakes/2026/eq44',
    eventType: 'earthquake',
    title: '[SYNTHETIC] M 5.4 - 28 km SE of Chamoli, Uttarakhand',
    description:
      'Moderate earthquake recorded at 10.0 km depth. Light to moderate shaking felt across Garhwal region. Estimated low casualty probability; localized minor structural cracks.',
    severity: 'moderate',
    geographicInfo: {
      locationName: 'Chamoli district',
      adminRegion: 'Uttarakhand',
      country: 'India',
      coordinates: { latitude: 30.291, longitude: 79.524 },
      affectedRadiusKm: 60,
      affectedAreaDescription: 'Garhwal division valleys'
    },
    publishedAt: new Date('2026-10-22T08:15:00.000Z'),
    updatedAtSource: new Date('2026-10-22T08:35:00.000Z'),
    eventOccurredAt: new Date('2026-10-22T08:11:42.000Z'),
    retrievedAt: new Date('2026-10-22T08:40:00.000Z'),
    rawPayload: { magnitude: 5.4, magnitudeType: 'mww', depthKm: 10, mmi: 5 },
    isSynthetic: true
  },

  // Scenario B - Source 2: NCS Earthquake Report (Disagrees on magnitude: 5.5 vs 5.4)
  {
    syntheticId: 'synth-incident-003',
    sourceReportId: 'NCS-SYNTH-2026-0912',
    sourceName: 'National Center for Seismology (Synthetic)',
    sourceType: 'official_agency',
    sourceUrl: 'https://synthetic.seismo.gov.example/reports/20260912',
    eventType: 'earthquake',
    title: '[SYNTHETIC] Preliminary Seismological Report: M 5.5 Chamoli',
    description:
      'Earthquake of Magnitude 5.5 occurred at depth of 12 km in Chamoli district. Ground inspection underway by local administration; no major building collapses reported.',
    severity: 'moderate',
    geographicInfo: {
      locationName: 'Pipalkoti, Chamoli',
      adminRegion: 'Uttarakhand',
      country: 'India',
      coordinates: { latitude: 30.428, longitude: 79.431 },
      affectedRadiusKm: 50,
      affectedAreaDescription: 'Alaknanda river valley corridor'
    },
    publishedAt: new Date('2026-10-22T08:22:00.000Z'),
    updatedAtSource: new Date('2026-10-22T08:45:00.000Z'),
    eventOccurredAt: new Date('2026-10-22T08:11:40.000Z'),
    retrievedAt: new Date('2026-10-22T08:50:00.000Z'),
    rawPayload: { magnitude: 5.5, depthKm: 12, stationCount: 38 },
    isSynthetic: true
  },

  // Scenario C - Older Alert (06:00 UTC): Cyclone Evacuation Order
  {
    syntheticId: 'synth-incident-004',
    sourceReportId: 'IMD-SYNTH-2026-CYC03',
    sourceName: 'IMD Cyclone Warning Division (Synthetic)',
    sourceType: 'meteorological_service',
    sourceUrl: 'https://synthetic.mausam.gov.example/cyclone/bulletin03',
    eventType: 'cyclone',
    title: '[SYNTHETIC] Red Alert: Mandatory Evacuation for Paradip Coast (Bulletin 03)',
    description:
      'Very Severe Cyclonic Storm "Sagar" tracking towards Paradip landfall within 12 hours. Coastal residents within 5 km zone advised mandatory relocation to cyclone shelters.',
    severity: 'extreme',
    geographicInfo: {
      locationName: 'Paradip Port & Jagatsinghpur coast',
      adminRegion: 'Odisha',
      country: 'India',
      coordinates: { latitude: 20.316, longitude: 86.611 },
      affectedRadiusKm: 40,
      affectedAreaDescription: 'Coastal Jagatsinghpur and Kendrapara districts'
    },
    publishedAt: new Date('2026-10-20T06:00:00.000Z'),
    updatedAtSource: new Date('2026-10-20T06:15:00.000Z'),
    eventOccurredAt: null,
    retrievedAt: new Date('2026-10-20T06:30:00.000Z'),
    rawPayload: { bulletinNumber: 3, windSpeedKmph: 155, category: 'Very Severe' },
    isSynthetic: true
  },

  // Scenario C - Newer Update (14:00 UTC): Cyclone Re-curved & Evacuation Stand-down
  {
    syntheticId: 'synth-incident-005',
    sourceReportId: 'IMD-SYNTH-2026-CYC06',
    sourceName: 'IMD Cyclone Warning Division (Synthetic)',
    sourceType: 'meteorological_service',
    sourceUrl: 'https://synthetic.mausam.gov.example/cyclone/bulletin06',
    eventType: 'cyclone',
    title: '[SYNTHETIC] Downgrade Bulletin: Cyclone Sagar Recurved Northeastward away from Paradip (Bulletin 06)',
    description:
      'Cyclonic Storm "Sagar" has recurved sharply east-northeastward over the deep Bay of Bengal, avoiding direct Odisha landfall. Red Alert withdrawn for Paradip; port operations permitted to resume under cautionary signal 3.',
    severity: 'moderate',
    geographicInfo: {
      locationName: 'Paradip Port',
      adminRegion: 'Odisha',
      country: 'India',
      coordinates: { latitude: 20.316, longitude: 86.611 },
      affectedRadiusKm: 20,
      affectedAreaDescription: 'Offshore maritime zone; coastal warning downgraded'
    },
    publishedAt: new Date('2026-10-20T14:00:00.000Z'),
    updatedAtSource: new Date('2026-10-20T14:10:00.000Z'),
    eventOccurredAt: null,
    retrievedAt: new Date('2026-10-20T14:20:00.000Z'),
    rawPayload: { bulletinNumber: 6, windSpeedKmph: 85, trackStatus: 'recurved_northeast' },
    isSynthetic: true
  },

  // Scenario D: Wildfire in Rohru (78 km from Shimla)
  {
    syntheticId: 'synth-incident-006',
    sourceReportId: 'HP-SDMA-SYNTH-2026-WF19',
    sourceName: 'Himachal SDMA (Synthetic)',
    sourceType: 'emergency_management',
    sourceUrl: 'https://synthetic.hpsdma.gov.example/alerts/wf19',
    eventType: 'wildfire',
    title: '[SYNTHETIC] Forest Fire Contained in North Rohru Valley',
    description:
      'Pine forest fire near Chirgaon in northern Rohru block has been 85% contained by forest department beat teams. No spread towards Jubbal or Shimla municipal areas.',
    severity: 'moderate',
    geographicInfo: {
      locationName: 'Chirgaon, Rohru',
      adminRegion: 'Himachal Pradesh',
      country: 'India',
      coordinates: { latitude: 31.214, longitude: 77.904 },
      affectedRadiusKm: 15,
      affectedAreaDescription: 'Chirgaon beat forest compartment 42'
    },
    publishedAt: new Date('2026-10-22T11:00:00.000Z'),
    updatedAtSource: new Date('2026-10-22T13:30:00.000Z'),
    eventOccurredAt: new Date('2026-10-22T07:00:00.000Z'),
    retrievedAt: new Date('2026-10-22T13:45:00.000Z'),
    rawPayload: { containmentPercentage: 85, hectaresBurned: 120 },
    isSynthetic: true
  },

  // Scenario F: Suketi Bridge Flash Flood (Mandi)
  {
    syntheticId: 'synth-incident-007',
    sourceReportId: 'MANDI-DEOC-SYNTH-2026-FF02',
    sourceName: 'Mandi District Emergency Operations Center (Synthetic)',
    sourceType: 'first_responder',
    sourceUrl: 'https://synthetic.mandi.gov.example/emergency/ff02',
    eventType: 'flood',
    title: '[SYNTHETIC] Cloudburst in Mandi: Suketi Khad Bridge Damaged; Hospital Grid Secure',
    description:
      'Intense flash flood down Suketi Khad has washed away the approach slab of the Old Suketi Bridge on National Highway 21, halting vehicular traffic. Electricity transmission to District Hospital and Zonal Hospital remains fully operational via secondary line and backup gensets.',
    severity: 'severe',
    geographicInfo: {
      locationName: 'Suketi Khad, Mandi',
      adminRegion: 'Himachal Pradesh',
      country: 'India',
      coordinates: { latitude: 31.708, longitude: 76.932 },
      affectedRadiusKm: 10,
      affectedAreaDescription: 'Suketi Khad confluence and Old Bridge bypass'
    },
    publishedAt: new Date('2026-10-23T01:30:00.000Z'),
    updatedAtSource: new Date('2026-10-23T02:15:00.000Z'),
    eventOccurredAt: new Date('2026-10-23T00:50:00.000Z'),
    retrievedAt: new Date('2026-10-23T02:30:00.000Z'),
    rawPayload: { bridgeStatus: 'impassable', hospitalPowerStatus: '100% operational' },
    isSynthetic: true
  },

  // Scenario G - Source 1 (Supporting general event): NDRF Flood Report for Kosi basin
  {
    syntheticId: 'synth-incident-008',
    sourceReportId: 'NDRF-SYNTH-2026-KS01',
    sourceName: 'National Disaster Response Force Bihar Zone (Synthetic)',
    sourceType: 'emergency_management',
    sourceUrl: 'https://synthetic.ndrf.gov.example/reports/2026/KS01',
    eventType: 'flood',
    title: '[SYNTHETIC] Kosi River Flooding — Supaul District Affected',
    description:
      'Heavy flooding in Supaul district due to Kosi River breaching embankment at Birpur. Villages in Basantpur block inundated. NDRF teams deployed. No confirmed fatalities as of this report.',
    severity: 'severe',
    geographicInfo: {
      locationName: 'Birpur, Supaul',
      adminRegion: 'Bihar',
      country: 'India',
      coordinates: { latitude: 26.591, longitude: 86.615 },
      affectedRadiusKm: 30,
      affectedAreaDescription: 'Basantpur block and surrounding low-lying villages'
    },
    publishedAt: new Date('2026-10-23T09:00:00.000Z'),
    updatedAtSource: new Date('2026-10-23T10:30:00.000Z'),
    eventOccurredAt: new Date('2026-10-23T06:00:00.000Z'),
    retrievedAt: new Date('2026-10-23T10:45:00.000Z'),
    rawPayload: { embankmentStatus: 'breached', fatalitiesConfirmed: 0 },
    isSynthetic: true
  },

  // Scenario G - Source 2 (Contradicting casualty claim): State Disaster Management
  {
    syntheticId: 'synth-incident-009',
    sourceReportId: 'SDMA-BIHAR-SYNTH-2026-FL03',
    sourceName: 'Bihar State Disaster Management Authority (Synthetic)',
    sourceType: 'official_agency',
    sourceUrl: 'https://synthetic.bihar.gov.example/sdma/2026/FL03',
    eventType: 'flood',
    title: '[SYNTHETIC] Bihar Flood Situation Report: No Confirmed Flood Deaths in Supaul District',
    description:
      'Official situation report from Bihar SDMA confirms flooding in Supaul district (Kosi breach at Birpur). As of this report, there are zero confirmed fatalities. Casualty figures circulating on social media are unverified and contradicted by field reports from NDRF teams on ground.',
    severity: 'severe',
    geographicInfo: {
      locationName: 'Supaul district',
      adminRegion: 'Bihar',
      country: 'India',
      coordinates: { latitude: 26.59, longitude: 86.60 },
      affectedRadiusKm: 35,
      affectedAreaDescription: 'Kosi basin flood zone'
    },
    publishedAt: new Date('2026-10-23T11:00:00.000Z'),
    updatedAtSource: new Date('2026-10-23T11:15:00.000Z'),
    eventOccurredAt: new Date('2026-10-23T06:00:00.000Z'),
    retrievedAt: new Date('2026-10-23T11:30:00.000Z'),
    rawPayload: { fatalitiesConfirmed: 0, socialMediaClaimsStatus: 'contradicted' },
    isSynthetic: true
  }
];

export const syntheticClaims = [
  // Scenario A: Claim consistent with an official report
  {
    syntheticId: 'synth-claim-001',
    originalText:
      'Water levels have crossed danger marks on the Teesta River near Domohani Jalpaiguri. Flood waters are entering farm fields and low villages!',
    sourcePlatform: 'twitter',
    authorId: '@bengal_weather_watcher',
    authorDisplayName: 'Bengal Weather Watch (Synthetic)',
    publishedAt: new Date('2026-10-21T05:10:00.000Z'),
    claimedLocation: {
      rawText: 'Domohani, Jalpaiguri, West Bengal',
      city: 'Jalpaiguri',
      region: 'West Bengal',
      country: 'India',
      coordinates: { latitude: 26.54, longitude: 88.72 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-001-1',
        claimText: 'Teesta River water levels have crossed danger marks near Domohani Jalpaiguri',
        subject: 'Teesta River water levels',
        predicate: 'have crossed danger mark',
        object: 'at Domohani Jalpaiguri',
        claimedLocation: { city: 'Jalpaiguri', region: 'West Bengal' },
        claimedTimestamp: new Date('2026-10-21T05:00:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  },

  // Scenario B: Claim with inflated magnitude & casualties where sources disagree on fine details
  {
    syntheticId: 'synth-claim-002',
    originalText:
      'MASSIVE 7.2 Richter earthquake just hit Chamoli Uttarakhand! Entire towns flattened and hundreds feared dead. Please pray!',
    sourcePlatform: 'telegram',
    authorId: 'tg_crisis_feed_synthetic',
    authorDisplayName: 'Himalayan Breaking Alerts (Synthetic)',
    publishedAt: new Date('2026-10-22T08:25:00.000Z'),
    claimedLocation: {
      rawText: 'Chamoli, Uttarakhand',
      city: 'Chamoli',
      region: 'Uttarakhand',
      country: 'India',
      coordinates: { latitude: 30.29, longitude: 79.52 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-002-1',
        claimText: 'Magnitude 7.2 earthquake struck Chamoli Uttarakhand',
        subject: 'Chamoli earthquake',
        predicate: 'had magnitude',
        object: '7.2 Richter',
        claimedLocation: { city: 'Chamoli', region: 'Uttarakhand' },
        claimedTimestamp: new Date('2026-10-22T08:15:00.000Z')
      },
      {
        atomicClaimId: 'atom-002-2',
        claimText: 'Entire towns flattened and hundreds dead in Chamoli',
        subject: 'Damage impact',
        predicate: 'flattened entire towns with hundreds dead',
        object: 'hundreds dead',
        claimedLocation: { city: 'Chamoli' },
        claimedTimestamp: new Date('2026-10-22T08:20:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  },

  // Scenario C: Old alert cited after newer update superseded it (Outdated claim)
  {
    syntheticId: 'synth-claim-003',
    originalText:
      'EVACUATE NOW: Government Red Alert order in place for Paradip coast right now. Cyclone Sagar will hit Paradip directly tonight with 160 kmph winds!',
    sourcePlatform: 'whatsapp',
    authorId: null, // forwarded message with no traceable author
    authorDisplayName: null,
    publishedAt: new Date('2026-10-20T16:30:00.000Z'), // Published hours after 14:00 stand-down bulletin
    claimedLocation: {
      rawText: 'Paradip Port, Odisha',
      city: 'Paradip',
      region: 'Odisha',
      country: 'India',
      coordinates: { latitude: 20.316, longitude: 86.611 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-003-1',
        claimText: 'Mandatory evacuation order is currently active for Paradip coast due to Cyclone Sagar',
        subject: 'Evacuation order',
        predicate: 'is currently active',
        object: 'Paradip coast',
        claimedLocation: { city: 'Paradip', region: 'Odisha' },
        claimedTimestamp: new Date('2026-10-20T16:30:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  },

  // Scenario D: Geographic Mismatch (Wildfire 78 km away claimed in Shimla center)
  {
    syntheticId: 'synth-claim-004',
    originalText:
      'Horrific forest fire has now reached Shimla city center! Mall Road is engulfed in flames and sirens blaring everywhere.',
    sourcePlatform: 'facebook',
    authorId: 'fb_synthetic_tourist_board',
    authorDisplayName: 'Shimla Traveller Diary (Synthetic)',
    publishedAt: new Date('2026-10-22T12:00:00.000Z'),
    claimedLocation: {
      rawText: 'Mall Road, Shimla, Himachal Pradesh',
      city: 'Shimla',
      region: 'Himachal Pradesh',
      country: 'India',
      coordinates: { latitude: 31.104, longitude: 77.173 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-004-1',
        claimText: 'Forest fire has engulfed Shimla Mall Road in the city center',
        subject: 'Forest fire',
        predicate: 'engulfed',
        object: 'Shimla Mall Road city center',
        claimedLocation: { city: 'Shimla', region: 'Himachal Pradesh' },
        claimedTimestamp: new Date('2026-10-22T12:00:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  },

  // Scenario E: Insufficient Information / Unverified rumor
  {
    syntheticId: 'synth-claim-005',
    originalText:
      'URGENT ALERT: Auxiliary spillway gate 4 at Bhadra dam collapsed 20 minutes ago. 50,000 cusecs surging downstream towards Tarikere, evacuate immediately!',
    sourcePlatform: 'whatsapp',
    authorId: null,
    authorDisplayName: null,
    publishedAt: new Date('2026-10-23T06:00:00.000Z'),
    claimedLocation: {
      rawText: 'Bhadra Dam, Tarikere, Karnataka',
      city: 'Tarikere',
      region: 'Karnataka',
      country: 'India',
      coordinates: { latitude: 13.708, longitude: 75.642 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-005-1',
        claimText: 'Auxiliary spillway gate 4 collapsed at Bhadra dam causing 50,000 cusecs surge',
        subject: 'Bhadra dam spillway gate 4',
        predicate: 'collapsed with sudden surge',
        object: '50000 cusecs downstream flood',
        claimedLocation: { city: 'Tarikere', region: 'Karnataka' },
        claimedTimestamp: new Date('2026-10-23T05:40:00.000Z')
      }
    ],
    processingStatus: 'pending',
    isSynthetic: true
  },

  // Scenario F: Multiple atomic claims in one social media post
  {
    syntheticId: 'synth-claim-006',
    originalText:
      'Cloudburst destruction in Mandi: The Suketi highway bridge has collapsed into the river AND the entire district power grid is dead with hospitals in total darkness!',
    sourcePlatform: 'twitter',
    authorId: '@himachal_live_news',
    authorDisplayName: 'Himachal Live Updates (Synthetic)',
    publishedAt: new Date('2026-10-23T02:00:00.000Z'),
    claimedLocation: {
      rawText: 'Mandi, Himachal Pradesh',
      city: 'Mandi',
      region: 'Himachal Pradesh',
      country: 'India',
      coordinates: { latitude: 31.708, longitude: 76.932 }
    },
    atomicClaims: [
      {
        atomicClaimId: 'atom-006-1',
        claimText: 'The Suketi highway bridge in Mandi has collapsed into the river',
        subject: 'Suketi highway bridge',
        predicate: 'collapsed into river',
        object: 'traffic halted',
        claimedLocation: { city: 'Mandi' },
        claimedTimestamp: new Date('2026-10-23T01:15:00.000Z')
      },
      {
        atomicClaimId: 'atom-006-2',
        claimText: 'Entire Mandi district power grid collapsed leaving hospitals in total darkness',
        subject: 'Hospital power grid',
        predicate: 'collapsed leaving hospitals in total darkness',
        object: 'complete blackout',
        claimedLocation: { city: 'Mandi' },
        claimedTimestamp: new Date('2026-10-23T01:30:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  },

  // Scenario G: One post with two atoms — tests CONFLICTING-over-VERIFIED precedence
  //   atom-007-1: Kosi flood location — has BOTH supporting (NDRF) AND contradicting (SDMA
  //               casualty denial). Engine must return Conflicting, not Verified.
  //   atom-007-2: "200 deaths" detail — NDRF report confirms flood but reports zero fatalities;
  //               no evidence explicitly corroborates the specific 200 figure → Unverified
  //               (material detail not confirmed by linked evidence).
  {
    syntheticId: 'synth-claim-007',
    originalText:
      'Kosi river floods have inundated Supaul district in Bihar. At least 200 people have died according to locals.',
    sourcePlatform: 'facebook',
    authorId: 'fb_synthetic_bihar_news',
    authorDisplayName: 'Bihar Flood Watch (Synthetic)',
    publishedAt: new Date('2026-10-23T12:00:00.000Z'),
    claimedLocation: {
      rawText: 'Supaul, Bihar',
      city: 'Supaul',
      region: 'Bihar',
      country: 'India',
      coordinates: { latitude: 26.591, longitude: 86.615 }
    },
    atomicClaims: [
      {
        // Has BOTH supporting (NDRF confirms Kosi flooding at Supaul) AND contradicting
        // (SDMA denies casualty claims circulating on social media) evidence.
        // Engine must apply CONFLICTING-over-VERIFIED precedence.
        atomicClaimId: 'atom-007-1',
        claimText: 'Kosi river floods have inundated Supaul district in Bihar',
        subject: 'Kosi river floods',
        predicate: 'have inundated',
        object: 'Supaul district Bihar',
        claimedLocation: { city: 'Supaul', region: 'Bihar' },
        claimedTimestamp: new Date('2026-10-23T11:00:00.000Z')
      },
      {
        // "200 deaths" is a specific material detail. NDRF confirms the flood and
        // reports zero confirmed fatalities — the detail is not corroborated.
        // No evidence record with role "supporting" links to this atom → Unverified.
        atomicClaimId: 'atom-007-2',
        claimText: 'At least 200 people have died in the Kosi flooding in Supaul',
        subject: 'Kosi flood fatalities',
        predicate: 'died',
        object: 'at least 200 people',
        claimedLocation: { city: 'Supaul', region: 'Bihar' },
        claimedTimestamp: new Date('2026-10-23T11:30:00.000Z')
      }
    ],
    processingStatus: 'completed',
    isSynthetic: true
  }
];

export const syntheticEvidence = [
  // Evidence for Claim 1 (Supporting Teesta Flood)
  {
    syntheticId: 'synth-evidence-001',
    claimSyntheticId: 'synth-claim-001',
    atomicClaimId: 'atom-001-1',
    incidentReportSyntheticIds: ['synth-incident-001'],
    excerpts: [
      {
        excerptText:
          'River Teesta at Domohani (Jalpaiguri district) has exceeded the Extreme Danger Level by 0.42m... Embankment overtopping reported in low-lying villages.',
        sourceRef: 'CWC-SYNTH-2026-FL01',
        sourceName: 'Central Water Commission (Synthetic)',
        url: 'https://synthetic.cwc.gov.example/bulletins/2026/FL01'
      }
    ],
    role: 'supporting',
    evidenceTimestamp: new Date('2026-10-21T06:00:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 0.5,
      notes: 'Gauge station located at Domohani directly corresponds with claimed location.'
    },
    explanation:
      'Official gauge bulletin confirms Teesta River has exceeded danger mark at Domohani and is overtopping embankments, directly corroborating the user claim.',
    isSynthetic: true
  },

  // Evidence for Claim 2 (Contradicting Inflated M7.2 Earthquake Claim)
  {
    syntheticId: 'synth-evidence-002',
    claimSyntheticId: 'synth-claim-002',
    atomicClaimId: 'atom-002-1',
    incidentReportSyntheticIds: ['synth-incident-002', 'synth-incident-003'],
    excerpts: [
      {
        excerptText: 'M 5.4 - 28 km SE of Chamoli, Uttarakhand recorded at 10.0 km depth. Light to moderate shaking.',
        sourceRef: 'USGS-SYNTH-2026-EQ44',
        sourceName: 'USGS Earthquake Hazards Program (Synthetic)',
        url: 'https://synthetic.usgs.example/earthquakes/2026/eq44'
      },
      {
        excerptText:
          'Earthquake of Magnitude 5.5 occurred at depth of 12 km in Chamoli district... no major building collapses reported.',
        sourceRef: 'NCS-SYNTH-2026-0912',
        sourceName: 'National Center for Seismology (Synthetic)',
        url: 'https://synthetic.seismo.gov.example/reports/20260912'
      }
    ],
    role: 'contradicting',
    evidenceTimestamp: new Date('2026-10-22T08:35:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 4.2,
      notes: 'Epicenter localized within Chamoli district.'
    },
    explanation:
      'Both USGS (M5.4) and NCS (M5.5) independently measure the earthquake between M5.4 and M5.5 with no major collapses, contradicting the claim of an M7.2 catastrophe with hundreds dead.',
    isSynthetic: true
  },

  // Evidence for Claim 3 (Outdated Cyclone Evacuation)
  // supersedes: true — the curator explicitly attests that Bulletin 06 cancels Bulletin 03,
  // making the claim outdated. The engine uses this structural flag; keyword matching is
  // NOT the primary mechanism.
  {
    syntheticId: 'synth-evidence-003',
    claimSyntheticId: 'synth-claim-003',
    atomicClaimId: 'atom-003-1',
    incidentReportSyntheticIds: ['synth-incident-004', 'synth-incident-005'],
    excerpts: [
      {
        excerptText:
          'Cyclone Sagar has recurved sharply east-northeastward over deep Bay of Bengal... Red Alert withdrawn for Paradip.',
        sourceRef: 'IMD-SYNTH-2026-CYC06',
        sourceName: 'IMD Cyclone Warning Division (Synthetic)',
        url: 'https://synthetic.mausam.gov.example/cyclone/bulletin06'
      }
    ],
    role: 'contradicting',
    supersedes: true,
    evidenceTimestamp: new Date('2026-10-20T14:00:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 0.0,
      notes: 'Direct match for Paradip Port coastal sector.'
    },
    explanation:
      'Bulletin 06 (14:00 UTC) explicitly cancelled the mandatory evacuation order that was in effect under Bulletin 03 (06:00 UTC). The claim was published at 16:30 UTC — after the cancellation — making its assertion that the evacuation is currently active outdated and incorrect.',
    isSynthetic: true
  },

  // Evidence for Claim 4 (Contradicting Geographic Mismatch)
  {
    syntheticId: 'synth-evidence-004',
    claimSyntheticId: 'synth-claim-004',
    atomicClaimId: 'atom-004-1',
    incidentReportSyntheticIds: ['synth-incident-006'],
    excerpts: [
      {
        excerptText:
          'Pine forest fire near Chirgaon in northern Rohru block has been 85% contained... No spread towards Jubbal or Shimla municipal areas.',
        sourceRef: 'HP-SDMA-SYNTH-2026-WF19',
        sourceName: 'Himachal SDMA (Synthetic)',
        url: 'https://synthetic.hpsdma.gov.example/alerts/wf19'
      }
    ],
    role: 'contradicting',
    evidenceTimestamp: new Date('2026-10-22T13:30:00.000Z'),
    geographicRelevance: {
      locationMatched: false,
      distanceKm: 78.4,
      notes: 'Active wildfire perimeter in Chirgaon, Rohru is ~78 km northeast of Shimla Mall Road.'
    },
    explanation:
      'The only recorded active forest fire is in the Rohru sector 78 km away. Emergency authorities explicitly confirm that Shimla city limits are completely unimpacted.',
    isSynthetic: true
  },

  // Evidence for Claim 5 (Insufficient information for Bhadra Dam rumor)
  {
    syntheticId: 'synth-evidence-005',
    claimSyntheticId: 'synth-claim-005',
    atomicClaimId: 'atom-005-1',
    incidentReportSyntheticIds: [],
    excerpts: [],
    role: 'insufficient',
    evidenceTimestamp: new Date('2026-10-23T06:15:00.000Z'),
    geographicRelevance: {
      locationMatched: null,
      distanceKm: null,
      notes: 'No official incident report found for Bhadra reservoir within 24 hours.'
    },
    explanation:
      'Cross-examination against water resources and disaster management feeds found zero records of spillway damage or emergency water release at Bhadra Dam.',
    isSynthetic: true
  },

  // Evidence for Claim 6, Atomic Claim 1 (Supporting Suketi Bridge Damage)
  {
    syntheticId: 'synth-evidence-006',
    claimSyntheticId: 'synth-claim-006',
    atomicClaimId: 'atom-006-1',
    incidentReportSyntheticIds: ['synth-incident-007'],
    excerpts: [
      {
        excerptText:
          'Flash flood down Suketi Khad has washed away the approach slab of the Old Suketi Bridge on National Highway 21, halting vehicular traffic.',
        sourceRef: 'MANDI-DEOC-SYNTH-2026-FF02',
        sourceName: 'Mandi District Emergency Operations Center (Synthetic)',
        url: 'https://synthetic.mandi.gov.example/emergency/ff02'
      }
    ],
    role: 'supporting',
    evidenceTimestamp: new Date('2026-10-23T02:15:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 0.1,
      notes: 'Old Suketi Bridge on NH21 in Mandi.'
    },
    explanation:
      'Official district operations alert corroborates that the approach slab of the Suketi Bridge was washed away by flash floods.',
    isSynthetic: true
  },

  // Evidence for Claim 6, Atomic Claim 2 (Contradicting Hospital Power Blackout)
  {
    syntheticId: 'synth-evidence-007',
    claimSyntheticId: 'synth-claim-006',
    atomicClaimId: 'atom-006-2',
    incidentReportSyntheticIds: ['synth-incident-007'],
    excerpts: [
      {
        excerptText:
          'Electricity transmission to District Hospital and Zonal Hospital remains fully operational via secondary line and backup gensets.',
        sourceRef: 'MANDI-DEOC-SYNTH-2026-FF02',
        sourceName: 'Mandi District Emergency Operations Center (Synthetic)',
        url: 'https://synthetic.mandi.gov.example/emergency/ff02'
      }
    ],
    role: 'contradicting',
    evidenceTimestamp: new Date('2026-10-23T02:15:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 1.2,
      notes: 'Mandi hospital district zone.'
    },
    explanation:
      'The claim asserts that hospitals are in total darkness, but the emergency operations center confirms secondary power lines and backup generators are maintaining 100% electricity supply to hospitals.',
    isSynthetic: true
  },

  // Evidence for Claim 7, Atom 1 (Scenario G — CONFLICTING-over-VERIFIED precedence test)
  // Supporting: NDRF confirms the Kosi flood event at Supaul.
  // Contradicting: SDMA explicitly denies the casualty count circulating on social media.
  // Both are linked to atom-007-1. Engine must return Conflicting, not Verified.
  {
    syntheticId: 'synth-evidence-008',
    claimSyntheticId: 'synth-claim-007',
    atomicClaimId: 'atom-007-1',
    incidentReportSyntheticIds: ['synth-incident-008'],
    excerpts: [
      {
        excerptText:
          'Heavy flooding in Supaul district due to Kosi River breaching embankment at Birpur. NDRF teams deployed.',
        sourceRef: 'NDRF-SYNTH-2026-KS01',
        sourceName: 'National Disaster Response Force Bihar Zone (Synthetic)',
        url: 'https://synthetic.ndrf.gov.example/reports/2026/KS01'
      }
    ],
    role: 'supporting',
    evidenceTimestamp: new Date('2026-10-23T10:30:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 0.3,
      notes: 'NDRF report covers Supaul district Kosi breach zone directly.'
    },
    explanation:
      'NDRF field report confirms Kosi River has breached the embankment at Birpur and Supaul district is inundated, directly corroborating the flood location claim.',
    isSynthetic: true
  },
  {
    syntheticId: 'synth-evidence-009',
    claimSyntheticId: 'synth-claim-007',
    atomicClaimId: 'atom-007-1',
    incidentReportSyntheticIds: ['synth-incident-009'],
    excerpts: [
      {
        excerptText:
          'As of this report, there are zero confirmed fatalities. Casualty figures circulating on social media are unverified and contradicted by field reports.',
        sourceRef: 'SDMA-BIHAR-SYNTH-2026-FL03',
        sourceName: 'Bihar State Disaster Management Authority (Synthetic)',
        url: 'https://synthetic.bihar.gov.example/sdma/2026/FL03'
      }
    ],
    role: 'contradicting',
    supersedes: false,
    evidenceTimestamp: new Date('2026-10-23T11:00:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 1.5,
      notes: 'Bihar SDMA covers Supaul district in its official situation report.'
    },
    explanation:
      'Bihar SDMA official situation report explicitly states zero confirmed fatalities and contradicts social media casualty claims. While the flood event is confirmed, the associated social media narrative of casualties is not corroborated by official ground data.',
    isSynthetic: true
  },

  // Evidence for Claim 7, Atom 2 (Scenario G — material detail / unsupported casualty count)
  // The NDRF report confirms the flood but explicitly reports zero fatalities.
  // This atom claims "200 people have died" — the general event is confirmed but the
  // specific death toll detail is not supported. No evidence with role="supporting" is
  // linked to atom-007-2. Role is "insufficient" to correctly produce Unverified.
  {
    syntheticId: 'synth-evidence-010',
    claimSyntheticId: 'synth-claim-007',
    atomicClaimId: 'atom-007-2',
    incidentReportSyntheticIds: ['synth-incident-008', 'synth-incident-009'],
    excerpts: [
      {
        excerptText:
          'No confirmed fatalities as of this report. NDRF teams on ground have not reported any casualties.',
        sourceRef: 'NDRF-SYNTH-2026-KS01',
        sourceName: 'National Disaster Response Force Bihar Zone (Synthetic)',
        url: 'https://synthetic.ndrf.gov.example/reports/2026/KS01'
      }
    ],
    role: 'insufficient',
    evidenceTimestamp: new Date('2026-10-23T10:30:00.000Z'),
    geographicRelevance: {
      locationMatched: true,
      distanceKm: 0.3,
      notes: 'NDRF covers Supaul zone but reports zero fatalities — the specific death toll is unverifiable.'
    },
    explanation:
      'The NDRF field report confirms the Kosi flood event but explicitly records zero confirmed fatalities. The specific claim of 200 deaths has no corroborating authoritative source. The general event is confirmed but this specific material detail remains unverified.',
    isSynthetic: true
  }
];
