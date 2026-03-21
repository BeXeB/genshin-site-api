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

## Future Enhancements

- [ ] Load JSON data from `genshin-site` on initialization
- [ ] Admin authentication (IP whitelist or basic auth)
- [ ] Support for image/icon serving
- [ ] Data validation and error checking
- [ ] Pagination for large result sets
- [ ] Caching strategy (ETags, 304 responses)
- [ ] API documentation (Swagger/OpenAPI)
