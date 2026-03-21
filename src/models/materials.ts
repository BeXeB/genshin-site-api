import { MaterialType } from './enums';
import { Item, ResolvedItem } from './items';

export type Material = {
  id: number;
  name: string;
  normalizedName: string;

  rarity?: 1 | 2 | 3 | 4 | 5;
  sortRank: number;
  description: string;

  type: MaterialType;
  typeText: string;

  dropDomainName?: string;
  daysOfWeek?: string[];

  images: {
    filename_icon: string;
  };
};

export type MaterialCraft = {
  id: number;
  materialId: number;
  resultCount: number;
  moraCost: number;
  recipe: Item[];
};

export type MaterialResolved = Material & {
  craftable?: boolean;
  craft?: {
    recipe: ResolvedItem[];
    moraCost: number;
    resultCount: number;
  };
};

export type MaterialCraftResolved = Omit<MaterialCraft, 'recipe'> & {
  recipe: ResolvedItem[];
};