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
 * Sync characters from genshin-db to database
 * Uses insert-only mode to preserve manual corrections
 */
export async function syncCharacters(db: Database): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Get all character names from genshin-db
    const characterNames = genshindb.characters('names', {
      matchCategories: true,
    });

    if (!characterNames || characterNames.length === 0) {
      console.error('No characters found in genshin-db');
      return stats;
    }

    await beginTransaction(db);

    for (const characterName of characterNames) {
      stats.totalProcessed++;

      try {
        // Fetch full character data
        const fullCharacter = genshindb.characters(characterName, {
          queryLanguages: [queryLanguage],
        });

        if (!fullCharacter) {
          console.warn(`Could not fetch full data for character: ${characterName}`);
          stats.errors++;
          continue;
        }

        const normalizedName = normalizeGameName(fullCharacter.name);

        // Fetch talents separately
        let talentsData: string | null = null;
        try {
          const talents = genshindb.talents(characterName, {
            queryLanguages: [queryLanguage],
          });
          if (talents) {
            talentsData = JSON.stringify(talents);
          }
        } catch (e) {
          console.warn(`Could not fetch talents for ${characterName}`);
        }

        // Fetch constellations separately
        let constellationData: string | null = null;
        try {
          const constellations = genshindb.constellations(characterName, {
            queryLanguages: [queryLanguage],
          });
          if (constellations) {
            constellationData = JSON.stringify(constellations);
          }
        } catch (e) {
          console.warn(`Could not fetch constellations for ${characterName}`);
        }

        // Map character profile data - using ACTUAL field names from genshin-db types
        const profileData = JSON.stringify({
          name: fullCharacter.name,
          fullname: fullCharacter.fullname,
          title: fullCharacter.title,
          description: fullCharacter.description,
          rarity: fullCharacter.rarity,
          elementType: fullCharacter.elementType,
          weaponType: fullCharacter.weaponType,
          substatType: fullCharacter.substatType,
          gender: fullCharacter.gender,
          bodyType: fullCharacter.bodyType,
          associationType: fullCharacter.associationType,
          region: fullCharacter.region,
          affiliation: fullCharacter.affiliation,
          birthday: fullCharacter.birthday,
          birthdaymmdd: fullCharacter.birthdaymmdd,
          constellation: fullCharacter.constellation,
          cv: fullCharacter.cv,
          costs: fullCharacter.costs,
          images: fullCharacter.images,
          version: fullCharacter.version,
        });

        // Consolidate full character data into single JSON `data` column
        const characterPayload = {
          profile: fullCharacter,
          talents: talentsData ? JSON.parse(talentsData) : null,
          constellations: constellationData ? JSON.parse(constellationData) : null,
          profileData: JSON.parse(profileData),
          isTraveler: normalizedName.includes('traveler') || normalizedName.includes('aether') || normalizedName.includes('lumine'),
        };

        // Insert using genshin-db id as the primary key
        const result = await insertIfMissing(
          db,
          'characters',
          normalizedName,
          ['id', 'normalized_name', 'data'],
          [fullCharacter.id, normalizedName, JSON.stringify(characterPayload)]
        );

        if (result.inserted) {
          stats.inserted++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(
          `Error syncing character ${characterName}: ${error}`
        );
        stats.errors++;
      }
    }

    await commitTransaction(db);
    logSyncResults('characters', stats.inserted, stats.skipped, stats.errors, stats.totalProcessed);

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncCharacters: ${error}`);
    throw error;
  }
}
