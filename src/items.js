/**
 * Items Database & Definitions
 * Foods, Drinks, and Tools with procedural vector graphics and stat benefits.
 */

const ITEMS_DB = {
  foods: [
    {
      id: 'apple',
      name: 'Apel Segar',
      type: 'food',
      cost: 10,
      hunger: 25,
      thirst: 5,
      sanity: 8,
      desc: 'Apel merah renyah penahan lapar sahur.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path d="M32 14 C35 6 42 8 44 10" stroke="#4ade80" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path d="M32 14 C32 8 36 4 38 4" stroke="#854d0e" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M32 16 C20 12 10 24 12 40 C14 54 28 58 32 54 C36 58 50 54 52 40 C54 24 44 12 32 16 Z" fill="#ef4444"/>
          <ellipse cx="24" cy="28" rx="4" ry="8" fill="#fca5a5" transform="rotate(-25 24 28)"/>
        </svg>
      `
    },
    {
      id: 'cake',
      name: 'Kue Tart Sahur',
      type: 'food',
      cost: 25,
      hunger: 45,
      thirst: -5,
      sanity: 20,
      desc: 'Kue bolu manis berlapis krim stroberi.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <polygon points="12,48 52,48 56,32 8,32" fill="#fef08a"/>
          <polygon points="14,32 50,32 46,20 18,20" fill="#f43f5e"/>
          <rect x="8" y="44" width="48" height="10" rx="3" fill="#9333ea"/>
          <path d="M14 32 Q 23 38 32 32 Q 41 38 50 32" stroke="#fff" stroke-width="4" fill="none"/>
          <circle cx="32" cy="14" r="5" fill="#e11d48"/>
          <path d="M32 9 L34 5" stroke="#15803d" stroke-width="2"/>
        </svg>
      `
    },
    {
      id: 'indomie',
      name: 'Indomie Telur',
      type: 'food',
      cost: 30,
      hunger: 60,
      thirst: -10,
      sanity: 25,
      desc: 'Santapan andalan sahur dengan kuah & telur setengah matang.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="32" cy="46" rx="26" ry="12" fill="#64748b"/>
          <ellipse cx="32" cy="42" rx="24" ry="10" fill="#fef08a"/>
          <path d="M16 40 Q22 32 30 38 Q38 32 46 38" stroke="#ca8a04" stroke-width="5" fill="none"/>
          <path d="M18 43 Q26 36 34 42 Q42 36 48 42" stroke="#eab308" stroke-width="4" fill="none"/>
          <circle cx="28" cy="38" r="8" fill="#ffffff"/>
          <circle cx="28" cy="38" r="5" fill="#f97316"/>
          <circle cx="44" cy="40" r="3" fill="#16a34a"/>
          <circle cx="39" cy="45" r="2.5" fill="#16a34a"/>
        </svg>
      `
    },
    {
      id: 'rendang',
      name: 'Rendang Daging',
      type: 'food',
      cost: 40,
      hunger: 80,
      thirst: -15,
      sanity: 35,
      desc: 'Rendang pedas gurih bumbu rempah kelapa asli.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="32" cy="48" rx="28" ry="10" fill="#475569"/>
          <path d="M18 42 C16 32 26 26 38 28 C48 30 46 42 40 46 C32 50 20 48 18 42 Z" fill="#451a03"/>
          <path d="M22 36 C24 30 32 28 36 30 C32 36 26 38 22 36 Z" fill="#78350f"/>
          <circle cx="25" cy="40" r="1.5" fill="#ca8a04"/>
          <circle cx="35" cy="36" r="1.5" fill="#ca8a04"/>
          <circle cx="31" cy="44" r="1.5" fill="#ca8a04"/>
        </svg>
      `
    },
    {
      id: 'backrooms_ration',
      name: 'Ransum Level 0',
      type: 'food',
      cost: 15,
      hunger: 40,
      thirst: -5,
      sanity: -5,
      desc: 'Biskuit kering aneh yang ditemukan tergeletak di karpet kuning.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <rect x="14" y="16" width="36" height="34" rx="4" fill="#a16207" stroke="#713f12" stroke-width="3"/>
          <circle cx="22" cy="24" r="2" fill="#713f12"/>
          <circle cx="32" cy="24" r="2" fill="#713f12"/>
          <circle cx="42" cy="24" r="2" fill="#713f12"/>
          <circle cx="22" cy="34" r="2" fill="#713f12"/>
          <circle cx="32" cy="34" r="2" fill="#713f12"/>
          <circle cx="42" cy="34" r="2" fill="#713f12"/>
          <circle cx="22" cy="42" r="2" fill="#713f12"/>
          <circle cx="32" cy="42" r="2" fill="#713f12"/>
          <circle cx="42" cy="42" r="2" fill="#713f12"/>
        </svg>
      `
    }
  ],

  drinks: [
    {
      id: 'water',
      name: 'Air Mineral Segar',
      type: 'drink',
      cost: 10,
      thirst: 35,
      hunger: 0,
      sanity: 5,
      desc: 'Air dingin murni yang menghilangkan haus seketika.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path d="M20 16 L44 16 L40 54 L24 54 Z" fill="rgba(56, 189, 248, 0.3)" stroke="#38bdf8" stroke-width="3"/>
          <path d="M23 28 L41 28 L39 52 L25 52 Z" fill="#0284c7"/>
          <ellipse cx="32" cy="28" rx="9" ry="2" fill="#38bdf8"/>
          <line x1="28" y1="20" x2="30" y2="48" stroke="#bae6fd" stroke-width="2"/>
        </svg>
      `
    },
    {
      id: 'orange_juice',
      name: 'Jus Jeruk Segar',
      type: 'drink',
      cost: 20,
      thirst: 50,
      hunger: 5,
      sanity: 15,
      desc: 'Jus jeruk peras manis kaya vitamin untuk semangat.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path d="M20 18 L44 18 L40 54 L24 54 Z" fill="rgba(251, 146, 60, 0.4)" stroke="#f97316" stroke-width="3"/>
          <path d="M22 26 L42 26 L39 52 L25 52 Z" fill="#ea580c"/>
          <circle cx="32" cy="38" r="5" fill="#fdba74"/>
          <line x1="38" y1="8" x2="28" y2="40" stroke="#22c55e" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      id: 'almond_water',
      name: 'Almond Water Backrooms',
      type: 'drink',
      cost: 45,
      thirst: 75,
      hunger: 10,
      sanity: 50,
      desc: 'Air mistis penawar kegilaan di Backrooms. Sangat menyegarkan!',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <rect x="22" y="10" width="20" height="10" rx="3" fill="#e2e8f0"/>
          <path d="M20 20 C14 24 14 50 18 56 C22 58 42 58 46 56 C50 50 50 24 44 20 Z" fill="#ecfdf5" stroke="#10b981" stroke-width="3"/>
          <path d="M22 30 C18 34 18 48 21 52 C25 54 39 54 43 52 C46 48 46 34 42 30 Z" fill="#a7f3d0"/>
          <ellipse cx="32" cy="40" rx="6" ry="8" fill="#34d399"/>
          <text x="32" y="44" font-size="8" font-weight="bold" fill="#065f46" text-anchor="middle">AW</text>
        </svg>
      `
    },
    {
      id: 'coffee',
      name: 'Kopi Sahur Mantap',
      type: 'drink',
      cost: 25,
      thirst: 30,
      hunger: 0,
      energy: 35,
      sanity: 15,
      desc: 'Kopi hitam panas agar melek dan tidak lemas bangun sahur.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <rect x="16" y="24" width="30" height="28" rx="6" fill="#78350f" stroke="#451a03" stroke-width="3"/>
          <path d="M46 28 C52 28 54 38 46 42" stroke="#451a03" stroke-width="4" fill="none"/>
          <ellipse cx="31" cy="24" rx="14" ry="4" fill="#291205"/>
          <path d="M26 18 Q28 12 25 8" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M34 19 Q36 13 33 9" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>
      `
    },
    {
      id: 'boba',
      name: 'Boba Brown Sugar',
      type: 'drink',
      cost: 35,
      thirst: 55,
      hunger: 15,
      sanity: 30,
      desc: 'Minuman manis kekinian dengan kenyalnya boba tapioka.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path d="M20 20 L44 20 L40 56 L24 56 Z" fill="#ffedd5" stroke="#7c2d12" stroke-width="3"/>
          <path d="M22 28 L42 28 L39 54 L25 54 Z" fill="#fdba74"/>
          <circle cx="28" cy="48" r="3.5" fill="#451a03"/>
          <circle cx="36" cy="48" r="3.5" fill="#451a03"/>
          <circle cx="32" cy="43" r="3.5" fill="#451a03"/>
          <circle cx="27" cy="38" r="3" fill="#451a03"/>
          <circle cx="37" cy="39" r="3" fill="#451a03"/>
          <line x1="38" y1="8" x2="28" y2="44" stroke="#e11d48" stroke-width="5" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      id: 'ginger_tea',
      name: 'Teh Jahe Hangat',
      type: 'drink',
      cost: 20,
      thirst: 45,
      hunger: 5,
      sanity: 25,
      curesMules: true,
      desc: 'Teh herbal jahe hangat pereda mules perut, kembung, dan rasa haus.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <rect x="18" y="24" width="28" height="26" rx="6" fill="#ea580c" stroke="#9a3412" stroke-width="3"/>
          <path d="M46 28 C52 28 54 36 46 40" stroke="#9a3412" stroke-width="3.5" fill="none"/>
          <ellipse cx="32" cy="24" rx="14" ry="4" fill="#c2410c"/>
          <circle cx="28" cy="34" r="3" fill="#fed7aa"/>
          <circle cx="35" cy="40" r="2" fill="#fed7aa"/>
          <path d="M28 16 Q30 10 27 6" stroke="#fdba74" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>
      `
    },
    {
      id: 'medicine',
      name: 'Sirup Obat Maag & Meriang',
      type: 'medicine',
      cost: 30,
      thirst: 20,
      hunger: 15,
      sanity: 40,
      curesSick: true,
      desc: 'Sirup obat ajaib penawar sakit perut, meriang, dan pusing di Backrooms.',
      icon: `
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <rect x="24" y="10" width="16" height="8" rx="2" fill="#94a3b8"/>
          <path d="M22 18 L42 18 L46 54 L18 54 Z" fill="#f8fafc" stroke="#dc2626" stroke-width="3"/>
          <rect x="22" y="28" width="20" height="24" fill="#ef4444" rx="2"/>
          <rect x="30" y="32" width="4" height="16" fill="#ffffff"/>
          <rect x="24" y="38" width="16" height="4" fill="#ffffff"/>
        </svg>
      `
    }
  ],

  tools: [
    {
      id: 'sponge',
      name: 'Spons Pembersih',
      type: 'tool',
      action: 'clean_pet',
      desc: 'Gosokkan ke Tungtungtung Sahur untuk memandikan dan membersihkan debu karpet.'
    },
    {
      id: 'mop',
      name: 'Sapu & Mop Lantai',
      type: 'tool',
      action: 'clean_poop',
      desc: 'Klik kotoran/pup yang berceceran di lantai untuk menyedot dan membersihkannya.'
    },
    {
      id: 'thermometer',
      name: 'Kompres & Obat Meriang',
      type: 'tool',
      action: 'cure_fever',
      desc: 'Kompres dan rawat Tungtungtung Sahur saat dia meriang, sakit perut, atau demam.'
    },
    {
      id: 'beater',
      name: 'Pemukul Kentongan',
      type: 'tool',
      action: 'beat_kentongan',
      desc: 'Ketuk Tungtungtung Sahur agar dia memukul kentongan dan bersenandung sahur!'
    }
  ]
};

// Export to window
window.ITEMS_DB = ITEMS_DB;
