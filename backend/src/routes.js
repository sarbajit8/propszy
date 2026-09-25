const { Router } = require('express');

const router = Router();

router.use('/home', require('./modules/home/home.routes'));
router.use('/search', require('./modules/search/search.routes'));
router.use('/cities', require('./modules/cities/city.routes'));
router.use('/developers', require('./modules/developers/developer.routes'));
router.use('/unit-categories', require('./modules/categories/category.routes'));
router.use('/configurations', require('./modules/configurations/configuration.routes').router);
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/users', require('./modules/users/user.routes'));
router.use('/me', require('./modules/me/me.routes'));
router.use('/projects', require('./modules/projects/project.routes'));
router.use('/properties', require('./modules/properties/property.routes'));
router.use('/media', require('./modules/media/media.routes'));
router.use('/uploads', require('./modules/media/media.routes'));
router.use('/amenities', require('./modules/amenities/amenity.routes'));
router.use('/favorites', require('./modules/favorites/favorite.routes'));
router.use('/leads', require('./modules/leads/lead.routes'));
router.use('/agents', require('./modules/agents/agent.routes'));
router.use('/kyc', require('./modules/kyc/kyc.routes'));
router.use('/mlm', require('./modules/mlm/mlm.routes'));
router.use('/commissions', require('./modules/commissions/commission.routes'));
router.use('/dashboard', require('./modules/dashboard/dashboard.routes'));
router.use('/reports', require('./modules/reports/report.routes'));
router.use('/cms', require('./modules/cms/cms.routes'));
router.use('/settings', require('./modules/settings/settings.routes'));

module.exports = router;
