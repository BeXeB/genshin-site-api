import { Router, Request, Response } from 'express';

const router = Router();

// Admin middleware to check local network access (optional - currently allows all)
const adminMiddleware = (req: Request, res: Response, next: Function) => {
  // TODO: Add IP whitelist or basic auth here
  next();
};

router.use(adminMiddleware);

// ============ CHARACTERS ============

// POST /admin/characters - Create new character
router.post('/characters', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id, name, rarity, element, weapon_type, nation, data } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields: id, name' });
    }

    await db.run(
      'INSERT OR REPLACE INTO characters (id, name, rarity, element, weapon_type, nation, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, rarity, element, weapon_type, nation, JSON.stringify(data || {})]
    );

    res.status(201).json({ id, name, message: 'Character created' });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// PUT /admin/characters/:id - Update character
router.put('/characters/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { name, rarity, element, weapon_type, nation, data } = req.body;

    const character = await db.get('SELECT * FROM characters WHERE id = ?', [id]);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    await db.run(
      'UPDATE characters SET name = ?, rarity = ?, element = ?, weapon_type = ?, nation = ?, data = ? WHERE id = ?',
      [name || character.name, rarity ?? character.rarity, element || character.element, weapon_type || character.weapon_type, nation || character.nation, JSON.stringify(data || character.data), id]
    );

    res.json({ id, message: 'Character updated' });
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// DELETE /admin/characters/:id - Delete character
router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.run('DELETE FROM characters WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ id, message: 'Character deleted' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// ============ GUIDES ============

// POST /admin/guides - Create new guide
router.post('/guides', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id, title, author, description, content } = req.body;

    if (!id || !title) {
      return res.status(400).json({ error: 'Missing required fields: id, title' });
    }

    await db.run(
      'INSERT INTO guides (id, title, author, description, content) VALUES (?, ?, ?, ?, ?)',
      [id, title, author || null, description || null, content || '']
    );

    res.status(201).json({ id, title, message: 'Guide created' });
  } catch (error) {
    console.error('Error creating guide:', error);
    res.status(500).json({ error: 'Failed to create guide' });
  }
});

// PUT /admin/guides/:id - Update guide
router.put('/guides/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { title, author, description, content } = req.body;

    const guide = await db.get('SELECT * FROM guides WHERE id = ?', [id]);
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    await db.run(
      'UPDATE guides SET title = ?, author = ?, description = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title || guide.title, author || guide.author, description || guide.description, content || guide.content, id]
    );

    res.json({ id, message: 'Guide updated' });
  } catch (error) {
    console.error('Error updating guide:', error);
    res.status(500).json({ error: 'Failed to update guide' });
  }
});

// DELETE /admin/guides/:id - Delete guide
router.delete('/guides/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.run('DELETE FROM guides WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    res.json({ id, message: 'Guide deleted' });
  } catch (error) {
    console.error('Error deleting guide:', error);
    res.status(500).json({ error: 'Failed to delete guide' });
  }
});

// ============ WEAPONS ============

// POST /admin/weapons - Create new weapon
router.post('/weapons', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id, name, rarity, type, data } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields: id, name' });
    }

    await db.run(
      'INSERT OR REPLACE INTO weapons (id, name, rarity, type, data) VALUES (?, ?, ?, ?, ?)',
      [id, name, rarity, type, JSON.stringify(data || {})]
    );

    res.status(201).json({ id, name, message: 'Weapon created' });
  } catch (error) {
    console.error('Error creating weapon:', error);
    res.status(500).json({ error: 'Failed to create weapon' });
  }
});

// PUT /admin/weapons/:id - Update weapon
router.put('/weapons/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { name, rarity, type, data } = req.body;

    const weapon = await db.get('SELECT * FROM weapons WHERE id = ?', [id]);
    if (!weapon) {
      return res.status(404).json({ error: 'Weapon not found' });
    }

    await db.run(
      'UPDATE weapons SET name = ?, rarity = ?, type = ?, data = ? WHERE id = ?',
      [name || weapon.name, rarity ?? weapon.rarity, type || weapon.type, JSON.stringify(data || weapon.data), id]
    );

    res.json({ id, message: 'Weapon updated' });
  } catch (error) {
    console.error('Error updating weapon:', error);
    res.status(500).json({ error: 'Failed to update weapon' });
  }
});

// DELETE /admin/weapons/:id - Delete weapon
router.delete('/weapons/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.run('DELETE FROM weapons WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Weapon not found' });
    }

    res.json({ id, message: 'Weapon deleted' });
  } catch (error) {
    console.error('Error deleting weapon:', error);
    res.status(500).json({ error: 'Failed to delete weapon' });
  }
});

// ============ BRIEF DESCRIPTIONS ============

// GET /admin/briefdescriptions/:character_id - Get brief descriptions (optionally for a specific variant)
router.get('/briefdescriptions/:character_id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { character_id } = req.params;
    const { element_type } = req.query;

    const brief = await db.get(
      'SELECT * FROM brief_descriptions WHERE character_id = ? AND element_type = ?',
      [character_id, element_type || null]
    );

    if (!brief) {
      return res.status(404).json({ error: 'Brief descriptions not found' });
    }

    res.json(brief);
  } catch (error) {
    console.error('Error fetching brief descriptions:', error);
    res.status(500).json({ error: 'Failed to fetch brief descriptions' });
  }
});

// POST /admin/briefdescriptions - Create brief descriptions (with optional element_type for variants)
router.post('/briefdescriptions', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { character_id, element_type, combat1, combat2, combat3, passive1, passive2, passive3, passive4, c1, c2, c3, c4, c5, c6 } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'Missing required field: character_id' });
    }

    // Check if character exists
    const character = await db.get('SELECT id FROM characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    await db.run(
      `INSERT OR REPLACE INTO brief_descriptions 
      (character_id, element_type, combat1, combat2, combat3, passive1, passive2, passive3, passive4, c1, c2, c3, c4, c5, c6) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [character_id, element_type || null, combat1 || null, combat2 || null, combat3 || null, passive1 || null, passive2 || null, passive3 || null, passive4 || null, c1 || null, c2 || null, c3 || null, c4 || null, c5 || null, c6 || null]
    );

    res.status(201).json({ character_id, element_type: element_type || null, message: 'Brief descriptions created' });
  } catch (error) {
    console.error('Error creating brief descriptions:', error);
    res.status(500).json({ error: 'Failed to create brief descriptions' });
  }
});

// PUT /admin/briefdescriptions/:character_id - Update brief descriptions (optionally for a specific variant)
router.put('/briefdescriptions/:character_id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { character_id } = req.params;
    const { element_type, combat1, combat2, combat3, passive1, passive2, passive3, passive4, c1, c2, c3, c4, c5, c6 } = req.body;

    const brief = await db.get(
      'SELECT * FROM brief_descriptions WHERE character_id = ? AND element_type = ?',
      [character_id, element_type || null]
    );
    if (!brief) {
      return res.status(404).json({ error: 'Brief descriptions not found' });
    }

    await db.run(
      `UPDATE brief_descriptions 
      SET combat1 = ?, combat2 = ?, combat3 = ?, passive1 = ?, passive2 = ?, passive3 = ?, passive4 = ?, c1 = ?, c2 = ?, c3 = ?, c4 = ?, c5 = ?, c6 = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE character_id = ? AND element_type = ?`,
      [
        combat1 ?? brief.combat1,
        combat2 ?? brief.combat2,
        combat3 ?? brief.combat3,
        passive1 ?? brief.passive1,
        passive2 ?? brief.passive2,
        passive3 ?? brief.passive3,
        passive4 ?? brief.passive4,
        c1 ?? brief.c1,
        c2 ?? brief.c2,
        c3 ?? brief.c3,
        c4 ?? brief.c4,
        c5 ?? brief.c5,
        c6 ?? brief.c6,
        character_id,
        element_type || null
      ]
    );

    res.json({ character_id, element_type: element_type || null, message: 'Brief descriptions updated' });
  } catch (error) {
    console.error('Error updating brief descriptions:', error);
    res.status(500).json({ error: 'Failed to update brief descriptions' });
  }
});

// DELETE /admin/briefdescriptions/:character_id - Delete brief descriptions (optionally for a specific variant)
router.delete('/briefdescriptions/:character_id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { character_id } = req.params;
    const { element_type } = req.query;

    const result = await db.run(
      'DELETE FROM brief_descriptions WHERE character_id = ? AND element_type = ?',
      [character_id, element_type || null]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Brief descriptions not found' });
    }

    res.json({ character_id, message: 'Brief descriptions deleted' });
  } catch (error) {
    console.error('Error deleting brief descriptions:', error);
    res.status(500).json({ error: 'Failed to delete brief descriptions' });
  }
});

export default router;
