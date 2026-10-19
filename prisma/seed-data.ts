import { hashPassword } from '../server/auth/password.js';
import type { PrismaClient } from '../server/generated/prisma/client.js';
import { EventStatus, Role } from '../server/generated/prisma/enums.js';

/** Пароль всех демо-аккаунтов. Только для локальной разработки. */
export const SEED_PASSWORD = 'demo-pass-2026';

export const SEED_USERS = {
  resonance: { email: 'organizer@afisha.local', name: 'Студия «Резонанс»', role: Role.organizer },
  sokol: { email: 'sokol@afisha.local', name: 'КЦ «Сокол»', role: Role.organizer },
  prazdnik: { email: 'prazdnik@afisha.local', name: 'Агентство «Праздник»', role: Role.organizer },
  moderator: { email: 'moderator@afisha.local', name: 'Ирина К.', role: Role.moderator },
} as const;

const CATEGORIES = [
  ['concert', 'Концерты'],
  ['theatre', 'Театр'],
  ['exhibition', 'Выставки'],
  ['lecture', 'Лекции'],
  ['kids', 'Детям'],
  ['standup', 'Стендап'],
  ['festival', 'Фестивали'],
] as const;
type Cat = (typeof CATEGORIES)[number][0];

const VENUES = {
  severny: ['Концертный зал «Северный»', 'Новослободская ул., 24'],
  shtab: ['Арт-пространство «Штаб»', 'Бауманская ул., 44, 2 этаж'],
  shirma: ['Камерный театр «Ширма»', 'Малая Бронная ул., 7'],
  kvadrat: ['Галерея «Квадрат»', 'ул. Пречистенка, 21'],
  podval: ['Клуб «Подвал»', 'ул. Покровка, 3'],
  technopark: ['Технопарк, лекторий', 'Солнечная аллея, 6, Зеленоград'],
  sokolniki: ['Парк «Сокольники», летняя эстрада', 'Сокольнический Вал, 1'],
  rodina: ['ДК «Родина»', 'Ленинградский пр., 18'],
} as const;
type VenueKey = keyof typeof VENUES;

/**
 * Даты считаются от «сегодня» по Москве, поэтому seed не устаревает:
 * в выдаче всегда есть идущие, ближайшие и будущие события.
 */
function at(today: Date, days: number, time: string): Date {
  const d = new Date(today.getTime() + days * 86_400_000);
  const ymd = d.toISOString().slice(0, 10);
  return new Date(`${ymd}T${time}:00+03:00`);
}

interface SeedEvent {
  key: string;
  owner: keyof typeof SEED_USERS;
  title: string;
  description?: string;
  start?: [number, string];
  end?: [number, string];
  price?: number;
  ageLimit?: number;
  venue?: VenueKey;
  city?: string;
  cats: Cat[];
  status?: EventStatus;
  hiddenReason?: string;
}

const EVENTS: SeedEvent[] = [
  {
    key: 'quartet',
    owner: 'sokol',
    title: 'Струнный квартет «Северное сияние»: Шостакович и Пярт',
    description:
      'Камерная программа из двух квартетов и цикла миниатюр. Перед концертом музыковед 15 минут рассказывает о программе.',
    start: [4, '19:00'],
    end: [4, '21:00'],
    price: 1200,
    ageLimit: 6,
    venue: 'severny',
    cats: ['concert'],
  },
  {
    key: 'openmic',
    owner: 'resonance',
    title: 'Открытый микрофон: стендап по средам',
    description: 'Восемь новых комиков, по семь минут на каждого. Записаться выступить можно до 19:30 у ведущего.',
    start: [2, '20:00'],
    end: [2, '22:30'],
    price: 500,
    ageLimit: 18,
    venue: 'podval',
    cats: ['standup'],
  },
  {
    key: 'avantgarde',
    owner: 'sokol',
    title: 'Графика московских авангардистов 1920-х',
    description:
      'Сто двадцать листов из частных собраний: плакаты, книжная графика и эскизы оформления городских праздников.',
    start: [-4, '10:00'],
    end: [41, '20:00'],
    price: 350,
    ageLimit: 0,
    venue: 'kvadrat',
    cats: ['exhibition'],
  },
  {
    key: 'transport',
    owner: 'resonance',
    title: 'Как устроен городской транспорт: лекция урбаниста',
    description: 'Почему трамвай возвращается в города, как считать пассажиропоток и что меняет выделенная полоса.',
    start: [7, '18:30'],
    end: [7, '20:00'],
    price: 0,
    ageLimit: 12,
    venue: 'shtab',
    cats: ['lecture'],
  },
  {
    key: 'seagull',
    owner: 'sokol',
    title: '«Чайка» в постановке камерного театра',
    description: 'Чеховская комедия в зале на 60 мест. Спектакль идёт с одним антрактом.',
    start: [12, '19:00'],
    end: [12, '21:40'],
    price: 1800,
    ageLimit: 16,
    venue: 'shirma',
    cats: ['theatre'],
  },
  {
    key: 'streetfood',
    owner: 'resonance',
    title: 'Осенний фестиваль уличной еды и музыки',
    description: 'Двенадцать дней фудкортов, локальных групп и ярмарки ремесленников.',
    start: [-4, '12:00'],
    end: [7, '22:00'],
    price: 0,
    ageLimit: 0,
    venue: 'sokolniki',
    cats: ['festival', 'concert'],
  },
  {
    key: 'puppets',
    owner: 'sokol',
    title: 'Кукольный спектакль «Лиса и журавль»',
    description: 'Сказка для самых маленьких: 45 минут, после спектакля можно познакомиться с куклами.',
    start: [6, '11:00'],
    end: [6, '11:45'],
    price: 400,
    ageLimit: 0,
    venue: 'shirma',
    cats: ['kids', 'theatre'],
  },
  {
    key: 'jazz',
    owner: 'resonance',
    title: 'Джазовый вечер: трио «Полутон»',
    description: 'Стандарты и авторские пьесы. Два отделения, столики рассаживаются по приходу.',
    start: [19, '20:00'],
    end: [19, '23:00'],
    price: 900,
    ageLimit: 18,
    venue: 'podval',
    cats: ['concert'],
  },
  {
    key: 'robots',
    owner: 'sokol',
    title: 'Робототехника для детей: открытое занятие',
    description: 'Собираем и программируем простого робота. Наборы выдают на месте.',
    start: [13, '12:00'],
    end: [13, '14:00'],
    price: 0,
    ageLimit: 6,
    venue: 'technopark',
    cats: ['kids', 'lecture'],
  },
  {
    key: 'nightgallery',
    owner: 'resonance',
    title: 'Ночь в галерее: кураторская экскурсия',
    description: 'Куратор выставки проводит по залам после закрытия. Группа до 25 человек.',
    start: [25, '21:00'],
    end: [25, '23:30'],
    price: 700,
    ageLimit: 16,
    venue: 'kvadrat',
    cats: ['exhibition'],
  },
  {
    key: 'organ',
    owner: 'sokol',
    title: 'Органный концерт при свечах',
    description: 'Бах, Букстехуде и Гласс в исполнении приглашённого органиста.',
    start: [32, '19:00'],
    end: [32, '20:30'],
    price: 1500,
    ageLimit: 6,
    venue: 'severny',
    cats: ['concert'],
  },
  {
    key: 'impro',
    owner: 'sokol',
    title: 'Импровизация: шоу без сценария',
    description: 'Актёры собирают сцены из подсказок зала. Каждый вечер — новое шоу.',
    start: [40, '19:30'],
    end: [40, '21:00'],
    price: 800,
    ageLimit: 16,
    venue: 'shtab',
    cats: ['standup', 'theatre'],
  },
  {
    key: 'vintage',
    owner: 'sokol',
    title: 'Ярмарка винтажа и пластинок',
    description: 'Сорок продавцов винила, одежды и техники. Вход свободный.',
    start: [20, '11:00'],
    end: [20, '19:00'],
    price: 0,
    ageLimit: 0,
    venue: 'rodina',
    cats: ['festival'],
  },
  {
    key: 'surprise',
    owner: 'prazdnik',
    title: 'Концерт-сюрприз: билеты за репост',
    description: 'Разыгрываем проходки среди подписчиков. Состав объявим в день концерта.',
    start: [5, '20:00'],
    end: [5, '22:00'],
    price: 0,
    ageLimit: 18,
    venue: 'shtab',
    cats: ['concert'],
  },
  {
    key: 'shortfilm',
    owner: 'resonance',
    title: 'Фестиваль короткого метра',
    description: 'Два дня показов студенческих короткометражек.',
    start: [-15, '15:00'],
    end: [-14, '21:00'],
    price: 300,
    ageLimit: 16,
    venue: 'shtab',
    cats: ['festival'],
  },
  {
    key: 'soundlecture',
    owner: 'resonance',
    title: 'Лекция о звукорежиссуре кино',
    start: [28, '19:00'],
    ageLimit: 12,
    cats: ['lecture'],
    status: EventStatus.draft,
  },
  {
    key: 'choir',
    owner: 'resonance',
    title: 'Хоровой вечер «Голоса города»',
    description: 'Три любительских хора в одном концерте: от духовной музыки до песен из кино.',
    start: [47, '19:00'],
    end: [47, '21:00'],
    price: 600,
    ageLimit: 0,
    venue: 'severny',
    cats: ['concert'],
    status: EventStatus.draft,
  },
  {
    key: 'lightshadow',
    owner: 'resonance',
    title: 'Бесплатный вход на выставку «Свет и тень»',
    description: 'Фотовыставка о городской архитектуре.',
    start: [9, '10:00'],
    end: [23, '19:00'],
    price: 0,
    ageLimit: 0,
    venue: 'kvadrat',
    cats: ['exhibition'],
    status: EventStatus.hidden,
    hiddenReason: 'Недостоверная цена: на площадке вход платный (400 ₽), в карточке указано «бесплатно».',
  },
  {
    key: 'calligraphy',
    owner: 'sokol',
    title: 'Мастерская каллиграфии',
    ageLimit: 12,
    venue: 'shtab',
    cats: [],
    status: EventStatus.draft,
  },
];

/** Полностью пересоздаёт демо-данные. Возвращает id для тестов. */
export async function seed(prisma: PrismaClient, now = new Date()) {
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = {} as Record<keyof typeof SEED_USERS, string>;
  for (const [key, u] of Object.entries(SEED_USERS) as [
    keyof typeof SEED_USERS,
    (typeof SEED_USERS)[keyof typeof SEED_USERS],
  ][]) {
    users[key] = (await prisma.user.create({ data: { ...u, passwordHash } })).id;
  }

  const categories = {} as Record<Cat, string>;
  for (const [slug, name] of CATEGORIES) categories[slug] = (await prisma.category.create({ data: { slug, name } })).id;

  const venues = {} as Record<VenueKey, string>;
  for (const [key, [name, address]] of Object.entries(VENUES) as [VenueKey, readonly [string, string]][]) {
    venues[key] = (await prisma.venue.create({ data: { name, address } })).id;
  }

  // «Сегодня» по Москве: сдвигаем на +3 часа, чтобы взять московскую календарную дату.
  const today = new Date(new Date(now.getTime() + 3 * 3_600_000).toISOString().slice(0, 10) + 'T00:00:00Z');
  const events = {} as Record<string, string>;
  for (const e of EVENTS) {
    const status = e.status ?? EventStatus.published;
    const created = await prisma.event.create({
      data: {
        title: e.title,
        description: e.description ?? null,
        startsAt: e.start ? at(today, ...e.start) : null,
        endsAt: e.end ? at(today, ...e.end) : null,
        price: e.price ?? null,
        ageLimit: e.ageLimit ?? null,
        city: e.city ?? 'moscow',
        status,
        ownerId: users[e.owner],
        venueId: e.venue ? venues[e.venue] : null,
        categories: { connect: e.cats.map((c) => ({ id: categories[c] })) },
        publishedAt: status === EventStatus.draft ? null : now,
        ...(status === EventStatus.hidden && {
          hiddenReason: e.hiddenReason,
          hiddenAt: now,
          hiddenById: users.moderator,
        }),
      },
    });
    events[e.key] = created.id;
  }

  return { users, categories, venues, events };
}
