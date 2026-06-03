'use strict';

const service = require('./checklists.service');

async function list(req, res, next) {
  try {
    const data = await service.list({ query: req.query, actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function equipment(req, res, next) {
  try {
    const data = await service.equipment({ query: req.query, actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function taskMaster(req, res, next) {
  try {
    const data = await service.taskMaster({ query: req.query, actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function get(req, res, next) {
  try {
    const data = await service.get({ id: Number(req.params.id), actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  try {
    const data = await service.create({ body: req.body, actor: req.user });
    return res.status(201).json({ data });
  } catch (e) {
    return next(e);
  }
}

async function update(req, res, next) {
  try {
    const data = await service.update({ id: Number(req.params.id), body: req.body, actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function remove(req, res, next) {
  try {
    const data = await service.remove({ id: Number(req.params.id), actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function forEquipment(req, res, next) {
  try {
    const data = await service.forEquipment({ query: req.query, actor: req.user });
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

async function applyToJobCard(req, res, next) {
  try {
    const data = await service.applyToJobCard({ sectionJobNo: req.params.id, body: req.body, actor: req.user });
    return res.status(201).json({ data });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  list,
  equipment,
  taskMaster,
  get,
  create,
  update,
  delete: remove,
  forEquipment,
  applyToJobCard,
};
