# Genshin Site API

Backend REST API for serving Genshin Impact game data (characters, weapons, artifacts, materials, guides) with admin capabilities.

## Tech Stack

- **Framework**: Express.js + TypeScript
- **Database**: SQLite (file-based, zero-config)
- **Environment**: Node.js 16+

## Setup

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
DATABASE_URL=./data/genshin.db
```

### Development

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Characters

- `GET /api/characters` - Get all characters (supports filtering by `element`, `weapon`, `rarity`)
- `GET /api/characters/:id` - Get character details

### Weapons

- `GET /api/weapons` - Get all weapons (supports filtering by `type`, `rarity`)
- `GET /api/weapons/:id` - Get weapon details

### Artifacts

- `GET /api/artifacts` - Get all artifacts (supports filtering by `rarity`)
- `GET /api/artifacts/:id` - Get artifact details

### Materials

- `GET /api/materials` - Get all materials (supports filtering by `type`)
- `GET /api/materials/:id` - Get material details

### Guides

- `GET /api/guides` - Get all guides
- `GET /api/guides/:id` - Get guide with full content

### Admin Endpoints (requires local network access)

#### Characters

- `POST /admin/characters` - Create character
- `PUT /admin/characters/:id` - Update character
- `DELETE /admin/characters/:id` - Delete character

#### Guides

- `POST /admin/guides` - Create guide
- `PUT /admin/guides/:id` - Update guide
- `DELETE /admin/guides/:id` - Delete guide

#### Weapons

- `POST /admin/weapons` - Create weapon
- `PUT /admin/weapons/:id` - Update weapon
- `DELETE /admin/weapons/:id` - Delete weapon

### Health Check

- `GET /health` - Server status

## Database

The SQLite database is stored in `./data/genshin.db` (created on first run).

### Tables

- `characters` - Character profiles with stats
- `weapons` - Weapon data
- `artifacts` - Artifact set information
- `materials` - Craft/ascension materials
- `guides` - User guides and documentation

## Data Sync Commands

All sync operations use **insert-only mode**: existing records are never overwritten, preserving manual corrections.

### Running Data Syncs

Individual sync commands:

```bash
npm run sync:characters   # Character profiles, skills, stats
npm run sync:artifacts    # Artifact set definitions
npm run sync:materials    # Materials and crafting recipes
npm run sync:weapons      # Weapons and stat tables
npm run sync:icons        # Organize all game icons into Backend/public/images/
npm run verify:data       # Verify all required game images exist
```

Sync all datasets at once:

```bash
npm run sync:all  # Runs all 4 data syncs + icon organization sequentially
```

Custom sync (comma-separated types):

```bash
npm run sync -- --type characters,weapons,artifacts
```

### How Insert-Only Mode Works

When you run a sync command:

1. For each item from genshin-db, the script checks if it already exists in the database (by normalized name)
2. If the item exists, it's **skipped** (not updated)
3. If the item is new, it's **inserted**

**Why?** This preserves manual corrections you've made to character data (e.g., updated stat breakdowns, corrected descriptions).

### If You Need to Update an Existing Record

If genshin-db updates a character and you want the new data:

1. Manually delete the character from the database:
   ```bash
   sqlite3 data/genshin.db "DELETE FROM characters WHERE normalized_name = 'fischl'"
   ```

2. Run the sync again:
   ```bash
   npm run sync:characters
   ```
   The character will be re-inserted with latest data.

### Backup Before First Sync

```bash
# Backup current database
cp data/genshin.db data/genshin.db.backup.$(date +%s)

# Then run sync
npm run sync:all
```

### Icon Organization

The icon organizer reads from the frontend's `raw_icons/` directory and copies files to `Backend/public/images/`:

- `Backend/public/images/characters/{normalized_name}/` - Character icons, skills, constellations
- `Backend/public/images/weapons/{normalized_name}/` - Weapon icons
- `Backend/public/images/artifacts/{normalized_name}/` - Artifact piece icons
- `Backend/public/images/materials/` - Material icons

Run before first sync:

```bash
npm run sync:icons
```

### Data Verification

Check that all required game assets exist:

```bash
npm run verify:data
```

This checks:
- ✅ All character skill icons exist
- ✅ All constellation icons present
- ✅ Weapon icons organized
- ✅ Artifact piece icons complete
- ✅ Material images available

Reports missing files and suggests remediation.

### Troubleshooting Sync

**Sync hangs**
- Check network connectivity to genshin-db API
- Genshin-db may be rate-limiting large requests

**Icon organization fails**
- Run from backend folder so it can locate `../genshin-site/raw_icons/`
- Verify frontend `raw_icons/` directory exists and is populated

**Verification fails with missing assets**
- Run `npm run sync:icons` if database was populated but images not yet organized
- Check `Backend/public/images/` folder permissions

**Database conflicts**
- If sync was interrupted, run `sqlite3 data/genshin.db "PRAGMA integrity_check"` to verify
- If corrupted, restore from backup: `cp data/genshin.db.backup.{timestamp} data/genshin.db`

### Sync Performance

- First sync: ~30-60 seconds (reads all data from genshin-db)
- Subsequent syncs: ~1-2 seconds (only inserts new items)
- Icon organization: ~5-10 seconds (copies ~500+ image files)

## Future Enhancements

- [ ] Load JSON data from `genshin-site` on initialization
- [ ] Admin authentication (IP whitelist or basic auth)
- [ ] Support for image/icon serving
- [ ] Data validation and error checking
- [ ] Pagination for large result sets
- [ ] Caching strategy (ETags, 304 responses)
- [ ] API documentation (Swagger/OpenAPI)
