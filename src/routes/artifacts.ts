import { Router, Request, Response } from 'express';
import { Artifact } from '../models';

const router = Router();

// GET /api/artifacts - Get all artifacts
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { rarity } = req.query;

    let query = `
      SELECT id, normalized_name, name, rarity
      FROM artifacts
    `;
    const params: any[] = [];

    if (rarity) {
      query += ' WHERE rarity = ?';
      params.push(parseInt(rarity as string));
    }

    const artifacts = await db.all(query, params);
    
    const parsed = artifacts.map((a: any) => ({
      id: a.id,
      name: a.name,
      normalizedName: a.normalized_name,
      rarity: a.rarity,
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({ error: 'Failed to fetch artifacts' });
  }
});

// GET /api/artifacts/:id - Get artifact details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const artifact: any = await db.get(
      `SELECT artifact_data FROM artifacts WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const result: Artifact = JSON.parse(artifact.artifact_data);
    res.json(result);
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

export default router;
