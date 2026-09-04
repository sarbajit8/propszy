const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { logActivity } = require('../../services/activity');
const svc = require('./project.service');

const isStaff = (req) => req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);

const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const { rows, total, facets } = await svc.list(req.query, { skip, take, publicOnly: !isStaff(req) });
  return ok(res, rows, { ...pageMeta(page, limit, total), facets });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await svc.getByIdOrSlug(req.params.idOrSlug, { publicOnly: !isStaff(req) });
  logActivity(req, { action: 'project.view', entityType: 'project', entityId: project.id });
  return ok(res, project);
});

const mapView = asyncHandler(async (req, res) => {
  const pins = await svc.mapPins(req.query);
  return ok(res, pins);
});

const createProject = asyncHandler(async (req, res) => {
  const project = await svc.create(req.body, req.user.id);
  logActivity(req, { action: 'project.create', entityType: 'project', entityId: project.id });
  return created(res, project);
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await svc.update(req.params.id, req.body);
  logActivity(req, { action: 'project.update', entityType: 'project', entityId: project.id });
  return ok(res, project);
});

const deleteProject = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  logActivity(req, { action: 'project.delete', entityType: 'project', entityId: req.params.id });
  return ok(res, { deleted: true });
});

module.exports = { listProjects, getProject, mapView, createProject, updateProject, deleteProject };
