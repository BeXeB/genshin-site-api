import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

export async function initializeDatabase(): Promise<Database> {
  const dbPath = process.env.DATABASE_URL || './data/genshin.db';
  const dbDir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Initialize schema if needed
  await createTables(db);

  return db;
}

async function createTables(db: Database): Promise<void> {
  // Characters table with extracted profile/skills/constellation fields
  await db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL,
      name TEXT NOT NULL,
      rarity INTEGER,
      element_type TEXT,
      weapon_type TEXT,
      region TEXT,
      affiliation TEXT,
      is_traveler INTEGER DEFAULT 0,
      profile_data JSON NOT NULL,
      skills_data JSON,
      stats_data JSON,
      constellation_data JSON,
      variants_data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Weapons table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weapons (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL,
      name TEXT NOT NULL,
      rarity INTEGER,
      weapon_type TEXT,
      main_stat_type TEXT,
      base_atk_value REAL,
      stats_data JSON NOT NULL,
      weapon_data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Artifacts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL,
      name TEXT NOT NULL,
      rarity INTEGER,
      artifact_data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Materials table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      rarity INTEGER,
      farmable TEXT,
      material_data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Guides table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guides (
      slug TEXT PRIMARY KEY,
      name TEXT,
      description TEXT NOT NULL,
      imageUrl TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Brief descriptions table (Hungarian translations of skill/constellation descriptions)
  // Supports both flat descriptions for regular characters and variant-specific descriptions for characters like Traveler
  await db.exec(`
    CREATE TABLE IF NOT EXISTS brief_descriptions (
      character_id INTEGER NOT NULL,
      element_type TEXT,
      combat1 TEXT,
      combat2 TEXT,
      combat3 TEXT,
      passive1 TEXT,
      passive2 TEXT,
      passive3 TEXT,
      passive4 TEXT,
      c1 TEXT,
      c2 TEXT,
      c3 TEXT,
      c4 TEXT,
      c5 TEXT,
      c6 TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (character_id, element_type),
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);
}

export async function loadDataFromJSON(db: Database): Promise<void> {
  const dataDir = path.join(__dirname, '../../..', 'genshin-site/src/assets/json');

  // Load characters
  const charactersFile = path.join(dataDir, 'characters.json');
  if (fs.existsSync(charactersFile)) {
    const charactersData = JSON.parse(fs.readFileSync(charactersFile, 'utf-8'));
    for (const char of Object.entries(charactersData)) {
      const [id, data] = char;
      await db.run(
        'INSERT OR REPLACE INTO characters (id, name, rarity, element, weapon_type, nation, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, (data as any).name || id, (data as any).rarity, (data as any).element, (data as any).weaponType, (data as any).nation, JSON.stringify(data)]
      );
    }
  }

  // Load weapons, artifacts, materials similarly...
}
