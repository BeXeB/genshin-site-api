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
 * Get material names from a specific category (matches frontend filtering)
 */
function getMaterialNames(category: string): string[] {
  const result = genshindb.materials(category, {
    matchCategories: true,
  });

  if (!result) return [];

  return Array.isArray(result)
    ? result.filter((x): x is string => typeof x === 'string')
    : [];
}

/**
 * Sync materials from genshin-db to database
 * Uses insert-only mode to preserve manual corrections
 * Only syncs materials from the same categories as the frontend script
 */
export async function syncMaterials(db: Database): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Collect material names from specific categories (matching frontend filtering)
    const nations = [
      'Mondstadt',
      'Liyue',
      'Inazuma',
      'Sumeru',
      'Fontaine',
      'Natlan',
      'Nod-Krai',
    ];

    const talentMaterialNames = getMaterialNames('Character Talent Material');
    const weaponMaterialNames = getMaterialNames('Weapon Ascension Material');
    const gemstoneNames = getMaterialNames('Character Ascension Material');
    const genericMaterialNames = getMaterialNames('Character and Weapon Enhancement Material');
    const bossMaterialNames = getMaterialNames('Character Level-Up Material');
    const localSpecialtyNames = nations.flatMap((n) =>
      getMaterialNames(`Local Specialty (${n})`)
    );
    const moraName = getMaterialNames('Common Currency');
    const charXPNames = getMaterialNames('Character EXP Material');
    const weaponXPNames = getMaterialNames('Weapon Enhancement Material');

    // Combine all material names with their types (matching frontend categorization)
    const materialsWithTypes: Array<{
      name: string;
      type: string;
    }> = [
      ...talentMaterialNames.map((n) => ({ name: n, type: 'talent' })),
      ...weaponMaterialNames.map((n) => ({ name: n, type: 'weapon' })),
      ...gemstoneNames.map((n) => ({ name: n, type: 'gemstone' })),
      ...genericMaterialNames.map((n) => ({ name: n, type: 'generic' })),
      ...bossMaterialNames.map((n) => ({ name: n, type: 'boss' })),
      ...localSpecialtyNames.map((n) => ({ name: n, type: 'local-specialty' })),
      ...moraName.map((n) => ({ name: n, type: 'xp-and-mora' })),
      ...charXPNames.map((n) => ({ name: n, type: 'xp-and-mora' })),
      ...weaponXPNames.map((n) => ({ name: n, type: 'xp-and-mora' })),
    ];

    if (!materialsWithTypes || materialsWithTypes.length === 0) {
      console.error('No materials found in specified categories');
      return stats;
    }

    await beginTransaction(db);

    for (const { name: materialName, type: materialType } of materialsWithTypes) {
      stats.totalProcessed++;

      try {
        // Fetch full material data
        const fullMaterial: genshindb.Material | undefined = genshindb.materials(materialName, {
          queryLanguages: [queryLanguage],
        });

        if (!fullMaterial) {
          console.warn(`Could not fetch full data for material: ${materialName}`);
          stats.errors++;
          continue;
        }

        const normalizedName = normalizeGameName(fullMaterial.name);

        // Map material data using ACTUAL field names from genshin-db types
        const materialData = JSON.stringify({
          name: fullMaterial.name,
          dupealias: fullMaterial.dupealias,
          description: fullMaterial.description,
          sortRank: fullMaterial.sortRank,
          rarity: fullMaterial.rarity,
          category: fullMaterial.category,
          typeText: fullMaterial.typeText,
          dropDomainId: fullMaterial.dropDomainId,
          dropDomainName: fullMaterial.dropDomainName,
          daysOfWeek: fullMaterial.daysOfWeek,
          source: fullMaterial.source,
          images: fullMaterial.images,
        });

        // Consolidate material data into single JSON `data` column
        const materialPayload = {
          meta: fullMaterial,
          categoryType: materialType,
          data: JSON.parse(materialData),
        };

        // Insert using genshin-db id as the primary key
        const result = await insertIfMissing(
          db,
          'materials',
          normalizedName,
          ['id', 'normalized_name', 'data'],
          [fullMaterial.id, normalizedName, JSON.stringify(materialPayload)]
        );

        if (result.inserted) {
          stats.inserted++;
        } else {
          stats.skipped++;
        }

        // Also check for craft data and insert it separately
        try {
          const craftData: genshindb.Craft | undefined = genshindb.crafts(materialName, {
            queryLanguages: [queryLanguage],
          });

            if (craftData && craftData.recipe && craftData.recipe.length > 0) {
            // Map craft recipe items
            const recipeItems = craftData.recipe.map((r: any) => ({
              id: r.id,
              name: r.name,
              count: r.count,
            }));

            const craftPayload = {
              recipe: recipeItems,
              moraCost: craftData.moraCost || 0,
              resultCount: craftData.resultCount || 1,
            };

            // Insert or replace craft data into simplified material_craft schema
            await db.run(
              `INSERT OR REPLACE INTO material_craft (id, material_id, data)
               VALUES (?, ?, ?)`,
              [fullMaterial.id, fullMaterial.id, JSON.stringify(craftPayload)]
            );
          }
        } catch (craftError) {
          // Craft data is optional, don't fail if it doesn't exist
          console.debug(`No craft data for material ${materialName}`);
        }
      } catch (error) {
        console.error(`Error syncing material ${materialName}: ${error}`);
        stats.errors++;
      }
    }

    await commitTransaction(db);
    logSyncResults('materials', stats.inserted, stats.skipped, stats.errors, stats.totalProcessed);

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncMaterials: ${error}`);
    throw error;
  }
}
