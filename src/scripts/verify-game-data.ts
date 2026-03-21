import fs from 'fs';
import path from 'path';
import { Database } from 'sqlite';

interface VerificationResult {
  charactersChecked: number;
  weaponsChecked: number;
  artifactsChecked: number;
  materialsChecked: number;
  missingFiles: Array<{
    type: string;
    item: string;
    missing: string[];
  }>;
  criticalErrors: boolean;
}

function safeParseJSON(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function checkFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Verify that all game data assets exist in Backend/public/images/
 */
export async function verifyGameData(
  db: Database,
  imagesDir: string
): Promise<VerificationResult> {
  const result: VerificationResult = {
    charactersChecked: 0,
    weaponsChecked: 0,
    artifactsChecked: 0,
    materialsChecked: 0,
    missingFiles: [],
    criticalErrors: false,
  };

  try {
    // ====================================
    // VERIFY CHARACTERS
    // ====================================
    const characters = await db.all('SELECT * FROM characters');

    for (const character of characters) {
      result.charactersChecked++;

      try {
        const profileData = safeParseJSON(character.profile_data);

        if (!profileData || !profileData.images) {
          continue;
        }

        const normalizedName = character.normalized_name;
        const charFolder = path.join(imagesDir, 'characters', normalizedName);
        const missingForCharacter: string[] = [];

        // Check character main images
        const charImages = [
          { key: 'filename_icon', name: 'icon.webp' },
          { key: 'filename_iconCard', name: 'card.webp' },
          { key: 'filename_sideIcon', name: 'side.webp' },
          { key: 'filename_gachaSplash', name: 'gacha-splash.webp' },
          { key: 'filename_gachaSlice', name: 'gacha-icon.webp' },
        ];

        for (const img of charImages) {
          if (profileData.images[img.key]) {
            const filePath = path.join(charFolder, img.name);
            if (!checkFileExists(filePath)) {
              missingForCharacter.push(img.name);
            }
          }
        }

        // Check skill images
        const skillsData = safeParseJSON(character.skills_data);
        if (skillsData?.talents) {
          const skillFolder = path.join(charFolder, 'skills');
          const skillImages = [
            { key: 'filename_combat1', name: 'combat1.webp' },
            { key: 'filename_combat2', name: 'combat2.webp' },
            { key: 'filename_combat3', name: 'combat3.webp' },
            { key: 'filename_passive1', name: 'passive1.webp' },
            { key: 'filename_passive2', name: 'passive2.webp' },
            { key: 'filename_passive3', name: 'passive3.webp' },
            { key: 'filename_passive4', name: 'passive4.webp' },
          ];

          for (const talent of ['combat1', 'combat2', 'combat3', 'passive1', 'passive2', 'passive3', 'passive4']) {
            const talentData = skillsData.talents[talent];
            if (talentData?.images) {
              for (const img of skillImages) {
                if (talentData.images[img.key]) {
                  const filePath = path.join(skillFolder, img.name);
                  if (!checkFileExists(filePath)) {
                    missingForCharacter.push(`skills/${img.name}`);
                  }
                }
              }
            }
          }
        }

        // Check constellation images
        const constellationData = safeParseJSON(character.constellation_data);
        if (constellationData?.constellations) {
          const constellationFolder = path.join(charFolder, 'constellation');
          const constImages = [
            { key: 'filename_c1', name: 'c1.webp' },
            { key: 'filename_c2', name: 'c2.webp' },
            { key: 'filename_c3', name: 'c3.webp' },
            { key: 'filename_c4', name: 'c4.webp' },
            { key: 'filename_c5', name: 'c5.webp' },
            { key: 'filename_c6', name: 'c6.webp' },
            { key: 'filename_constellation', name: 'constellation.webp' },
          ];

          for (const c of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
            const constData = constellationData.constellations[c];
            if (constData?.images) {
              for (const img of constImages) {
                if (constData.images[img.key]) {
                  const filePath = path.join(constellationFolder, img.name);
                  if (!checkFileExists(filePath)) {
                    missingForCharacter.push(`constellation/${img.name}`);
                  }
                }
              }
            }
          }
        }

        if (missingForCharacter.length > 0) {
          result.missingFiles.push({
            type: 'character',
            item: character.name,
            missing: missingForCharacter,
          });
          result.criticalErrors = true;
        }
      } catch (error) {
        console.error(`Error checking character ${character.name}: ${error}`);
      }
    }

    // ====================================
    // VERIFY WEAPONS
    // ====================================
    const weapons = await db.all('SELECT * FROM weapons');

    for (const weapon of weapons) {
      result.weaponsChecked++;

      try {
        const weaponData = safeParseJSON(weapon.weapon_data);

        if (!weaponData || !weaponData.images) {
          continue;
        }

        const normalizedName = weapon.normalized_name;
        const weaponFolder = path.join(imagesDir, 'weapons', normalizedName);
        const missingForWeapon: string[] = [];

        const weaponImages = [
          { key: 'filename_icon', name: 'icon.webp' },
          { key: 'filename_awakenIcon', name: 'awaken.webp' },
          { key: 'filename_gacha', name: 'gacha.webp' },
        ];

        for (const img of weaponImages) {
          if (weaponData.images[img.key]) {
            const filePath = path.join(weaponFolder, img.name);
            if (!checkFileExists(filePath)) {
              missingForWeapon.push(img.name);
            }
          }
        }

        if (missingForWeapon.length > 0) {
          result.missingFiles.push({
            type: 'weapon',
            item: weapon.name,
            missing: missingForWeapon,
          });
        }
      } catch (error) {
        console.error(`Error checking weapon ${weapon.name}: ${error}`);
      }
    }

    // ====================================
    // VERIFY ARTIFACTS
    // ====================================
    const artifacts = await db.all('SELECT * FROM artifacts');

    for (const artifact of artifacts) {
      result.artifactsChecked++;

      try {
        const artifactData = safeParseJSON(artifact.artifact_data);

        if (!artifactData || !artifactData.images) {
          continue;
        }

        const normalizedName = artifact.normalized_name;
        const artifactFolder = path.join(imagesDir, 'artifacts', normalizedName);
        const missingForArtifact: string[] = [];

        const artifactImages = [
          { key: 'filename_flower', name: 'flower.webp' },
          { key: 'filename_plume', name: 'plume.webp' },
          { key: 'filename_sands', name: 'sands.webp' },
          { key: 'filename_goblet', name: 'goblet.webp' },
          { key: 'filename_circlet', name: 'circlet.webp' },
        ];

        for (const img of artifactImages) {
          if (artifactData.images[img.key]) {
            const filePath = path.join(artifactFolder, img.name);
            if (!checkFileExists(filePath)) {
              missingForArtifact.push(img.name);
            }
          }
        }

        if (missingForArtifact.length > 0) {
          result.missingFiles.push({
            type: 'artifact',
            item: artifact.name,
            missing: missingForArtifact,
          });
        }
      } catch (error) {
        console.error(`Error checking artifact ${artifact.name}: ${error}`);
      }
    }

    // ====================================
    // VERIFY MATERIALS
    // ====================================
    const materials = await db.all('SELECT * FROM materials');

    for (const material of materials) {
      result.materialsChecked++;

      try {
        const materialData = safeParseJSON(material.material_data);

        if (!materialData || !materialData.images) {
          continue;
        }

        const normalizedName = material.normalized_name;
        const materialFolder = path.join(imagesDir, 'materials');
        const filePath = path.join(materialFolder, `${normalizedName}.webp`);

        if (!checkFileExists(filePath)) {
          result.missingFiles.push({
            type: 'material',
            item: material.name,
            missing: [`${normalizedName}.webp`],
          });
        }
      } catch (error) {
        console.error(`Error checking material ${material.name}: ${error}`);
      }
    }

    // ====================================
    // REPORT RESULTS
    // ====================================
    console.log('\n📊 Game Data Verification Report');
    console.log('━'.repeat(60));
    console.log(`Characters checked: ${result.charactersChecked}`);
    console.log(`Weapons checked: ${result.weaponsChecked}`);
    console.log(`Artifacts checked: ${result.artifactsChecked}`);
    console.log(`Materials checked: ${result.materialsChecked}`);

    if (result.missingFiles.length === 0) {
      console.log('\n✅ All required game assets found!');
    } else {
      console.log(`\n⚠️  Found ${result.missingFiles.length} items with missing assets:`);
      console.log('━'.repeat(60));

      for (const missing of result.missingFiles) {
        console.log(`\n${missing.type.toUpperCase()}: ${missing.item}`);
        for (const file of missing.missing) {
          console.log(`   ❌ ${file}`);
        }
      }

      if (result.criticalErrors) {
        console.log('\n⛔ CRITICAL: Character assets missing');
        console.log('Run: npm run sync:icons');
      }
    }

    return result;
  } catch (error) {
    console.error(`Error in verifyGameData: ${error}`);
    throw error;
  }
}
