import { Material } from './materials';

export type Item = {
  id: number;
  name: string;
  count: number;
};

export type ResolvedItem = {
  material: Material;
  count: number;
  craftable?: boolean;
  craft?: {
    recipe: ResolvedItem[];
    moraCost: number;
    resultCount: number;
  };
};
