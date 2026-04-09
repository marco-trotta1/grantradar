import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/saved/:orgId
router.get("/:orgId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saved = await prisma.savedGrant.findMany({
      where: { orgId: req.params.orgId },
      include: {
        grant: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/saved — save a grant
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, grantId, notes } = req.body;
    if (!orgId || !grantId) {
      res.status(400).json({ error: "orgId and grantId are required" });
      return;
    }
    const saved = await prisma.savedGrant.upsert({
      where: { orgId_grantId: { orgId, grantId } },
      create: { orgId, grantId, notes },
      update: { notes },
      include: { grant: true },
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved/:orgId/:grantId
router.delete(
  "/:orgId/:grantId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.savedGrant.delete({
        where: {
          orgId_grantId: {
            orgId: req.params.orgId,
            grantId: req.params.grantId,
          },
        },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/saved/:orgId/:grantId/notes
router.patch(
  "/:orgId/:grantId/notes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notes } = req.body;
      const saved = await prisma.savedGrant.update({
        where: {
          orgId_grantId: {
            orgId: req.params.orgId,
            grantId: req.params.grantId,
          },
        },
        data: { notes },
      });
      res.json(saved);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
