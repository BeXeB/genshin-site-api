import { StatType, WeaponType } from './enums';
import { Item, ResolvedItem } from './items';

export type Weapon = {
  id: number;
  name: string;
  normalizedName: string;
  description: string;
  descriptionRaw: string;
  weaponType: WeaponType;
  weaponText: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  story: string;
  baseAtkValue: number;
  mainStatType: StatType;
  mainStatText?: string;
  baseStatText?: string;
  effectName?: string;
  effectTemplateRaw?: string;
  r1?: WeaponRefine;
  r2?: WeaponRefine;
  r3?: WeaponRefine;
  r4?: WeaponRefine;
  r5?: WeaponRefine;
  costs: Record<`ascend${1 | 2 | 3 | 4}`, Item[]> & Partial<Record<`ascend${5 | 6}`, Item[]>>;
  images: {
    filename_icon: string;
    filename_awakenIcon: string;
    filename_gacha: string;
  };
  version: string;
  stats: WeaponStats;
};

export type WeaponRefine = {
  description: string;
  values: string[];
};

export type WeaponStats = Record<string, WeaponStat>;

export type WeaponStat = {
  level: number;
  ascension: number;
  attack?: number;
  specialized?: number;
};

export type WeaponResolved = Omit<Weapon, 'costs'> & {
  costs: Partial<Record<`ascend${1 | 2 | 3 | 4 | 5 | 6}`, ResolvedItem[]>>;
};
