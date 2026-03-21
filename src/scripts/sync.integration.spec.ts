import { Database } from 'sqlite';
import { syncCharacters } from '../scripts/sync-characters';
import { syncWeapons } from '../scripts/sync-weapons';
import { syncArtifacts } from '../scripts/sync-artifacts';
import { syncMaterials } from '../scripts/sync-materials';

describe('Data Sync Integration Tests', () => {
  let db: Database;

  beforeAll(async () => {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');

    // Create in-memory test database
    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    });

    // Initialize schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
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
      );

      CREATE TABLE IF NOT EXISTS weapons (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        rarity INTEGER,
        weapon_type TEXT,
        main_stat_type TEXT,
        base_atk_value REAL,
        stats_data JSON NOT NULL,
        weapon_data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        rarity INTEGER,
        artifact_data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT,
        rarity INTEGER,
        farmable INTEGER DEFAULT 0,
        material_data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clear tables between tests
    await db.run('DELETE FROM characters');
    await db.run('DELETE FROM weapons');
    await db.run('DELETE FROM artifacts');
    await db.run('DELETE FROM materials');
  });

  describe('syncCharacters', () => {
    it('should populate characters table on first run', async () => {
      const stats = await syncCharacters(db);

      expect(stats.inserted).toBeGreaterThan(0);
      expect(stats.skipped).toBe(0);

      const count = await db.get('SELECT COUNT(*) as count FROM characters');
      expect(count.count).toBeGreaterThan(0);
    });

    it('should skip existing records on second run', async () => {
      const stats1 = await syncCharacters(db);
      const initialCount = stats1.inserted;

      const stats2 = await syncCharacters(db);

      expect(stats2.inserted).toBe(0);
      expect(stats2.skipped).toBeGreaterThan(0);

      const count = await db.get('SELECT COUNT(*) as count FROM characters');
      expect(count.count).toBe(initialCount);
    });

    it('should preserve manually edited character data', async () => {
      const stats1 = await syncCharacters(db);
      expect(stats1.inserted).toBeGreaterThan(0);

      // Get the first character
      const firstChar = await db.get('SELECT * FROM characters LIMIT 1');

      // Manually edit it
      const originalName = firstChar.name;
      const editedName = 'MANUALLY EDITED';
      await db.run(
        'UPDATE characters SET name = ? WHERE id = ?',
        [editedName, firstChar.id]
      );

      // Run sync again
      const stats2 = await syncCharacters(db);

      // Verify the manually edited character was not overwritten
      const updatedChar = await db.get(
        'SELECT * FROM characters WHERE id = ?',
        [firstChar.id]
      );

      expect(updatedChar.name).toBe(editedName);
      expect(stats2.skipped).toBeGreaterThan(0);
    });

    it('should have all required fields in characters table', async () => {
      const stats = await syncCharacters(db);

      const character = await db.get('SELECT * FROM characters LIMIT 1');

      expect(character).toBeDefined();
      expect(character.normalized_name).toBeDefined();
      expect(character.name).toBeDefined();
      expect(character.profile_data).toBeDefined();
      expect(typeof character.profile_data).toBe('string');

      // Verify profile_data is valid JSON
      const profileData = JSON.parse(character.profile_data);
      expect(profileData).toBeDefined();
    });
  });

  describe('syncWeapons', () => {
    it('should populate weapons table', async () => {
      const stats = await syncWeapons(db);

      expect(stats.inserted).toBeGreaterThan(0);

      const count = await db.get('SELECT COUNT(*) as count FROM weapons');
      expect(count.count).toBeGreaterThan(0);
    });

    it('should not insert duplicate weapons', async () => {
      const stats1 = await syncWeapons(db);
      const initialCount = stats1.inserted;

      const stats2 = await syncWeapons(db);

      expect(stats2.inserted).toBe(0);

      const count = await db.get('SELECT COUNT(*) as count FROM weapons');
      expect(count.count).toBe(initialCount);
    });
  });

  describe('syncArtifacts', () => {
    it('should populate artifacts table', async () => {
      const stats = await syncArtifacts(db);

      expect(stats.inserted).toBeGreaterThan(0);

      const count = await db.get('SELECT COUNT(*) as count FROM artifacts');
      expect(count.count).toBeGreaterThan(0);
    });

    it('should not insert duplicate artifacts', async () => {
      const stats1 = await syncArtifacts(db);
      const initialCount = stats1.inserted;

      const stats2 = await syncArtifacts(db);

      expect(stats2.inserted).toBe(0);

      const count = await db.get('SELECT COUNT(*) as count FROM artifacts');
      expect(count.count).toBe(initialCount);
    });
  });

  describe('syncMaterials', () => {
    it('should populate materials table', async () => {
      const stats = await syncMaterials(db);

      expect(stats.inserted).toBeGreaterThan(0);

      const count = await db.get('SELECT COUNT(*) as count FROM materials');
      expect(count.count).toBeGreaterThan(0);
    });

    it('should not insert duplicate materials', async () => {
      const stats1 = await syncMaterials(db);
      const initialCount = stats1.inserted;

      const stats2 = await syncMaterials(db);

      expect(stats2.inserted).toBe(0);

      const count = await db.get('SELECT COUNT(*) as count FROM materials');
      expect(count.count).toBe(initialCount);
    });

    it('should categorize materials by type', async () => {
      const stats = await syncMaterials(db);

      const materials = await db.all('SELECT DISTINCT type FROM materials');

      const types = materials.map((m: any) => m.type);
      expect(types.length).toBeGreaterThan(0);
    });
  });
});
