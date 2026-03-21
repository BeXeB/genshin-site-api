#!/usr/bin/env ts-node
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function resetMaterials() {
  const dbPath = path.resolve('./data/genshin.db');

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  try {
    // Drop the materials table
    await db.exec('DROP TABLE IF EXISTS materials');
    console.log('✓ Materials table dropped');

    // Recreate the table with proper schema (matching init.ts)
    await db.exec(`
      CREATE TABLE materials (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        rarity INTEGER,
        farmable BOOLEAN,
        material_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_synced_at DATETIME
      )
    `);
    console.log('✓ Materials table recreated');

    await db.close();
    console.log('\n✅ Reset complete. Now run: npm run sync:materials');
  } catch (error) {
    console.error('❌ Error:', error);
    await db.close();
    process.exit(1);
  }
}

resetMaterials();
