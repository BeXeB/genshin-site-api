import { Router, Request, Response } from 'express';
import { Weapon, WeaponResolved } from '../models';
import { resolveCostRecord } from '../utils/resolver';

const router = Router();

// GET /api/weapons - Get all weapons
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { type, rarity } = req.query;

    const weapons = await db.all(
      `SELECT id, normalized_name, data FROM weapons ORDER BY normalized_name`
    );

    // Parse and filter
    let parsed = weapons
      .map((weap: any) => {
        try {
          return JSON.parse(weap.data) as Weapon;
        } catch (e: any) {
          return null;
        }
      })
      .filter((weap: any): weap is Weapon => weap !== null);

    if (type) {
      parsed = parsed.filter((weap: Weapon) => weap.weaponType === type);
    }
    if (rarity) {
      parsed = parsed.filter((weap: Weapon) => weap.rarity === parseInt(rarity as string));
    }

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching weapons:', error);
    res.status(500).json({ error: 'Failed to fetch weapons' });
  }
});

// GET /api/weapons/:id - Get weapon details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    const weapon: any = await db.get(
      `SELECT id, normalized_name, data FROM weapons WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!weapon) {
      return res.status(404).json({ error: 'Weapon not found' });
    }

    let weaponData: Weapon;
    try {
      weaponData = JSON.parse(weapon.data);
    } catch (e) {
      console.error(`Failed to parse weapon data:`, e);
      return res.status(500).json({ error: 'Invalid weapon data' });
    }

    // Resolve costs
    const resolved: WeaponResolved = {
      ...weaponData,
      costs: resolveCostRecord(weaponData.costs as any, materialsMap),
    };

    res.json(resolved);
  } catch (error) {
    console.error('Error fetching weapon:', error);
    res.status(500).json({ error: 'Failed to fetch weapon' });
  }
});

export default router;
