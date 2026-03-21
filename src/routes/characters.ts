import { Router, Request, Response } from 'express';
import { Character, CharacterResolved } from '../models';
import { resolveCostRecord } from '../utils/resolver';

const router = Router();

// GET /api/characters - Get all characters or search
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { element, weapon, rarity } = req.query;

    let query = `
      SELECT 
        id, normalized_name, name, rarity, element_type, weapon_type, region, affiliation,
        profile_data
      FROM characters
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (element) {
      conditions.push('element_type = ?');
      params.push(element);
    }
    if (weapon) {
      conditions.push('weapon_type = ?');
      params.push(weapon);
    }
    if (rarity) {
      conditions.push('rarity = ?');
      params.push(parseInt(rarity as string));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const characters = await db.all(query, params);
    
    // Parse profile_data and return full CharacterProfile objects
    const parsed = characters.map((char: any) => {
      const profile = JSON.parse(char.profile_data);
      return profile;
    });

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// GET /api/characters/:id - Get character details (fully resolved)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    const character: any = await db.get(
      `SELECT 
        id, normalized_name, name, profile_data, skills_data, stats_data, constellation_data, variants_data
      FROM characters 
      WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Parse JSON fields
    const profile = JSON.parse(character.profile_data);
    const skills = character.skills_data ? JSON.parse(character.skills_data) : undefined;
    const stats = JSON.parse(character.stats_data);
    const constellation = character.constellation_data ? JSON.parse(character.constellation_data) : undefined;
    let variants = character.variants_data ? JSON.parse(character.variants_data) : undefined;

    // Resolve costs for profile
    const resolvedProfile = {
      ...profile,
      costs: resolveCostRecord(profile.costs, materialsMap),
    };

    // Resolve costs for skills
    let resolvedSkills = undefined;
    if (skills) {
      resolvedSkills = {
        ...skills,
        costs: resolveCostRecord(skills.costs, materialsMap),
      };
    }

    // Resolve costs for variants
    let resolvedVariants = undefined;
    if (variants) {
      resolvedVariants = {} as any;
      for (const [elementType, variant] of Object.entries(variants)) {
        const variantData = variant as any;
        resolvedVariants[elementType] = {
          ...variantData,
          skills: {
            ...variantData.skills,
            costs: resolveCostRecord(variantData.skills.costs, materialsMap),
          },
          constellation: variantData.constellation,
        };
      }
    }

    // Load brief descriptions if available
    // For characters with variants, brief descriptions are stored per-element
    // For regular characters, they're stored with element_type = NULL
    let briefDescriptions: any = undefined;
    
    if (variants) {
      // Character has variants - load variant-specific brief descriptions
      const variantBriefs: any = await db.all(
        `SELECT element_type, combat1, combat2, combat3, passive1, passive2, passive3, passive4, c1, c2, c3, c4, c5, c6 
         FROM brief_descriptions 
         WHERE character_id = ? AND element_type IS NOT NULL`,
        [character.id]
      );
      
      if (variantBriefs && variantBriefs.length > 0) {
        briefDescriptions = {};
        for (const brief of variantBriefs) {
          const elementType = brief.element_type;
          briefDescriptions[elementType] = {
            combat1: brief.combat1,
            combat2: brief.combat2,
            combat3: brief.combat3,
            passive1: brief.passive1,
            passive2: brief.passive2,
            passive3: brief.passive3,
            passive4: brief.passive4,
            c1: brief.c1,
            c2: brief.c2,
            c3: brief.c3,
            c4: brief.c4,
            c5: brief.c5,
            c6: brief.c6,
          };
        }
      }
    } else {
      // Regular character - load flat brief descriptions
      const brief: any = await db.get(
        `SELECT combat1, combat2, combat3, passive1, passive2, passive3, passive4, c1, c2, c3, c4, c5, c6 
         FROM brief_descriptions 
         WHERE character_id = ? AND element_type IS NULL`,
        [character.id]
      );
      
      if (brief) {
        briefDescriptions = {
          combat1: brief.combat1,
          combat2: brief.combat2,
          combat3: brief.combat3,
          passive1: brief.passive1,
          passive2: brief.passive2,
          passive3: brief.passive3,
          passive4: brief.passive4,
          c1: brief.c1,
          c2: brief.c2,
          c3: brief.c3,
          c4: brief.c4,
          c5: brief.c5,
          c6: brief.c6,
        };
      }
    }

    const result: CharacterResolved = {
      profile: resolvedProfile,
      skills: resolvedSkills,
      stats,
      constellation,
      variants: resolvedVariants,
    };

    // Add brief descriptions if they exist
    if (briefDescriptions) {
      (result as any).brief = briefDescriptions;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

export default router;
