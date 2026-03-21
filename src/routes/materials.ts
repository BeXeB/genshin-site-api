import { Router, Request, Response } from 'express';
import { Material, MaterialResolved, MaterialCraft } from '../models';
import { ResolvedItem } from '../models/items';
import { resolveCostRecord } from '../utils/resolver';

const router = Router();

// GET /api/materials - Get all materials
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { type, rarity } = req.query;

    const materials = await db.all(
      `SELECT id, normalized_name, data FROM materials ORDER BY normalized_name`
    );

    // Parse and filter
    let parsed = materials
      .map((mat: any) => {
        try {
          return JSON.parse(mat.data) as Material;
        } catch (e: any) {
          return null;
        }
      })
      .filter((mat: any): mat is Material => mat !== null);

    if (type) {
      parsed = parsed.filter((mat: Material) => mat.type === type);
    }
    if (rarity) {
      parsed = parsed.filter((mat: Material) => mat.rarity === parseInt(rarity as string));
    }


    res.json(parsed);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// GET /api/materials/:id - Get material details with craft data
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    const material: any = await db.get(
      `SELECT id, normalized_name, data FROM materials WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    let materialData: Material;
    try {
      materialData = JSON.parse(material.data);
    } catch (e) {
      console.error(`Failed to parse material data:`, e);
      return res.status(500).json({ error: 'Invalid material data' });
    }

    // Try to find craft data if available
    const craftRow: any = await db.get(
      `SELECT data FROM material_craft WHERE material_id = ?`,
      [materialData.id]
    );

    const resolved: MaterialResolved = {
      ...materialData,
      craftable: !!craftRow,
    };

    if (craftRow) {
      try {
        const craftData = JSON.parse(craftRow.data) as MaterialCraft;
        // Convert recipe array to map format for resolver
        const recipeMap = craftData.recipe.reduce((map: Record<string, any[]>, item: any) => {
          map[String(item.id)] = [item];
          return map;
        }, {});
        const recipeValues = Object.values(resolveCostRecord(recipeMap, materialsMap));
        const resolvedRecipeItems = recipeValues.flat().filter((item: any): item is ResolvedItem => !!item);
        resolved.craft = {
          recipe: resolvedRecipeItems,
          moraCost: craftData.moraCost,
          resultCount: craftData.resultCount,
        };
      } catch (e: any) {
        console.error(`Failed to parse craft data for material ${materialData.id}:`, e);
      }
    }

    res.json(resolved);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

export default router;
