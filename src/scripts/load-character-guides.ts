import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../db/init';
import dotenv from 'dotenv';

dotenv.config();

async function loadCharacterGuides() {
  const db = await initializeDatabase();

  // Calculate paths
  const backendRoot = path.resolve(__dirname, '../..');  // Backend root
  const parentDir = path.dirname(backendRoot);           // genshin site
  const frontendRoot = path.join(parentDir, 'genshin-site');
  const characterGuidesDir = path.resolve(frontendRoot, 'src/assets/guides/characters');

  try {
    console.log('📚 Loading character guides into database...\n');
    console.log(`Character guides dir: ${characterGuidesDir}\n`);

    if (!fs.existsSync(characterGuidesDir)) {
      console.warn(`⚠️  Character guides directory not found: ${characterGuidesDir}`);
      process.exit(0);
    }

    const files = fs.readdirSync(characterGuidesDir).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} character guide files\n`);

    if (files.length === 0) {
      console.log('⚠️  No markdown files found in character guides directory');
      process.exit(0);
    }

    for (const file of files) {
      const apiKey = file.replace('.json', '').replace('.md', '');
      const slug = `characters/${apiKey}`;
      const filePath = path.join(characterGuidesDir, file);

      console.log(`Loading guide: ${slug}`);
      console.log(`  File path: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  File not found!`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Look up character by apiKey to get its name
        const character = await db.get(
          'SELECT name FROM characters WHERE normalized_name = ?',
          [apiKey]
        );

        const characterName = character?.name || apiKey;

        // Check if guide already exists
        const existing = await db.get('SELECT slug FROM guides WHERE slug = ?', [slug]);

        if (existing) {
          // Update existing guide
          await db.run(
            `UPDATE guides 
             SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP
             WHERE slug = ?`,
            [characterName, content, slug]
          );
          console.log(`  ✓ Updated guide: ${slug}`);
        } else {
          // Insert new guide
          await db.run(
            `INSERT INTO guides (slug, name, description, content)
             VALUES (?, ?, ?, ?)`,
            [slug, characterName, '', content]
          );
          console.log(`  ✓ Created guide: ${slug}`);
        }
      } catch (error) {
        console.error(`  ✗ Error loading guide ${slug}:`, error);
      }
    }

    console.log('\n✅ Character guide loading complete!');
  } catch (error) {
    console.error('❌ Error loading character guides:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

loadCharacterGuides();
