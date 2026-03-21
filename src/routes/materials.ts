import { Router, Request, Response } from 'express';
import { Material, MaterialResolved } from '../models';
import { resolveItems } from '../utils/resolver';

const router = Router();

// GET /api/materials - Get all materials
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { type } = req.query;

    let query = `
      SELECT id, normalized_name, name, type, rarity
      FROM materials
    `;
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    const materials = await db.all(query, params);
    
    const parsed = materials.map((m: any) => ({
      id: m.id,
      name: m.name,
      normalizedName: m.normalized_name,
      type: m.type,
      rarity: m.rarity,
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// GET /api/materials/:id - Get material details (fully resolved)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    const material: any = await db.get(
      `SELECT material_data FROM materials WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const materialData = JSON.parse(material.material_data) as Material;

    // Resolve craft recipe items if material is craftable
    let result: MaterialResolved = {
      ...materialData,
    } as MaterialResolved;

    if (materialData.craft) {
      result.craft = {
        cost: materialData.craft.cost,
        resultCount: materialData.craft.resultCount,
        recipe: resolveItems(materialData.craft.recipe, materialsMap),
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

export default router;
