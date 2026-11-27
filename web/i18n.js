// UI strings in English and Turkish. Source excerpts (issue titles, quotes)
// are shown in their original language on purpose: they are evidence.

export const STRINGS = {
  en: {
    'nav.overview': 'Overview', 'nav.cards': 'Problems', 'nav.following': 'Following', 'nav.changes': 'Changelog',
    'nav.digest': 'Weekly', 'nav.sources': 'Sources', 'nav.about': 'How it works',
    'brand.tag': 'AI infra & dev tools',
    'status.synced': 'Synced {ago}', 'status.sources': '{n} sources', 'status.failing': '{n} failing', 'status.delayed': '{n} delayed',
    'hero.kicker': 'Problem watchlist · {repos} repositories · GitHub + Hacker News',
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
    'nav.overview': 'Genel bakış', 'nav.cards': 'Problemler', 'nav.following': 'Takip', 'nav.changes': 'Değişiklikler',
    'nav.digest': 'Haftalık', 'nav.sources': 'Kaynaklar', 'nav.about': 'Nasıl çalışır',
    'brand.tag': 'AI altyapısı ve geliştirici araçları',
    'status.synced': '{ago} güncellendi', 'status.sources': '{n} kaynak', 'status.failing': '{n} hatalı', 'status.delayed': '{n} gecikmeli',
    'hero.kicker': 'Problem takip listesi · {repos} repo · GitHub + Hacker News',
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
