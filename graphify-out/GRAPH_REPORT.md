# Graph Report - fat-cat-cartel  (2026-07-24)

## Corpus Check
- 400 files · ~2,116,254 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2564 nodes · 5053 edges · 171 communities (151 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6429200`
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
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
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
- Community 96
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
- queryPalworldPlayersViaSsm
- PalworldStartupStatus.tsx
- updateMonthlyCostSnapshot
- statusForEnabledServer
- PalworldActivityTimeline.tsx
- adminFunctions.ts
- PalworldPlayerField.tsx
- PalworldCostSummary.tsx
- describePalworldInstance
- requireAdminSession
- accessEntryFromValue
- cleanText
- cloudWatchQuery
- updateMonthlyCostSnapshot
- statusForEnabledServer
- listGameServerAuditLog

## God Nodes (most connected - your core abstractions)
1. `formatGil()` - 35 edges
2. `registerDefaultHandlers()` - 33 edges
3. `callAdminFunction()` - 25 edges
4. `ContentType` - 25 edges
5. `MemberData` - 25 edges
6. `compilerOptions` - 22 edges
7. `calculateMeowketProfitForAdmin()` - 21 edges
8. `formatQuantity()` - 20 edges
9. `ZoneEncounter` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `fetchDmuProgressionRows()` --indirect_call--> `progress()`  [INFERRED]
  functions/src/refresh-tomestone-raid-stats.ts → src/lib/db.stub.ts
- `fetchTomestoneProgressionGraph()` --indirect_call--> `progress()`  [INFERRED]
  functions/src/refresh-tomestone-raid-stats.ts → src/lib/db.stub.ts
- `Stepper()` --references--> `react`  [EXTRACTED]
  src/components/reui/stepper.tsx → package.json
- `useStepper()` --references--> `react`  [EXTRACTED]
  src/components/reui/stepper.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json

## Import Cycles
- None detected.

## Communities (171 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (59): CachePayload, CollectiblesValue, MembersValue, useFCCollection(), CollectibleDetailDialog(), CollectibleDetailDialogProps, isMount(), animateFilterClick() (+51 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (57): approveCalendarEventRequest(), createRaidHelperEvent(), denyCalendarEventRequest(), listCalendarEventRequests(), submitCalendarEventRequest(), readCalendarData(), CalendarHeader(), CalendarMonthList() (+49 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (82): parsePort(), acceptCraftingRequest, adminAppOrigin, approveCalendarEventRequest, autoStopIdleGameServers, awsAccessKeyId, awsRegion, awsSecretAccessKey (+74 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (76): appendGameServerAuditEntry(), assertAuthenticated(), assertCapability(), assertDevLayer(), assertGameServerAccess(), CalendarRequest, CalendarRequestCreator, CalendarStore (+68 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (52): acceptCraftingRequestForMember(), addEligibleCrafters(), arrayValue(), cleanText(), closeCraftingRequestForMember(), commissionText(), completeCraftingRequestForMember(), craftingBoardUrl() (+44 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (36): fetchDmuProgress(), triggerDmuProgressRefresh(), DmuRecentActivity(), DmuChartStats(), DmuChartTooltip(), formatPullDuration(), DmuEndpointAvatarMark(), DmuProgressChart() (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (43): ButtonStyle, clearChannelErrorMessage(), ClearChannelResult, clearChannelResultMessage(), clearRecentChannelMessages(), ComponentType, confirmClearChannelComponents(), deferredEphemeral() (+35 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (37): ActivityChartType, COLLECTIBLE_META, dayKey(), displayJobName(), EMPTY_PROFILE, EmptyChart(), encodeBirthday(), fmtRdps() (+29 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (40): firebase, AnyFn, Callback, getAtPath(), listeners, makeSnapshot(), maxedJobLevels(), notifyPath() (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (37): ActivityPayload, ActivityRow, batchRun(), buildDmuProgressForMembers(), CompactActivity, DmuProgressCache, DmuProgressPlayer, DmuProgressPoint (+29 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (35): ALLOWED_RAID_HELPER_PING_ROLE_IDS, approveCalendarEventRequest(), CalendarEventRequest, CalendarEventRequestCreator, CalendarEventRequestNotification, CalendarEventRequestNotificationConfig, CalendarEventRequestRecord, cleanText() (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (39): AdminAuthConfig, AdminOAuthStartConfig, AdminSession, applyDevRoleOverride(), assertDevRoleOverrideSafety(), authenticatedSessionRecordIsValid(), cookieIsSecure(), cookieValue() (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (30): getFFLogsToken(), TokenCache, buildCharacterZonesQuery(), DIFFICULTY, queryFFLogs(), AllStars, batchRun(), buildCharacterParseEntries() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (20): readMemberProfiles(), MemberCard(), MembersPage(), JOB_ICON_SLUG, JOB_MAX_LEVELS, RANK_SORT_ORDER, useMemberProfiles(), useMembersGridAnimation() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (20): MountRouletteControls(), LoadingSkeleton(), MountRoulettePage(), MountResultDialog(), drawWheel(), SpinWheel(), CAT_POSITIONS, EXPANSIONS (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (23): callAdminFunction(), deleteMember(), importLodestoneMembers(), refreshMemberSource(), triggerDmuProgressRefresh(), triggerFCCollectionRefresh(), triggerFFLogsRefresh(), triggerTomestoneRaidStatsRefresh() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (27): acceptCraftingRequest(), byCompletedAtDesc(), byUpdatedAtDesc(), closeCraftingRequest(), completeCraftingRequest(), CRAFTING_REQUEST_PATHS, CraftingLifecycleInput, CraftingMemberTotals (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (25): FriendRefreshJob, processFriendRefreshJob(), runSource(), assertRefreshableMember(), MemberSourceResult, MemberSourceSecrets, parseRequest(), refreshLodestoneMember() (+17 more)

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
Cohesion: 0.08
Nodes (25): dependencies, animejs, class-variance-authority, clsx, cmdk, echarts, echarts-for-react, embla-carousel-react (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (9): CalendarSyncStatus(), MemberSyncToolbar(), MemberSyncToolbarProps, parseStatus(), useCalendarSyncStatus(), CalendarSyncStatusProps, CalendarSyncStatusState, DATE_TIME_FORMATTER (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (17): CompletedRequestButton(), LanePagination(), RequestCard(), MemberAvatar(), MemberLine(), CraftingRequestDashboardRecord, CraftingRequestMember, completedByMember() (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (22): Props, Props, Props, coord(), MemberRadarChart(), polygonPath(), Props, Props (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+16 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (16): CraftingRecipe, CreateRequestDialog(), EligibleCrafters(), RecipePreview(), SearchSkeleton(), CrafterChip(), QuantityControl(), CraftingEligibleCrafter (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (23): adminRoute, calendarRoute, craftingBoardRoute, dmuProgRoute, easter2026Route, fcCollectionRoute, fcLeaderboardRoute, fcTypeRoute (+15 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (17): BestPerJobCarousel(), getBestPerJob(), JobEntry, maxWidthForStaticSlides(), bestPrimary(), MemberBoard(), primaryParses(), SortKey (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (21): deleteEasterParticipantAdmin(), EasterParticipantRequest, FAVORITE_CONTENT_OPTIONS, FC_RANKS, FFXIV_JOBS, isValidBirthday(), ParsedProfile, parseFavoriteId() (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (18): AdminAuth, devAuthSnapshot(), devSessionFromPersona(), localDevSession, removeAdminHashParams(), subscribers, updateAuthSnapshot(), useAdminAuth() (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): useScoreboard(), UseScoreboardResult, EventCard(), EventCardProps, PointRule, PrizeRule, HideAndSeekDialog(), instructionImages (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (25): MemberDeleteDialog(), MemberDeleteDialogProps, MemberRosterTable(), MemberRosterTableProps, StatusCell(), AdminAuthState, AdminMember, AdminPageShellProps (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (14): getXivapiIconUrl(), RequestedItem(), IngredientGroup(), PreviewIcon(), CRAFTING_MATERIAL_STATUSES, CRAFTING_REQUEST_STATUSES, CraftingDiscordMessageMetadata, CraftingPrecraftSnapshot (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (18): readHomeWeeklyData(), useHomeDashboardData(), HomeNextBirthdaySummary, HomeWeeklyBirthdaySummary, HomeWeeklyData, HomeWeeklyEventSummary, DATE_FORMATTER, endOfWeekWindow() (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (17): ActivityChartType, COLLECTIBLE_META, EMPTY_PROFILE, JOB_ABBR, JOB_ICON_SLUG, JOB_LEVEL_GROUPS, JOB_MAX_LEVELS, JOB_NAME_ALIASES (+9 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (11): HomePage(), NewspaperSectionLabel(), NoticeBoard(), OPERATION_TOOLS, OperationsPanel(), OperationTool, scrapbookImages, ScrapbookPreview() (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (17): birthdayMessage(), BirthdayNotificationConfig, BirthdayRunResult, BirthdayTarget, claimBirthdayNotification(), cleanText(), DiscordMessageResponse, findBirthdayTargets() (+9 more)

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
Cohesion: 0.17
Nodes (13): MemberProfileDialog(), MemberProfileDialogProps, DAYS, EMPTY_PROFILE, FC_RANKS, FRESHNESS_MS, JOBS, MONTHS (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.23
Nodes (12): ClassifiedLink(), FeaturedToolCard(), excerptBio(), MemberSpotlightCard(), HOME_FEATURED_TOOLS, HomeSpotlightMember, getDailyIndex(), getInitials() (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (14): formatDate(), KillTimeline(), Props, AllStars, EncounterKey, EncounterProgress, FirstKillData, ParseBuckets (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (12): CARD_COPY, CARD_ICONS, Props, RaidStatsHome(), EMPTY_ENCOUNTERS, useRaidStatsPageState(), ParseEntry, MemberIdentity (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (16): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @firebase/rules-unit-testing, globals, tailwindcss (+8 more)

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (10): AddCurrentCraftButton(), CartItemRow(), CartLineIcon(), CartRouteItem, prefersReducedMotion(), CartRouteByWorld(), MathTooltip(), SummaryCard() (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (13): compileOnSave, compilerOptions, lib, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck (+5 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (10): HOME_NOTICES, HOME_QUICK_TOOLS, HOME_STATIC_WEEK_ITEMS, HomeFeaturedTool, HomeHouseDetails, HomeNotice, HomeOpenErrandSummary, HomeQuickTool (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.24
Nodes (9): saveOwnMemberProfile(), useProfileEditor(), ActivityChartType, CraftingProfileStats, MemberProfile, ProfileParseType, encodeBirthday(), parseBirthday() (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (12): activityLabel(), buildActivitySummary(), favoriteById(), favoriteContentIcon(), favoriteOptions(), findRarest(), formatBirthday(), isCollectible() (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.26
Nodes (8): MarketStatusCard(), MaterialCostByWorldChart(), materialCostByWorldData(), CART_ROUTE_WORLDS, formatChartGil(), formatRelativeTime(), shortGil(), shortGilWithUnit()

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (12): DeleteMemberRequest, deleteTrackedMember(), emptyBuckets(), ParseBuckets, ParseData, parseDeleteMemberRequest(), ParseEntry, percentileBucket() (+4 more)

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
Cohesion: 0.23
Nodes (8): ItemIcon(), JobIcon(), CRAFTING_JOB_ICON_SLUG, materialStatusLabels, RequestSectionConfig, CombinedEligibleCrafter, jobIconMap, jobIconSrc()

### Community 64 - "Community 64"
Cohesion: 0.21
Nodes (8): AuthLinkHelpDialog(), AuthLinkHelpDialogProps, AuthLoginInstructionsDialog(), AuthLoginInstructionsDialogProps, InstructionSectionProps, AuthUserMenu(), AuthUserMenuProps, initials()

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (7): adminItem, AppSidebar(), bottomItems, navItems, progressItems, toolItems, BANNER_CATS

### Community 66 - "Community 66"
Cohesion: 0.27
Nodes (10): CollectiblesData, CraftingProfileStats, DbSnapshot, EMPTY_CRAFTING_STATS, loadCollectiblesCache(), MemberProfileState, normalizeCollectibles(), normalizeCraftingStats() (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (11): memberSyncError(), decodeHtml(), fetchLodestoneCharacter(), JOB_ALIASES, LodestoneEntry, parseCharacterPage(), parseJobLevels(), runScrapeLodestone() (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (11): buildSellConfidence(), confidenceLabel(), confidenceReason(), confidenceVerdict(), demandInsight(), donComment(), fetchSellConfidence(), formatHistoryTime() (+3 more)

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (5): ClippingCard(), FcHangoutCard(), StatusBoardCard(), HOME_HOUSE_DETAILS, HomeCraftingStatus

### Community 70 - "Community 70"
Cohesion: 0.42
Nodes (8): cacheKey(), loadCachedZone(), saveCachedZone(), fetchRaidStatsZone(), fetchRaidStatsZoneLastUpdated(), RaidStatsState, useRaidStats(), ZoneData

### Community 71 - "Community 71"
Cohesion: 0.31
Nodes (10): compactProfile(), computeMostPlayedJobs(), configuredEncountersByCanonical(), emptyEncounterSummary(), initializeZoneMembers(), mergeActivity(), mergeProfileClears(), profileEncounterSummaries() (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (6): StepperContent(), StepperContext, StepperContextValue, StepperItem(), StepperTrigger(), useStepper()

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (8): AdminPage(), AdminHeader(), AdminHeaderProps, EasterEventCard(), EasterEventCardProps, GameServerAccessCard(), GameServerAccessCardProps, SelectedAdminView

### Community 74 - "Community 74"
Cohesion: 0.23
Nodes (8): deleteEasterParticipantAdmin(), upsertEasterParticipantAdmin(), ParticipantCard(), ParticipantCardProps, ParticipantManager(), ParticipantManagerProps, useEasterParticipants(), LocalParticipant

### Community 75 - "Community 75"
Cohesion: 0.36
Nodes (7): FavoriteCollectibleOption, FavoriteCollectiblePicker(), favoriteById(), favoriteOptions(), findRarest(), isCollectible(), ownedPct()

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (13): assertServerEnabled(), getGameServerSettingsForAdmin(), listGameServerAuditLogForSession(), parseServerId(), readGameServerSettings(), sessionDisplayName(), settingsFromValue(), startGameServerForSession() (+5 more)

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
Cohesion: 0.36
Nodes (5): FC_FOCUS_ITEMS, HomeHero(), NewspaperStamp(), HOME_GAZETTE, useHomeAnimations()

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

### Community 96 - "Community 96"
Cohesion: 0.50
Nodes (4): countIndexRecords(), DashboardIndexValue, DbSnapshot, readHomeCraftingStatus()

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
Cohesion: 0.16
Nodes (12): PalworldConnectionPanel(), PalworldConnectionPanelProps, PalworldServerHero(), PalworldServerHeroProps, stateTheme(), formatDateTime(), formatPlayers(), friendlyStatus() (+4 more)

### Community 138 - "profile.ts"
Cohesion: 0.09
Nodes (31): AuthorizedGameServerSession, escapeCloudWatchSearch(), GAME_SERVERS, GameServerAccessCandidate, GameServerAccessEntry, GameServerAuditAction, GameServerAuditLogEntry, GameServerAuditResult (+23 more)

### Community 139 - "Meowket Board Implementation"
Cohesion: 0.13
Nodes (14): Admin Auth And Callables, Callable API Contract, Child Materials, Cost Impact, Current Scope, Implementation Phases, Market Scope And Future Data Centers, Meowket Board Implementation (+6 more)

### Community 140 - "Crafting Board Implementation"
Cohesion: 0.18
Nodes (10): Crafting Board Implementation, Crafting Request Data Model, Create Request Flow, Current Scope, Lifecycle Actions, Recipe Preview Cost And Traffic, Request Cost Impact, Request Extension Hook (+2 more)

### Community 141 - "Project Reference"
Cohesion: 0.18
Nodes (10): Animation Pattern, App Entry And Shell, Assets, Coding Conventions, Commands, File Structure, Project Reference, Routes (+2 more)

### Community 142 - "Admin Auth Implementation"
Cohesion: 0.18
Nodes (10): Admin Auth Implementation, Client Surfaces, Database Rules, Local Emulator Development, OAuth Flow, Palworld Entitlements, Protected Admin Operations, Secrets And Config (+2 more)

### Community 143 - "Database Cleanup Inventory"
Cohesion: 0.20
Nodes (9): Cleanup Candidates, Database Cleanup Inventory, Emulator Data, Generated And Rebuildable, Keep, Live Top-Level Branches, Local Storage Keys, Orphan Cleanup Rules (+1 more)

### Community 144 - "Raid Stats Implementation"
Cohesion: 0.20
Nodes (9): Cache Keys, Cost Notes, Data Sources, Database Shape, Firebase Functions, Frontend Behavior, Raid Stats Implementation, Refresh Behavior (+1 more)

### Community 145 - "Website Overview"
Cohesion: 0.20
Nodes (9): Admin Features, Data Sources And Integrations, Deeper Docs, Local Development Modes, Main Audiences, Member And FC Data Features, Public And Community Features, Tools (+1 more)

### Community 146 - "Firebase Data And Costs"
Cohesion: 0.20
Nodes (9): Cache Keys, Cost And Read Rules, Data Access Rules, Database Shape, Firebase Data And Costs, Firebase Functions, Game Server Cost Notes, Ownership Boundaries (+1 more)

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
Cohesion: 0.19
Nodes (11): deleteGameServerAccess(), GameServerAccessInput, getGameServerSettings(), listGameServerAccess(), listGameServerAccessCandidates(), listGameServerAuditLog(), updateGameServerSettings(), upsertGameServerAccess() (+3 more)

### Community 152 - "cloudWatchQuery"
Cohesion: 0.13
Nodes (14): GAME_SERVERS, GameServerAccessCandidate, GameServerAccessCandidatesResponse, GameServerAccessEntry, GameServerAccessListResponse, GameServerAccessStatusResponse, GameServerAccessUpsertResponse, GameServerCostSnapshot (+6 more)

### Community 153 - "BestProgressByEncounter"
Cohesion: 0.22
Nodes (17): callGameServerFunction(), getGameServers(), getGameServerStatus(), listGameServerEvents(), startGameServer(), stopGameServer(), checkedAt, events (+9 more)

### Community 154 - "queryPalworldPlayersViaSsm"
Cohesion: 0.20
Nodes (7): activityImpact(), ActivityTimelineChart(), ActivityTooltipContent(), BestProgressByEncounter(), clampPercent(), compactContentType(), formatDate()

### Community 155 - "PalworldStartupStatus.tsx"
Cohesion: 0.28
Nodes (7): PalworldStartupStatus(), PalworldStartupStatusProps, prefersReducedMotion(), StageState, StartupStage, startupStages(), GameServerStatusResponse

### Community 157 - "updateMonthlyCostSnapshot"
Cohesion: 0.31
Nodes (9): autoStopText(), clampPercent(), formatDuration(), PalworldServerUsage(), PalworldServerUsageProps, prefersReducedMotion(), uptimeText(), UsageGauge() (+1 more)

### Community 158 - "statusForEnabledServer"
Cohesion: 0.28
Nodes (9): assertAwsConfig(), connectAddress(), describePalworldInstance(), ec2Client(), hostForInstance(), readIdleState(), runAutoStopIdleGameServers(), ssmClient() (+1 more)

### Community 159 - "PalworldActivityTimeline.tsx"
Cohesion: 0.25
Nodes (10): ACTION_DETAILS, actorName(), formatTime(), PalworldActivityTimeline(), PalworldActivityTimelineProps, prefersReducedMotion(), RESULT_LABELS, resultTone() (+2 more)

### Community 160 - "adminFunctions.ts"
Cohesion: 1.00
Nodes (3): adminOAuthStartUrl(), functionsEmulatorOrigin(), projectId()

### Community 162 - "PalworldPlayerField.tsx"
Cohesion: 0.21
Nodes (14): DisplayedPlayer, hashText(), initialDisplayedPlayers(), PalworldPlayerField(), PalworldPlayerFieldProps, pingDisplay(), PLAYER_ICONS, playerBaseKey() (+6 more)

### Community 163 - "PalworldCostSummary.tsx"
Cohesion: 0.31
Nodes (10): animatedValue(), CostValueKey, formatAud(), formatMonthLabel(), hourlyRate(), INSTANCE_PRICES_AUD, PalworldCostSummary(), PalworldCostSummaryProps (+2 more)

### Community 164 - "describePalworldInstance"
Cohesion: 0.18
Nodes (14): getGameServerAccessStatus(), GameServerCard, GameServerIndexPage(), sessionDisplayName(), PalworldServerIndexCard(), PalworldServerIndexCardProps, prefersReducedMotion(), statusPresentation() (+6 more)

### Community 165 - "requireAdminSession"
Cohesion: 0.29
Nodes (7): requireAdminSession(), adminAuthConfig(), adminAuthConfigWithHousecat(), adminAuthConfigWithSingleMemberRole(), adminAuthConfigWithSingleMemberRoleAndHousecat(), authenticatedSessionWithLiveAdmin(), discordOAuthConfig()

### Community 166 - "accessEntryFromValue"
Cohesion: 0.33
Nodes (7): accessEntryFromValue(), getGameServerAccessStatusForSession(), isGameServerAccessEntryActive(), listGameServerAccessCandidatesForAdmin(), listGameServerAccessForAdmin(), readAccessEntry(), requireGameServerAccess()

### Community 167 - "cleanText"
Cohesion: 0.38
Nodes (7): cleanText(), deleteGameServerAccessForAdmin(), parseDiscordId(), parseDisplayName(), parseEnabled(), parseNotes(), upsertGameServerAccessForAdmin()

### Community 168 - "cloudWatchQuery"
Cohesion: 0.33
Nodes (6): amzDate(), cloudWatchQuery(), dateStamp(), hashHex(), hmac(), signingKey()

### Community 169 - "updateMonthlyCostSnapshot"
Cohesion: 0.40
Nodes (6): costSnapshotFromValue(), monthKeyForTimestamp(), monthStartUtc(), previousMonthKey(), readCostSnapshot(), updateMonthlyCostSnapshot()

### Community 170 - "statusForEnabledServer"
Cohesion: 0.40
Nodes (5): disabledStatus(), getGameServerStatusForSession(), listGameServersForSession(), statusForEnabledServer(), statusMessage()

### Community 171 - "listGameServerAuditLog"
Cohesion: 0.50
Nodes (4): auditEntryFromValue(), listGameServerAuditLog(), listGameServerAuditLogForAdmin(), normalizeState()

## Knowledge Gaps
- **840 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+835 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `progress()` connect `Community 9` to `Community 8`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `fetchTomestoneProgressionGraph()` connect `Community 9` to `Community 2`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 24` to `Community 8`, `Community 60`, `Community 93`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _840 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06386554621848739 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07191358024691358 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.022982635342185902 - nodes in this community are weakly interconnected._