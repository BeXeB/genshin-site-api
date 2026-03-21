import { ArtifactType } from './enums';

export type ArtifactPiece = {
  name: string;
  relicType: ArtifactType;
  relicText: string;
  description: string;
  story: string;
};

export type ArtifactSet = {
  id: number;
  name: string;
  normalizedName: string;
  rarityList: (1 | 2 | 3 | 4 | 5)[];
  effect1Pc?: string;
  effect2Pc?: string;
  effect4Pc?: string;
  flower?: ArtifactPiece;
  plume?: ArtifactPiece;
  sands?: ArtifactPiece;
  goblet?: ArtifactPiece;
  circlet?: ArtifactPiece;
  images: {
    filename_flower?: string;
    filename_plume?: string;
    filename_sands?: string;
    filename_goblet?: string;
    filename_circlet?: string;
  };
  version: string;
};
