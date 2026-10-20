import 'server-only';

/** Тексты бота SolWish (HTML-разметка Telegram). Язык — из настроек Telegram пользователя. */

const ruPlural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};

export const T = {
  ru: {
    hello:
      'Привет! Я бот <b>SolWish</b> 🎁\n\n' +
      'Присылаю уведомления о подарках, напоминаю о дате события и помогаю делиться вишлистами.\n\n' +
      'Чтобы получать уведомления, подключите кошелёк на сайте: «Мои вишлисты» → «Подключить Telegram».',
    helloLinked: (wallets: string) =>
      'Привет! Я бот <b>SolWish</b> 🎁\n\n' +
      `Уведомления включены для кошелька ${wallets}.\n` +
      'Посмотреть вишлисты — /wishlists, все команды — /help.',
    linked: '✅ Готово! Буду присылать сюда уведомления о подарках на кошелёк',
    linkedNext: 'Что я умею — /help. Поделиться вишлистом в любом чате: наберите @{bot} и выберите вишлист.',
    bad: 'Ссылка устарела. Откройте «Мои вишлисты» на сайте и нажмите «Подключить Telegram» ещё раз.',
    help:
      '<b>Что я умею</b>\n\n' +
      '/wishlists — ваши вишлисты и сколько собрано\n' +
      '/stats — общая статистика\n' +
      '/stop — отключить уведомления\n' +
      '/help — эта подсказка\n\n' +
      '<b>Поделиться вишлистом</b> в любом чате: наберите <code>@{bot}</code> и выберите вишлист из списка.\n\n' +
      'Я сам пришлю сообщение, когда придёт подарок, когда собрана половина или вся цель, и напомню за 3 дня и за день до события.',
    notLinked: 'Кошелёк ещё не подключён. Откройте на сайте «Мои вишлисты» → «Подключить Telegram».',
    noWishes: 'У подключённого кошелька пока нет вишлистов. Создайте первый на сайте 👇',
    listTitle: '📋 <b>Ваши вишлисты</b>',
    progress: (raised: string, goal: string, count: number) =>
      `${raised} из ${goal} · ${count} ${ruPlural(count, 'подарок', 'подарка', 'подарков')}`,
    daysLeft: (d: number) =>
      d === 0 ? 'событие сегодня' : d > 0 ? `до события ${d} ${ruPlural(d, 'день', 'дня', 'дней')}` : 'событие прошло',
    closed: 'сбор закрыт',
    stats: (wishes: number, gifts: number, raised: string) =>
      `📊 <b>Статистика</b>\n\nВишлистов: ${wishes}\nПодарков: ${gifts}\nСобрано: ${raised}`,
    stopped: '🔕 Уведомления отключены. Включить снова: «Мои вишлисты» → «Подключить Telegram» на сайте.',
    unknown: 'Не понял 🙂 Что я умею — /help.',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> подарил(а) ${amount} на «${title}»`,
    anon: 'Аноним',
    half: (title: string, raised: string, goal: string) => `🙌 Половина собрана: «${title}» — ${raised} из ${goal}`,
    full: (title: string, raised: string, goal: string) => `🎉 Цель достигнута: «${title}» — ${raised} из ${goal}!`,
    remind: (title: string, d: number, raised: string, goal: string, left: string) =>
      `⏰ ${d === 0 ? 'Сегодня' : d === 1 ? 'Завтра' : `Через ${d} ${ruPlural(d, 'день', 'дня', 'дней')}`} — «${title}».\n` +
      `Собрано ${raised} из ${goal}, не хватает ${left}. Напомните друзьям 👇`,
    summary: (title: string, count: number, raised: string, names: string) =>
      `🎉 <b>Итоги «${title}»</b>\n\n${count} ${ruPlural(count, 'подарок', 'подарка', 'подарков')} на ${raised}.` +
      (names ? `\nСпасибо: ${names}.` : '') +
      '\n\nОтветьте дарителям «спасибо» — это можно сделать на странице открытки.',
    inlineMsg: (title: string, name: string, raised: string, goal: string) =>
      `🎁 <b>${title}</b>${name ? ` — для ${name}` : ''}\nСобрано ${raised} из ${goal}. Подарить можно по ссылке 👇`,
    inlineEmpty: 'Нет вишлистов',
    inlineEmptyDesc: 'Подключите кошелёк к боту на сайте SolWish',
    inlineConnect: 'Подключить вишлисты',
    btnCreate: '✨ Создать вишлист',
    btnDemo: '👀 Демо',
    btnMy: '📋 Мои вишлисты',
    btnStats: '📊 Статистика',
    btnConnect: '🔔 Подключить уведомления',
    btnOpen: 'Открыть',
    btnShare: '📤 Поделиться',
    btnCard: '💌 Открытка',
    btnThanks: '❤️ Сказать спасибо',
    btnGift: '🎁 Подарить',
  },
  kk: {
    hello:
      'Сәлем! Мен <b>SolWish</b> ботымын 🎁\n\n' +
      'Сыйлықтар туралы хабарлаймын, іс-шара күнін еске саламын және тізімдермен бөлісуге көмектесемін.\n\n' +
      'Хабарламалар алу үшін сайтта әмиянды қосыңыз: «Менің тізімдерім» → «Telegram қосу».',
    helloLinked: (wallets: string) =>
      'Сәлем! Мен <b>SolWish</b> ботымын 🎁\n\n' +
      `${wallets} әмияны үшін хабарламалар қосулы.\n` +
      'Тізімдер — /wishlists, барлық командалар — /help.',
    linked: '✅ Дайын! Әмиянға түскен сыйлықтар туралы осында хабарлаймын',
    linkedNext: 'Не істей аламын — /help. Кез келген чатта тізіммен бөлісу: @{bot} деп жазып, тізімді таңдаңыз.',
    bad: 'Сілтеменің мерзімі өтті. Сайттағы «Менің тізімдерім» бөлімінде «Telegram қосу» батырмасын қайта басыңыз.',
    help:
      '<b>Не істей аламын</b>\n\n' +
      '/wishlists — тізімдеріңіз және қанша жиналды\n' +
      '/stats — жалпы статистика\n' +
      '/stop — хабарламаларды өшіру\n' +
      '/help — осы анықтама\n\n' +
      '<b>Тізіммен бөлісу</b> кез келген чатта: <code>@{bot}</code> деп жазып, тізімді таңдаңыз.\n\n' +
      'Сыйлық түскенде, мақсаттың жартысы не толығы жиналғанда хабарлаймын, іс-шараға 3 күн және 1 күн қалғанда еске саламын.',
    notLinked: 'Әмиян әлі қосылмаған. Сайтта «Менің тізімдерім» → «Telegram қосу» ашыңыз.',
    noWishes: 'Қосылған әмиянда әлі тізім жоқ. Біріншісін сайтта жасаңыз 👇',
    listTitle: '📋 <b>Сіздің тізімдеріңіз</b>',
    progress: (raised: string, goal: string, count: number) => `${goal} ішінен ${raised} · ${count} сыйлық`,
    daysLeft: (d: number) => (d === 0 ? 'іс-шара бүгін' : d > 0 ? `іс-шараға ${d} күн` : 'іс-шара өтті'),
    closed: 'жинау жабық',
    stats: (wishes: number, gifts: number, raised: string) =>
      `📊 <b>Статистика</b>\n\nТізімдер: ${wishes}\nСыйлықтар: ${gifts}\nЖиналды: ${raised}`,
    stopped: '🔕 Хабарламалар өшірілді. Қайта қосу: сайтта «Менің тізімдерім» → «Telegram қосу».',
    unknown: 'Түсінбедім 🙂 Не істей аламын — /help.',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> «${title}» үшін ${amount} сыйлады`,
    anon: 'Аноним',
    half: (title: string, raised: string, goal: string) => `🙌 Жартысы жиналды: «${title}» — ${goal} ішінен ${raised}`,
    full: (title: string, raised: string, goal: string) => `🎉 Мақсатқа жеттік: «${title}» — ${goal} ішінен ${raised}!`,
    remind: (title: string, d: number, raised: string, goal: string, left: string) =>
      `⏰ ${d === 0 ? 'Бүгін' : d === 1 ? 'Ертең' : `${d} күннен кейін`} — «${title}».\n` +
      `${goal} ішінен ${raised} жиналды, ${left} жетпейді. Достарыңызға еске салыңыз 👇`,
    summary: (title: string, count: number, raised: string, names: string) =>
      `🎉 <b>«${title}» қорытындысы</b>\n\n${count} сыйлық, барлығы ${raised}.` +
      (names ? `\nРақмет: ${names}.` : '') +
      '\n\nСыйлаушыларға ашықхат бетінде «рақмет» айтуға болады.',
    inlineMsg: (title: string, name: string, raised: string, goal: string) =>
      `🎁 <b>${title}</b>${name ? ` — ${name} үшін` : ''}\n${goal} ішінен ${raised} жиналды. Сілтеме арқылы сыйлауға болады 👇`,
    inlineEmpty: 'Тізім жоқ',
    inlineEmptyDesc: 'SolWish сайтында әмиянды ботқа қосыңыз',
    inlineConnect: 'Тізімдерді қосу',
    btnCreate: '✨ Тізім жасау',
    btnDemo: '👀 Демо',
    btnMy: '📋 Менің тізімдерім',
    btnStats: '📊 Статистика',
    btnConnect: '🔔 Хабарламаларды қосу',
    btnOpen: 'Ашу',
    btnShare: '📤 Бөлісу',
    btnCard: '💌 Ашықхат',
    btnThanks: '❤️ Рақмет айту',
    btnGift: '🎁 Сыйлау',
  },
  en: {
    hello:
      'Hi! I am the <b>SolWish</b> bot 🎁\n\n' +
      'I send gift notifications, remind you about the event date and help you share wishlists.\n\n' +
      'To get notifications, connect your wallet on the website: “My wishlists” → “Connect Telegram”.',
    helloLinked: (wallets: string) =>
      'Hi! I am the <b>SolWish</b> bot 🎁\n\n' +
      `Notifications are on for wallet ${wallets}.\n` +
      'Your wishlists — /wishlists, all commands — /help.',
    linked: '✅ Done! I will notify you here about gifts to wallet',
    linkedNext: 'What I can do — /help. Share a wishlist in any chat: type @{bot} and pick a wishlist.',
    bad: 'This link has expired. Open “My wishlists” on the website and press “Connect Telegram” again.',
    help:
      '<b>What I can do</b>\n\n' +
      '/wishlists — your wishlists and how much is raised\n' +
      '/stats — overall stats\n' +
      '/stop — turn off notifications\n' +
      '/help — this message\n\n' +
      '<b>Share a wishlist</b> in any chat: type <code>@{bot}</code> and pick a wishlist.\n\n' +
      'I message you when a gift arrives, when half or all of the goal is raised, and 3 days and 1 day before the event.',
    notLinked: 'No wallet connected yet. On the website open “My wishlists” → “Connect Telegram”.',
    noWishes: 'The connected wallet has no wishlists yet. Create your first one 👇',
    listTitle: '📋 <b>Your wishlists</b>',
    progress: (raised: string, goal: string, count: number) => `${raised} of ${goal} · ${count} gift${count === 1 ? '' : 's'}`,
    daysLeft: (d: number) =>
      d === 0 ? 'event is today' : d > 0 ? `${d} day${d === 1 ? '' : 's'} to go` : 'event has passed',
    closed: 'closed',
    stats: (wishes: number, gifts: number, raised: string) =>
      `📊 <b>Stats</b>\n\nWishlists: ${wishes}\nGifts: ${gifts}\nRaised: ${raised}`,
    stopped: '🔕 Notifications are off. To turn them back on: “My wishlists” → “Connect Telegram” on the website.',
    unknown: 'Sorry, I did not get that 🙂 See /help.',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> sent ${amount} for “${title}”`,
    anon: 'Anonymous',
    half: (title: string, raised: string, goal: string) => `🙌 Halfway there: “${title}” — ${raised} of ${goal}`,
    full: (title: string, raised: string, goal: string) => `🎉 Goal reached: “${title}” — ${raised} of ${goal}!`,
    remind: (title: string, d: number, raised: string, goal: string, left: string) =>
      `⏰ ${d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`} — “${title}”.\n` +
      `${raised} of ${goal} raised, ${left} to go. Remind your friends 👇`,
    summary: (title: string, count: number, raised: string, names: string) =>
      `🎉 <b>“${title}” wrap-up</b>\n\n${count} gift${count === 1 ? '' : 's'}, ${raised} in total.` +
      (names ? `\nThanks to: ${names}.` : '') +
      '\n\nSay thank you to your givers on each card page.',
    inlineMsg: (title: string, name: string, raised: string, goal: string) =>
      `🎁 <b>${title}</b>${name ? ` — for ${name}` : ''}\n${raised} of ${goal} raised. Chip in via the link 👇`,
    inlineEmpty: 'No wishlists',
    inlineEmptyDesc: 'Connect your wallet to the bot on the SolWish website',
    inlineConnect: 'Connect wishlists',
    btnCreate: '✨ Create a wishlist',
    btnDemo: '👀 Demo',
    btnMy: '📋 My wishlists',
    btnStats: '📊 Stats',
    btnConnect: '🔔 Turn on notifications',
    btnOpen: 'Open',
    btnShare: '📤 Share',
    btnCard: '💌 Card',
    btnThanks: '❤️ Say thanks',
    btnGift: '🎁 Gift',
  },
};

export type Lang = keyof typeof T;

export const pickLang = (code?: string | null): Lang =>
  code === 'kk' || code === 'en' ? code : code?.startsWith('kk') ? 'kk' : code?.startsWith('en') ? 'en' : 'ru';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Меню команд (кнопка «/» в Telegram) на каждом языке. */
export const COMMANDS: Record<Lang, { command: string; description: string }[]> = {
  ru: [
    { command: 'wishlists', description: 'Мои вишлисты и сколько собрано' },
    { command: 'stats', description: 'Общая статистика' },
    { command: 'help', description: 'Что умеет бот' },
    { command: 'stop', description: 'Отключить уведомления' },
  ],
  kk: [
    { command: 'wishlists', description: 'Менің тізімдерім' },
    { command: 'stats', description: 'Жалпы статистика' },
    { command: 'help', description: 'Бот не істей алады' },
    { command: 'stop', description: 'Хабарламаларды өшіру' },
  ],
  en: [
    { command: 'wishlists', description: 'My wishlists and progress' },
    { command: 'stats', description: 'Overall stats' },
    { command: 'help', description: 'What the bot can do' },
    { command: 'stop', description: 'Turn off notifications' },
  ],
};

/** Описание бота (экран до нажатия Start) и короткое описание (профиль бота). */
export const ABOUT: Record<Lang, { description: string; short: string }> = {
  ru: {
    description:
      'SolWish — вишлисты и подарки в SOL с открыткой в блокчейне Solana.\n\n' +
      '• уведомления о подарках\n• напоминания о дате события\n• делитесь вишлистом в любом чате через @бота',
    short: 'Уведомления о подарках SolWish и быстрый обмен вишлистами.',
  },
  kk: {
    description:
      'SolWish — SOL-дағы тілектер тізімі мен сыйлықтар, ашықхаты Solana блокчейнінде.\n\n' +
      '• сыйлықтар туралы хабарламалар\n• іс-шара күнін еске салу\n• кез келген чатта @бот арқылы бөлісу',
    short: 'SolWish сыйлықтары туралы хабарламалар және тізіммен жылдам бөлісу.',
  },
  en: {
    description:
      'SolWish — wishlists and SOL gifts with a greeting card on the Solana blockchain.\n\n' +
      '• gift notifications\n• event date reminders\n• share a wishlist in any chat via @bot',
    short: 'SolWish gift notifications and quick wishlist sharing.',
  },
};
