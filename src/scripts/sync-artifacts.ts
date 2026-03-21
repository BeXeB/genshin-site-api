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

        // Map artifact data from genshin-db format (with numeric string keys like '1pc', '2pc', '4pc')
        const artifactData = JSON.stringify({
          name: fullArtifact.name,
          rarity: fullArtifact.rarity,
          '1pc': fullArtifact['1pc'],
          '2pc': fullArtifact['2pc'],
          '4pc': fullArtifact['4pc'],
          flower: fullArtifact.flower,
          plume: fullArtifact.plume,
          sands: fullArtifact.sands,
          goblet: fullArtifact.goblet,
          circlet: fullArtifact.circlet,
          images: fullArtifact.images,
          version: fullArtifact.version,
        });

        // Get highest rarity from rarity array
        const maxRarity = fullArtifact.rarity && fullArtifact.rarity.length > 0
          ? Math.max(...fullArtifact.rarity.map((r: string) => parseInt(r, 10)))
          : null;

        // Try to insert the artifact
        const result = await insertIfMissing(
          db,
          'artifacts',
          normalizedName,
          ['normalized_name', 'name', 'rarity', 'artifact_data'],
          [
            normalizedName,
            fullArtifact.name,
            maxRarity,
            artifactData,
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
