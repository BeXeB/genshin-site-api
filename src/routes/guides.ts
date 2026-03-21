import { Router, Request, Response } from 'express';
import { Guide } from '../models';

const router = Router();

// GET /api/guides - Get all standalone guides (excluding character guides)
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const guides = await db.all(
      "SELECT slug, name, description, imageUrl, created_at FROM guides WHERE slug NOT LIKE 'characters/%' ORDER BY created_at DESC"
    );
    res.json(guides);
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// GET /api/guides/characters/:apiKey - Get character guide details with content
router.get('/characters/:apiKey', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { apiKey } = req.params;
    const slug = `characters/${apiKey}`;

    const guide = await db.get(
      'SELECT slug, name, description, imageUrl, content, created_at, updated_at FROM guides WHERE slug = ?',
      [slug]
    );

    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    res.json(guide);
  } catch (error) {
    console.error('Error fetching character guide:', error);
    res.status(500).json({ error: 'Failed to fetch character guide' });
  }
});

// GET /api/guides/:slug - Get guide details with content (standalone guides)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { slug } = req.params;

    const guide = await db.get(
      'SELECT slug, name, description, imageUrl, content, created_at, updated_at FROM guides WHERE slug = ?',
      [slug]
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
