import type { AbilityDef, HeroDef, MoveStep } from './types';

const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const allDirs = (range: number): MoveStep[] =>
  DIRS.map(([dr, dc]) => ({ kind: 'slide' as const, dr, dc, range }));

const orth = (range: number): MoveStep[] =>
  ([
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ] as [number, number][]).map(([dr, dc]) => ({ kind: 'slide' as const, dr, dc, range }));

const diag = (range: number): MoveStep[] =>
  ([
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ] as [number, number][]).map(([dr, dc]) => ({ kind: 'slide' as const, dr, dc, range }));

const knight: MoveStep[] = (
  [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ] as [number, number][]
).map(([dr, dc]) => ({ kind: 'jump' as const, dr, dc }));

/** سرباز: یک خانه روبه‌جلو، موربِ روبه‌جلو و پهلو */
const soldier: MoveStep[] = [
  { kind: 'slide', dr: 1, dc: 0, range: 1, fwd: true },
  { kind: 'slide', dr: 1, dc: 1, range: 1, fwd: true },
  { kind: 'slide', dr: 1, dc: -1, range: 1, fwd: true },
  { kind: 'slide', dr: 0, dc: 1, range: 1 },
  { kind: 'slide', dr: 0, dc: -1, range: 1 },
];

function ability(def: AbilityDef): AbilityDef {
  return def;
}

export const HEROES: Record<string, HeroDef> = {
  shah: {
    id: 'shah',
    name: 'کی‌خسرو',
    cost: 0,
    steps: allDirs(1),
    moveText: 'یک خانه در هر جهت',
    portrait: 'portraits/shah.png',
    bio: 'شاه ایران، دادگر و خردمند. اگر او بیفتد، نبرد تمام است.',
    ability: ability({
      id: 'royal-inspiration',
      name: 'الهام شاهانه',
      cooldown: 6,
      text: 'بلافاصله یک بار دیگر حرکت کن.',
      target: 'self',
    }),
  },
  rostam: {
    id: 'rostam',
    name: 'رستم',
    cost: 6,
    steps: allDirs(2),
    moveText: 'تا ۲ خانه در هر جهت',
    portrait: 'portraits/rostam.png',
    bio: 'پهلوان بی‌همتای شاهنامه، سوار بر رخش با گرز دستان.',
    ability: ability({
      id: 'rostam-strike',
      name: 'گرز دستان',
      cooldown: 4,
      text: 'بدون حرکت، یک دشمن در شعاع ۲ خانه را بگیر.',
      target: 'enemy-piece',
      range: 2,
    }),
  },
  sohrab: {
    id: 'sohrab',
    name: 'سهراب',
    cost: 5,
    steps: orth(4),
    moveText: 'تا ۴ خانه، افقی یا عمودی',
    portrait: 'portraits/sohrab.png',
    bio: 'جوان‌ترین پهلوان، با شور بی‌پایان نبرد.',
    ability: ability({
      id: 'sohrab-fury',
      name: 'شور جنگ',
      cooldown: 4,
      text: 'اگر این نوبت مهره‌ای بگیری، بلافاصله باز هم می‌توانی حرکت کنی.',
      target: 'self',
    }),
  },
  esfandiar: {
    id: 'esfandiar',
    name: 'اسفندیار',
    cost: 5,
    steps: orth(3),
    moveText: 'تا ۳ خانه، افقی یا عمودی',
    portrait: 'portraits/esfandiar.png',
    bio: 'دارنده‌ی تن آهنین؛ جز با تیر رستم راهی بر او نیست.',
    ability: ability({
      id: 'esf-chain',
      name: 'زنجیر اسفندیار',
      cooldown: 5,
      text: 'یک دشمن در شعاع ۳ خانه را تا نوبت بعدی خودت قفل کن.',
      target: 'enemy-piece',
      range: 3,
    }),
  },
  arash: {
    id: 'arash',
    name: 'آرش کمانگیر',
    cost: 4,
    steps: allDirs(2),
    moveText: 'تا ۲ خانه در هر جهت',
    portrait: 'portraits/arash.png',
    bio: 'کماندار اسطوره‌ای که تیرش مرزها را جابه‌جا کرد.',
    ability: ability({
      id: 'arash-arrow',
      name: 'تیر آرش',
      cooldown: 5,
      text: 'در خط دید مستقیم تا ۶ خانه، یک دشمن را بگیر.',
      target: 'enemy-los',
      losRange: 6,
    }),
  },
  zal: {
    id: 'zal',
    name: 'زال',
    cost: 4,
    steps: allDirs(1),
    moveText: 'یک خانه در هر جهت',
    portrait: 'portraits/zal.png',
    bio: 'فرزند سیمرغ و خردمندترین مشاور ایران.',
    ability: ability({
      id: 'zal-revive',
      name: 'مهر سیمرغ',
      cooldown: 0,
      text: 'یک‌بار در بازی: یک مهره‌ی از‌دست‌رفته را در خانه‌ای خالی کنار زال زنده کن.',
      target: 'revive',
    }),
  },
  siavash: {
    id: 'siavash',
    name: 'سیاوش',
    cost: 4,
    steps: diag(7),
    moveText: 'نامحدود در قطرها',
    portrait: 'portraits/siavash.png',
    bio: 'شاهزاده‌ای که از آزمون آتش سالم بیرون آمد.',
    ability: ability({
      id: 'siavash-fire',
      name: 'آزمون آتش',
      cooldown: 5,
      text: 'تا نوبت بعدی خودت، مصون از گرفته‌شدن.',
      target: 'self',
    }),
  },
  gordafarid: {
    id: 'gordafarid',
    name: 'گردافرید',
    cost: 3,
    steps: knight,
    moveText: 'جهش اسبی (ال)',
    portrait: 'portraits/gordafarid.png',
    bio: 'بانوی جنگجوی شاهنامه، استاد نیرنگ و تدبیر.',
    ability: ability({
      id: 'gordafarid-trick',
      name: 'نیرنگ جنگ',
      cooldown: 3,
      text: 'جایت را با یک دشمن در شعاع ۳ خانه عوض کن (به‌جز شاه).',
      target: 'enemy-swap',
      range: 3,
    }),
  },
  bijan: {
    id: 'bijan',
    name: 'بیژن',
    cost: 3,
    steps: diag(3),
    moveText: 'تا ۳ خانه در قطرها',
    portrait: 'portraits/bijan.png',
    bio: 'جوان‌مرد دلیر که در بند افتاد، اما نشکست.',
    ability: ability({
      id: 'bijan-rage',
      name: 'خشم بیژن',
      cooldown: 3,
      text: 'قبل از حرکت: تا پایان نوبت، بُرد حرکتت ۲ خانه بیشتر.',
      target: 'self',
    }),
  },
  toos: {
    id: 'toos',
    name: 'طوس',
    cost: 3,
    steps: orth(3),
    moveText: 'تا ۳ خانه، افقی یا عمودی',
    portrait: 'portraits/toos.png',
    bio: 'فرمانده‌ی سپاه ایران، آرایش‌دهنده‌ی نبرد.',
    ability: ability({
      id: 'toos-formation',
      name: 'آرایش سپاه',
      cooldown: 4,
      text: 'جایت را با یک هم‌تیمی در شعاع ۳ خانه عوض کن.',
      target: 'ally-swap',
      range: 3,
    }),
  },
  giv: {
    id: 'giv',
    name: 'گیو',
    cost: 3,
    steps: orth(4),
    moveText: 'تا ۴ خانه، افقی یا عمودی',
    portrait: 'portraits/giv.png',
    bio: 'پیک تندروی ایران، همیشه در لحظه‌ی درست در جای درست.',
    ability: ability({
      id: 'giv-courier',
      name: 'پیک تند',
      cooldown: 3,
      text: 'به هر خانه‌ی خالی در شعاع ۵ خانه جهش کن.',
      target: 'empty-square',
      range: 5,
    }),
  },
  faramarz: {
    id: 'faramarz',
    name: 'فرامرز',
    cost: 3,
    steps: allDirs(2),
    moveText: 'تا ۲ خانه در هر جهت',
    portrait: 'portraits/faramarz.png',
    bio: 'فرزند رستم، نگهبان خاندان دستان.',
    ability: ability({
      id: 'faramarz-shield',
      name: 'سپر خاندان',
      cooldown: 4,
      text: 'یک هم‌تیمی مجاور (یا خودت) تا نوبت بعدی سپردار می‌شود.',
      target: 'ally-piece',
      range: 1,
    }),
  },
  kamanandar: {
    id: 'kamanandar',
    name: 'کماندار',
    cost: 2,
    steps: allDirs(2),
    moveText: 'تا ۲ خانه در هر جهت',
    portrait: 'portraits/kamanandar.png',
    bio: 'تیرانداز سپاه ایران، چشم تیز و دلیر.',
    ability: ability({
      id: 'kaman-shot',
      name: 'تیراندازی',
      cooldown: 4,
      text: 'در خط دید مستقیم تا ۴ خانه، یک دشمن را بگیر.',
      target: 'enemy-los',
      losRange: 4,
    }),
  },
  sarbaz: {
    id: 'sarbaz',
    name: 'سرباز',
    cost: 1,
    steps: soldier,
    moveText: 'یک خانه: روبه‌جلو، موربِ روبه‌جلو، پهلو',
    portrait: 'portraits/sarbaz.png',
    bio: 'گمنام‌ترین سربازان ایران، ستون پیروزی پهلوانان.',
    ability: ability({
      id: 'sarbaz-daring',
      name: 'جسارت',
      cooldown: 5,
      text: 'بلافاصله یک بار دیگر حرکت کن.',
      target: 'self',
    }),
  },
};

export const HERO_LIST: HeroDef[] = Object.values(HEROES);
export const DRAFTABLE_HEROES: HeroDef[] = HERO_LIST.filter((h) => h.id !== 'shah');
export const SHAH = HEROES.shah;
