import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { syncGrants } from "../services/grantService";
import { runMatchingForOrg } from "../services/matchingService";

const router = Router();

// GET /api/grants — list grants with optional filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, limit = "50", offset = "0" } = req.query;

    const grants = await prisma.grant.findMany({
      where: {
        isActive: true,
        OR: [{ deadline: { gte: new Date() } }, { deadline: null }],
        ...(category && {
          category: { has: category as string },
        }),
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: "insensitive" } },
            { funder: { contains: search as string, mode: "insensitive" } },
            { description: { contains: search as string, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { deadline: "asc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json({ grants, total: grants.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/grants/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: req.params.id },
    });
    if (!grant) {
      res.status(404).json({ error: "Grant not found" });
      return;
    }
    res.json(grant);
  } catch (err) {
    next(err);
  }
});

// POST /api/grants/sync — trigger Grants.gov sync
router.post(
  "/sync",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count = 50, filters = {} } = req.body;
      const result = await syncGrants(count, filters);
      res.json({ message: "Sync complete", ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/grants/match/:orgId — run AI matching for an org
router.post(
  "/match/:orgId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 50 } = req.body;
      const result = await runMatchingForOrg(req.params.orgId, { limit });
      res.json({ message: "Matching complete", ...result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/grants/matches/:orgId — ranked matches for an org
router.get(
  "/matches/:orgId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { minScore = "0", limit = "50" } = req.query;

      const matches = await prisma.match.findMany({
        where: {
          orgId: req.params.orgId,
          score: { gte: parseInt(minScore as string) },
          grant: {
            isActive: true,
            OR: [{ deadline: { gte: new Date() } }, { deadline: null }],
          },
        },
        orderBy: { score: "desc" },
        take: parseInt(limit as string),
        include: { grant: true },
      });

      res.json({ matches });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
