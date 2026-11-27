// UI strings in English and Turkish. Source excerpts (issue titles, quotes)
// are shown in their original language on purpose: they are evidence.

export const STRINGS = {
  en: {
    'dt.funding': 'Funding', 'dt.product': 'Product', 'dt.launch': 'Launch', 'dt.new_repo': 'New repo', 'dt.news': 'News', 'dt.release': 'Release', 'dt.tool': 'Tool',
    'n.home': 'Home', 'n.domains': 'Domains',
    'h.kicker': 'Opportunity radar · {d} domains · {s} live sources',
    'h.title': 'What is the world <em>still missing?</em>',
    'h.lede': 'People say what they need every day: on Stack Exchange, in maker and engineering forums, on Hacker News. The radar reads all of it, groups requests that mean the same thing, checks what already exists, and turns the gaps into product, startup and project ideas you can start on today.',
    'h.stat.ideas': 'ideas that look open', 'h.stat.needs': 'needs read', 'h.stat.devs': 'market developments',
    'h.index': 'Domains', 'h.top': 'Strongest ideas right now', 'h.top.sub': 'Several people ask for it, little or nothing serves it yet.',
    'h.map': 'Opportunity map', 'h.map.sub': 'Right = more people ask for it. Bottom = less already exists. Bottom right is where ideas look open.',
    'h.live': 'Live',
    'd.ideas': 'Ideas', 'd.needs': 'Needs', 'd.devs': 'Developments', 'd.all': 'All', 'd.openIdeas': '{n} open idea|{n} open ideas', 'd.needsN': '{n} need|{n} needs', 'd.devsN': '{n} development|{n} developments',
    'd.noIdeas': 'No ideas here yet. Needs are still accumulating; ideas appear when several people ask for the same thing.',
    'd.src.all': 'All sources', 'd.src.stackexchange': 'Q&A sites', 'd.src.forum': 'Forums', 'd.src.hn': 'Hacker News', 'd.src.github': 'GitHub issues',
    'i.type.startup': 'Startup idea', 'i.type.product': 'Product idea', 'i.type.project': 'Project idea',
    'i.strength.strong': 'Strong evidence', 'i.strength.emerging': 'Emerging', 'i.strength.signal': 'Single signal',
    'i.open': 'Looks open', 'i.partial': 'Partly served', 'i.crowded': 'Crowded',
    'i.people': '{n} person asks|{n} people ask', 'i.evidence': 'Who is asking', 'i.solutions': 'What already exists', 'i.none': 'Nothing close turned up among launches, new repositories and known tools.',
    'i.next': 'Smallest next step', 'i.original': 'Original', 'i.views': '{n} views', 'i.answered': 'answered', 'i.unanswered': 'unanswered',
    'i.verdict.open': 'This idea looks open: {people} and nothing close turned up among product launches, new repositories or known tools.',
    'i.verdict.partial': 'Partly served: {people}, and a few things come close. Check whether they really solve it.',
    'i.verdict.crowded': 'Crowded: {people}, but many products already target it. Look for the part they miss.',
    'i.step.talk_payers': 'Contact the {n} people who said they would pay. Ask what they use today and what it costs them.',
    'i.step.prototype': 'Build the smallest version this weekend and show it to the {n} people below.',
    'i.step.validate': 'One clear request so far. Reply to it, ask what they tried, and look for two more people with the same need.',
    'i.step.differentiate': 'Something similar exists. Ask the people below why it does not work for them.',
    'k.pay': 'would pay', 'k.seeking': 'looking for a tool', 'k.question': 'question', 'k.complaint': 'complaint',
    'map.x': 'More people asking →', 'map.y': 'More already exists →', 'map.open': 'Looks open', 'map.crowded': 'Crowded',
    'gap.open': 'Looks open', 'gap.partial': 'Partly served', 'gap.crowded': 'Crowded',
    'gap.market': 'Market gap', 'gap.upstream': 'Upstream request',
    'gap.people': '{n} person|{n} people', 'gap.pay': '{n} would pay', 'gap.seeking': '{n} looking for a tool', 'gap.complaints': '{n} complaint|{n} complaints',
    'gap.problems': '{n} problem report|{n} problem reports', 'gap.features': '{n} feature request|{n} feature requests', 'gap.questions': '{n} question|{n} questions', 'gap.unanswered': '{n} unanswered',
    'gap.solutionsN': '{n} close solution|{n} close solutions', 'gap.noSolutions': 'no close solution found', 'gap.interestN': '{n} related funding round|{n} related funding rounds',
    'gap.verdictOpen': 'This idea looks open: {people} want it and nothing close to it turned up among known tools, new products, launches or new repositories.',
    'gap.verdictPartial': 'Partly served: {people} want it and a few things come close. Check whether they actually solve it.',
    'gap.verdictCrowded': 'Crowded: {people} want it, but many tools already target it. Look for the part they miss.',
    'gap.upstreamNote': 'All of this demand sits in one project, so the best move is usually to contribute there.',
    'gap.evidence': 'Who wants this', 'gap.solutions': 'Closest existing solutions', 'gap.interest': 'Investor interest nearby', 'gap.similar': '{p}% similar',
    'gap.next': 'Smallest next step', 'gap.area': 'Area', 'gap.keywords': 'Keywords',
    'gap.step.talk_payers': 'Contact the {n} people who said they would pay. Ask what they use today and what it costs them.',
    'gap.step.prototype': 'A workaround is documented. Build the smallest tool that removes it and show it to the people below.',
    'gap.step.interview': 'Talk to {n} of the people below before writing code: how do they handle this today?',
    'gap.step.contribute': 'Pick up the request in {repo}: comment that you are working on it and open a small PR.',
    'gaps.title': 'Opportunities', 'gaps.sub': 'Where demand is strong and supply is weak. The local language model groups requests that mean the same thing, then looks for anything that already solves them.',
    'gaps.tab.market': 'Market gaps', 'gaps.tab.upstream': 'Contribution opportunities', 'gaps.tab.areas': 'Areas',
    'gaps.radar': 'Gap radar', 'gaps.radar.legend': 'Center = looks open · edge = crowded · hollow = upstream request',
    'ov.gaps': 'Ideas that look open', 'ov.gaps.sub': 'Several people want it, little or nothing serves it yet.',
    'ov.areas': 'Areas to watch', 'ov.areas.sub': 'Market developments meeting first-hand needs, by area.',
    'hero3.kicker': 'Market gap radar · {n} sources of demand and supply',
    'hero3.title': 'Find the gap <em>before</em> someone else builds it.',
    'hero3.lede': 'The radar reads funding news from around the world, product launches, new repositories, release notes, and what developers actually ask for and complain about. A local language model groups requests that mean the same thing and checks whether anything already solves them. What is left is a list of ideas that look open, each with the evidence behind it.',
    'nav.opps': 'Opportunities', 'nav.devs': 'Developments', 'nav.needs': 'Needs',
    'hero2.title': 'See what is happening, <em>see where people are stuck,</em> find real work to start today.',
    'hero2.lede': 'Developments (funding, new AI products, releases, news, brand-new repos) on one side, needs (first-hand problems from GitHub and Hacker News) on the other. Where they meet, the radar opens an opportunity card with the evidence, what already exists, a narrow question and the smallest experiment you can run.',
    'hero2.cta': 'See opportunities', 'hero2.cta2': 'Latest developments',
    'ov.opps': 'Top opportunities', 'ov.opps.sub': 'A development meets a need. Ranked by verified funding, launches and first-hand demand.',
    'ov.devs': 'Latest developments', 'ov.devs.sub': 'Funding, launches, releases and news. Copies of one story count once.',
    'ov.needs': 'Needs on the move', 'ov.needs.sub': 'Problems whose evidence just changed.',
    'opps.title': 'Opportunities', 'opps.sub': 'Each card connects market developments to real, first-hand needs in the same area, with a narrow question to research and the smallest first experiment.',
    'opp.supply': 'Developments', 'opp.demand': 'Needs', 'opp.question': 'Need to research', 'opp.experiment': 'First experiment',
    'opp.status': 'Card status', 'opp.tools': 'What already exists', 'opp.releases': 'Recent releases in this area', 'opp.devlist': 'Market developments (last 30 days)',
    'opp.needlist': 'First-hand needs in this area', 'opp.seeNeeds': 'See all {n} needs', 'opp.anchor': 'Strongest evidence: {title}',
    'opp.fundingN': '{n} funding round|{n} funding rounds', 'opp.verifiedN': '{n} verified', 'opp.productsN': '{n} launch|{n} launches', 'opp.reposN': '{n} new repo|{n} new repos', 'opp.newsN': '{n} news story|{n} news stories',
    'opp.casesN': '{n} first-hand case|{n} first-hand cases', 'opp.cardsN': '{n} problem|{n} problems', 'opp.multiN': '{n} hit by 2+ people', 'opp.worthN': '{n} worth trying', 'opp.workaroundsN': '{n} with a workaround',
    'opp.faded': 'No recent development in this area', 'opp.history': 'State history',
    'devs.title': 'Developments', 'devs.sub': 'What is changing: funding, new AI products, release notes, media news and brand-new small repositories. When many outlets publish the same story it is one event, not many signals.',
    'devs.all': 'All', 'devs.topic': 'Area', 'devs.allTopics': 'All areas', 'devs.outlets': 'reported by {n} outlet, counted once|reported by {n} outlets, counted once',
    'devs.verified': 'verified by 2+ outlets', 'devs.single': 'single source', 'devs.stars': '{n} stars', 'devs.points': '{n} points', 'devs.empty': 'No developments match.',
    'devs.opp': 'Opportunity', 'needs.title': 'Needs', 'needs.sub': 'First-hand problems from GitHub issues and Hacker News: who is stuck, what they were trying to do, how they get by today, and which fix actually shipped.',
    'follow.meaning': 'What it means for you', 'live.updated': 'Fresh data loaded', 'live.updatedN': 'Fresh data: {n} new change|Fresh data: {n} new changes',
    'nav.overview': 'Overview', 'nav.cards': 'Problems', 'nav.following': 'Following', 'nav.changes': 'Changelog',
    'nav.digest': 'Weekly', 'nav.sources': 'Sources', 'nav.about': 'How it works',
    'brand.tag': 'AI infra & dev tools',
    'status.synced': 'Synced {ago}', 'status.sources': '{n} sources', 'status.failing': '{n} failing', 'status.delayed': '{n} delayed',
    'hero.kicker': 'Opportunity radar · funding, launches, news · {repos} repositories · Hacker News', 'brand.name': 'Problem Radar',
    'hero.title': 'Where builders get stuck, <em>and when it actually gets fixed.</em>',
    'hero.lede': 'Every card is one real problem, counted in first-hand cases rather than headlines. It only moves when the evidence moves: a second person hits it, a fix merges, a release ships it.',
    'hero.cta': 'Browse problems', 'hero.cta2': 'How the evidence works',
    'ladder.title': 'The evidence ladder', 'ladder.hint': 'Click a rung to see its cards',
    'sec.opportunities': 'Worth trying now', 'sec.opportunities.sub': 'Several people stuck, a workaround on record. The best place to build something small.',
    'sec.resolved': 'Just shipped', 'sec.resolved.sub': 'Fixes that a published release provably contains.',
    'sec.coming': 'Fix on the way', 'sec.coming.sub': 'Merged, not released yet. Test it early or help it land.',
    'sec.watching': 'Sources disagree', 'sec.watching.sub': 'Reopened or reported again after a fix.',
    'sec.seeall': 'See all', 'sec.empty': 'Nothing here yet.',
    'filters.search': 'Search titles, errors, workarounds…', 'filters.state': 'State', 'filters.repo': 'Repository',
    'filters.all': 'All repositories', 'filters.allStates': 'All states', 'detail.shipped': 'Shipped in', 'filters.sort': 'Sort', 'sort.recent': 'Recently moved', 'sort.cases': 'Most cases', 'sort.new': 'Newest reports',
    'filters.clear': 'Clear filters', 'list.count': '{n} problems', 'list.more': 'Show more', 'list.empty': 'No problem matches these filters.',
    'card.cases': '{n} first-hand case|{n} first-hand cases', 'card.teams': '{n} verified team|{n} verified teams',
    'card.follow': 'Follow', 'card.following': 'Following', 'card.new': '{n} new',
    'card.since': 'since {date}', 'card.closedNoFix': 'Closed without fix',
    'detail.back': '← Back', 'detail.openIssue': 'Open on GitHub', 'detail.reported': 'First reported {date}',
    'detail.why': 'Why it is in this state', 'detail.openSource': 'Open the source',
    'detail.was': '{state} since {date}, before that {prev}', 'detail.sinceOnly': '{state} since {date}',
    'detail.job': 'Trying to', 'detail.blocker': 'Blocked by', 'detail.workaround': 'Workaround today', 'detail.env': 'Environment',
    'detail.notStated': 'Not stated in the sources', 'detail.source': 'source',
    'detail.fix': 'Fix', 'detail.noFix': 'No merged fix linked yet.', 'detail.mergedOn': 'merged {date}',
    'detail.shippedIn': 'shipped in {tag}', 'detail.notReleased': 'not in a release yet', 'detail.partial': 'Partial fixes',
    'detail.next': 'Smallest next step', 'detail.evidence': 'Evidence', 'detail.history': 'State history',
    'detail.created': 'Created as', 'detail.outcome': 'Did this card lead somewhere?',
    'detail.outcomeNote': 'Saved in this browser. In the pilot, these answers matter more than any click count.',
    'detail.appliesTo': 'applies to {v}', 'detail.sourceNow': 'source now: {s}', 'detail.checked': 'checked {ago}',
    'detail.missing': 'This card no longer exists. It may have merged into another card.',
    'outcome.talked': 'Talked to a user', 'outcome.contributed': 'Contributed', 'outcome.prototyped': 'Built a prototype', 'outcome.not_useful': 'Not useful',
    'following.title': 'Following', 'following.sub': 'Saved in this browser. You hear about a card only when its state changes, and every change links what caused it.',
    'following.changes': 'Changed since you last looked', 'following.markSeen': 'Mark all as seen', 'following.cards': 'Followed problems',
    'following.empty': 'You are not following anything yet. Press Follow on any problem.',
    'changes.title': 'Changelog', 'changes.sub': 'Every state change, newest first. A rescan that finds nothing new writes nothing here.',
    'changes.empty': 'No state changes yet. The first sync creates cards, later syncs move them.',
    'digest.title': 'Weekly digest', 'digest.sub': 'Built automatically from the changelog. Subscribe in any reader:', 'digest.rss': 'RSS feed',
    'digest.sofar': 'so far', 'digest.top': 'Top opportunities right now', 'digest.empty': 'No digest yet.',
    'sources.title': 'Sources and quality', 'sources.sub': 'Each source syncs on its own cursor. A failing source keeps its last good data and shows its delay here.',
    'sources.col.source': 'Source', 'sources.col.success': 'Last success', 'sources.col.status': 'Status', 'sources.col.items': 'Items', 'sources.col.requests': 'Requests',
    'sources.ok': 'OK', 'sources.catching': 'Catching up', 'sources.failing': 'Failing ×{n}',
    'sources.note': 'Resolutions and retractions are counted apart on purpose: a withdrawn card is a radar error, a resolved one is the radar working.',
    'm.cards': 'problems tracked', 'm.published': 'past the publish rule', 'm.changed': 'moved by new evidence', 'm.resolved': 'resolved by a verified release',
    'm.retracted': 'withdrawn (quality miss)', 'm.conflicts': 'moved to watching', 'm.closedNoFix': 'closed issues not counted as fixed',
    'm.cases': 'first-hand cases', 'm.teams': 'verified teams',
    'foot.left': 'Built from public GitHub and Hacker News data. Every claim links to its source.', 'foot.code': 'Source code',
    'loading': 'Loading the radar…', 'loadError': 'Could not load radar data: {e}',
    'ago.never': 'never',
  },
  tr: {
    'dt.funding': 'Yatırım', 'dt.product': 'Ürün', 'dt.launch': 'Lansman', 'dt.new_repo': 'Yeni repo', 'dt.news': 'Haber', 'dt.release': 'Sürüm', 'dt.tool': 'Araç',
    'n.home': 'Ana sayfa', 'n.domains': 'Alanlar',
    'h.kicker': 'Fırsat radarı · {d} alan · {s} canlı kaynak',
    'h.title': 'Dünyada <em>hâlâ ne eksik?</em>',
    'h.lede': 'İnsanlar her gün neye ihtiyaç duyduğunu yazıyor: Stack Exchange’te, mühendislik ve maker forumlarında, Hacker News’te. Radar hepsini okur, aynı anlama gelen istekleri gruplar, zaten ne olduğuna bakar ve açıkları bugün başlayabileceğin ürün, girişim ve proje fikirlerine çevirir.',
    'h.stat.ideas': 'boşta görünen fikir', 'h.stat.needs': 'okunan ihtiyaç', 'h.stat.devs': 'piyasa gelişmesi',
    'h.index': 'Alanlar', 'h.top': 'Şu an en güçlü fikirler', 'h.top.sub': 'Birden fazla kişi istiyor, henüz neredeyse hiçbir şey karşılamıyor.',
    'h.map': 'Fırsat haritası', 'h.map.sub': 'Sağa gittikçe daha çok kişi istiyor. Aşağı indikçe daha az şey var. Sağ alt köşe boşta görünen fikirler.',
    'h.live': 'Canlı',
    'd.ideas': 'Fikirler', 'd.needs': 'İhtiyaçlar', 'd.devs': 'Gelişmeler', 'd.all': 'Tümü', 'd.openIdeas': '{n} boşta fikir|{n} boşta fikir', 'd.needsN': '{n} ihtiyaç|{n} ihtiyaç', 'd.devsN': '{n} gelişme|{n} gelişme',
    'd.noIdeas': 'Burada henüz fikir yok. İhtiyaçlar birikiyor; birden fazla kişi aynı şeyi isteyince fikir çıkıyor.',
    'd.src.all': 'Tüm kaynaklar', 'd.src.stackexchange': 'Soru-cevap siteleri', 'd.src.forum': 'Forumlar', 'd.src.hn': 'Hacker News', 'd.src.github': 'GitHub sorunları',
    'i.type.startup': 'Girişim fikri', 'i.type.product': 'Ürün fikri', 'i.type.project': 'Proje fikri',
    'i.strength.strong': 'Güçlü kanıt', 'i.strength.emerging': 'Yükselen', 'i.strength.signal': 'Tek sinyal',
    'i.open': 'Boşta görünüyor', 'i.partial': 'Kısmen karşılanıyor', 'i.crowded': 'Kalabalık',
    'i.people': '{n} kişi istiyor|{n} kişi istiyor', 'i.evidence': 'Kim istiyor', 'i.solutions': 'Zaten ne var', 'i.none': 'Lansmanlar, yeni repolar ve bilinen araçlar arasında yakın bir şey çıkmadı.',
    'i.next': 'En küçük sonraki adım', 'i.original': 'Orijinali', 'i.views': '{n} görüntülenme', 'i.answered': 'cevaplanmış', 'i.unanswered': 'cevapsız',
    'i.verdict.open': 'Bu fikir boşta gibi: {people} ve ürün lansmanları, yeni repolar ya da bilinen araçlar arasında yakın bir şey çıkmadı.',
    'i.verdict.partial': 'Kısmen karşılanıyor: {people} ve birkaç şey yaklaşıyor. Gerçekten çözüp çözmediklerine bak.',
    'i.verdict.crowded': 'Kalabalık: {people} ama zaten birçok ürün bunu hedefliyor. Kaçırdıkları parçayı ara.',
    'i.step.talk_payers': 'Para öderim diyen {n} kişiye ulaş. Bugün ne kullandıklarını ve bunun onlara neye mal olduğunu sor.',
    'i.step.prototype': 'Bu hafta sonu en küçük sürümünü yap ve aşağıdaki {n} kişiye göster.',
    'i.step.validate': 'Şimdilik tek net bir istek var. Ona cevap yaz, neler denediğini sor ve aynı ihtiyacı olan iki kişi daha bul.',
    'i.step.differentiate': 'Benzer bir şey var. Aşağıdaki kişilere bunun neden onlara yetmediğini sor.',
    'k.pay': 'para öderim diyor', 'k.seeking': 'araç arıyor', 'k.question': 'soru', 'k.complaint': 'şikâyet',
    'map.x': 'Daha çok kişi istiyor →', 'map.y': 'Zaten daha çok şey var →', 'map.open': 'Boşta görünüyor', 'map.crowded': 'Kalabalık',
    'gap.open': 'Açık görünüyor', 'gap.partial': 'Kısmen karşılanıyor', 'gap.crowded': 'Kalabalık',
    'gap.market': 'Pazar boşluğu', 'gap.upstream': 'Kaynakta istek',
    'gap.people': '{n} kişi|{n} kişi', 'gap.pay': '{n} kişi para öderim diyor', 'gap.seeking': '{n} kişi araç arıyor', 'gap.complaints': '{n} şikâyet|{n} şikâyet',
    'gap.problems': '{n} problem bildirimi|{n} problem bildirimi', 'gap.features': '{n} özellik isteği|{n} özellik isteği', 'gap.questions': '{n} soru|{n} soru', 'gap.unanswered': '{n} cevapsız',
    'gap.solutionsN': '{n} yakın çözüm|{n} yakın çözüm', 'gap.noSolutions': 'yakın bir çözüm bulunamadı', 'gap.interestN': '{n} ilgili yatırım turu|{n} ilgili yatırım turu',
    'gap.verdictOpen': 'Bu fikir boşta gibi: {people} bunu istiyor ve bilinen araçlar, yeni ürünler, lansmanlar ya da yeni repolar arasında buna yakın bir şey çıkmadı.',
    'gap.verdictPartial': 'Kısmen karşılanıyor: {people} bunu istiyor ve birkaç şey yaklaşıyor. Gerçekten çözüp çözmediklerine bak.',
    'gap.verdictCrowded': 'Kalabalık: {people} bunu istiyor ama zaten birçok araç bunu hedefliyor. Kaçırdıkları parçayı ara.',
    'gap.upstreamNote': 'Bu talebin hepsi tek bir projede, o yüzden en iyi hamle genelde oraya katkı vermek.',
    'gap.evidence': 'Bunu kim istiyor', 'gap.solutions': 'En yakın mevcut çözümler', 'gap.interest': 'Yakındaki yatırımcı ilgisi', 'gap.similar': '%{p} benzer',
    'gap.next': 'En küçük sonraki adım', 'gap.area': 'Alan', 'gap.keywords': 'Anahtar kelimeler',
    'gap.step.talk_payers': 'Para öderim diyen {n} kişiye ulaş. Bugün ne kullandıklarını ve bunun onlara neye mal olduğunu sor.',
    'gap.step.prototype': 'Belgelenmiş bir geçici çözüm var. Onu ortadan kaldıran en küçük aracı yap ve aşağıdaki kişilere göster.',
    'gap.step.interview': 'Kod yazmadan önce aşağıdakilerden {n} kişiyle konuş: bugün bunu nasıl idare ediyorlar?',
    'gap.step.contribute': '{repo} içindeki isteği üstlen: üzerinde çalıştığını yaz ve küçük bir PR aç.',
    'gaps.title': 'Fırsatlar', 'gaps.sub': 'Talebin güçlü, arzın zayıf olduğu yerler. Yerel dil modeli aynı anlama gelen istekleri gruplar, sonra bunları zaten çözen bir şey var mı diye bakar.',
    'gaps.tab.market': 'Pazar boşlukları', 'gaps.tab.upstream': 'Katkı fırsatları', 'gaps.tab.areas': 'Alanlar',
    'gaps.radar': 'Boşluk radarı', 'gaps.radar.legend': 'Merkez = açık görünüyor · kenar = kalabalık · içi boş = kaynakta istek',
    'ov.gaps': 'Boşta görünen fikirler', 'ov.gaps.sub': 'Birden fazla kişi istiyor, henüz neredeyse hiçbir şey karşılamıyor.',
    'ov.areas': 'İzlenecek alanlar', 'ov.areas.sub': 'Piyasa gelişmelerinin birinci elden ihtiyaçlarla buluştuğu alanlar.',
    'hero3.kicker': 'Pazar boşluğu radarı · {n} talep ve arz kaynağı',
    'hero3.title': 'Boşluğu başkası doldurmadan <em>önce</em> bul.',
    'hero3.lede': 'Radar dünyanın her yerinden yatırım haberlerini, ürün lansmanlarını, yeni repoları, sürüm notlarını ve geliştiricilerin gerçekten ne istediğini, neden şikâyet ettiğini okur. Yerel bir dil modeli aynı anlama gelen istekleri gruplar ve bunları zaten çözen bir şey var mı diye bakar. Geriye kalan, her birinin arkasında kanıtı olan, boşta görünen fikirlerin listesi.',
    'nav.opps': 'Fırsatlar', 'nav.devs': 'Gelişmeler', 'nav.needs': 'İhtiyaçlar',
    'hero2.title': 'Piyasada ne olduğunu gör, <em>insanların nerede takıldığını anla,</em> bugün başlayabileceğin gerçek bir iş bul.',
    'hero2.lede': 'Bir yanda gelişmeler (yatırımlar, yeni AI ürünleri, sürümler, haberler, yepyeni repolar), öbür yanda ihtiyaçlar (GitHub ve Hacker News’ten birinci elden problemler). İkisi buluştuğunda radar bir fırsat kartı açar: kanıtı, mevcut çözümler, araştırılacak dar soru ve deneyebileceğin en küçük şey.',
    'hero2.cta': 'Fırsatları gör', 'hero2.cta2': 'Son gelişmeler',
    'ov.opps': 'Öne çıkan fırsatlar', 'ov.opps.sub': 'Bir gelişme bir ihtiyaçla buluşuyor. Doğrulanmış yatırım, lansman ve birinci elden talebe göre sıralı.',
    'ov.devs': 'Son gelişmeler', 'ov.devs.sub': 'Yatırımlar, lansmanlar, sürümler ve haberler. Aynı haberin kopyaları tek sayılır.',
    'ov.needs': 'Hareketlenen ihtiyaçlar', 'ov.needs.sub': 'Kanıtı az önce değişen problemler.',
    'opps.title': 'Fırsatlar', 'opps.sub': 'Her kart, aynı alandaki piyasa gelişmelerini gerçek, birinci elden ihtiyaçlarla birleştirir. Araştırılacak dar bir soru ve en küçük ilk deneyle gelir.',
    'opp.supply': 'Gelişmeler', 'opp.demand': 'İhtiyaçlar', 'opp.question': 'Araştırılacak ihtiyaç', 'opp.experiment': 'İlk deney',
    'opp.status': 'Kartın durumu', 'opp.tools': 'Mevcut çözümler', 'opp.releases': 'Bu alandaki son sürümler', 'opp.devlist': 'Piyasa gelişmeleri (son 30 gün)',
    'opp.needlist': 'Bu alandaki birinci elden ihtiyaçlar', 'opp.seeNeeds': '{n} ihtiyacın tamamını gör', 'opp.anchor': 'En güçlü kanıt: {title}',
    'opp.fundingN': '{n} yatırım turu|{n} yatırım turu', 'opp.verifiedN': '{n} doğrulanmış', 'opp.productsN': '{n} lansman|{n} lansman', 'opp.reposN': '{n} yeni repo|{n} yeni repo', 'opp.newsN': '{n} haber|{n} haber',
    'opp.casesN': '{n} birinci elden vaka|{n} birinci elden vaka', 'opp.cardsN': '{n} problem|{n} problem', 'opp.multiN': '{n} tanesinde 2+ kişi', 'opp.worthN': '{n} denemeye değer', 'opp.workaroundsN': '{n} tanesinde geçici çözüm',
    'opp.faded': 'Bu alanda yakın zamanda gelişme yok', 'opp.history': 'Durum geçmişi',
    'devs.title': 'Gelişmeler', 'devs.sub': 'Ne değişiyor: yatırım duyuruları, yeni AI ürünleri, sürüm notları, medya haberleri ve yepyeni küçük repolar. Aynı haberi yayımlayan onlarca site tek olay sayılır, ayrı sinyal değil.',
    'devs.all': 'Tümü', 'devs.topic': 'Alan', 'devs.allTopics': 'Tüm alanlar', 'devs.outlets': '{n} kaynakta yayımlandı, tek sayıldı|{n} kaynakta yayımlandı, tek sayıldı',
    'devs.verified': '2+ kaynakla doğrulandı', 'devs.single': 'tek kaynak', 'devs.stars': '{n} yıldız', 'devs.points': '{n} puan', 'devs.empty': 'Uyan gelişme yok.',
    'devs.opp': 'Fırsat', 'needs.title': 'İhtiyaçlar', 'needs.sub': 'GitHub issue’larından ve Hacker News’ten birinci elden problemler: kim takılmış, ne yapmaya çalışıyormuş, bugün nasıl idare ediyor ve hangi düzeltme gerçekten yayımlandı.',
    'follow.meaning': 'Senin için anlamı', 'live.updated': 'Yeni veri yüklendi', 'live.updatedN': 'Yeni veri: {n} yeni değişiklik|Yeni veri: {n} yeni değişiklik',
    'nav.overview': 'Genel bakış', 'nav.cards': 'Problemler', 'nav.following': 'Takip', 'nav.changes': 'Değişiklikler',
    'nav.digest': 'Haftalık', 'nav.sources': 'Kaynaklar', 'nav.about': 'Nasıl çalışır',
    'brand.tag': 'AI altyapısı ve geliştirici araçları',
    'status.synced': '{ago} güncellendi', 'status.sources': '{n} kaynak', 'status.failing': '{n} hatalı', 'status.delayed': '{n} gecikmeli',
    'hero.kicker': 'Fırsat radarı · yatırım, lansman, haber · {repos} repo · Hacker News', 'brand.name': 'Fırsat Radarı',
    'hero.title': 'Geliştiriciler nerede takılıyor, <em>ve ne zaman gerçekten çözülüyor.</em>',
    'hero.lede': 'Her kart gerçek bir problem. Haberle değil, birinci elden vakayla sayılır. Kart ancak kanıt değişince hareket eder: ikinci biri aynı soruna takılır, bir düzeltme birleşir, bir sürüm onu yayımlar.',
    'hero.cta': 'Problemlere göz at', 'hero.cta2': 'Kanıt nasıl işliyor',
    'ladder.title': 'Kanıt merdiveni', 'ladder.hint': 'Kartlarını görmek için bir basamağa tıkla',
    'sec.opportunities': 'Şimdi denemeye değer', 'sec.opportunities.sub': 'Birden fazla kişi takılmış, geçici bir çözüm kayıtlı. Küçük bir şey inşa etmek için en iyi yer.',
    'sec.resolved': 'Yeni çözülenler', 'sec.resolved.sub': 'Yayımlanmış bir sürümün içerdiği kanıtlanan düzeltmeler.',
    'sec.coming': 'Çözüm yolda', 'sec.coming.sub': 'Birleşti ama henüz sürüme girmedi. Erkenden dene ya da yayına girmesine yardım et.',
    'sec.watching': 'Kaynaklar çelişiyor', 'sec.watching.sub': 'Düzeltmeden sonra yeniden açılmış ya da tekrar bildirilmiş.',
    'sec.seeall': 'Tümünü gör', 'sec.empty': 'Henüz bir şey yok.',
    'filters.search': 'Başlık, hata, geçici çözüm ara…', 'filters.state': 'Durum', 'filters.repo': 'Repo',
    'filters.all': 'Tüm repolar', 'filters.allStates': 'Tüm durumlar', 'detail.shipped': 'Yayımlandığı sürüm:', 'filters.sort': 'Sıralama', 'sort.recent': 'Son hareket edenler', 'sort.cases': 'En çok vaka', 'sort.new': 'En yeni bildirimler',
    'filters.clear': 'Filtreleri temizle', 'list.count': '{n} problem', 'list.more': 'Daha fazla göster', 'list.empty': 'Bu filtrelere uyan problem yok.',
    'card.cases': '{n} birinci elden vaka|{n} birinci elden vaka', 'card.teams': '{n} doğrulanmış ekip|{n} doğrulanmış ekip',
    'card.follow': 'Takip et', 'card.following': 'Takipte', 'card.new': '{n} yeni',
    'card.since': '{date} tarihinden beri', 'card.closedNoFix': 'Düzeltmesiz kapatılmış',
    'detail.back': '← Geri', 'detail.openIssue': "GitHub'da aç", 'detail.reported': 'İlk bildirim {date}',
    'detail.why': 'Neden bu durumda', 'detail.openSource': 'Kaynağı aç',
    'detail.was': '{date} tarihinden beri {state}, öncesinde {prev}', 'detail.sinceOnly': '{date} tarihinden beri {state}',
    'detail.job': 'Yapmaya çalıştığı', 'detail.blocker': 'Takıldığı yer', 'detail.workaround': 'Bugünkü geçici çözüm', 'detail.env': 'Ortam',
    'detail.notStated': 'Kaynaklarda belirtilmemiş', 'detail.source': 'kaynak',
    'detail.fix': 'Düzeltme', 'detail.noFix': 'Henüz bağlı birleşmiş bir düzeltme yok.', 'detail.mergedOn': '{date} birleşti',
    'detail.shippedIn': '{tag} sürümünde yayımlandı', 'detail.notReleased': 'henüz bir sürümde değil', 'detail.partial': 'Kısmi düzeltmeler',
    'detail.next': 'En küçük sonraki adım', 'detail.evidence': 'Kanıtlar', 'detail.history': 'Durum geçmişi',
    'detail.created': 'Şu durumda oluşturuldu:', 'detail.outcome': 'Bu kart bir yere vardı mı?',
    'detail.outcomeNote': 'Bu tarayıcıda saklanır. Pilotta bu cevaplar her tıklama sayısından daha değerli.',
    'detail.appliesTo': 'geçerli sürüm: {v}', 'detail.sourceNow': 'kaynağın durumu: {s}', 'detail.checked': '{ago} kontrol edildi',
    'detail.missing': 'Bu kart artık yok. Başka bir kartla birleşmiş olabilir.',
    'outcome.talked': 'Bir kullanıcıyla konuştum', 'outcome.contributed': 'Katkı verdim', 'outcome.prototyped': 'Prototip yaptım', 'outcome.not_useful': 'İşe yaramadı',
    'following.title': 'Takip ettiklerin', 'following.sub': 'Bu tarayıcıda saklanır. Bir karttan ancak durumu değişince haberin olur ve her değişiklik sebebine link verir.',
    'following.changes': 'Son bakışından beri değişenler', 'following.markSeen': 'Hepsini görüldü say', 'following.cards': 'Takip edilen problemler',
    'following.empty': 'Henüz hiçbir şeyi takip etmiyorsun. Herhangi bir problemde Takip et düğmesine bas.',
    'changes.title': 'Değişiklikler', 'changes.sub': 'Her durum değişikliği, en yenisi üstte. Yeni bir şey bulamayan tarama buraya hiçbir şey yazmaz.',
    'changes.empty': 'Henüz durum değişikliği yok. İlk tarama kartları oluşturur, sonrakiler onları hareket ettirir.',
    'digest.title': 'Haftalık özet', 'digest.sub': 'Değişiklik kaydından otomatik oluşur. Herhangi bir okuyucuyla abone ol:', 'digest.rss': 'RSS akışı',
    'digest.sofar': 'şimdiye kadar', 'digest.top': 'Şu anki en iyi fırsatlar', 'digest.empty': 'Henüz özet yok.',
    'sources.title': 'Kaynaklar ve kalite', 'sources.sub': 'Her kaynak kendi ilerleme kaydıyla taranır. Hata veren kaynak son sağlam verisini korur ve gecikmesi burada görünür.',
    'sources.col.source': 'Kaynak', 'sources.col.success': 'Son başarılı', 'sources.col.status': 'Durum', 'sources.col.items': 'Kayıt', 'sources.col.requests': 'İstek',
    'sources.ok': 'Sorunsuz', 'sources.catching': 'Yetişiyor', 'sources.failing': '{n} kez hata',
    'sources.note': 'Çözülenler ve geri çekilenler bilerek ayrı sayılır: geri çekilen kart radarın hatası, çözülen kart radarın işini yapması demek.',
    'm.cards': 'izlenen problem', 'm.published': 'yayın kuralını geçen', 'm.changed': 'yeni kanıtla hareket eden', 'm.resolved': 'doğrulanmış sürümle çözülen',
    'm.retracted': 'geri çekilen (kalite hatası)', 'm.conflicts': 'takibe alınan', 'm.closedNoFix': 'düzeltmesiz kapanıp çözüldü sayılmayan',
    'm.cases': 'birinci elden vaka', 'm.teams': 'doğrulanmış ekip',
    'foot.left': 'Açık GitHub ve Hacker News verisinden üretilir. Her iddia kaynağına bağlanır.', 'foot.code': 'Kaynak kod',
    'loading': 'Radar yükleniyor…', 'loadError': 'Radar verisi yüklenemedi: {e}',
    'ago.never': 'hiç',
  },
};

export const STATE_NAMES = {
  en: { early_signal: 'Early signal', worth_trying: 'Worth trying', watching: 'Watching', fix_coming: 'Fix coming', resolved: 'Resolved', retracted: 'Withdrawn' },
  tr: { early_signal: 'Erken sinyal', worth_trying: 'Denemeye değer', watching: 'Takipte', fix_coming: 'Çözüm geliyor', resolved: 'Çözüldü', retracted: 'Geri çekildi' },
};

export const GROUP_NAMES = {
  en: { 'inference-server': 'Inference servers', 'local-runner': 'Local runners', gateway: 'Gateways', sdk: 'SDKs', framework: 'Agent & RAG frameworks', observability: 'Observability', training: 'Training' },
  tr: { 'inference-server': 'Çıkarım sunucuları', 'local-runner': 'Yerel çalıştırıcılar', gateway: 'Ağ geçitleri', sdk: "SDK'lar", framework: 'Ajan ve RAG çatıları', observability: 'Gözlemlenebilirlik', training: 'Eğitim' },
};

export const STATE_RULES = {
  en: {
    early_signal: 'At least one first-hand report.',
    worth_trying: 'Two or more people hit it, and one documented a workaround.',
    fix_coming: 'A closing pull request merged. No release contains it yet.',
    resolved: 'A stable release provably contains the fix.',
    watching: 'Reopened, or reported again, after a fix.',
    retracted: 'The only reporter withdrew the claim.',
  },
  tr: {
    early_signal: 'En az bir birinci elden bildirim var.',
    worth_trying: 'İki veya daha fazla kişi takılmış ve biri geçici çözümünü yazmış.',
    fix_coming: 'Kapatan bir PR birleşti. Henüz hiçbir sürümde yok.',
    resolved: 'Kararlı bir sürümün düzeltmeyi içerdiği kanıtlandı.',
    watching: 'Düzeltmeden sonra yeniden açılmış ya da tekrar bildirilmiş.',
    retracted: 'Tek bildiren kişi iddiasını geri çekmiş.',
  },
};

export const EVIDENCE_NAMES = {
  en: {
    case: 'First-hand case', case_retracted: 'Retracted case', retraction: 'Retraction', workaround: 'Workaround',
    fix_merged: 'Fix merged', fix_released: 'Fix released', partial_fix: 'Partial fix merged', partial_fix_released: 'Partial fix released',
    conflict: 'Conflicting report', closed_without_fix: 'Closed, no fix', syndicated_copy: 'Syndicated copy',
  },
  tr: {
    case: 'Birinci elden vaka', case_retracted: 'Geri çekilen vaka', retraction: 'Geri çekme', workaround: 'Geçici çözüm',
    fix_merged: 'Düzeltme birleşti', fix_released: 'Düzeltme yayımlandı', partial_fix: 'Kısmi düzeltme birleşti', partial_fix_released: 'Kısmi düzeltme yayımlandı',
    conflict: 'Çelişen bildirim', closed_without_fix: 'Düzeltmesiz kapandı', syndicated_copy: 'Kopya içerik',
  },
};

const METHODS = {
  en: { 'tag contains merge commit': 'the tag contains the merge commit', 'release notes reference the PR': 'the release notes reference the PR' },
  tr: { 'tag contains merge commit': 'sürüm etiketi birleştirme commit’ini içeriyor', 'release notes reference the PR': 'sürüm notları PR’a atıf yapıyor' },
};

const SIZES = {
  en: { 'Interview first': 'Interview first', 'Weekend prototype': 'Weekend prototype', Tonight: 'Tonight' },
  tr: { 'Interview first': 'Önce görüşme', 'Weekend prototype': 'Hafta sonu prototipi', Tonight: 'Bu akşam' },
};

const FLAGS = {
  en: {
    closedWithoutFix: 'Closed without a merged fix, not counted as resolved', partialFixMerged: 'Partial fix merged',
    narrowed: 'Narrowed: a partial fix shipped, the rest stays open', hnOnly: 'Hacker News only',
    syndicated: '{n} syndicated copy counted once|{n} syndicated copies counted once', retracted: '{n} retracted case|{n} retracted cases',
  },
  tr: {
    closedWithoutFix: 'Birleşmiş düzeltme olmadan kapatılmış, çözüldü sayılmıyor', partialFixMerged: 'Kısmi düzeltme birleşti',
    narrowed: 'Daraltıldı: kısmi düzeltme yayımlandı, kalanı açık', hnOnly: 'Sadece Hacker News',
    syndicated: '{n} kopya içerik tek sayıldı|{n} kopya içerik tek sayıldı', retracted: '{n} geri çekilen vaka|{n} geri çekilen vaka',
  },
};

let lang = 'en';
export function setLang(l) { lang = STRINGS[l] ? l : 'en'; }
export function getLang() { return lang; }

function fill(str, vars = {}) {
  let s = str;
  if (s.includes('|')) { const [one, many] = s.split('|'); s = Number(vars.n) === 1 ? one : many; }
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

export const t = (key, vars) => fill(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars);
export const stateName = (s) => STATE_NAMES[lang][s] || s;
export const groupName = (g) => GROUP_NAMES[lang][g] || g;
export const stateRule = (s) => STATE_RULES[lang][s] || '';
export const evidenceName = (s) => EVIDENCE_NAMES[lang][s] || s;
export const sizeName = (s) => SIZES[lang][s] || s;
export const flagText = (k, vars) => fill(FLAGS[lang][k] || k, vars);
export const methodText = (m) => METHODS[lang][m] || m;

/**
 * Explain a state change in the current language. Uses the structured code
 * and params when present, and falls back to parsing the English reason for
 * older events.
 */
export function reasonText(r) {
  if (!r) return '';
  let code = r.code;
  let p = r.params || {};
  const reason = r.reason || '';
  if (!code) {
    let m;
    if ((m = reason.match(/^Fix (\S+) verified in release (\S+) \((.+)\)\.$/))) { code = 'resolved'; p = { pr: m[1], tag: m[2], method: m[3] }; }
    else if ((m = reason.match(/^Fix (\S+) was merged/))) { code = 'fix_coming'; p = { pr: m[1] }; }
    else if ((m = reason.match(/^(\d+) first-hand cases/))) { code = 'worth_trying'; p = { count: m[1] }; }
    else if (/reopened/.test(reason)) code = 'reopened';
    else if (/still happens/.test(reason)) code = 'still_happening';
    else if (/retracted/.test(reason)) code = 'retracted';
    else if (/first-hand report was found/.test(reason)) code = 'early_signal';
  }
  const tr = lang === 'tr';
  switch (code) {
    case 'resolved': return tr ? `${p.pr} düzeltmesi ${p.tag} sürümünde doğrulandı (${methodText(p.method)}).` : `Fix ${p.pr} verified in release ${p.tag} (${methodText(p.method)}).`;
    case 'fix_coming': return tr ? `${p.pr} düzeltmesi birleşti, henüz hiçbir yayımlanmış sürüm onu içermiyor.` : `Fix ${p.pr} was merged; no published release contains it yet.`;
    case 'worth_trying': return tr ? `${p.count} birinci elden vaka ve belgelenmiş bir geçici çözüm var.` : `${p.count} first-hand cases and a documented workaround.`;
    case 'reopened': return tr ? 'Düzeltme birleştikten sonra issue yeniden açıldı.' : 'The issue was reopened after a fix was merged.';
    case 'still_happening': return tr ? 'Yeni bir bildirim, sorunun düzeltmeden sonra da sürdüğünü söylüyor.' : 'A new report says the problem still happens after the fix.';
    case 'retracted': return tr ? 'Tek birinci elden bildirim, yazarı tarafından geri çekildi.' : 'The only first-hand report was retracted by its author.';
    case 'early_signal': return tr ? 'Birinci elden bir bildirim bulundu.' : 'A first-hand report was found.';
    default: return reason;
  }
}

/** The "smallest next step" in the current language. */
export function nextStepText(n, card) {
  if (!n) return '';
  const tr = lang === 'tr';
  const code = n.code || card?.state;
  const p = n.params || {};
  const pr = p.pr || card?.fixes?.[0]?.pr;
  const tag = p.tag || card?.fixes?.find((f) => f.release)?.release.tag;
  const wa = p.workaround || card?.workaround?.value;
  switch (code) {
    case 'early_signal': return tr ? 'Şimdilik tek bir birinci elden bildirim var. Kaynak konuyu oku, bildirene ne yapmaya çalıştığını ve bugün nasıl idare ettiğini sor.' : n.text;
    case 'worth_trying': return tr ? `Birden fazla kişi takılmış ve biri geçici çözümünü yazmış. Bunu ortadan kaldıran en küçük aracı veya yamayı prototiple: “${wa}”` : n.text;
    case 'watching': return tr ? 'Kaynaklar çelişiyor. En son çelişen bildirimi aç ve en yeni sürümde yeniden üretmeyi dene.' : n.text;
    case 'fix_coming': return tr ? `Düzeltme (${pr}) birleşti ama henüz sürümde değil. main dalından dene ve issue'ya sonucu yaz ya da birleştirme commit'ine sabitle.` : n.text;
    case 'resolved': return tr ? `${tag} sürümüne yükselt. Bunun için bir geçici çözüm kullanıyorsan artık bırakabilirsin.` : n.text;
    case 'retracted': return tr ? 'Geri çekildi: bildiren kişi iddiasını geri aldı. Şeffaflık için tutuluyor.' : n.text;
    default: return n.text;
  }
}

export const OPP_STATE_NAMES = {
  en: { investigating: 'Investigating', demand_confirmed: 'Demand confirmed', being_solved: 'Being solved upstream', watching: 'Watching' },
  tr: { investigating: 'Araştırılıyor', demand_confirmed: 'Talep doğrulandı', being_solved: 'Kaynağında çözülüyor', watching: 'Takipte' },
};
export const oppStateName = (s) => OPP_STATE_NAMES[lang][s] || s;

export const DEV_TYPES = {
  en: { funding: 'Funding', product: 'Product', launch: 'Launch', new_repo: 'New repo', release: 'Release', news: 'News' },
  tr: { funding: 'Yatırım', product: 'Ürün', launch: 'Lansman', new_repo: 'Yeni repo', release: 'Sürüm', news: 'Haber' },
};
export const devTypeName = (s) => DEV_TYPES[lang][s] || s;

/** One-line card status, built from the evidence counts. */
export function oppStatusLine(o) {
  const tr = lang === 'tr';
  const s = o.supply, d = o.demand;
  const parts = [];
  if (s.funding) parts.push(tr ? `Yatırım: ${s.funding} tur, ${s.fundingVerified} tanesi 2+ kaynakla doğrulandı.` : `Funding: ${s.funding} round${s.funding === 1 ? '' : 's'}, ${s.fundingVerified} verified by 2+ outlets.`);
  else parts.push(tr ? `Piyasa: ${s.products} lansman, ${s.newRepos} yeni repo, ${s.news} haber.` : `Market: ${s.products} launches, ${s.newRepos} new repos, ${s.news} news stories.`);
  parts.push(tr ? `Talep: ${d.cards} problemde ${d.cases} birinci elden vaka, ${d.teams} doğrulanmış ekip.` : `Demand: ${d.cases} first-hand cases on ${d.cards} problems, ${d.teams} verified teams.`);
  const tail = {
    investigating: tr ? 'Küçük ekiplerde çözülmemiş bir ihtiyaç olup olmadığı araştırılıyor.' : 'Investigating whether the need is still unsolved.',
    demand_confirmed: tr ? 'Birden fazla kişinin takıldığı doğrulandı; ilk deney için hazır.' : 'Several people are confirmed stuck; ready for a first experiment.',
    being_solved: tr ? 'Bağlı problemlerin hepsinde birleşmiş ya da yayımlanmış bir düzeltme var.' : 'Every linked problem has a merged or released fix.',
    watching: tr ? 'Bir düzeltme tartışmalı; açık yeniden doğabilir.' : 'A fix is disputed; the gap may reopen.',
  }[o.state];
  parts.push(tail);
  return parts.join(' ');
}

export function experimentText(e) {
  const tr = lang === 'tr';
  const p = e.params || {};
  switch (e.code) {
    case 'prototype': return tr
      ? `“${p.title}” için insanların bugün kullandığı geçici çözümü ortadan kaldıran en küçük aracı yap ve bildirenlere göster.${p.workaround ? ` Geçici çözüm: “${p.workaround}”` : ''}`
      : `Build the smallest tool that removes the workaround people use today for “${p.title}”, then show it to the reporters.${p.workaround ? ` Workaround: “${p.workaround}”` : ''}`;
    case 'contribute': return tr
      ? `“${p.title}” için ${p.pr} düzeltmesini test et ve sonucu issue’ya yaz. Yeni bir şey yazmaktan önce kaynağa katkı ver.`
      : `Test ${p.pr} for “${p.title}” and report back on the issue. Contribute upstream before building something new.`;
    default: return tr
      ? `Kod yazmadan önce aşağıdaki problemlerin arkasındaki ${p.reporters} kişiyle konuş: bugün bunu nasıl idare ediyorlar, ne kadar zamanlarını alıyor?`
      : `Before writing code, talk to the ${p.reporters} people behind the top problems below: how do they handle this today, and what does it cost them?`;
  }
}

/** "What it means for you" line for a followed change. */
export function meaningText(e) {
  const tr = lang === 'tr';
  const m = {
    resolved: tr ? 'Yükseltip geçici çözümünü bırakabilirsin.' : 'You can upgrade and drop your workaround.',
    fix_coming: tr ? 'Düzeltmeyi erkenden dene ya da sürüme girmesine yardım et.' : 'Test the fix early, or help it land in a release.',
    worth_trying: tr ? 'Küçük bir prototipi haklı çıkaracak kadar kişi takılmış.' : 'Enough people are stuck to justify a small prototype.',
    watching: tr ? 'Düzeltme tutmayabilir; güvenmeden önce kontrol et.' : 'The fix may not hold. Check before you rely on it.',
    retracted: tr ? 'Problem geri çekildi; bir şey yapmana gerek yok.' : 'The problem was withdrawn; no action needed.',
    early_signal: tr ? 'Sen de takılıyor musun diye kaynağı oku.' : 'Read the source to see if you hit this too.',
    idea_open: tr ? 'Boşluk açıldı: artık yakın bir çözüm görünmüyor.' : 'The gap opened up: nothing close serves it now.',
    idea_partial: tr ? 'Yakın çözümler belirdi; neyi kaçırdıklarına bak.' : 'Close solutions appeared; check what they miss.',
    idea_crowded: tr ? 'Alan kalabalıklaştı; farklılaşmadan girme.' : 'It got crowded; do not enter without a clear difference.',
    opp_demand_confirmed: tr ? 'Birden fazla kişi takılmış; ilk deney zamanı.' : 'Several people are stuck here; time for a first experiment.',
    opp_being_solved: tr ? 'Kaynağında çözülüyor; sıfırdan yapmak yerine katkı ver.' : 'Upstream is fixing it; contribute rather than build.',
    opp_watching: tr ? 'Bir düzeltme tartışmalı; açık yeniden doğabilir.' : 'A fix is disputed; the gap may reopen.',
    opp_investigating: tr ? 'Piyasa ilgisi var; inşa etmeden önce kullanıcılarla konuş.' : 'Market interest exists; talk to users before building.',
  };
  return m[e.code] || m[e.to] || '';
}

export function oppReasonText(e) {
  const tr = lang === 'tr';
  if (!tr || !e.code?.startsWith('opp_')) return e.reason;
  const map = {
    opp_demand_confirmed: 'Talep doğrulandı: birden fazla kişinin takıldığı problemler var.',
    opp_being_solved: 'Bağlı her problemin artık birleşmiş ya da yayımlanmış bir düzeltmesi var.',
    opp_watching: 'Bağlı bir problem düzeltmeden sonra tartışmalı hale geldi.',
    opp_investigating: 'Piyasa sinyalleri birinci elden vakalarla buluştu; ihtiyaç hâlâ çözülmemiş mi?',
  };
  return map[e.code] || e.reason;
}
