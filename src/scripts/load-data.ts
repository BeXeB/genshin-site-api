import fs from 'fs';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { Character } from '../models';

dotenv.config();

async function createTables(db: any) {
  try {
    console.log('📋 Creating database tables...');
    
    // Create each table with explicit error handling
    await db.exec(`
      CREATE TABLE characters (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Characters table created');

    await db.exec(`
      CREATE TABLE weapons (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Weapons table created');

    await db.exec(`
      CREATE TABLE artifacts (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Artifacts table created');

    await db.exec(`
      CREATE TABLE materials (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Materials table created');

    await db.exec(`
      CREATE TABLE material_craft (
        id INTEGER PRIMARY KEY,
        material_id INTEGER NOT NULL UNIQUE,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✓ Material craft table created');

    await db.exec(`
      CREATE TABLE guides (
        slug TEXT PRIMARY KEY,
        name TEXT,
        description TEXT NOT NULL,
        imageUrl TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Guides table created');

    await db.exec(`
      CREATE TABLE brief_descriptions (
        character_id INTEGER NOT NULL,
        element_type TEXT,
        data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, element_type),
        FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✓ Brief descriptions table created');
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
}

async function loadDataFromJSON() {
  const dbPath = process.env.DATABASE_URL || './data/genshin.db';
  const dbDir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Delete existing database file for fresh schema
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log('🗑️  Removed old database file');
    } catch (err) {
      console.log('⚠️  Could not delete database (may be in use). Continuing with existing database...');
    }
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  console.log('📚 Loading data from JSON files...');
  
  // Create tables in the data loader (bypass the init.ts)
  await createTables(db);

  // Go up from dist/scripts/load-data.js -> dist/scripts -> dist -> . -> src/assets/json
  const sourceJsonDir = path.join(__dirname, '../../..', 'genshin-site/src/assets/json');
  console.log(`📂 Looking for data in: ${sourceJsonDir}`);
  console.log(`   Exists: ${fs.existsSync(sourceJsonDir)}`);

  try {
    // Load characters from individual files
    const charactersDir = path.join(sourceJsonDir, 'characters');
    if (fs.existsSync(charactersDir)) {
      console.log('👤 Loading characters...');
      const files = fs.readdirSync(charactersDir).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'profiles.json');
      let count = 0;
      for (const file of files) {
        try {
          const characterData: Character = JSON.parse(fs.readFileSync(path.join(charactersDir, file), 'utf-8'));
          const id = characterData.profile.id;
          const normalizedName = characterData.profile.normalizedName || file.replace('.json', '');
          
          await db.run(
            `INSERT OR REPLACE INTO characters 
            (id, normalized_name, data) 
            VALUES (?, ?, ?)`,
            [
              id,
              normalizedName,
              JSON.stringify(characterData),
            ]
          );
          count++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to load ${file}:`, (err as any).message);
        }
      }
      console.log(`   ✓ Loaded ${count} characters`);
    } else {
      console.log(`   ⚠️  Characters directory not found: ${charactersDir}`);
    }

    // Load weapons from individual files
    const weaponsDir = path.join(sourceJsonDir, 'weapons');
    if (fs.existsSync(weaponsDir)) {
      console.log('🗡️  Loading weapons...');
      const files = fs.readdirSync(weaponsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
      let count = 0;
      for (const file of files) {
        try {
          const weaponData = JSON.parse(fs.readFileSync(path.join(weaponsDir, file), 'utf-8'));
          const id = weaponData.id || file.replace('.json', '');
          const normalizedName = weaponData.normalizedName || file.replace('.json', '');
          
          await db.run(
            `INSERT OR REPLACE INTO weapons 
            (id, normalized_name, data) 
            VALUES (?, ?, ?)`,
            [
              id,
              normalizedName,
              JSON.stringify(weaponData),
            ]
          );
          count++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to load ${file}:`, (err as any).message);
        }
      }
      console.log(`   ✓ Loaded ${count} weapons`);
    } else {
      console.log(`   ⚠️  Weapons directory not found: ${weaponsDir}`);
    }

    // Load artifacts from individual files
    const artifactsDir = path.join(sourceJsonDir, 'artifacts');
    if (fs.existsSync(artifactsDir)) {
      console.log('🏺 Loading artifacts...');
      const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
      let count = 0;
      for (const file of files) {
        try {
          const artifactData = JSON.parse(fs.readFileSync(path.join(artifactsDir, file), 'utf-8'));
          const id = artifactData.id;
          const normalizedName = artifactData.normalizedName || file.replace('.json', '');
          
          await db.run(
            `INSERT OR REPLACE INTO artifacts 
            (id, normalized_name, data) 
            VALUES (?, ?, ?)`,
            [
              id,
              normalizedName,
              JSON.stringify(artifactData),
            ]
          );
          count++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to load ${file}:`, (err as any).message);
        }
      }
      console.log(`   ✓ Loaded ${count} artifacts`);
    } else {
      console.log(`   ⚠️  Artifacts directory not found: ${artifactsDir}`);
    }

    // Load materials from subdirectories
    const materialsDir = path.join(sourceJsonDir, 'materials');
    if (fs.existsSync(materialsDir)) {
      console.log('⚙️  Loading materials...');
      let count = 0;
      
      // Get all subdirectories in materials
      const subdirs = fs.readdirSync(materialsDir).filter(f => {
        const fullPath = path.join(materialsDir, f);
        return fs.statSync(fullPath).isDirectory();
      });
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(materialsDir, subdir);
        const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json') && f !== 'index.json');
        console.log(`   📂 Loading ${subdir} (${files.length} files)...`);
        
        for (const file of files) {
          try {
            const fileContent = fs.readFileSync(path.join(subdirPath, file), 'utf-8');
            const fileData = JSON.parse(fileContent);
            
            // Handle both array and object formats
            const materialsArray = Array.isArray(fileData) ? fileData : [fileData];
            
            for (const materialData of materialsArray) {
              const id = materialData.id;
              const normalizedName = materialData.normalizedName || file.replace('.json', '');
              
              await db.run(
                `INSERT OR REPLACE INTO materials 
                (id, normalized_name, data) 
                VALUES (?, ?, ?)`,
                [
                  id,
                  normalizedName,
                  JSON.stringify(materialData),
                ]
              );
              count++;
            }
          } catch (err) {
            console.warn(`   ⚠️  Failed to load ${subdir}/${file}:`, (err as any).message);
          }
        }
      }
      console.log(`   ✓ Loaded ${count} materials`);
    } else {
      console.log(`   ⚠️  Materials directory not found: ${materialsDir}`);
    }

    // Load brief descriptions (Hungarian translations)
    const briefDescDir = path.join(sourceJsonDir, 'briefdescription');
    if (fs.existsSync(briefDescDir)) {
      console.log('📝 Loading brief descriptions...');
      const files = fs.readdirSync(briefDescDir).filter(f => f.endsWith('.json'));
      let count = 0;
      for (const file of files) {
        try {
          const briefData = JSON.parse(fs.readFileSync(path.join(briefDescDir, file), 'utf-8'));
          const characterName = file.replace('.json', '');
          
          // Find character ID by normalized name
          const char: any = await db.get(
            'SELECT id FROM characters WHERE normalized_name = ?',
            [characterName]
          );
          
          if (char) {
            // Check if brief descriptions are grouped by element type (variant-specific)
            const isVariantGrouped = Object.keys(briefData).some(key => key.startsWith('ELEMENT_'));
            
            if (isVariantGrouped) {
              // Load variant-specific brief descriptions
              for (const [elementType, briefContent] of Object.entries(briefData)) {
                await db.run(
                  `INSERT OR REPLACE INTO brief_descriptions 
                  (character_id, element_type, data) 
                  VALUES (?, ?, ?)`,
                  [
                    char.id,
                    elementType,
                    JSON.stringify(briefContent),
                  ]
                );
                count++;
              }
            } else {
              // Load flat brief descriptions
              await db.run(
                `INSERT OR REPLACE INTO brief_descriptions 
                (character_id, element_type, data) 
                VALUES (?, ?, ?)`,
                [
                  char.id,
                  null,
                  JSON.stringify(briefData),
                ]
              );
              count++;
            }
          } else {
            console.warn(`   ⚠️  Character not found for brief description: ${characterName}`);
          }
        } catch (err) {
          console.warn(`   ⚠️  Failed to load ${file}:`, (err as any).message);
        }
      }
      console.log(`   ✓ Loaded ${count} brief descriptions`);
    } else {
      console.log(`   ⚠️  Brief descriptions directory not found: ${briefDescDir}`);
    }

    console.log('\n✅ Data loading complete!');
  } catch (error) {
    console.error('❌ Error loading data:', error);
  } finally {
    await db.close();
  }
}

loadDataFromJSON().catch(console.error);
