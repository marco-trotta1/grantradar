import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const OrgSchema = z.object({
  name: z.string().min(1),
  orgType: z.enum(["NONPROFIT", "SCHOOL", "COMMUNITY_ORG", "GOVERNMENT"]),
  mission: z.string().min(20),
  location: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  budgetSize: z.enum([
    "UNDER_100K",
    "FROM_100K_TO_500K",
    "FROM_500K_TO_1M",
    "FROM_1M_TO_5M",
    "OVER_5M",
  ]),
  focusAreas: z.array(z.string()).min(1),
  staffCapacity: z.enum([
    "VOLUNTEER_ONLY",
    "ONE_TO_FIVE",
    "SIX_TO_TWENTY",
    "OVER_TWENTY",
  ]),
  website: z.string().url().optional().or(z.literal("")),
  ein: z.string().optional(),
  clerkUserId: z.string().optional(),
});

// POST /api/organizations — create org profile
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = OrgSchema.parse(req.body);
    const org = await prisma.organization.create({ data });
    res.status(201).json(org);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", issues: err.issues });
      return;
    }
    next(err);
  }
});

// GET /api/organizations/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
    });
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    res.json(org);
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:id — update profile
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = OrgSchema.partial().parse(req.body);
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data,
    });
    res.json(org);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", issues: err.issues });
      return;
    }
    next(err);
  }
});

export default router;
