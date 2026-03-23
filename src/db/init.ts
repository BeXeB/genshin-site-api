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
  // Simplified schema: ID + normalized_name + complete JSON data

  // Characters table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Weapons table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weapons (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Artifacts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Materials table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY,
      normalized_name TEXT NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Material craft recipes table
  // Use material_id as the primary key so each material has at most one craft entry
  await db.exec(`
    CREATE TABLE IF NOT EXISTS material_craft (
      material_id INTEGER PRIMARY KEY,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `);

  // Guides table (storing paths instead of content)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guides (
      slug TEXT PRIMARY KEY,
      name TEXT,
      description TEXT NOT NULL,
      imageUrl TEXT,
      contentPath TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Brief descriptions table (unchanged - different purpose)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS brief_descriptions (
      character_id INTEGER NOT NULL,
      element_type TEXT,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (character_id, element_type),
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);
}
