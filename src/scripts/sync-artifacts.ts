import { Database } from 'sqlite';
import genshindb from 'genshin-db';
import {
  normalizeGameName,
  insertIfMissing,
  logSyncResults,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from '../utils/data-sync';
import { ArtifactSet } from '../models';

interface SyncStats {
  inserted: number;
  skipped: number;
  errors: number;
  totalProcessed: number;
}

const queryLanguage = genshindb.Language.English;

/**
 * Sync artifacts from genshin-db to database
 * Uses insert-only mode to preserve manual corrections
 */
export async function syncArtifacts(db: Database): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Get all artifact names from genshin-db
    const artifactNames = genshindb.artifacts('names', {
      matchCategories: true,
    });

    if (!artifactNames || artifactNames.length === 0) {
      console.error('No artifacts found in genshin-db');
      return stats;
    }

    await beginTransaction(db);

    for (const artifactName of artifactNames) {
      stats.totalProcessed++;

      try {
        // Fetch full artifact data from genshin-db (typed as any due to numeric property names)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fullArtifact = genshindb.artifacts(artifactName, {
          queryLanguages: [queryLanguage],
        }) as any;

        if (!fullArtifact) {
          console.warn(`Could not fetch full data for artifact: ${artifactName}`);
          stats.errors++;
          continue;
        }

        const normalizedName = normalizeGameName(fullArtifact.name);

        // Parse rarity array from genshin-db (e.g., ["3", "4", "5"] -> [3, 4, 5])
        const rarityList: (1 | 2 | 3 | 4 | 5)[] = fullArtifact.rarity
          ? fullArtifact.rarity.map((r: string) => parseInt(r, 10) as 1 | 2 | 3 | 4 | 5)
          : [];

        // Parse artifact piece data and extract relic type, text, and story
        const parsePiece = (piece: any, type: string) => {
          if (!piece) return undefined;
          return {
            name: piece.name,
            relicType: type as any,
            relicText: piece.relicText || piece.name || '',
            description: piece.description || '',
            story: piece.story || '',
          };
        };

        // Map artifact data from genshin-db format to ArtifactSet format
        const artifactData: ArtifactSet = {
          id: fullArtifact.id,
          name: fullArtifact.name,
          normalizedName,
          rarityList,
          effect1Pc: fullArtifact['1pc'],
          effect2Pc: fullArtifact['2pc'],
          effect4Pc: fullArtifact['4pc'],
          flower: parsePiece(fullArtifact.flower, 'flower'),
          plume: parsePiece(fullArtifact.plume, 'plume'),
          sands: parsePiece(fullArtifact.sands, 'sands'),
          goblet: parsePiece(fullArtifact.goblet, 'goblet'),
          circlet: parsePiece(fullArtifact.circlet, 'circlet'),
          images: fullArtifact.images || {},
          version: fullArtifact.version || '1.0',
        };

        // Try to insert the artifact using genshin-db id as the primary key
        const result = await insertIfMissing(
          db,
          'artifacts',
          normalizedName,
          ['id', 'normalized_name', 'data'],
          [
            fullArtifact.id,
            normalizedName,
            JSON.stringify(artifactData),
          ]
        );

        if (result.inserted) {
          stats.inserted++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(`Error syncing artifact ${artifactName}: ${error}`);
        stats.errors++;
      }
    }

    await commitTransaction(db);
    logSyncResults('artifacts', stats.inserted, stats.skipped, stats.errors, stats.totalProcessed);

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncArtifacts: ${error}`);
    throw error;
  }
}
