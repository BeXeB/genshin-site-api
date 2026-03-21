import { Material } from '../models/materials';
import { Item, ResolvedItem } from '../models/items';

/**
 * Resolver utility for expanding Item references into full ResolvedItem objects
 * with nested craft data. Mirrors the frontend ResolverService logic.
 */

let materialsMapCache: Map<number, Material> | null = null;

/**
 * Load all materials from database and build lookup map
 * Called once on server startup
 */
export async function loadMaterialsMap(db: any): Promise<Map<number, Material>> {
  if (materialsMapCache) {
    return materialsMapCache;
  }

  const materialRows = await db.all(
    'SELECT id, data FROM materials ORDER BY id'
  );

  const map = new Map<number, Material>();

  for (const row of materialRows) {
    try {
      const material = JSON.parse(row.data) as Material;
      
      // Also load craft data if it exists
      const craftRow = await db.get(
        'SELECT data FROM material_craft WHERE material_id = ?',
        [row.id]
      );

      if (craftRow) {
        const craftData = JSON.parse(craftRow.data);
        (material as any).craft = {
          recipe: craftData.recipe,
          moraCost: craftData.moraCost,
          resultCount: craftData.resultCount,
        };
      }

      map.set(material.id, material);
    } catch (error) {
      console.error(`Failed to parse material data for id ${row.id}:`, error);
    }
  }

  materialsMapCache = map;
  console.log(`✓ Loaded ${map.size} materials into resolver map`);
  return map;
}

/**
 * Clear the materials map cache (useful for testing/reloads)
 */
export function clearMaterialsMapCache(): void {
  materialsMapCache = null;
}

/**
 * Get the cached materials map (must be initialized first with loadMaterialsMap)
 */
export function getMaterialsMap(): Map<number, Material> {
  if (!materialsMapCache) {
    throw new Error(
      'Materials map not initialized. Call loadMaterialsMap() first.'
    );
  }
  return materialsMapCache;
}

/**
 * Resolve a single Item to a ResolvedItem with full material data and nested craft
 */
export function resolveItem(
  item: Item,
  materialsMap: Map<number, Material>,
  depthLimit: number = 10,
  currentDepth: number = 0
): ResolvedItem {
  // Safety: prevent infinite recursion on circular craft references
  if (currentDepth > depthLimit) {
    const material = materialsMap.get(item.id);
    return {
      material: material || ({ id: item.id, name: item.name } as Material),
      count: item.count,
      craftable: false,
    };
  }

  const material = materialsMap.get(item.id);

  if (!material) {
    // Material not found in map - return placeholder
    return {
      material: { id: item.id, name: item.name } as Material,
      count: item.count,
      craftable: false,
    };
  }

  const resolved: ResolvedItem = {
    material,
    count: item.count,
    craftable: !!(material as any).craft,
  };

  // Recursively resolve craft recipe if material is craftable
  const materialWithCraft = material as any;
  if (materialWithCraft.craft) {
    resolved.craft = {
      moraCost: materialWithCraft.craft.moraCost,
      resultCount: materialWithCraft.craft.resultCount,
      recipe: materialWithCraft.craft.recipe.map((recipeItem: Item) =>
        resolveItem(recipeItem, materialsMap, depthLimit, currentDepth + 1)
      ),
    };
  }

  return resolved;
}

/**
 * Resolve an array of Items to ResolvedItems
 */
export function resolveItems(
  items: Item[],
  materialsMap: Map<number, Material>
): ResolvedItem[] {
  return items.map((item) => resolveItem(item, materialsMap));
}

/**
 * Resolve a cost record (e.g., character ascension costs: ascend1-6)
 * Returns a new record with Item[] values replaced by ResolvedItem[]
 */
export function resolveCostRecord<K extends string>(
  costs: Record<K, Item[]> | Partial<Record<K, Item[]>>,
  materialsMap: Map<number, Material>
): Record<K, ResolvedItem[]> | Partial<Record<K, ResolvedItem[]>> {
  const resolved: any = {};

  for (const [key, items] of Object.entries(costs)) {
    if (items) {
      resolved[key as K] = resolveItems(items as Item[], materialsMap);
    }
  }

  return resolved;
}
