import { Router, Request, Response } from 'express';
import { Weapon, WeaponResolved } from '../models';
import { resolveCostRecord } from '../utils/resolver';

const router = Router();

// GET /api/weapons - Get all weapons
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { type, rarity } = req.query;

    let query = `
      SELECT id, normalized_name, name, rarity, weapon_type, main_stat_type, base_atk_value
      FROM weapons
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push('weapon_type = ?');
      params.push(type);
    }
    if (rarity) {
      conditions.push('rarity = ?');
      params.push(parseInt(rarity as string));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const weapons = await db.all(query, params);
    
    // Return summary format
    const parsed = weapons.map((w: any) => ({
      id: w.id,
      name: w.name,
      normalizedName: w.normalized_name,
      rarity: w.rarity,
      weaponType: w.weapon_type,
      mainStatType: w.main_stat_type,
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching weapons:', error);
    res.status(500).json({ error: 'Failed to fetch weapons' });
  }
});

// GET /api/weapons/:id - Get weapon details (fully resolved)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    const weapon: any = await db.get(
      `SELECT weapon_data FROM weapons WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!weapon) {
      return res.status(404).json({ error: 'Weapon not found' });
    }

    const weaponData = JSON.parse(weapon.weapon_data) as Weapon;

    // Resolve costs if present
    const resolvedCosts: any = {};
    if (weaponData.costs) {
      for (const [key, items] of Object.entries(weaponData.costs)) {
        if (items) {
          resolvedCosts[key] = resolveCostRecord(
            { [key]: items } as any,
            materialsMap
          )[key];
        }
      }
    }

    const result: WeaponResolved = {
      ...weaponData,
      costs: resolvedCosts,
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching weapon:', error);
    res.status(500).json({ error: 'Failed to fetch weapon' });
  }
});

export default router;
