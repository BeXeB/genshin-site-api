import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './db/init';
import { loadMaterialsMap } from './utils/resolver';
import characterRoutes from './routes/characters';
import weaponRoutes from './routes/weapons';
import artifactRoutes from './routes/artifacts';
import materialRoutes from './routes/materials';
import guideRoutes from './routes/guides';
import adminRoutes from './routes/admin';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/guides', express.static(path.join(__dirname, '../public/guides')));

// Initialize database on startup
let db: any;

async function startServer() {
  try {
    db = await initializeDatabase();
    console.log('✓ Database initialized');

    // Load materials map for item resolution
    const materialsMap = await loadMaterialsMap(db);
    console.log('✓ Item resolver ready');

    // Store db and materialsMap in app locals for access in routes
    app.locals.db = db;
    app.locals.materialsMap = materialsMap;

    // Routes
    app.use('/api/characters', characterRoutes);
    app.use('/api/weapons', weaponRoutes);
    app.use('/api/artifacts', artifactRoutes);
    app.use('/api/materials', materialRoutes);
    app.use('/api/guides', guideRoutes);
    app.use('/admin', adminRoutes);

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    app.use((err: any, req: Request, res: Response) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ CORS enabled for: ${CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
