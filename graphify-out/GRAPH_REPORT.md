# Graph Report - fat-cat-cartel  (2026-10-07)

## Corpus Check
- 462 files · ~2,350,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2883 nodes · 5764 edges · 181 communities (156 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9284180a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Dragonwilds: phased implementation checklist
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 125
- types.ts
- profile.ts
- Meowket Board Implementation
- Crafting Board Implementation
- Project Reference
- Admin Auth Implementation
- Database Cleanup Inventory
- Raid Stats Implementation
- Website Overview
- Firebase Data And Costs
- Frontend Patterns
- Fat Cat Cartel
- Calendar Events Implementation
- Game Server Dashboard Progress
- adminFunctions.ts
- cloudWatchQuery
- BestProgressByEncounter
- refresh-fc-collection.ts
- PalworldStartupStatus.tsx
- PalworldServerIndexCard.tsx
- updateMonthlyCostSnapshot
- SpudJarPage.tsx
- PalworldActivityTimeline.tsx
- describeGameServerInstance
- PalworldPlayerField.tsx
- PalworldCostSummary.tsx
- describePalworldInstance
- RuneScape: Dragonwilds implementation plan
- accessEntryFromValue
- game-servers.test.ts
- cloudWatchQuery
- scrape-lodestone.ts
- avatar.tsx
- getGameServerAccessStatusForIdentity
- cleanText
- 4. Proposed implementation
- Phase 4: build the Dragonwilds page and online board
- types.ts
- Dragonwilds Phase 7 release handoff
- PalworldActivityTimeline.tsx
- game-server-access-lifecycle.test.mjs
- ucob-animations.test.mjs

## God Nodes (most connected - your core abstractions)
1. `formatGil()` - 35 edges
2. `registerDefaultHandlers()` - 28 edges
3. `ContentType` - 25 edges
4. `MemberData` - 25 edges
5. `callAdminFunction()` - 24 edges
6. `compilerOptions` - 22 edges
7. `calculateMeowketProfitForAdmin()` - 21 edges
8. `formatQuantity()` - 20 edges
9. `useAdminAuth()` - 19 edges
10. `ZoneEncounter` - 18 edges

## Surprising Connections (you probably didn't know these)
- `useAdminAuth()` --indirect_call--> `login()`  [INFERRED]
  src/features/admin/hooks/useAdminAuth.ts → tests/dragonwilds-dashboard.test.mjs
- `createDragonwildsController()` --indirect_call--> `refreshStatus()`  [INFERRED]
  src/features/gameserver/hooks/dragonwildsController.ts → tests/dragonwilds-dashboard.test.mjs
- `createDragonwildsController()` --indirect_call--> `runAction()`  [INFERRED]
  src/features/gameserver/hooks/dragonwildsController.ts → tests/dragonwilds-dashboard.test.mjs
- `mapUcobProgressionRows()` --indirect_call--> `progress()`  [INFERRED]
  functions/src/ucob-progress.ts → src/lib/db.stub.ts
- `render()` --references--> `react`  [EXTRACTED]
  tests/ucob-progress-client.test.mjs → package.json

## Import Cycles
- None detected.

## Communities (181 total, 25 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (58): CachePayload, CollectiblesValue, MembersValue, useFCCollection(), CollectibleDetailDialog(), CollectibleDetailDialogProps, isMount(), animateFilterClick() (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (57): approveCalendarEventRequest(), createRaidHelperEvent(), denyCalendarEventRequest(), listCalendarEventRequests(), submitCalendarEventRequest(), readCalendarData(), CalendarHeader(), CalendarMonthList() (+49 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (93): parsePort(), acceptCraftingRequest, addSpudJarComplaints, adminAppOrigin, adminAuthConfigWithSingleMemberRole(), adminAuthConfigWithSingleMemberRoleAndHousecat(), approveCalendarEventRequest, autoStopIdleGameServers (+85 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (74): assertAuthenticated(), assertCapability(), assertDevLayer(), assertGameServerAccess(), CalendarRequest, CalendarRequestCreator, CalendarStore, callDevAdminFunction() (+66 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (52): acceptCraftingRequestForMember(), addEligibleCrafters(), arrayValue(), cleanText(), closeCraftingRequestForMember(), commissionText(), completeCraftingRequestForMember(), craftingBoardUrl() (+44 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (22): chooseClubhousePoint(), clampClubhousePoint(), clubhouseTravelMs(), getClubhouseBounds(), getClubhouseFootprint(), getClubhouseGeometry(), getClubhouseHatCorners(), isInsideClubhousePolygon() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (43): ButtonStyle, clearChannelErrorMessage(), ClearChannelResult, clearChannelResultMessage(), clearRecentChannelMessages(), ComponentType, confirmClearChannelComponents(), deferredEphemeral() (+35 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (43): ActivityChartType, activityLabel(), COLLECTIBLE_META, dayKey(), displayJobName(), EMPTY_PROFILE, EmptyChart(), encodeBirthday() (+35 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (39): firebase, AnyFn, Callback, getAtPath(), listeners, makeSnapshot(), maxedJobLevels(), notifyPath() (+31 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (29): ActivityPayload, ActivityRow, CompactActivity, compactProfile(), computeMostPlayedJobs(), configuredEncountersByCanonical(), emptyEncounterSummary(), fetchRecentActivity() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (35): ALLOWED_RAID_HELPER_PING_ROLE_IDS, approveCalendarEventRequest(), CalendarEventRequest, CalendarEventRequestCreator, CalendarEventRequestNotification, CalendarEventRequestNotificationConfig, CalendarEventRequestRecord, cleanText() (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (44): AdminAuthConfig, AdminOAuthStartConfig, AdminSession, applyDevRoleOverride(), assertDevRoleOverrideSafety(), authenticatedSessionRecordIsValid(), cookieIsSecure(), cookieValue() (+36 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (29): getFFLogsToken(), TokenCache, buildCharacterZonesQuery(), DIFFICULTY, queryFFLogs(), AllStars, buildCharacterParseEntries(), CharacterRankings (+21 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (20): readMemberProfiles(), MemberCard(), MembersPage(), JOB_ICON_SLUG, JOB_MAX_LEVELS, RANK_SORT_ORDER, useMemberProfiles(), useMembersGridAnimation() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (27): MountRouletteControls(), LoadingSkeleton(), MountRoulettePage(), MountResultDialog(), drawWheel(), SpinWheel(), CAT_POSITIONS, EXPANSIONS (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (31): deleteMember(), importLodestoneMembers(), refreshMemberSource(), triggerFCCollectionRefresh(), triggerFFLogsRefresh(), triggerTomestoneRaidStatsRefresh(), updateMemberProfileAdmin(), upsertMember() (+23 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (27): acceptCraftingRequest(), byCompletedAtDesc(), byUpdatedAtDesc(), closeCraftingRequest(), completeCraftingRequest(), CRAFTING_REQUEST_PATHS, CraftingLifecycleInput, CraftingMemberTotals (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (27): FriendRefreshJob, processFriendRefreshJob(), runSource(), assertRefreshableMember(), MemberSourceResult, MemberSourceSecrets, parseRequest(), refreshLodestoneMember() (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (26): collectPrecrafts(), CRAFT_TYPE_TO_JOB, CraftingIngredient, CraftingPrecraftSnapshot, CraftingSearchItem, fetchRecipeById(), fetchRecipeByOutputItemId(), groupRecipesByItem() (+18 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (26): CartFill, CRAFT_TYPE_TO_JOB, MaterialResolution, MeowketItemSearchResult, MeowketMaterial, MeowketMaterialCategory, MeowketProfitResult, MeowketWorld (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (26): Sidebar, SidebarContent, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+18 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (20): calculateMeowketProfit(), LOCAL_MEOWKET_RESULTS, localSearch(), MOCK_MEOWKET_SEARCH_RESULTS, searchMeowketItems(), ItemIcon(), ItemSearchDialog(), SelectedCraftCard() (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (20): MaterialsTable(), MeowketBoardPage(), TheDonPanel(), prefersReducedMotion(), useEntranceAnimation(), useStaggeredEntrance(), useMeowketCalculation(), useMeowketCart() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.19
Nodes (17): MeowketCartPopover(), ProfitWaterfallChart(), profitWaterfallData(), ProfitWaterfallDatum, WaterfallTooltip(), SellPriceByWorldChart(), SellRecommendationCard(), MeowketCartSummary (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (28): dependencies, animejs, class-variance-authority, clsx, cmdk, echarts, echarts-for-react, embla-carousel-react (+20 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (9): CalendarSyncStatus(), MemberSyncToolbar(), MemberSyncToolbarProps, parseStatus(), useCalendarSyncStatus(), CalendarSyncStatusProps, CalendarSyncStatusState, DATE_TIME_FORMATTER (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (16): CompletedRequestButton(), LanePagination(), RequestCard(), ItemIcon(), CraftingRequestDashboardRecord, CraftingRequestMember, completedByMember(), sameCraftingMember() (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (22): Props, Props, Props, coord(), MemberRadarChart(), polygonPath(), Props, Props (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+16 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (12): EligibleCrafters(), CrafterChip(), MemberAvatar(), MemberLine(), CraftingEligibleCrafter, safeArray(), combinedEligibility(), CombinedEligibleCrafter (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (25): adminRoute, calendarRoute, craftingBoardRoute, dragonwildsServerRoute, easter2026Route, fcCollectionRoute, fcLeaderboardRoute, fcTypeRoute (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (17): BestPerJobCarousel(), getBestPerJob(), JobEntry, maxWidthForStaticSlides(), bestPrimary(), MemberBoard(), primaryParses(), SortKey (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (23): CLUBHOUSE_HAT_IDS, deleteEasterParticipantAdmin(), EasterParticipantRequest, FAVORITE_CONTENT_OPTIONS, FC_RANKS, FFXIV_JOBS, isValidBirthday(), parseClubhouseHat() (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (19): AdminAuth, devAuthSnapshot(), devSessionFromPersona(), localDevSession, removeAdminHashParams(), requestAdminSession(), subscribers, updateAuthSnapshot() (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): useScoreboard(), UseScoreboardResult, EventCard(), EventCardProps, PointRule, PrizeRule, HideAndSeekDialog(), instructionImages (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (25): MemberDeleteDialog(), MemberDeleteDialogProps, MemberRosterTable(), MemberRosterTableProps, StatusCell(), AdminAuthState, AdminMember, AdminPageShellProps (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (10): RequestedItem(), CRAFTING_MATERIAL_STATUSES, CRAFTING_REQUEST_STATUSES, CraftingDiscordMessageMetadata, CraftingPrecraftSnapshot, CraftingRequestCommission, CraftingRequestDashboardData, CraftingRequestDashboardItem (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (23): countIndexRecords(), DashboardIndexValue, DbSnapshot, readHomeCraftingStatus(), readHomeWeeklyData(), useHomeDashboardData(), HomeCraftingStatus, HomeNextBirthdaySummary (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (20): groups, MainJobsPicker(), JobIcon(), ActivityChartType, COLLECTIBLE_META, EMPTY_PROFILE, JOB_ABBR, JOB_ICON_SLUG (+12 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (11): HomePage(), NewspaperSectionLabel(), NoticeBoard(), OPERATION_TOOLS, OperationsPanel(), OperationTool, archiveImages, scrapbookImages (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (26): birthdayMessage(), BirthdayNotificationConfig, BirthdayRunResult, BirthdayTarget, claimBirthdayNotification(), cleanText(), DiscordMessageResponse, findBirthdayTargets() (+18 more)

### Community 43 - "Community 43"
Cohesion: 0.16
Nodes (17): applyOwnedMaterials(), calculateMeowketProfitForAdmin(), collectFlattenedMaterials(), compactSearchResults(), estimateSellPrice(), isCostedMaterial(), materialCategory(), materialFromIngredient() (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.32
Nodes (13): MaterialIcon(), MaterialRow(), SupplyBadge(), MeowketMaterial, formatQuantity(), actualCostTooltip(), effectiveUnitTooltip(), materialLabel() (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (15): MeowketCartBatch, allUsedListingKeys(), buildCartBatch(), buildCartShoppingList(), buildCartSummary(), buildReplacementCartItem(), buildReplacementListings(), buildShoppingRouteGroups() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.21
Nodes (10): TomestoneActivitySection(), DIFFICULTY_BADGE, Props, RecentKillCard(), timeAgo(), LoadingSkeleton(), RaidStatsTabButton(), RaidStatsPage() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (18): dependencies, @aws-sdk/client-ec2, @aws-sdk/client-ssm, firebase-admin, firebase-functions, devDependencies, @types/node, typescript (+10 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (23): actionLabels, DragonwildsActivity(), resultLabels, DragonwildsConnectionPanel(), DragonwildsConnectionPanelProps, DragonwildsOnlineBoard(), DragonwildsDashboard(), Context (+15 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (18): ClassifiedLink(), ClippingCard(), FcHangoutCard(), FeaturedToolCard(), HomeWidgets(), excerptBio(), MemberSpotlightCard(), StatusBoardCard() (+10 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (14): formatDate(), KillTimeline(), Props, AllStars, EncounterKey, EncounterProgress, FirstKillData, ParseBuckets (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (12): CARD_COPY, CARD_ICONS, Props, RaidStatsHome(), EMPTY_ENCOUNTERS, useRaidStatsPageState(), ParseEntry, MemberIdentity (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @firebase/rules-unit-testing, globals, tailwindcss (+9 more)

### Community 53 - "Community 53"
Cohesion: 0.21
Nodes (8): batchRun(), batchRun(), CreateRequestDialog(), FCStats(), animations, fixture(), item(), leaf()

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (13): compileOnSave, compilerOptions, lib, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck (+5 more)

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (24): CartelClubhouse(), isSydneyNight(), sydneyHour, ClubhousePortrait, Props, CLUBHOUSE, HOME_NOTICES, HOME_QUICK_TOOLS (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.24
Nodes (9): saveOwnMemberProfile(), useProfileEditor(), ActivityChartType, CraftingProfileStats, MemberProfile, ProfileParseType, encodeBirthday(), parseBirthday() (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (8): Background, carpet, and door motion, Cartel Clubhouse handoff, Commands in this environment, Current product behavior, Data and scope, Files to inspect, Resume context, Verification status

### Community 58 - "Community 58"
Cohesion: 0.26
Nodes (8): MarketStatusCard(), MaterialCostByWorldChart(), materialCostByWorldData(), CART_ROUTE_WORLDS, formatChartGil(), formatRelativeTime(), shortGil(), shortGilWithUnit()

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (15): DeleteMemberRequest, deleteTrackedMember(), emptyBuckets(), ParseBuckets, ParseData, parseDeleteMemberRequest(), ParseEntry, percentileBucket() (+7 more)

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (11): react, Stepper(), useCarousel(), Collapsible(), CollapsibleContent(), CollapsibleContext, CollapsibleContextValue, CollapsibleTrigger() (+3 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 62 - "Community 62"
Cohesion: 0.24
Nodes (8): EMPTY_DASHBOARD_DATA, CraftingBoardPage(), LoadingBoard(), Metric(), CraftingRequestsState, useCraftingRequests(), CraftingMaterialStatus, isCraftingAdminSession()

### Community 63 - "Community 63"
Cohesion: 0.31
Nodes (6): JobIcon(), CRAFTING_JOB_ICON_SLUG, materialStatusLabels, RequestSectionConfig, jobIconMap, jobIconSrc()

### Community 64 - "Community 64"
Cohesion: 0.21
Nodes (8): AuthLinkHelpDialog(), AuthLinkHelpDialogProps, AuthLoginInstructionsDialog(), AuthLoginInstructionsDialogProps, InstructionSectionProps, AuthUserMenu(), AuthUserMenuProps, initials()

### Community 65 - "Community 65"
Cohesion: 0.20
Nodes (6): adminItem, AppSidebar(), bottomItems, navItems, progressItems, toolItems

### Community 66 - "Community 66"
Cohesion: 0.27
Nodes (10): CollectiblesData, CraftingProfileStats, DbSnapshot, EMPTY_CRAFTING_STATS, loadCollectiblesCache(), MemberProfileState, normalizeCollectibles(), normalizeCraftingStats() (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (3): ClubhouseHatPicker(), assets, ClubhouseHat()

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (11): buildSellConfidence(), confidenceLabel(), confidenceReason(), confidenceVerdict(), demandInsight(), donComment(), fetchSellConfidence(), formatHistoryTime() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.42
Nodes (8): cacheKey(), loadCachedZone(), saveCachedZone(), fetchRaidStatsZone(), fetchRaidStatsZoneLastUpdated(), RaidStatsState, useRaidStats(), ZoneData

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (6): StepperContent(), StepperContext, StepperContextValue, StepperItem(), StepperTrigger(), useStepper()

### Community 73 - "Community 73"
Cohesion: 0.13
Nodes (13): AdminPage(), formatTimestamp(), GameServerAccessForm(), GameServerAccessManager(), GameServerAccessManagerProps, AdminHeader(), AdminHeaderProps, EasterEventCard() (+5 more)

### Community 74 - "Community 74"
Cohesion: 0.23
Nodes (8): deleteEasterParticipantAdmin(), upsertEasterParticipantAdmin(), ParticipantCard(), ParticipantCardProps, ParticipantManager(), ParticipantManagerProps, useEasterParticipants(), LocalParticipant

### Community 75 - "Community 75"
Cohesion: 0.36
Nodes (7): FavoriteCollectibleOption, FavoriteCollectiblePicker(), favoriteById(), favoriteOptions(), findRarest(), isCollectible(), ownedPct()

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (6): SheetContent, SheetContentProps, SheetDescription, SheetOverlay, SheetTitle, sheetVariants

### Community 78 - "Community 78"
Cohesion: 0.36
Nodes (8): compareCartCandidate(), compareSelectedListings(), fillWholeListings(), greedyWholeListingFill(), materialWithPrices(), materialWorldPrice(), publicWorldPrice(), publicWorldPrices()

### Community 79 - "Community 79"
Cohesion: 0.22
Nodes (9): scripts, build, dev, dev:auth, dev:emulator, dev:stub, lint, preview (+1 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (7): Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow

### Community 82 - "Community 82"
Cohesion: 0.27
Nodes (7): FC_FOCUS_ITEMS, HomeHero(), HOME_GAZETTE, useHomeAnimations(), useHomeGreeting(), getHomeGreeting(), sydneyTime

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (5): attemptConfig, EncounterActivityChart(), JobUsageDonut(), groupEncounterActivity(), groupJobActivity()

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (7): chunk(), fetchUniversalisWorldChunk(), fetchWorldPrices(), finalItemWorldPrices(), ItemWorldPrices, worldPricesForItem(), worldPricesFromUniversalis()

### Community 85 - "Community 85"
Cohesion: 0.38
Nodes (7): escapeXivapiQuery(), fetchRecipeByOutputItemId(), fetchUniversalisHistory(), fetchWithTimeout(), parseSearchQuery(), searchMeowketItemsForAdmin(), UniversalisResponse

### Community 86 - "Community 86"
Cohesion: 0.48
Nodes (7): listingArray(), MARKET_WORLDS, numberValue(), priceListings(), worldNameValue(), worldPriceFromUniversalis(), worldSortIndex()

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (5): ChartConfig, ChartContext, ChartContextValue, ChartTooltipContent(), formatTooltipValue()

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (6): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList

### Community 90 - "Community 90"
Cohesion: 0.43
Nodes (5): BestEntry, BestParseCarousel(), getBest(), maxWidthForStaticSlides(), ParseData

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (4): DialogContent, DialogDescription, DialogOverlay, DialogTitle

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (5): Member, Participant, SCORE_CATEGORIES, ScoreCategory, Scores

### Community 93 - "Community 93"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 94 - "Community 94"
Cohesion: 0.50
Nodes (4): children, shutdown(), start(), RequestSection()

### Community 96 - "Dragonwilds: phased implementation checklist"
Cohesion: 0.13
Nodes (28): fetchUcobProgress(), triggerUcobProgressRefresh(), createUcobProgressFixture(), UcobRecentActivity(), UcobChartStats(), UcobChartTooltip(), UcobEndpointAvatar(), UcobProgressChart() (+20 more)

### Community 97 - "Community 97"
Cohesion: 0.70
Nodes (4): bestPrimary(), ParseLeaderboard(), primaryParses(), SortKey

### Community 98 - "Community 98"
Cohesion: 0.70
Nodes (4): bestPrimary(), GuildSummaryStrip(), primaryParses(), Stat

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): __dirname, JOBS, OUT_DIR

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 103 - "Community 103"
Cohesion: 0.50
Nodes (3): Button, ButtonProps, buttonVariants

### Community 104 - "Community 104"
Cohesion: 0.11
Nodes (17): Cache Keys, Collectible Types, Cost Notes, Data Sources, Database Shape, FC Collection Implementation, Firebase Functions, Frontend Data Hook (+9 more)

### Community 137 - "types.ts"
Cohesion: 0.23
Nodes (18): callGameServerFunction(), getGameServerAccessStatus(), getGameServers(), getGameServerStatus(), getGameServerTelemetry(), listGameServerEvents(), sharedRead(), startGameServer() (+10 more)

### Community 138 - "profile.ts"
Cohesion: 0.06
Nodes (75): amzDate(), assertAwsConfig(), assertGameServerScope(), assertServerEnabled(), AuthorizedGameServerSession, autoStopIdleServer(), cloudWatchQuery(), connectAddress() (+67 more)

### Community 139 - "Meowket Board Implementation"
Cohesion: 0.13
Nodes (14): Admin Auth And Callables, Callable API Contract, Child Materials, Cost Impact, Current Scope, Implementation Phases, Market Scope And Future Data Centers, Meowket Board Implementation (+6 more)

### Community 140 - "Crafting Board Implementation"
Cohesion: 0.18
Nodes (10): Crafting Board Implementation, Crafting Request Data Model, Create Request Flow, Current Scope, Lifecycle Actions, Recipe Preview Cost And Traffic, Request Cost Impact, Request Extension Hook (+2 more)

### Community 141 - "Project Reference"
Cohesion: 0.22
Nodes (9): Animation Pattern, App Entry And Shell, Assets, Coding Conventions, Commands, File Structure, Project Reference, Routes (+1 more)

### Community 142 - "Admin Auth Implementation"
Cohesion: 0.15
Nodes (12): Admin Auth Implementation, Client Surfaces, Database Rules, Independent Game Server Entitlements, Local Emulator Development, OAuth Flow, Phase 6 local security verification, Profile Editor Layout and Main Jobs (+4 more)

### Community 143 - "Database Cleanup Inventory"
Cohesion: 0.18
Nodes (10): Cleanup Candidates, Database Cleanup Inventory, Emulator Data, Generated And Rebuildable, Keep, Live Top-Level Branches, Local Storage Keys, Orphan Cleanup Rules (+2 more)

### Community 144 - "Raid Stats Implementation"
Cohesion: 0.17
Nodes (11): Cache Keys, Cost Notes, Data Sources, Database Shape, Firebase Functions, Frontend Behavior, Raid Stats Implementation, Refresh Behavior (+3 more)

### Community 145 - "Website Overview"
Cohesion: 0.20
Nodes (9): Admin Features, Data Sources And Integrations, Deeper Docs, Local Development Modes, Main Audiences, Member And FC Data Features, Public And Community Features, Tools (+1 more)

### Community 146 - "Firebase Data And Costs"
Cohesion: 0.17
Nodes (12): Cache Keys, Clubhouse Hat Updates, Cost And Read Rules, Data Access Rules, Database Shape, Firebase Data And Costs, Firebase Functions, Game Server Cost Notes (+4 more)

### Community 147 - "Frontend Patterns"
Cohesion: 0.22
Nodes (8): Animation, Assets, Components And Styling, Feature Notes, Frontend Patterns, General UI Taste, Navigation And Shell, UI Verification

### Community 148 - "Fat Cat Cartel"
Cohesion: 0.22
Nodes (8): Fat Cat Cartel, Firebase Console, Firebase Deploy Commands, Firebase Emulator Commands, Firebase Functions Commands, Local App Commands, Notes, Useful Firebase Commands

### Community 149 - "Calendar Events Implementation"
Cohesion: 0.29
Nodes (6): Calendar Events Implementation, Client UI, Data Ownership, Functions, Parser Behavior, Verification

### Community 150 - "Game Server Dashboard Progress"
Cohesion: 0.18
Nodes (10): Current Phase, Deferred Work, Game Server Dashboard Progress, Locked Decisions, Overall Checklist, Phase 1 Checklist, Phase 2 Checklist, Phase 3 Checklist (+2 more)

### Community 151 - "adminFunctions.ts"
Cohesion: 0.27
Nodes (12): adminOAuthStartUrl(), callAdminFunction(), functionsEmulatorOrigin(), projectId(), deleteGameServerAccess(), GameServerAccessInput, getGameServerSettings(), listGameServerAccess() (+4 more)

### Community 153 - "BestProgressByEncounter"
Cohesion: 0.12
Nodes (17): GAME_SERVER_FIXTURE_TIME, gameServerFixture, Actor, createGameServerMockState(), parseMockCatalogServerIds(), parseMockServerId(), Storage, actor (+9 more)

### Community 154 - "refresh-fc-collection.ts"
Cohesion: 0.22
Nodes (9): 10. Phase 7 catalog bridge and gated release, 1. Scope and evidence status, 2. Provisioning requirements and deployment inventory, 5. Fixture capture and live acceptance, 6. Costs, handoff checks and remaining gates, 8. Phase 5 independent authorization (local implementation), Dragonwilds server implementation and operations, Inputs required from the operator (+1 more)

### Community 155 - "PalworldStartupStatus.tsx"
Cohesion: 0.12
Nodes (19): PalworldConnectionPanel(), PalworldConnectionPanelProps, PalworldServerHero(), PalworldServerHeroProps, stateTheme(), PalworldStartupStatus(), PalworldStartupStatusProps, prefersReducedMotion() (+11 more)

### Community 156 - "PalworldServerIndexCard.tsx"
Cohesion: 0.23
Nodes (10): CraftingRecipe, getXivapiIconUrl(), RecipePreview(), SearchSkeleton(), IngredientGroup(), PreviewIcon(), QuantityControl(), CraftingRecipeSnapshot (+2 more)

### Community 157 - "updateMonthlyCostSnapshot"
Cohesion: 0.31
Nodes (9): autoStopText(), clampPercent(), formatDuration(), PalworldServerUsage(), PalworldServerUsageProps, prefersReducedMotion(), uptimeText(), UsageGauge() (+1 more)

### Community 158 - "SpudJarPage.tsx"
Cohesion: 0.08
Nodes (29): CALLABLE_BY_ACTION, localRecord(), mutateSpudJar(), ComplaintCoin(), ComplaintCoinProps, ComplaintControls(), ComplaintControlsProps, ComplaintCounter() (+21 more)

### Community 159 - "PalworldActivityTimeline.tsx"
Cohesion: 0.20
Nodes (18): triggerUcobProgressRefresh, fetchTomestone(), buildUcobProgressData(), duration(), mapUcobActivities(), mapUcobProgressionRows(), numeric(), percent() (+10 more)

### Community 160 - "describeGameServerInstance"
Cohesion: 0.20
Nodes (16): accessEntryFromValue(), cleanText(), deleteGameServerAccessForAdmin(), gameServerGrantRoot(), getGameServerAccessStatusForIdentity(), getGameServerAccessStatusForSession(), isGameServerAccessEntryActive(), listGameServerAccessCandidatesForAdmin() (+8 more)

### Community 162 - "PalworldPlayerField.tsx"
Cohesion: 0.21
Nodes (14): DisplayedPlayer, hashText(), initialDisplayedPlayers(), PalworldPlayerField(), PalworldPlayerFieldProps, pingDisplay(), PLAYER_ICONS, playerBaseKey() (+6 more)

### Community 163 - "PalworldCostSummary.tsx"
Cohesion: 0.31
Nodes (10): animatedValue(), CostValueKey, formatAud(), formatMonthLabel(), hourlyRate(), INSTANCE_PRICES_AUD, PalworldCostSummary(), PalworldCostSummaryProps (+2 more)

### Community 164 - "describePalworldInstance"
Cohesion: 0.14
Nodes (18): DragonwildsServerIndexCard(), DragonwildsServerPage(), GameServerCard, GameServerCatalog(), GameServerIndexPage(), sessionDisplayName(), PalworldServerIndexCard(), PalworldServerIndexCardProps (+10 more)

### Community 165 - "RuneScape: Dragonwilds implementation plan"
Cohesion: 0.22
Nodes (10): AddCurrentCraftButton(), CartItemRow(), CartLineIcon(), CartRouteItem, prefersReducedMotion(), CartRouteByWorld(), MathTooltip(), SummaryCard() (+2 more)

### Community 166 - "accessEntryFromValue"
Cohesion: 0.39
Nodes (6): mutateSpudJar(), nextSpudJarRecord(), parseSpudJarBatchCount(), readCurrent(), SpudJarAction, SpudJarRecord

### Community 167 - "game-servers.test.ts"
Cohesion: 0.14
Nodes (12): auditEntryFromValue(), GameServerAwsConfig, GameServerId, getGameServerSettingsForAdmin(), listGameServerAuditLog(), listGameServerAuditLogForAdmin(), listGameServerAuditLogForSession(), listGameServersForSession() (+4 more)

### Community 168 - "cloudWatchQuery"
Cohesion: 0.40
Nodes (5): 3. Import, joining and lifecycle runbook, Backup and restore, Import the private world, Verify boot and clean shutdown, Verify joining

### Community 169 - "scrape-lodestone.ts"
Cohesion: 0.33
Nodes (3): actor, ids, runners

### Community 170 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 172 - "cleanText"
Cohesion: 0.50
Nodes (4): 4. Player-status contract for Phase 2, Snapshot schema (proposed interface, not implemented), Source selection and execution boundary, Validation and continuity rules

### Community 174 - "4. Proposed implementation"
Cohesion: 0.50
Nodes (4): 7. Phase 2 backend groundwork, Implemented boundaries, Runtime cost impact after deployment, Validation and release limits

### Community 175 - "Phase 4: build the Dragonwilds page and online board"
Cohesion: 0.50
Nodes (4): Game-server integrated verification, General checks, Homepage Cartel Clubhouse, Verification

### Community 176 - "types.ts"
Cohesion: 0.10
Nodes (23): ACTION_DETAILS, actorName(), formatTime(), PalworldActivityTimeline(), PalworldActivityTimelineProps, prefersReducedMotion(), RESULT_LABELS, resultTone() (+15 more)

### Community 177 - "Dragonwilds Phase 7 release handoff"
Cohesion: 0.67
Nodes (3): 9. Phase 6 local verification and release handoff, Operator evidence needed before release, Troubleshooting and rollback sequence

### Community 178 - "PalworldActivityTimeline.tsx"
Cohesion: 0.27
Nodes (9): COLLECTIBLE_CONFIG, CollectibleKey, fetchMemberCollectionData(), MemberCacheData, MemberFetchResult, parseOwned(), PreviousOwnedEntry, runRefreshFCCollection() (+1 more)

### Community 180 - "game-server-access-lifecycle.test.mjs"
Cohesion: 0.14
Nodes (12): api, auth(), calls, component(), find(), handlers, manager(), mount() (+4 more)

## Knowledge Gaps
- **928 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+923 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `item()` connect `Community 53` to `Community 21`, `Community 45`, `Community 29`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `FCStats()` connect `Community 53` to `Community 0`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `progress()` connect `Community 9` to `Dragonwilds: phased implementation checklist`, `Community 8`, `PalworldActivityTimeline.tsx`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _928 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06483075157773953 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07191358024691358 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.020808080808080807 - nodes in this community are weakly interconnected._