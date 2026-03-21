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
 * Sync weapons from genshin-db to database
 * Uses insert-only mode to preserve manual corrections
 */
export async function syncWeapons(db: Database): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Get all weapon names from genshin-db
    const weaponNames = genshindb.weapons('names', {
      matchCategories: true,
    });

    if (!weaponNames || weaponNames.length === 0) {
      console.error('No weapons found in genshin-db');
      return stats;
    }

    await beginTransaction(db);

    for (const weaponName of weaponNames) {
      stats.totalProcessed++;

      try {
        // Fetch full weapon data
        const fullWeapon = genshindb.weapons(weaponName, {
          queryLanguages: [queryLanguage],
        });

        if (!fullWeapon) {
          console.warn(`Could not fetch full data for weapon: ${weaponName}`);
          stats.errors++;
          continue;
        }

        const normalizedName = normalizeGameName(fullWeapon.name);

        // Compute weapon stats at all levels and ascensions using the stats function
        const rarity = fullWeapon.rarity;
        const maxLevel = rarity === 1 || rarity === 2 ? 70 : 90;
        const ascensionLevels = rarity === 1 || rarity === 2
          ? [20, 40, 50, 60, 70]
          : [20, 40, 50, 60, 70, 80, 90];

        const weaponStats: Record<string, any> = {};

        // Get stats at all levels
        for (let level = 1; level <= maxLevel; level++) {
          try {
            const stats = (fullWeapon.stats as Function)(level);
            weaponStats[`level_${level}`] = {
              level: level,
              ascension: stats.ascension,
              attack: stats.attack,
              specialized: stats.specialized,
            };
          } catch (e) {
            // Skip if stats not available for this level
          }
        }

        // Map weapon data using ACTUAL field names from genshin-db types
        const weaponData = JSON.stringify({
          name: fullWeapon.name,
          dupealias: fullWeapon.dupealias,
          description: fullWeapon.description,
          weaponType: fullWeapon.weaponType,
          rarity: fullWeapon.rarity,
          story: fullWeapon.story,
          baseAtkValue: fullWeapon.baseAtkValue,
          mainStatType: fullWeapon.mainStatType,
          baseStatText: fullWeapon.baseStatText,
          effectName: fullWeapon.effectName,
          effectTemplateRaw: fullWeapon.effectTemplateRaw,
          r1: fullWeapon.r1,
          r2: fullWeapon.r2,
          r3: fullWeapon.r3,
          r4: fullWeapon.r4,
          r5: fullWeapon.r5,
          costs: fullWeapon.costs,
          images: fullWeapon.images,
          version: fullWeapon.version,
        });

        // Try to insert the weapon
        const result = await insertIfMissing(
          db,
          'weapons',
          normalizedName,
          [
            'normalized_name',
            'name',
            'rarity',
            'weapon_type',
            'main_stat_type',
            'base_atk_value',
            'stats_data',
            'weapon_data',
          ],
          [
            normalizedName,
            fullWeapon.name,
            fullWeapon.rarity,
            fullWeapon.weaponType || null,
            fullWeapon.mainStatType || null,
            fullWeapon.baseAtkValue || null,
            JSON.stringify(weaponStats),
            weaponData,
          ]
        );

        if (result.inserted) {
          stats.inserted++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(`Error syncing weapon ${weaponName}: ${error}`);
        stats.errors++;
      }
    }

    await commitTransaction(db);
    logSyncResults('weapons', stats.inserted, stats.skipped, stats.errors, stats.totalProcessed);

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncWeapons: ${error}`);
    throw error;
  }
}
