import { Database } from 'sqlite';

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
