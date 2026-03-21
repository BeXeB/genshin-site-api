import { MaterialType } from './enums';
import { Item, ResolvedItem } from './items';

export type MaterialCraft = {
  cost: number;
  resultCount: number;
  recipe: Item[];
};

export type Material = {
  id: number;
  name: string;
  normalizedName: string;
  type: MaterialType;
  rarity: number;
  description: string;
  location: string;
  farmable: string[];
  craft?: MaterialCraft;
  images: {
    filename_icon: string;
  };
  version: string;
};

export type MaterialResolved = Omit<Material, 'craft'> & {
  craft?: Omit<MaterialCraft, 'recipe'> & {
    recipe: ResolvedItem[];
  };
};
