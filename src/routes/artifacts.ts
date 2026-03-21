import { Router, Request, Response } from 'express';
import { ArtifactSet } from '../models';

const router = Router();

// GET /api/artifacts - Get all artifacts
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;

    const artifacts = await db.all(
      `SELECT id, normalized_name, data FROM artifacts ORDER BY normalized_name`
    );

    const parsed = artifacts
      .map((art: any) => {
        try {
          return JSON.parse(art.data) as ArtifactSet;
        } catch (e: any) {
          return null;
        }
      })
      .filter((art: any): art is ArtifactSet => art !== null);

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
      `SELECT id, normalized_name, data FROM artifacts WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    let artifactData: ArtifactSet;
    try {
      artifactData = JSON.parse(artifact.data);
    } catch (e) {
      console.error(`Failed to parse artifact data:`, e);
      return res.status(500).json({ error: 'Invalid artifact data' });
    }

    res.json(artifactData);
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

export default router;
