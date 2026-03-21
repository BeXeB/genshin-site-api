import { Database } from 'sqlite';
import genshindb from 'genshin-db';
import {
  normalizeGameName,
  insertIfMissing,
  logSyncResults,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from '../utils/data-sync';
import { mapCostRecord } from '../utils/data-sync';
import { Character, CharacterProfile, ElementType, StatType, WeaponType } from '../models';

interface SyncStats {
  inserted: number;
  skipped: number;
  errors: number;
  totalProcessed: number;
}

const queryLanguage = genshindb.Language.English;

/**
 * Sync characters from genshin-db to database
 * Uses insert-only mode to preserve manual corrections
 */
export async function syncCharacters(db: Database): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Get all character names from genshin-db
    const characterNames = genshindb.characters('names', {
      matchCategories: true,
    });

    if (!characterNames || characterNames.length === 0) {
      console.error('No characters found in genshin-db');
      return stats;
    }

    await beginTransaction(db);

    for (const characterName of characterNames) {
      stats.totalProcessed++;

      try {
        // Fetch full character data
        const fullCharacter = genshindb.characters(characterName, {
          queryLanguages: [queryLanguage],
        });

        if (!fullCharacter) {
          console.warn(`Could not fetch full data for character: ${characterName}`);
          stats.errors++;
          continue;
        }

        const normalizedName = normalizeGameName(fullCharacter.name);

        // Fetch talents separately
        let talents: any | null = null;
        try {
          talents = genshindb.talents(characterName, {
            queryLanguages: [queryLanguage],
          }) as any;
        } catch (e) {
          console.warn(`Could not fetch talents for ${characterName}`);
        }

        // Fetch constellations separately
        let constellations: any | null = null;
        try {
          constellations = genshindb.constellations(characterName, {
            queryLanguages: [queryLanguage],
          }) as any;
        } catch (e) {
          console.warn(`Could not fetch constellations for ${characterName}`);
        }

        // Build sanitized profile object and typed Character payload
        const profile: CharacterProfile = {
          id: fullCharacter.id,
          name: fullCharacter.name,
          normalizedName,
          title: fullCharacter.title,
          description: fullCharacter.description,
          weaponType: fullCharacter.weaponType as WeaponType,
          weaponText: fullCharacter.weaponText || '',
          qualityType: (fullCharacter.qualityType as any) || undefined,
          rarity: fullCharacter.rarity,
          birthdaymmdd: fullCharacter.birthdaymmdd,
          birthday: fullCharacter.birthday,
          elementType: fullCharacter.elementType as ElementType,
          elementText: fullCharacter.elementText || '',
          affiliation: fullCharacter.affiliation,
          region: fullCharacter.region,
          substatType: fullCharacter.substatType as StatType,
          substatText: fullCharacter.substatText || '',
          constellation: fullCharacter.constellation,
          costs: mapCostRecord(fullCharacter.costs) as any,
          images: {
            filename_icon: fullCharacter.images?.filename_icon,
            filename_iconCard: fullCharacter.images?.filename_iconCard,
            filename_sideIcon: fullCharacter.images?.filename_sideIcon,
            filename_gachaSplash: fullCharacter.images?.filename_gachaSplash,
            filename_gachaSlice: fullCharacter.images?.filename_gachaSlice,
          },
          version: fullCharacter.version,
          isTraveler: normalizedName.includes('traveler') || normalizedName.includes('aether') || normalizedName.includes('lumine'),
        };

        // Sanitize talents images if present
        const sanitizedTalents = talents
          ? {
              ...talents,
              images: talents.images
                ? {
                    filename_combat1: talents.images.filename_combat1,
                    filename_combat2: talents.images.filename_combat2,
                    filename_combat3: talents.images.filename_combat3,
                    filename_passive1: talents.images.filename_passive1,
                    filename_passive2: talents.images.filename_passive2,
                    filename_passive3: talents.images.filename_passive3,
                    filename_passive4: talents.images.filename_passive4,
                  }
                : undefined,
            }
          : null;

        // Sanitize constellation images if present
        const sanitizedConstellations = constellations
          ? {
              ...constellations,
              images: constellations.images
                ? {
                    filename_c1: constellations.images.filename_c1,
                    filename_c2: constellations.images.filename_c2,
                    filename_c3: constellations.images.filename_c3,
                    filename_c4: constellations.images.filename_c4,
                    filename_c5: constellations.images.filename_c5,
                    filename_c6: constellations.images.filename_c6,
                    filename_constellation: constellations.images.filename_constellation,
                  }
                : undefined,
            }
          : null;

        // Compute character stats across levels and ascensions (match update-characters.ts)
        const characterStats: Record<string, any> = {};
        // levels 1..90, plus 95 and 100
        const levels: number[] = Array.from({ length: 90 }, (_, i) => i + 1);
        levels.push(95);
        levels.push(100);
        const ascensionLevels: number[] = [20, 40, 50, 60, 70, 80];

        for (const level of levels) {
          try {
            const s = (fullCharacter as any).stats(level);
            characterStats[level] = {
              level: level,
              ascension: s.ascension,
              hp: s.hp,
              attack: s.attack,
              defense: s.defense,
              specialized: s.specialized,
            };
          } catch (e) {
            // ignore missing stats for some levels
          }
        }

        for (const ascLevel of ascensionLevels) {
          try {
            const s = (fullCharacter as any).stats(ascLevel, '+');
            characterStats[ascLevel + '+'] = {
              level: ascLevel,
              ascension: s.ascension,
              hp: s.hp,
              attack: s.attack,
              defense: s.defense,
              specialized: s.specialized,
            };
          } catch (e) {
            // ignore
          }
        }

        const characterPayload: Character = {
          profile,
          skills: sanitizedTalents || undefined,
          stats: characterStats,
          constellation: sanitizedConstellations || undefined,
        };

        // Insert using genshin-db id as the primary key
        const result = await insertIfMissing(
          db,
          'characters',
          normalizedName,
          ['id', 'normalized_name', 'data'],
          [fullCharacter.id, normalizedName, JSON.stringify(characterPayload)]
        );

        if (result.inserted) {
          stats.inserted++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(
          `Error syncing character ${characterName}: ${error}`
        );
        stats.errors++;
      }
    }

    await commitTransaction(db);
    logSyncResults('characters', stats.inserted, stats.skipped, stats.errors, stats.totalProcessed);

    return stats;
  } catch (error) {
    await rollbackTransaction(db);
    console.error(`Error in syncCharacters: ${error}`);
    throw error;
  }
}
