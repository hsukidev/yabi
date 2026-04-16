import type { Boss, BossFamily } from '../types';

export const bosses: Boss[] = [
  { id: 'extreme-black-mage', name: 'Extreme Black Mage', family: 'black-mage', crystalValue: 18000000000 },
  { id: 'extreme-kaling', name: 'Extreme Kaling', family: 'kaling', crystalValue: 6026000000 },
  { id: 'extreme-first-adversary', name: 'Extreme First Adversary', family: 'first-adversary', crystalValue: 5880000000 },
  { id: 'extreme-kalos-the-guardian', name: 'Extreme Kalos the Guardian', family: 'kalos-the-guardian', crystalValue: 5200000000 },
  { id: 'hard-black-mage', name: 'Hard Black Mage', family: 'black-mage', crystalValue: 4500000000 },
  { id: 'extreme-chosen-seren', name: 'Extreme Chosen Seren', family: 'chosen-seren', crystalValue: 4235000000 },
  { id: 'hard-baldrix', name: 'Hard Baldrix', family: 'baldrix', crystalValue: 4200000000 },
  { id: 'hard-limbo', name: 'Hard Limbo', family: 'limbo', crystalValue: 3745000000 },
  { id: 'hard-kaling', name: 'Hard Kaling', family: 'kaling', crystalValue: 2990000000 },
  { id: 'hard-first-adversary', name: 'Hard First Adversary', family: 'first-adversary', crystalValue: 2940000000 },
  { id: 'normal-baldrix', name: 'Normal Baldrix', family: 'baldrix', crystalValue: 2800000000 },
  { id: 'chaos-kalos-the-guardian', name: 'Chaos Kalos the Guardian', family: 'kalos-the-guardian', crystalValue: 2600000000 },
  { id: 'normal-limbo', name: 'Normal Limbo', family: 'limbo', crystalValue: 2100000000 },
  { id: 'normal-kaling', name: 'Normal Kaling', family: 'kaling', crystalValue: 1506500000 },
  { id: 'extreme-lotus', name: 'Extreme Lotus', family: 'lotus', crystalValue: 1397500000 },
  { id: 'normal-first-adversary', name: 'Normal First Adversary', family: 'first-adversary', crystalValue: 1365000000 },
  { id: 'normal-kalos-the-guardian', name: 'Normal Kalos the Guardian', family: 'kalos-the-guardian', crystalValue: 1300000000 },
  { id: 'hard-chosen-seren', name: 'Hard Chosen Seren', family: 'chosen-seren', crystalValue: 1096562500 },
  { id: 'easy-kaling', name: 'Easy Kaling', family: 'kaling', crystalValue: 1031250000 },
  { id: 'easy-first-adversary', name: 'Easy First Adversary', family: 'first-adversary', crystalValue: 985000000 },
  { id: 'easy-kalos-the-guardian', name: 'Easy Kalos the Guardian', family: 'kalos-the-guardian', crystalValue: 937500000 },
  { id: 'normal-chosen-seren', name: 'Normal Chosen Seren', family: 'chosen-seren', crystalValue: 889021875 },
  { id: 'hard-verus-hilla', name: 'Hard Verus Hilla', family: 'verus-hilla', crystalValue: 762105000 },
  { id: 'hard-darknell', name: 'Hard Darknell', family: 'darknell', crystalValue: 667920000 },
  { id: 'hard-will', name: 'Hard Will', family: 'will', crystalValue: 621810000 },
  { id: 'chaos-guardian-angel-slime', name: 'Chaos Guardian Angel Slime', family: 'guardian-angel-slime', crystalValue: 600578125 },
  { id: 'normal-verus-hilla', name: 'Normal Verus Hilla', family: 'verus-hilla', crystalValue: 581880000 },
  { id: 'chaos-gloom', name: 'Chaos Gloom', family: 'gloom', crystalValue: 563945000 },
  { id: 'hard-lucid', name: 'Hard Lucid', family: 'lucid', crystalValue: 504000000 },
  { id: 'hard-lotus', name: 'Hard Lotus', family: 'lotus', crystalValue: 444675000 },
  { id: 'hard-damien', name: 'Hard Damien', family: 'damien', crystalValue: 421875000 },
  { id: 'normal-darknell', name: 'Normal Darknell', family: 'darknell', crystalValue: 316875000 },
  { id: 'normal-gloom', name: 'Normal Gloom', family: 'gloom', crystalValue: 297675000 },
  { id: 'normal-will', name: 'Normal Will', family: 'will', crystalValue: 279075000 },
  { id: 'normal-lucid', name: 'Normal Lucid', family: 'lucid', crystalValue: 253828125 },
  { id: 'easy-will', name: 'Easy Will', family: 'will', crystalValue: 246744750 },
  { id: 'easy-lucid', name: 'Easy Lucid', family: 'lucid', crystalValue: 237009375 },
  { id: 'normal-guardian-angel-slime', name: 'Normal Guardian Angel Slime', family: 'guardian-angel-slime', crystalValue: 231673500 },
  { id: 'normal-damien', name: 'Normal Damien', family: 'damien', crystalValue: 169000000 },
  { id: 'normal-lotus', name: 'Normal Lotus', family: 'lotus', crystalValue: 162562500 },
  { id: 'akechi-mitsuhide', name: 'Akechi Mitsuhide', family: 'akechi-mitsuhide', crystalValue: 144000000 },
  { id: 'chaos-papulatus', name: 'Chaos Papulatus', family: 'papulatus', crystalValue: 132250000 },
  { id: 'chaos-vellum', name: 'Chaos Vellum', family: 'vellum', crystalValue: 105062500 },
  { id: 'hard-magnus', name: 'Hard Magnus', family: 'magnus', crystalValue: 95062500 },
  { id: 'princess-no', name: 'Princess No', family: 'princess-no', crystalValue: 81000000 },
  { id: 'chaos-zakum', name: 'Chaos Zakum', family: 'zakum', crystalValue: 81000000 },
  { id: 'chaos-pierre', name: 'Chaos Pierre', family: 'pierre', crystalValue: 81000000 },
  { id: 'chaos-von-bon', name: 'Chaos Von Bon', family: 'von-bon', crystalValue: 81000000 },
  { id: 'chaos-crimson-queen', name: 'Chaos Crimson Queen', family: 'crimson-queen', crystalValue: 81000000 },
  { id: 'normal-cygnus', name: 'Normal Cygnus', family: 'cygnus', crystalValue: 72250000 },
  { id: 'chaos-pink-bean', name: 'Chaos Pink Bean', family: 'pink-bean', crystalValue: 64000000 },
  { id: 'hard-hilla', name: 'Hard Hilla', family: 'hilla', crystalValue: 56250000 },
  { id: 'easy-cygnus', name: 'Easy Cygnus', family: 'cygnus', crystalValue: 45562500 },
  { id: 'hard-mori-ranmaru', name: 'Hard Mori Ranmaru', family: 'mori-ranmaru', crystalValue: 13322500 },
  { id: 'normal-papulatus', name: 'Normal Papulatus', family: 'papulatus', crystalValue: 13322500 },
  { id: 'normal-magnus', name: 'Normal Magnus', family: 'magnus', crystalValue: 12960000 },
  { id: 'normal-arkarium', name: 'Normal Arkarium', family: 'arkarium', crystalValue: 12602500 },
  { id: 'hard-von-leon', name: 'Hard Von Leon', family: 'von-leon', crystalValue: 12250000 },
  { id: 'normal-von-leon', name: 'Normal Von Leon', family: 'von-leon', crystalValue: 7290000 },
  { id: 'normal-pink-bean', name: 'Normal Pink Bean', family: 'pink-bean', crystalValue: 7022500 },
  { id: 'chaos-horntail', name: 'Chaos Horntail', family: 'horntail', crystalValue: 6760000 },
  { id: 'omni-cln', name: 'OMNI-CLN', family: 'omni-cln', crystalValue: 6250000 },
  { id: 'easy-arkarium', name: 'Easy Arkarium', family: 'arkarium', crystalValue: 5760000 },
  { id: 'easy-von-leon', name: 'Easy Von Leon', family: 'von-leon', crystalValue: 5290000 },
  { id: 'normal-horntail', name: 'Normal Horntail', family: 'horntail', crystalValue: 5062500 },
  { id: 'normal-pierre', name: 'Normal Pierre', family: 'pierre', crystalValue: 4840000 },
  { id: 'normal-von-bon', name: 'Normal Von Bon', family: 'von-bon', crystalValue: 4840000 },
  { id: 'normal-crimson-queen', name: 'Normal Crimson Queen', family: 'crimson-queen', crystalValue: 4840000 },
  { id: 'normal-vellum', name: 'Normal Vellum', family: 'vellum', crystalValue: 4840000 },
  { id: 'easy-horntail', name: 'Easy Horntail', family: 'horntail', crystalValue: 4410000 },
  { id: 'normal-mori-ranmaru', name: 'Normal Mori Ranmaru', family: 'mori-ranmaru', crystalValue: 4202500 },
  { id: 'normal-hilla', name: 'Normal Hilla', family: 'hilla', crystalValue: 4000000 },
  { id: 'easy-magnus', name: 'Easy Magnus', family: 'magnus', crystalValue: 3610000 },
  { id: 'easy-papulatus', name: 'Easy Papulatus', family: 'papulatus', crystalValue: 3422500 },
  { id: 'normal-zakum', name: 'Normal Zakum', family: 'zakum', crystalValue: 3062500 },
  { id: 'easy-zakum', name: 'Easy Zakum', family: 'zakum', crystalValue: 1000000 },
];

export const bossFamilies: BossFamily[] = (() => {
  const familyMap = new Map<string, Boss[]>();
  for (const boss of bosses) {
    if (!familyMap.has(boss.family)) {
      familyMap.set(boss.family, []);
    }
    familyMap.get(boss.family)!.push(boss);
  }
  return Array.from(familyMap.entries())
    .map(([family, familyBosses]) => ({
      family,
      bosses: familyBosses.sort((a, b) => b.crystalValue - a.crystalValue),
    }))
    .sort((a, b) => b.bosses[0].crystalValue - a.bosses[0].crystalValue);
})();

const bossMap = new Map<string, Boss>(bosses.map((b) => [b.id, b]));

export function getBossById(id: string): Boss | undefined {
  return bossMap.get(id);
}

export function calculatePotentialIncome(selectedBossIds: string[]): number {
  return selectedBossIds.reduce((sum, id) => {
    const boss = getBossById(id);
    return sum + (boss?.crystalValue ?? 0);
  }, 0);
}