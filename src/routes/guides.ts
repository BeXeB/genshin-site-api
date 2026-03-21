import { Router, Request, Response } from 'express';
import { Guide } from '../models';

const router = Router();

// GET /api/guides - Get all guides
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const guides = await db.all(
      'SELECT id, title, author, description, created_at FROM guides ORDER BY created_at DESC'
    );
    res.json(guides);
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// GET /api/guides/:id - Get guide details with content
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const guide = await db.get(
      'SELECT id, title, author, description, content, created_at, updated_at FROM guides WHERE id = ?',
      [id]
    );

    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    res.json(guide);
  } catch (error) {
    console.error('Error fetching guide:', error);
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

export default router;
