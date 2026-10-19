/**
 * Тексты «Условия использования» и «Политика конфиденциальности» для беты.
 * Это рабочий черновик, а не юридическая консультация: перед запуском на реальные деньги
 * его стоит показать юристу и вписать данные владельца сервиса.
 */
export const LEGAL_UPDATED = '2026-10-19';

type Section = { h: string; p: string };
type Doc = { terms: Section[]; privacy: Section[] };

const ru: Doc = {
  terms: [
    {
      h: 'Что такое SolWish',
      p: 'SolWish — сервис для создания вишлистов и отправки подарков в SOL с открыткой в блокчейне Solana. Сейчас сервис работает в тестовой сети Devnet: реальные деньги не используются.',
    },
    {
      h: 'Мы не храним ваши деньги',
      p: 'Переводы идут напрямую из кошелька дарителя на кошелёк получателя. У SolWish нет доступа к вашим ключам и средствам. Транзакции в блокчейне необратимы — проверяйте адрес и сумму перед подписью.',
    },
    {
      h: 'Открытки публичны и вечны',
      p: 'Имя дарителя и текст открытки записываются в блокчейн и видны всем; удалить их невозможно. Не указывайте в открытках телефоны, адреса и другие личные данные.',
    },
    {
      h: 'Правила контента',
      p: 'Запрещены оскорбления, угрозы, мошенничество и ссылки на сторонние сайты. Мы скрываем такие тексты на сайте и можем удалить вишлист, нарушающий правила.',
    },
    {
      h: 'Платные опции',
      p: 'Премиум-оформление открытки оплачивается в той же транзакции, что и подарок, и поступает SolWish. Так как транзакции необратимы, оплата не возвращается. Комиссию сети Solana платит даритель, она уходит сети.',
    },
    {
      h: 'Бета-версия',
      p: 'Сервис предоставляется «как есть» в бета-версии: возможны ошибки и перерывы в работе. Мы постоянно его улучшаем и можем менять функции и эти условия.',
    },
  ],
  privacy: [
    {
      h: 'Что мы храним',
      p: 'Данные вишлиста: название, описание, имя получателя, адрес кошелька, дату события и обложку. Если вы сохранили вишлист в «Мои вишлисты» — адрес кошелька создателя. Если подключили Telegram — идентификатор чата и адрес кошелька. Заявки для бизнеса — имя, контакт и текст заявки.',
    },
    {
      h: 'Что хранится в блокчейне',
      p: 'Подарки, открытки и ответы «спасибо» записываются в блокчейн Solana. Это публичные данные, мы их не контролируем и не можем удалить.',
    },
    {
      h: 'Чего мы не собираем',
      p: 'Мы не просим email или телефон (кроме заявок для бизнеса), не храним пароли и приватные ключи. Ключ подарка-ссылки хранится только в вашем браузере и в самой ссылке.',
    },
    {
      h: 'Cookies и браузер',
      p: 'Cookie запоминает только язык интерфейса. Локальное хранилище браузера используется для списка ваших подарков-ссылок.',
    },
    {
      h: 'Сторонние сервисы',
      p: 'Хостинг — Vercel, база данных — Supabase, доступ к сети Solana — RPC-провайдер, уведомления — Telegram (если вы их включили). Если вы пользуетесь AI-помощником открытки, текст запроса отправляется AI-провайдеру для генерации вариантов.',
    },
    {
      h: 'Как удалить данные',
      p: 'Вишлист можно удалить в разделе «Управление», Telegram-уведомления — отключить в «Моих вишлистах». По остальным вопросам напишите нам. Данные в блокчейне удалить невозможно.',
    },
  ],
};

const en: Doc = {
  terms: [
    {
      h: 'What SolWish is',
      p: 'SolWish lets you create wishlists and send gifts in SOL with a greeting card stored on the Solana blockchain. The service currently runs on the Devnet test network: no real money is used.',
    },
    {
      h: 'We never hold your money',
      p: 'Transfers go directly from the giver’s wallet to the recipient’s wallet. SolWish has no access to your keys or funds. Blockchain transactions are irreversible — check the address and amount before signing.',
    },
    {
      h: 'Cards are public and permanent',
      p: 'The giver’s name and the card text are written to the blockchain and are visible to everyone; they cannot be deleted. Do not put phone numbers, addresses or other personal data in a card.',
    },
    {
      h: 'Content rules',
      p: 'Insults, threats, scams and links to other websites are not allowed. We hide such texts on the website and may delete a wishlist that breaks the rules.',
    },
    {
      h: 'Paid options',
      p: 'A premium card design is paid in the same transaction as the gift and goes to SolWish. Because transactions are irreversible, the payment is not refundable. The Solana network fee is paid by the giver and goes to the network.',
    },
    {
      h: 'Beta version',
      p: 'The service is provided “as is” as a beta: bugs and interruptions are possible. We keep improving it and may change features and these terms.',
    },
  ],
  privacy: [
    {
      h: 'What we store',
      p: 'Wishlist data: title, description, recipient name, wallet address, event date and cover. If you save a wishlist to “My wishlists” — the creator’s wallet address. If you connect Telegram — the chat id and wallet address. Business requests — name, contact and request text.',
    },
    {
      h: 'What lives on the blockchain',
      p: 'Gifts, greeting cards and thank-you replies are written to the Solana blockchain. This is public data that we do not control and cannot delete.',
    },
    {
      h: 'What we do not collect',
      p: 'We do not ask for email or phone (except in business requests) and never store passwords or private keys. A gift link key lives only in your browser and in the link itself.',
    },
    {
      h: 'Cookies and your browser',
      p: 'A cookie stores only the interface language. Browser local storage keeps the list of your gift links.',
    },
    {
      h: 'Third-party services',
      p: 'Hosting — Vercel, database — Supabase, Solana network access — an RPC provider, notifications — Telegram (if you turn them on). If you use the AI greeting helper, your request text is sent to an AI provider to generate suggestions.',
    },
    {
      h: 'Deleting your data',
      p: 'Delete a wishlist in “Manage” and turn off Telegram notifications in “My wishlists”. For anything else, contact us. Data on the blockchain cannot be deleted.',
    },
  ],
};

/** Казахский текст пока не переведён юристом — показываем русскую версию. */
export const LEGAL: Record<'ru' | 'kk' | 'en', Doc> = { ru, kk: ru, en };
