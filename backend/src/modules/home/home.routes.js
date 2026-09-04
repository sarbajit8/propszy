const { Router } = require('express');
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok } = require('../../utils/http');
const svc = require('./home.service');

const router = Router();

// Public — the assembled landing page payload (driven by admin config).
router.get('/', asyncHandler(async (req, res) => ok(res, await svc.buildHome())));

// Admin — manage which sections appear, their order, titles and sources.
router.get(
  '/config',
  authenticate,
  authorize('ADMIN', 'SUBADMIN'),
  asyncHandler(async (req, res) => {
    const config = await svc.getConfig();
    return ok(res, {
      config,
      defaults: svc.defaultConfig(),
      sources: {
        projects: Object.keys(svc.PROJECT_SOURCES).concat(['city', 'manual']),
        properties: Object.keys(svc.PROPERTY_SOURCES).concat(['manual']),
      },
    });
  })
);

router.put(
  '/config',
  authenticate,
  authorize('ADMIN', 'SUBADMIN'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        toggles: z.record(z.string(), z.boolean()).optional(),
        sections: z.array(z.record(z.string(), z.any())).optional(),
      })
      .parse(req.body);
    return ok(res, await svc.saveConfig(body));
  })
);

router.post(
  '/config/reset',
  authenticate,
  authorize('ADMIN', 'SUBADMIN'),
  asyncHandler(async (req, res) => ok(res, await svc.saveConfig(svc.defaultConfig())))
);

module.exports = router;
