import fs from 'fs';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { initializeDatabase } from '../db/init';

dotenv.config();

interface GuideMetadata {
  slug: string;
  name?: string;
  description: string;
  imageUrl?: string;
  filePath: string;
}

// Guide metadata - maps frontend paths to database entries
// Only includes standalone guides, not character guides (character guides are loaded from character details)
const GUIDES_METADATA: GuideMetadata[] = [
  {
    slug: 'test',
    name: 'asd',
    description: 'asd',
    imageUrl: 'Anemo',
    filePath: 'test.md',
  },
];

async function loadGuides() {
  // Initialize database with correct schema
  const db = await initializeDatabase();

  // Backend is at: F:\Repos\genshin site\genshin-site-api
  // Frontend is at: F:\Repos\genshin site\genshin-site
  // So we go up one level to "genshin site", then into "genshin-site"
  const backendRoot = path.resolve(__dirname, '../..');  // F:\Repos\genshin site\genshin-site-api
  const parentDir = path.dirname(backendRoot);              // F:\Repos\genshin site
  const frontendRoot = path.join(parentDir, 'genshin-site'); // F:\Repos\genshin site\genshin-site

  try {
    console.log('📚 Loading guides into database...\n');
    console.log(`Backend root: ${backendRoot}`);
    console.log(`Parent dir: ${parentDir}`);
    console.log(`Frontend root: ${frontendRoot}\n`);

    for (const guide of GUIDES_METADATA) {
      const filePath = path.resolve(frontendRoot, 'src/assets/guides', guide.filePath);

      console.log(`Loading guide: ${guide.slug}`);
      console.log(`  File path: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  File not found!`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      try {
        // Check if guide already exists
        const existing = await db.get('SELECT slug FROM guides WHERE slug = ?', [guide.slug]);

        if (existing) {
          // Update existing guide
          await db.run(
            `UPDATE guides 
             SET name = ?, description = ?, imageUrl = ?, content = ?, updated_at = CURRENT_TIMESTAMP
             WHERE slug = ?`,
            [
              guide.name || null,
              guide.description,
              guide.imageUrl || null,
              content,
              guide.slug,
            ]
          );
          console.log(`  ✓ Updated guide: ${guide.slug}`);
        } else {
          // Insert new guide
          await db.run(
            `INSERT INTO guides (slug, name, description, imageUrl, content)
             VALUES (?, ?, ?, ?, ?)`,
            [
              guide.slug,
              guide.name || null,
              guide.description,
              guide.imageUrl || null,
              content,
            ]
          );
          console.log(`  ✓ Created guide: ${guide.slug}`);
        }
      } catch (error) {
        console.error(`  ✗ Error loading guide ${guide.slug}:`, error);
      }
    }

    console.log('\n✅ Guide loading complete!');
  } catch (error) {
    console.error('❌ Error loading guides:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the script
loadGuides();
