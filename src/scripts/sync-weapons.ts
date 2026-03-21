import { Database } from "sqlite";
import genshindb from "genshin-db";
import {
  normalizeGameName,
  insertIfMissing,
  logSyncResults,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "../utils/data-sync";
import { mapCostRecord } from '../utils/data-sync';
import { StatType, Weapon, WeaponType } from "../models";

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
    const weaponNames = genshindb.weapons("names", {
      matchCategories: true,
    });

    if (!weaponNames || weaponNames.length === 0) {
      console.error("No weapons found in genshin-db");
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

        // Compute weapon stats at all levels and ascensions (match update-weapons.ts)
        const rarity = fullWeapon.rarity as number;
        const levels: number[] = Array.from({ length: rarity > 2 ? 90 : 70 }, (_, i) => i + 1);
        const ascensionLevels: number[] = rarity > 2 ? [20, 40, 50, 60, 70, 80] : [20, 40, 50, 60];

        const weaponStats: Record<string, any> = {};

        // Get stats at all levels
        for (const level of levels) {
          try {
            const s = (fullWeapon as any).stats(level);
            weaponStats[level] = {
              level,
              ascension: s.ascension,
              attack: s.attack,
              specialized: s.specialized,
            };
          } catch (e) {
            // ignore
          }
        }

        // Get ascension '+' stats
        for (const ascLevel of ascensionLevels) {
          try {
            const s = (fullWeapon as any).stats(ascLevel, '+');
            weaponStats[ascLevel + '+'] = {
              level: ascLevel,
              ascension: s.ascension,
              attack: s.attack,
              specialized: s.specialized,
            };
          } catch (e) {
            // ignore
          }
        }

        // Map weapon data using ACTUAL field names from genshin-db types
        const weaponDataObj: Weapon = {
          id: fullWeapon.id,
          name: fullWeapon.name,
          normalizedName,
          description: fullWeapon.description || "",
          descriptionRaw: (fullWeapon as any).descriptionRaw || "",
          weaponType: fullWeapon.weaponType as WeaponType,
          weaponText: fullWeapon.weaponText || "",
          rarity: fullWeapon.rarity,
          story: fullWeapon.story || "",
          baseAtkValue: fullWeapon.baseAtkValue || 0,
          mainStatType: fullWeapon.mainStatType as StatType,
          mainStatText: fullWeapon.mainStatText,
          baseStatText: fullWeapon.baseStatText,
          effectName: fullWeapon.effectName,
          effectTemplateRaw: fullWeapon.effectTemplateRaw,
          r1: fullWeapon.r1,
          r2: fullWeapon.r2,
          r3: fullWeapon.r3,
          r4: fullWeapon.r4,
          r5: fullWeapon.r5,
          costs: mapCostRecord(fullWeapon.costs || {}) as any,
          images: {
            filename_icon: fullWeapon.images?.filename_icon,
            filename_awakenIcon: fullWeapon.images?.filename_awakenIcon,
            filename_gacha: fullWeapon.images?.filename_gacha,
          },
          version: fullWeapon.version || "1.0",
          stats: weaponStats,
        };

        // Consolidate weapon data and stats into single JSON `data` column
        const weaponPayload = weaponDataObj;

        // Insert using genshin-db id as the primary key
        const result = await insertIfMissing(
          db,
          "weapons",
          normalizedName,
          ["id", "normalized_name", "data"],
          [fullWeapon.id, normalizedName, JSON.stringify(weaponPayload)],
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
    logSyncResults(
      "weapons",
      stats.inserted,
      stats.skipped,
      stats.errors,
      stats.totalProcessed,
    );

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncWeapons: ${error}`);
    throw error;
  }
}
