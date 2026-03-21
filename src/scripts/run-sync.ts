#!/usr/bin/env ts-node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from '../db/init';
import { syncCharacters } from './sync-characters';
import { syncWeapons } from './sync-weapons';
import { syncArtifacts } from './sync-artifacts';
import { syncMaterials } from './sync-materials';
import { organizeIcons } from './organize-icons';
import { verifyGameData } from './verify-game-data';

const program = new Command();

program
  .name('sync')
  .description('Genshin Site data sync and asset organization tool')
  .version('1.0.0')
  .option(
    '--type <types>',
    'Comma-separated or single type: characters, artifacts, materials, weapons, icons, verify, all',
    'all'
  )
  .option(
    '--force',
    'Force operations (not recommended, may overwrite existing data)',
    false
  )
  .parse(process.argv);

const options = program.opts();

async function main() {
  let syncTypes = options.type.split(',').map((t: string) => t.trim());

  if (syncTypes.includes('all')) {
    syncTypes = ['characters', 'artifacts', 'materials', 'weapons', 'icons'];
  }

  console.log('🚀 Starting Genshin data sync...');
  console.log(`Types to sync: ${syncTypes.join(', ')}`);
  if (options.force) {
    console.log('⚠️  FORCE MODE ENABLED');
  }
  console.log('');

  let db: any;

  try {
    // Initialize database
    db = await initializeDatabase();
    console.log('✓ Database connected\n');

    const startTime = Date.now();
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Run sync commands
    for (const syncType of syncTypes) {
      const typeStartTime = Date.now();

      try {
        console.log(`\n📦 Syncing ${syncType}...`);

        let stats: any;

        switch (syncType) {
          case 'characters':
            stats = await syncCharacters(db);
            break;

          case 'weapons':
            stats = await syncWeapons(db);
            break;

          case 'artifacts':
            stats = await syncArtifacts(db);
            break;

          case 'materials':
            stats = await syncMaterials(db);
            break;

          case 'icons':
            {
              // Organize icons from backend `raw_icons` to backend/public/images
                const sourceDir = path.resolve(__dirname, '../../raw-icons');
                const targetDir = path.resolve(__dirname, '../../public/images');

                if (!fs.existsSync(sourceDir)) {
                  console.error(`❌ Source directory not found: ${sourceDir}`);
                  console.log('   Ensure backend/raw_icons/ exists and is populated');
                  continue;
                }

                stats = await organizeIcons(db, sourceDir, targetDir);
            }
            break;

          case 'verify':
            {
              const imagesDir = path.resolve(
                __dirname,
                '../../public/images'
              );

              const result = await verifyGameData(db, imagesDir);

              // Set stats properties for consistent reporting
              stats = {
                inserted: result.charactersChecked,
                skipped: 0,
                errors: result.missingFiles.length,
                totalProcessed: result.charactersChecked + result.weaponsChecked + result.artifactsChecked + result.materialsChecked,
              };
            }
            break;

          default:
            console.error(`❌ Unknown sync type: ${syncType}`);
            continue;
        }

        if (stats) {
          totalInserted += stats.inserted || 0;
          totalSkipped += stats.skipped || 0;
          totalErrors += stats.errors || 0;

          const duration = ((Date.now() - typeStartTime) / 1000).toFixed(2);
          console.log(
            `✓ ${syncType} complete (${duration}s)`
          );
        }
      } catch (error) {
        console.error(`❌ Error syncing ${syncType}: ${error}`);
        totalErrors++;
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Duration: ${totalDuration}s`);
    console.log('═'.repeat(60));

    if (totalErrors === 0) {
      console.log('\n✅ Sync completed successfully!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Sync completed with ${totalErrors} error(s)`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

main().catch((error) => {
  console.error('Uncaught error:', error);
  process.exit(1);
});
