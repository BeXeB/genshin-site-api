import fs from 'fs';
import path from 'path';
import { Database } from 'sqlite';

interface SyncStats {
  inserted: number;
  skipped: number;
  errors: number;
  totalProcessed: number;
}

// Image type mappings
const CHARACTER_IMAGE_MAP: Record<string, string> = {
  filename_icon: 'icon.webp',
  filename_iconCard: 'card.webp',
  filename_sideIcon: 'side.webp',
  filename_gachaSplash: 'gacha-splash.webp',
  filename_gachaSlice: 'gacha-icon.webp',
};

const WEAPON_IMAGE_MAP: Record<string, string> = {
  filename_icon: 'icon.webp',
  filename_awakenIcon: 'awaken.webp',
  filename_gacha: 'gacha.webp',
};

const SKILL_IMAGE_MAP: Record<string, string> = {
  filename_combat1: 'combat1.webp',
  filename_combat2: 'combat2.webp',
  filename_combat3: 'combat3.webp',
  filename_passive1: 'passive1.webp',
  filename_passive2: 'passive2.webp',
  filename_passive3: 'passive3.webp',
  filename_passive4: 'passive4.webp',
};

const CONSTELLATION_IMAGE_MAP: Record<string, string> = {
  filename_c1: 'c1.webp',
  filename_c2: 'c2.webp',
  filename_c3: 'c3.webp',
  filename_c4: 'c4.webp',
  filename_c5: 'c5.webp',
  filename_c6: 'c6.webp',
  filename_constellation: 'constellation.webp',
};

const ARTIFACT_IMAGE_MAP: Record<string, string> = {
  filename_flower: 'flower.webp',
  filename_plume: 'plume.webp',
  filename_sands: 'sands.webp',
  filename_goblet: 'goblet.webp',
  filename_circlet: 'circlet.webp',
};

const MATERIAL_IMAGE_MAP: Record<string, string> = {
  filename_icon: 'icon.webp',
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function addLookup(
  lookup: Record<string, string[]>,
  imageName: string,
  target: string
): void {
  if (!lookup[imageName]) {
    lookup[imageName] = [];
  }
  lookup[imageName].push(target);
}

/**
 * Parse JSON data safely and return null if parsing fails
 */
function safeParseJSON(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Organize icon files from raw source into backend asset structure
 * Uses database to find characters, weapons, artifacts, and materials
 */
export async function organizeIcons(
  db: Database,
  sourceDir: string,
  targetDir: string
): Promise<SyncStats> {
  const stats: SyncStats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    totalProcessed: 0,
  };

  const lookup: Record<string, string[]> = {};

  try {
    // ====================================
    // CHARACTER ICONS
    // ====================================
    const characters = await db.all('SELECT * FROM characters');

    for (const character of characters) {
      stats.totalProcessed++;

      try {
        const profileData = safeParseJSON(character.profile_data);

        if (!profileData || !profileData.images) {
          continue;
        }

        const normalizedName = character.normalized_name;
        const charFolder = path.join(targetDir, 'characters', normalizedName);
        ensureDir(charFolder);

        // Character main images
        for (const [jsonKey, filename] of Object.entries(profileData.images)) {
          if (CHARACTER_IMAGE_MAP[jsonKey] && filename) {
            addLookup(
              lookup,
              filename as string,
              path.join(charFolder, CHARACTER_IMAGE_MAP[jsonKey])
            );
          }
        }

        // Skill images
        const skillsData = safeParseJSON(character.skills_data);
        if (skillsData?.talents) {
          const skillFolder = path.join(charFolder, 'skills');
          ensureDir(skillFolder);

          if (skillsData.talents.combat1?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.combat1.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
          if (skillsData.talents.combat2?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.combat2.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
          if (skillsData.talents.combat3?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.combat3.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
          if (skillsData.talents.passive1?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.passive1.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
          if (skillsData.talents.passive2?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.passive2.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
          if (skillsData.talents.passive3?.images) {
            for (const [jsonKey, filename] of Object.entries(
              skillsData.talents.passive3.images
            )) {
              if (SKILL_IMAGE_MAP[jsonKey] && filename) {
                addLookup(
                  lookup,
                  filename as string,
                  path.join(skillFolder, SKILL_IMAGE_MAP[jsonKey])
                );
              }
            }
          }
        }

        // Constellation images
        const constellationData = safeParseJSON(character.constellation_data);
        if (constellationData?.constellations) {
          const constellationFolder = path.join(charFolder, 'constellation');
          ensureDir(constellationFolder);

          const consts = constellationData.constellations;
          for (const c of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
            const constData = consts[c];
            if (constData?.images) {
              for (const [jsonKey, filename] of Object.entries(
                constData.images
              )) {
                if (CONSTELLATION_IMAGE_MAP[jsonKey] && filename) {
                  addLookup(
                    lookup,
                    filename as string,
                    path.join(constellationFolder, CONSTELLATION_IMAGE_MAP[jsonKey])
                  );
                }
              }
            }
          }
        }

        stats.inserted++;
      } catch (error) {
        console.error(
          `Error processing character ${character.name}: ${error}`
        );
        stats.errors++;
      }
    }

    // ====================================
    // WEAPON ICONS
    // ====================================
    const weapons = await db.all('SELECT * FROM weapons');

    for (const weapon of weapons) {
      stats.totalProcessed++;

      try {
        const weaponData = safeParseJSON(weapon.weapon_data);

        if (!weaponData || !weaponData.images) {
          continue;
        }

        const normalizedName = weapon.normalized_name;
        const weaponFolder = path.join(targetDir, 'weapons', normalizedName);
        ensureDir(weaponFolder);

        for (const [jsonKey, filename] of Object.entries(weaponData.images)) {
          if (WEAPON_IMAGE_MAP[jsonKey] && filename) {
            addLookup(
              lookup,
              filename as string,
              path.join(weaponFolder, WEAPON_IMAGE_MAP[jsonKey])
            );
          }
        }

        stats.inserted++;
      } catch (error) {
        console.error(`Error processing weapon ${weapon.name}: ${error}`);
        stats.errors++;
      }
    }

    // ====================================
    // ARTIFACT ICONS
    // ====================================
    const artifacts = await db.all('SELECT * FROM artifacts');

    for (const artifact of artifacts) {
      stats.totalProcessed++;

      try {
        const artifactData = safeParseJSON(artifact.artifact_data);

        if (!artifactData || !artifactData.images) {
          continue;
        }

        const normalizedName = artifact.normalized_name;
        const artifactFolder = path.join(targetDir, 'artifacts', normalizedName);
        ensureDir(artifactFolder);

        for (const [jsonKey, filename] of Object.entries(artifactData.images)) {
          if (ARTIFACT_IMAGE_MAP[jsonKey] && filename) {
            addLookup(
              lookup,
              filename as string,
              path.join(artifactFolder, ARTIFACT_IMAGE_MAP[jsonKey])
            );
          }
        }

        stats.inserted++;
      } catch (error) {
        console.error(
          `Error processing artifact ${artifact.name}: ${error}`
        );
        stats.errors++;
      }
    }

    // ====================================
    // MATERIAL ICONS
    // ====================================
    const materials = await db.all('SELECT * FROM materials');

    for (const material of materials) {
      stats.totalProcessed++;

      try {
        const materialData = safeParseJSON(material.material_data);

        if (!materialData || !materialData.images) {
          continue;
        }

        const normalizedName = material.normalized_name;
        const materialFolder = path.join(targetDir, 'materials');
        ensureDir(materialFolder);

        for (const [jsonKey, filename] of Object.entries(materialData.images)) {
          if (MATERIAL_IMAGE_MAP[jsonKey] && filename) {
            addLookup(
              lookup,
              filename as string,
              path.join(materialFolder, `${normalizedName}.webp`)
            );
          }
        }

        stats.inserted++;
      } catch (error) {
        console.error(
          `Error processing material ${material.name}: ${error}`
        );
        stats.errors++;
      }
    }

    // ====================================
    // COPY FILES
    // ====================================
    if (!fs.existsSync(sourceDir)) {
      console.error(`Source directory not found: ${sourceDir}`);
      return stats;
    }

    const files = fs.readdirSync(sourceDir);
    let copiedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.webp')) {
        continue;
      }

      const nameWithoutExt = path.parse(file).name;
      const destinations = lookup[nameWithoutExt];

      if (destinations && destinations.length > 0) {
        const srcPath = path.join(sourceDir, file);

        for (const destination of destinations) {
          try {
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(srcPath, destination);
            console.log(`Copied ${file} → ${destination}`);
            copiedCount++;
          } catch (error) {
            console.error(
              `Error copying ${file} to ${destination}: ${error}`
            );
            stats.errors++;
          }
        }
      } else {
        console.log(`Skipping ${file} (not referenced in database)`);
        skippedCount++;
      }
    }

    console.log(
      `\n✅ Icon organization complete. Copied: ${copiedCount}, Skipped: ${skippedCount}`
    );

    return stats;
  } catch (error) {
    console.error(`Error in organizeIcons: ${error}`);
    throw error;
  }
}
