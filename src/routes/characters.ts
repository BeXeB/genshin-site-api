import { Router, Request, Response } from "express";
import { Character, CharacterProfile, CharacterResolved } from "../models";
import { resolveCostRecord } from "../utils/resolver";

const router = Router();

// GET /api/characters - Get all characters or search
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;

    // Query returns all characters from the minimal schema
    const characters = await db.all(
      `SELECT id, normalized_name, data FROM characters ORDER BY normalized_name`,
    );

    // Parse JSON data and filter based on query parameters
    let parsed: Character[] = characters
      .map((char: any) => {
        try {
          const character = JSON.parse(char.data) as Character;
          return character;
        } catch (e: any) {
          console.error(`Failed to parse character ${char.id}:`, e);
          return null;
        }
      })
      .filter((char: Character | null): char is Character => char !== null);

    const profiles: CharacterProfile[] = parsed.map(
      (char: Character) => char.profile,
    );

    res.json(profiles);
  } catch (error) {
    console.error("Error fetching characters:", error);
    res.status(500).json({ error: "Failed to fetch characters" });
  }
});

// GET /api/characters/:id - Get character details (fully resolved)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const materialsMap = req.app.locals.materialsMap;
    const { id } = req.params;

    // Query using the minimal schema
    const character: any = await db.get(
      `SELECT id, normalized_name, data FROM characters WHERE id = ? OR normalized_name = ?`,
      [isNaN(Number(id)) ? null : Number(id), id],
    );

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Parse the complete character data from JSON
    let characterData: Character;
    try {
      characterData = JSON.parse(character.data);
    } catch (e) {
      console.error(`Failed to parse character data:`, e);
      return res.status(500).json({ error: "Invalid character data" });
    }

    // Resolve costs in profile
    const resolvedProfile: any = {
      ...characterData.profile,
      costs: resolveCostRecord(characterData.profile.costs, materialsMap),
    };

    // Resolve costs in skills
    let resolvedSkills: any = undefined;
    if (characterData.skills) {
      resolvedSkills = {
        ...characterData.skills,
        costs: resolveCostRecord(characterData.skills.costs, materialsMap),
      };
    }

    // Resolve variants if present
    let resolvedVariants: any = undefined;
    if (characterData.variants) {
      resolvedVariants = {} as any;
      for (const [elementType, variant] of Object.entries(
        characterData.variants,
      )) {
        resolvedVariants[elementType] = {
          skills: {
            ...variant.skills,
            costs: resolveCostRecord(variant.skills.costs, materialsMap),
          },
          constellation: variant.constellation,
        };
      }
    }

    // Get brief descriptions if available
    const briefRow: any = await db.get(
      `SELECT data FROM brief_descriptions WHERE character_id = ? AND element_type IS NULL`,
      [characterData.profile.id],
    );

    const brief = briefRow
      ? JSON.parse(briefRow.data)
      : undefined;

    // Build resolved character response
    const resolved: CharacterResolved = {
      profile: resolvedProfile,
      skills: resolvedSkills,
      stats: characterData.stats,
      constellation: characterData.constellation,
      brief,
      variants: resolvedVariants,
    };

    res.json(resolved);
  } catch (error) {
    console.error("Error fetching character:", error);
    res.status(500).json({ error: "Failed to fetch character" });
  }
});

export default router;
