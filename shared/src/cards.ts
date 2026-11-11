import type { CategoryId, SpectrumCard, Bilingual } from './types';

export const CATEGORIES: { id: CategoryId; name: Bilingual }[] = [
  { id: 'general', name: { en: 'General', ar: 'عام' } },
  { id: 'pop', name: { en: 'Pop Culture', ar: 'ثقافة شعبية' } },
  { id: 'arab', name: { en: 'Arab Life', ar: 'حياتنا العربية' } },
  { id: 'food', name: { en: 'Food & Drink', ar: 'أكل وشرب' } },
  { id: 'tech', name: { en: 'Tech & Geeky', ar: 'تقنية' } },
  { id: 'ethics', name: { en: 'Hot Takes', ar: 'آراء جريئة' } },
];

type Row = [enLeft: string, enRight: string, arLeft: string, arRight: string];

const RAW: Record<CategoryId, Row[]> = {
  general: [
    ['Hard to find', 'Easy to find', 'صعب الإيجاد', 'سهل الإيجاد'],
    ['Useless', 'Useful', 'عديم الفائدة', 'مفيد'],
    ['Boring', 'Exciting', 'ممل', 'مثير'],
    ['Cheap', 'Expensive', 'رخيص', 'غالي'],
    ['Quiet', 'Loud', 'هادئ', 'صاخب'],
    ['Smells bad', 'Smells good', 'رائحته سيئة', 'رائحته زكية'],
    ['Fragile', 'Indestructible', 'هش', 'لا يُكسر'],
    ['Rare', 'Common', 'نادر', 'شائع'],
    ['Easy to learn', 'Hard to learn', 'سهل التعلّم', 'صعب التعلّم'],
    ['Small talk topic', 'Deep talk topic', 'موضوع سوالف خفيفة', 'موضوع نقاش عميق'],
    ['Overpriced', 'Bargain', 'مبالغ بسعره', 'صفقة'],
    ['Bad habit', 'Good habit', 'عادة سيئة', 'عادة جيدة'],
  ],
  pop: [
    ['Underrated movie', 'Overrated movie', 'فيلم مظلوم', 'فيلم مبالغ بتقييمه'],
    ['Bad villain', 'Great villain', 'شرير ضعيف', 'شرير عظيم'],
    ['Forgettable song', 'Unforgettable song', 'أغنية تُنسى', 'أغنية لا تُنسى'],
    ['Guilty pleasure', 'Openly loved', 'متعة سرية', 'حب علني'],
    ['Flop', 'Blockbuster', 'فشل ذريع', 'نجاح ساحق'],
    ['Kids show', 'Adults only', 'برنامج أطفال', 'للكبار فقط'],
    ['Worst sequel', 'Best sequel', 'أسوأ جزء ثاني', 'أفضل جزء ثاني'],
    ['Fake celebrity', 'Genuine celebrity', 'مشهور مصطنع', 'مشهور حقيقي'],
    ['Cringe trend', 'Cool trend', 'ترند محرج', 'ترند رهيب'],
    ['Better as a book', 'Better as a movie', 'أفضل ككتاب', 'أفضل كفيلم'],
  ],
  arab: [
    ['Traditional', 'Modern', 'تقليدي', 'حديث'],
    ['Wedding must-have', 'Wedding waste', 'أساسي في العرس', 'تبذير في العرس'],
    ['Polite guest', 'Rude guest', 'ضيف مؤدب', 'ضيف ثقيل'],
    ['Ramadan vibe', 'Not Ramadan vibe', 'جو رمضاني', 'ما له علاقة برمضان'],
    ['Grandma approves', 'Grandma disapproves', 'ترضى عنه الجدة', 'تزعل منه الجدة'],
    ['Good Eid gift', 'Bad Eid gift', 'عيدية حلوة', 'عيدية مخيبة'],
    ['Desert trip essential', 'Desert trip useless', 'ضروري للكشتة', 'ما له داعي بالكشتة'],
    ['Formal occasion', 'Casual hangout', 'مناسبة رسمية', 'طلعة عادية'],
    ['Old-school name', 'Trendy name', 'اسم قديم', 'اسم دارج'],
    ['Acceptable lateness', 'Unacceptable lateness', 'تأخير مقبول', 'تأخير غير مقبول'],
    ['Family group chat', 'Friends group chat', 'قروب العائلة', 'قروب الشباب'],
  ],
  food: [
    ['Healthy', 'Unhealthy', 'صحي', 'غير صحي'],
    ['Breakfast food', 'Dinner food', 'أكل فطور', 'أكل عشاء'],
    ['Mild', 'Spicy', 'خفيف', 'حار'],
    ['Comfort food', 'Fancy food', 'أكل مريح', 'أكل فاخر'],
    ['Sweet', 'Savory', 'حلو', 'مالح'],
    ['Easy to cook', 'Hard to cook', 'سهل الطبخ', 'صعب الطبخ'],
    ['Messy to eat', 'Clean to eat', 'أكله يوسّخ', 'أكله نظيف'],
    ['Hot drink', 'Cold drink', 'مشروب حار', 'مشروب بارد'],
    ['Overrated dish', 'Underrated dish', 'طبق مبالغ فيه', 'طبق مظلوم'],
    ['Snack', 'Full meal', 'سناك', 'وجبة كاملة'],
  ],
  tech: [
    ['Simple code', 'Complex code', 'كود بسيط', 'كود معقد'],
    ['Useless app', 'Essential app', 'تطبيق بلا فائدة', 'تطبيق أساسي'],
    ['Outdated tech', 'Futuristic tech', 'تقنية قديمة', 'تقنية مستقبلية'],
    ['Easy bug', 'Nightmare bug', 'خطأ سهل', 'خطأ كابوس'],
    ['Overhyped gadget', 'Underhyped gadget', 'جهاز مبالغ فيه', 'جهاز مظلوم'],
    ['Good password', 'Terrible password', 'كلمة مرور قوية', 'كلمة مرور كارثية'],
    ['Nerdy hobby', 'Mainstream hobby', 'هواية نيردية', 'هواية عادية'],
    ['Privacy friendly', 'Privacy nightmare', 'يحترم الخصوصية', 'كابوس خصوصية'],
    ['Easy game', 'Hard game', 'لعبة سهلة', 'لعبة صعبة'],
    ['Will be replaced by AI', 'Safe from AI', 'ستأخذه الآلة', 'بأمان من الآلة'],
  ],
  ethics: [
    ['Forgivable act', 'Unforgivable act', 'تصرف يُغتفر', 'تصرف لا يُغتفر'],
    ['Harmless lie', 'Harmful lie', 'كذبة بيضاء', 'كذبة مؤذية'],
    ['Should be legal', 'Should be illegal', 'يجب أن يكون مسموحاً', 'يجب أن يكون ممنوعاً'],
    ['Red flag', 'Green flag', 'علامة خطر', 'علامة خير'],
    ['Overreaction', 'Underreaction', 'ردة فعل مبالغة', 'ردة فعل باردة'],
    ['Petty', 'Justified', 'تفاهة', 'له حق'],
    ['Acceptable at work', 'Unacceptable at work', 'مقبول في الدوام', 'غير مقبول في الدوام'],
    ['Good advice', 'Terrible advice', 'نصيحة ذهبية', 'نصيحة كارثية'],
    ['Worth the risk', 'Not worth the risk', 'تستاهل المخاطرة', 'ما تستاهل المخاطرة'],
    ['Selfish', 'Selfless', 'أناني', 'إيثاري'],
  ],
};

export const CARDS: SpectrumCard[] = (Object.keys(RAW) as CategoryId[]).flatMap((category) =>
  RAW[category].map(([enL, enR, arL, arR], i) => ({
    id: `${category}-${String(i + 1).padStart(2, '0')}`,
    category,
    left: { en: enL, ar: arL },
    right: { en: enR, ar: arR },
  })),
);

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
