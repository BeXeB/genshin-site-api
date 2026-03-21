import { Database } from 'sqlite';
import { Item } from '../models/items';
import { MaterialType } from '../models/enums';

/**
 * Normalize game item names using the same logic as frontend
 * Converts to lowercase and removes whitespace and special characters
 */
export function normalizeGameName(name: string): string {
  return name.replace(/[\s'"`:\-—]+/g, '').toLowerCase();
}

/**
 * Check if a record exists in a table by normalized_name
 */
export async function checkRecordExists(
  db: Database,
  tableName: string,
  normalizedName: string
): Promise<boolean> {
  try {
    const result = await db.get(
      `SELECT 1 FROM ${tableName} WHERE normalized_name = ?`,
      [normalizedName]
    );
    return !!result;
  } catch (error) {
    console.error(
      `Error checking if record exists in ${tableName}: ${error}`
    );
    throw error;
  }
}

/**
 * Insert a record if it doesn't already exist
 * Returns { inserted: true } if inserted, { inserted: false, reason } if skipped
 */
export async function insertIfMissing(
  db: Database,
  tableName: string,
  normalizedName: string,
  columns: string[],
  values: any[]
): Promise<{ inserted: boolean; reason?: string }> {
  try {
    const exists = await checkRecordExists(db, tableName, normalizedName);

    if (exists) {
      return { inserted: false, reason: 'already_exists' };
    }

    // Build INSERT statement
    const columnList = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`;

    await db.run(query, values);
    return { inserted: true };
  } catch (error) {
    console.error(
      `Error inserting record into ${tableName} (${normalizedName}): ${error}`
    );
    throw error;
  }
}

/**
 * Format and log sync results for a data type
 */
export function logSyncResults(
  tableName: string,
  inserted: number,
  skipped: number,
  errors: number,
  totalProcessed: number
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [${tableName}] Processed: ${totalProcessed}, Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`
  );
}

/**
 * Begin transaction for atomic operations
 */
export async function beginTransaction(db: Database): Promise<void> {
  await db.exec('BEGIN TRANSACTION');
}

/**
 * Commit transaction
 */
export async function commitTransaction(db: Database): Promise<void> {
  await db.exec('COMMIT');
}

/**
 * Rollback transaction on error
 */
export async function rollbackTransaction(db: Database): Promise<void> {
  try {
    await db.exec('ROLLBACK');
  } catch (error) {
    console.error(`Error rolling back transaction: ${error}`);
  }
}

/**
 * Map a raw genshin-db item (which may have string ids) to internal `Item` type
 */
export function mapItem(raw: any): Item {
  const idNum = typeof raw?.id === 'number' ? raw.id : parseInt(String(raw?.id || ''), 10);
  return {
    id: Number.isFinite(idNum) ? idNum : 0,
    name: raw?.name || '',
    count: typeof raw?.count === 'number' ? raw.count : parseInt(String(raw?.count || '1'), 10) || 1,
  };
}

/**
 * Map a cost record like { ascend1: [{id, name, count}, ...], ... }
 * into typed Record<K, Item[]>
 */
export function mapCostRecord<K extends string>(
  costs: Record<K, any[]> | Partial<Record<K, any[]>> | undefined
): Record<K, Item[]> | Partial<Record<K, Item[]>> {
  const mapped: any = {};

  if (!costs) return mapped;

  for (const [key, items] of Object.entries(costs)) {
    if (!items || !Array.isArray(items)) continue;
    mapped[key] = items.map((it) => mapItem(it));
  }

  return mapped;
}

/**
 * Map genshin-db material category/type strings to internal `MaterialType` enum
 */
export function mapMaterialType(rawCategory?: string): MaterialType {
  if (!rawCategory) return MaterialType.GENERIC;

  const map: Record<string, MaterialType> = {
    'talent': MaterialType.TALENT,
    'weapon': MaterialType.WEAPON,
    'gemstone': MaterialType.GEMSTONE,
    'generic': MaterialType.GENERIC,
    'boss': MaterialType.BOSS,
    'local-specialty': MaterialType.LOCAL_SPECIALTY,
    'xp-and-mora': MaterialType.GENERIC,
  };

  return map[rawCategory] ?? MaterialType.GENERIC;
}
