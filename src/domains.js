// Domains and their sub-areas. Every item the radar collects (a question, a
// forum post, a funding story, a new repository) is placed in one sub-area by
// meaning: the local language model compares it with each sub-area's
// description below. Keywords only break ties.
//
// Each domain also lists where its people talk (Stack Exchange sites, public
// Discourse forums), what news searches cover it, and which GitHub topics
// carry its brand-new projects.

const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const DOMAINS = [
  {
    id: 'computer', color: '#3b5bdb', name: { en: 'Computing & Software', tr: 'Bilgisayar & Yazılım' },
    subs: [
      { id: 'ai', name: { en: 'AI & LLM apps', tr: 'Yapay zekâ & LLM' }, desc: 'large language models, AI agents, chatbots, prompts, embeddings, RAG, model inference and fine-tuning', keywords: ['llm', 'gpt', 'agent', 'agents', 'ai', 'rag', 'embedding', 'prompt', 'inference', 'fine-tune', 'model'] },
      { id: 'devtools', name: { en: 'Developer tools', tr: 'Geliştirici araçları' }, desc: 'software developer tools, IDEs, CI/CD, testing, debugging, code review, APIs and SDKs', keywords: ['ide', 'ci', 'debug', 'testing', 'sdk', 'api', 'git', 'compiler', 'deploy', 'devops'] },
      { id: 'data', name: { en: 'Data & analytics', tr: 'Veri & analitik' }, desc: 'databases, data pipelines, spreadsheets, dashboards, analytics and data cleaning', keywords: ['database', 'sql', 'etl', 'dashboard', 'spreadsheet', 'excel', 'analytics', 'pipeline'] },
      { id: 'apps', name: { en: 'Apps & productivity', tr: 'Uygulamalar & verimlilik' }, desc: 'desktop and mobile apps, productivity software, automation of everyday tasks, file sync, notes and photos', keywords: ['app', 'android', 'iphone', 'windows', 'macos', 'productivity', 'automation', 'backup', 'sync'] },
    ],
    stackexchange: ['softwarerecs', 'softwareengineering', 'datascience'],
    forums: ['discuss.huggingface.co', 'discuss.pytorch.org'],
    news: ['(raises OR "seed round" OR "series A" OR launches) (AI OR "developer tools" OR SaaS OR software) startup when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['techcrunch', 'https://techcrunch.com/feed/'],
      ['theverge', 'https://www.theverge.com/rss/index.xml'],
      ['arstechnica', 'https://feeds.arstechnica.com/arstechnica/index'],
      ['wired', 'https://www.wired.com/feed/rss'],
      ['thenextweb', 'https://thenextweb.com/feed'],
      ['zdnet', 'https://www.zdnet.com/news/rss.xml'],
      ['theregister', 'https://www.theregister.com/headlines.atom'],
      ['infoq', 'https://feed.infoq.com/'],
      ['devto', 'https://dev.to/feed'],
      ['github-blog', 'https://github.blog/feed/'],
      ['mit-tech-review', 'https://www.technologyreview.com/feed/'],
      ['engadget', 'https://www.engadget.com/rss.xml'],
      ['siliconangle', 'https://siliconangle.com/feed/'],
      ['geekwire', 'https://www.geekwire.com/feed/'],
      ['sifted', 'https://sifted.eu/feed'],
      ['eu-startups', 'https://www.eu-startups.com/feed/'],
      ['crunchbase-news', 'https://news.crunchbase.com/feed/'],
      ['techfundingnews', 'https://techfundingnews.com/feed/'],
      ['tech-eu', 'https://tech.eu/feed/'],
      ['ycombinator-blog', 'https://www.ycombinator.com/blog/rss/'],
      ['lobsters', 'https://lobste.rs/rss'],
      ['huggingface-blog', 'https://huggingface.co/blog/feed.xml'],
    ],
    repoTopics: ['topic:llm', 'topic:ai-agents', 'topic:developer-tools', 'topic:productivity'],
  },
  {
    id: 'electronics', color: '#e8590c', name: { en: 'Electronics', tr: 'Elektronik' },
    subs: [
      { id: 'embedded', name: { en: 'Embedded & microcontrollers', tr: 'Gömülü sistemler & mikrodenetleyiciler' }, desc: 'microcontrollers, Arduino, ESP32, STM32, firmware, embedded C, bootloaders and peripherals', keywords: ['arduino', 'esp32', 'stm32', 'firmware', 'microcontroller', 'mcu', 'uart', 'i2c', 'spi', 'embedded'] },
      { id: 'pcb', name: { en: 'Circuits & PCB design', tr: 'Devre & PCB tasarımı' }, desc: 'circuit design, schematics, PCB layout, KiCad, components, soldering and signal integrity', keywords: ['pcb', 'kicad', 'schematic', 'footprint', 'resistor', 'capacitor', 'transistor', 'circuit', 'solder', 'op-amp'] },
      { id: 'iot', name: { en: 'IoT & sensors', tr: 'IoT & sensörler' }, desc: 'internet of things devices, sensors, wireless, LoRa, Zigbee, home automation and telemetry', keywords: ['iot', 'sensor', 'lora', 'zigbee', 'mqtt', 'wifi', 'bluetooth', 'telemetry', 'home automation'] },
      { id: 'power', name: { en: 'Power electronics', tr: 'Güç elektroniği' }, desc: 'power supplies, batteries, chargers, motor drivers, inverters, converters and power measurement', keywords: ['battery', 'charger', 'inverter', 'converter', 'buck', 'boost', 'mosfet', 'motor driver', 'power supply', 'voltage'] },
    ],
    stackexchange: ['electronics', 'arduino', 'iot'],
    forums: ['forum.kicad.info', 'forum.arduino.cc', 'community.platformio.org', 'community.particle.io'],
    news: ['(raises OR "seed round" OR "series A" OR launches) (electronics OR semiconductor OR IoT OR "embedded" OR sensors) startup when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['hackaday', 'https://hackaday.com/blog/feed/'],
      ['ieee-spectrum', 'https://spectrum.ieee.org/feeds/feed.rss'],
      ['eetimes', 'https://www.eetimes.com/feed/'],
      ['electronics-weekly', 'https://www.electronicsweekly.com/feed/'],
      ['cnx-software', 'https://www.cnx-software.com/feed/'],
      ['adafruit', 'https://blog.adafruit.com/feed/'],
      ['allaboutcircuits', 'https://www.allaboutcircuits.com/rss/news/'],
      ['embedded', 'https://www.embedded.com/feed/'],
      ['hackster', 'https://www.hackster.io/news.atom'],
      ['edn', 'https://www.edn.com/feed/'],
      ['electronicsforyou', 'https://www.electronicsforu.com/feed'],
    ],
    repoTopics: ['topic:embedded', 'topic:esp32', 'topic:iot', 'topic:kicad'],
  },
  {
    id: 'mechanical', color: '#2b8a3e', name: { en: 'Mechanical', tr: 'Makine' },
    subs: [
      { id: 'cad', name: { en: 'CAD & design', tr: 'CAD & tasarım' }, desc: 'mechanical design, CAD software, FreeCAD, Fusion 360, SolidWorks, tolerances and drawings', keywords: ['cad', 'freecad', 'fusion 360', 'solidworks', 'onshape', 'tolerance', 'drawing', 'stl', 'step file'] },
      { id: 'additive', name: { en: '3D printing', tr: '3D baskı' }, desc: '3D printers, filament, slicers, resin printing, print quality and printed parts', keywords: ['3d print', '3d printing', 'filament', 'slicer', 'resin', 'pla', 'petg', 'nozzle', 'printer'] },
      { id: 'cnc', name: { en: 'CNC & manufacturing', tr: 'CNC & imalat' }, desc: 'CNC machining, milling, laser cutting, welding, materials, fabrication and machine shops', keywords: ['cnc', 'milling', 'lathe', 'laser cutter', 'welding', 'machining', 'g-code', 'fabrication', 'steel', 'aluminum'] },
      { id: 'robotics', name: { en: 'Robotics & mechatronics', tr: 'Robotik & mekatronik' }, desc: 'robots, robot arms, ROS, actuators, motors, kinematics, drones and mechatronics', keywords: ['robot', 'robotics', 'ros', 'actuator', 'servo', 'stepper', 'kinematics', 'drone', 'gripper'] },
    ],
    stackexchange: ['engineering', '3dprinting', 'robotics'],
    forums: ['forum.makerforums.info'],
    news: ['(raises OR "seed round" OR "series A" OR launches) (robotics OR "3D printing" OR manufacturing OR CAD OR machining) startup when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['3dprintingindustry', 'https://3dprintingindustry.com/feed/'],
      ['3dprint-com', 'https://3dprint.com/feed/'],
      ['3dnatives', 'https://www.3dnatives.com/en/feed/'],
      ['voxelmatters', 'https://www.voxelmatters.com/feed/'],
      ['robot-report', 'https://www.therobotreport.com/feed/'],
      ['engineering-com', 'https://www.engineering.com/feed/'],
      ['interestingengineering', 'https://interestingengineering.com/feed'],
      ['plant-engineering', 'https://www.plantengineering.com/feed/'],
    ],
    repoTopics: ['topic:robotics', 'topic:3d-printing', 'topic:cad', 'topic:cnc'],
  },
  {
    id: 'hardware', color: '#5f3dc4', name: { en: 'Hardware', tr: 'Donanım' },
    subs: [
      { id: 'compute', name: { en: 'Chips & compute', tr: 'Çipler & işlem gücü' }, desc: 'CPUs, GPUs, chips, semiconductors, servers, data center hardware and accelerators', keywords: ['gpu', 'cpu', 'chip', 'semiconductor', 'server', 'nvidia', 'amd', 'risc-v', 'accelerator', 'datacenter'] },
      { id: 'sbc', name: { en: 'Single-board computers', tr: 'Tek kart bilgisayarlar' }, desc: 'Raspberry Pi, single-board computers, mini PCs, homelab and edge devices', keywords: ['raspberry pi', 'sbc', 'mini pc', 'homelab', 'jetson', 'nas', 'edge device'] },
      { id: 'devices', name: { en: 'Devices & peripherals', tr: 'Cihazlar & çevre birimleri' }, desc: 'laptops, phones, keyboards, mice, monitors, wearables, headphones and consumer hardware', keywords: ['laptop', 'keyboard', 'mouse', 'monitor', 'headphones', 'phone', 'tablet', 'wearable', 'usb', 'charger'] },
    ],
    stackexchange: ['hardwarerecs', 'raspberrypi'],
    forums: [],
    news: ['(raises OR "seed round" OR "series A" OR launches) (chip OR semiconductor OR "hardware startup" OR GPU OR device) when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['tomshardware', 'https://www.tomshardware.com/feeds/all'],
      ['servethehome', 'https://www.servethehome.com/feed/'],
      ['semiengineering', 'https://semiengineering.com/feed/'],
      ['notebookcheck', 'https://www.notebookcheck.net/News.152.100.html'],
      ['raspberrypi', 'https://www.raspberrypi.com/news/feed/'],
      ['liliputing', 'https://liliputing.com/feed/'],
      ['techpowerup', 'https://www.techpowerup.com/rss/news'],
      ['hothardware', 'https://hothardware.com/rss/news.aspx'],
      ['chipsandcheese', 'https://chipsandcheese.com/feed/'],
    ],
    repoTopics: ['topic:raspberry-pi', 'topic:hardware', 'topic:risc-v'],
  },
  {
    id: 'industry', color: '#c92a2a', name: { en: 'Industry', tr: 'Endüstri' },
    subs: [
      { id: 'automation', name: { en: 'Industrial automation', tr: 'Endüstriyel otomasyon' }, desc: 'PLC, SCADA, HMI, industrial control, Modbus, OPC UA, factory automation and industrial networks', keywords: ['plc', 'scada', 'hmi', 'modbus', 'opc ua', 'ignition', 'industrial', 'factory', 'automation'] },
      { id: 'energy', name: { en: 'Energy & utilities', tr: 'Enerji & altyapı' }, desc: 'solar, energy monitoring, batteries at scale, grid, heat pumps, EV charging and utilities', keywords: ['solar', 'energy', 'grid', 'heat pump', 'ev charging', 'kwh', 'inverter', 'meter', 'utility'] },
      { id: 'operations', name: { en: 'Operations & supply chain', tr: 'Operasyon & tedarik zinciri' }, desc: 'manufacturing operations, quality control, maintenance, inventory, logistics and supply chain', keywords: ['inventory', 'logistics', 'supply chain', 'maintenance', 'quality control', 'erp', 'mes', 'warehouse', 'procurement'] },
    ],
    stackexchange: [],
    forums: ['forum.inductiveautomation.com', 'community.openenergymonitor.org'],
    news: ['(raises OR "seed round" OR "series A" OR launches) ("industrial AI" OR manufacturing OR "supply chain" OR energy OR logistics) startup when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['manufacturing-dive', 'https://www.manufacturingdive.com/feeds/news/'],
      ['supplychain-dive', 'https://www.supplychaindive.com/feeds/news/'],
      ['utility-dive', 'https://www.utilitydive.com/feeds/news/'],
      ['canary-media', 'https://www.canarymedia.com/rss'],
      ['electrek', 'https://electrek.co/feed/'],
      ['cleantechnica', 'https://cleantechnica.com/feed/'],
      ['iiot-world', 'https://www.iiot-world.com/feed/'],
      ['powermag', 'https://www.powermag.com/feed/'],
      ['pv-magazine', 'https://www.pv-magazine.com/feed/'],
      ['freightwaves', 'https://www.freightwaves.com/news/feed'],
      ['energy-storage-news', 'https://www.energy-storage.news/feed/'],
    ],
    repoTopics: ['topic:industrial-automation', 'topic:plc', 'topic:energy'],
  },
  {
    id: 'math', color: '#0c8599', name: { en: 'Math & Science', tr: 'Matematik & Bilim' },
    subs: [
      { id: 'mathtools', name: { en: 'Math tools & learning', tr: 'Matematik araçları & öğrenme' }, desc: 'mathematics, proofs, algebra, calculus, math education, LaTeX and computer algebra', keywords: ['proof', 'algebra', 'calculus', 'theorem', 'latex', 'integral', 'equation', 'geometry', 'math'] },
      { id: 'scicomp', name: { en: 'Scientific computing', tr: 'Bilimsel hesaplama' }, desc: 'numerical methods, simulation, Julia, MATLAB, HPC, solvers and research software', keywords: ['simulation', 'numerical', 'solver', 'julia', 'matlab', 'hpc', 'finite element', 'ode', 'research software'] },
      { id: 'stats', name: { en: 'Statistics & data science', tr: 'İstatistik & veri bilimi' }, desc: 'statistics, regression, experiments, forecasting, machine learning models and data analysis', keywords: ['regression', 'statistics', 'bayesian', 'forecast', 'hypothesis', 'variance', 'dataset', 'classification'] },
    ],
    stackexchange: ['math', 'stats', 'scicomp'],
    forums: ['discourse.julialang.org'],
    news: ['(raises OR "seed round" OR launches) ("scientific computing" OR "research software" OR simulation OR "math education") startup when:14d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['quanta', 'https://api.quantamagazine.org/feed/'],
      ['phys-org', 'https://phys.org/rss-feed/'],
      ['sciencedaily-compmath', 'https://www.sciencedaily.com/rss/computers_math.xml'],
      ['mit-news-math', 'https://news.mit.edu/rss/topic/mathematics'],
      ['scientific-american', 'https://www.scientificamerican.com/platform/syndication/rss/'],
      ['nature', 'https://www.nature.com/nature.rss'],
      ['hpcwire', 'https://www.hpcwire.com/feed/'],
      ['plus-maths', 'https://plus.maths.org/content/rss.xml'],
      ['arxiv-math-na', 'https://rss.arxiv.org/rss/math.NA'],
      ['arxiv-math-oc', 'https://rss.arxiv.org/rss/math.OC'],
      ['arxiv-cs-ai', 'https://rss.arxiv.org/rss/cs.AI'],
    ],
    repoTopics: ['topic:scientific-computing', 'topic:mathematics', 'topic:simulation'],
  },
  {
    id: 'cyber', color: '#1c7ed6', name: { en: 'Cybersecurity', tr: 'Siber güvenlik' },
    subs: [
      { id: 'appsec', name: { en: 'App & cloud security', tr: 'Uygulama & bulut güvenliği' }, desc: 'application security, vulnerabilities, secrets, dependencies, cloud security and AI agent security', keywords: ['vulnerability', 'cve', 'secrets', 'sast', 'dependency', 'cloud security', 'prompt injection', 'xss', 'sql injection'] },
      { id: 'identity', name: { en: 'Identity & privacy', tr: 'Kimlik & gizlilik' }, desc: 'authentication, passwords, OAuth, 2FA, privacy, encryption and personal data protection', keywords: ['password', 'oauth', '2fa', 'mfa', 'privacy', 'encryption', 'gdpr', 'identity', 'vpn'] },
      { id: 'netsec', name: { en: 'Network & offensive security', tr: 'Ağ & saldırı güvenliği' }, desc: 'network security, firewalls, pentesting, malware, incident response, threat detection and CTFs', keywords: ['firewall', 'pentest', 'malware', 'phishing', 'ransomware', 'siem', 'incident', 'threat', 'ctf', 'nmap'] },
    ],
    stackexchange: ['security'],
    forums: ['forum.hackthebox.com'],
    news: ['(raises OR "seed round" OR "series A" OR launches) (cybersecurity OR security startup OR "identity security") when:7d'],
    // Outlets that cover this domain, each its own source.
    feeds: [
      ['bleepingcomputer', 'https://www.bleepingcomputer.com/feed/'],
      ['the-hacker-news', 'https://feeds.feedburner.com/TheHackersNews'],
      ['krebs', 'https://krebsonsecurity.com/feed/'],
      ['darkreading', 'https://www.darkreading.com/rss.xml'],
      ['securityweek', 'https://www.securityweek.com/feed/'],
      ['the-record', 'https://therecord.media/feed/'],
      ['helpnetsecurity', 'https://www.helpnetsecurity.com/feed/'],
      ['schneier', 'https://www.schneier.com/feed/atom/'],
      ['securityaffairs', 'https://securityaffairs.com/feed'],
    ],
    repoTopics: ['topic:cybersecurity', 'topic:security-tools', 'topic:pentesting'],
  },
];

export const SUBS = DOMAINS.flatMap((d) => d.subs.map((s) => ({ ...s, domain: d.id, key: `${d.id}/${s.id}` })));

export const DOMAIN_FEEDS = DOMAINS.flatMap((d) => [
  ...d.news.map((q, i) => ({ id: `gnews-${d.id}${i ? `-${i}` : ''}`, kind: 'news', url: gnews(q), domain: d.id })),
  ...(d.feeds || []).map(([id, url]) => ({ id, kind: 'news', url, domain: d.id })),
]);

export const ALL_SE_SITES = [...new Set(DOMAINS.flatMap((d) => d.stackexchange))];
export const ALL_FORUMS = [...new Set(DOMAINS.flatMap((d) => d.forums))];
export const ALL_REPO_TOPICS = [...new Set(DOMAINS.flatMap((d) => d.repoTopics))];

/** The domain a source naturally belongs to, used as a prior when classifying. */
export function domainOfSource(source) {
  for (const d of DOMAINS) {
    if (d.stackexchange.some((s) => source === `se:${s}`)) return d.id;
    if (d.forums.some((f) => source === `forum:${f}`)) return d.id;
  }
  return null;
}
