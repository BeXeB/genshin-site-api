import { ArtifactType } from './enums';

export type ArtifactPiece = {
  name: string;
  description: string;
  images: {
    filename_icon: string;
  };
};

export type Artifact = {
  id: number;
  name: string;
  normalizedName: string;
  rarity: number;
  description: string;
  effect2pc: string;
  effect4pc: string;
  flower: ArtifactPiece;
  plume: ArtifactPiece;
  sands: ArtifactPiece;
  goblet: ArtifactPiece;
  circlet: ArtifactPiece;
  images: {
    filename_flower: string;
    filename_plume: string;
    filename_sands: string;
    filename_goblet: string;
    filename_circlet: string;
  };
  version: string;
};
