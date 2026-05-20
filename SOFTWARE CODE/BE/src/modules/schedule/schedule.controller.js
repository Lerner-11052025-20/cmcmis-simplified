// ============================================================================
// src/modules/schedule/schedule.controller.js  —  HTTP shims
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// One handler per route. Pulls actor / IP / UA from req. ICS endpoints set
// the right content-type + filename. All business logic lives in the
// service module — controllers stay trivial.
// ============================================================================

'use strict';

const service = require('./schedule.service');

function actorOf(req) {
  return {
    employeeId: req.user.employeeId,
    role:       req.user.role,
    fullName:   req.user.fullName,
  };
}

async function list(req, res, next) {
  try {
    const data = await service.listSchedules(req.query);
    res.json({ data });
  } catch (e) { next(e); }
}

async function getDetail(req, res, next) {
  try {
    const data = await service.getScheduleDetail(req.params.id);
    res.json({ data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const data = await service.createSchedule({
      body:      req.body,
      actor:     actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ data });
  } catch (e) { next(e); }
}

async function edit(req, res, next) {
  try {
    const data = await service.editSchedule({
      id:        req.params.id,
      patch:     req.body,
      actor:     actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ data });
  } catch (e) { next(e); }
}

async function transition(req, res, next) {
  try {
    const data = await service.transitionSchedule({
      id:        req.params.id,
      body:      req.body,
      actor:     actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ data });
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try {
    const data = await service.cancelSchedule({
      id:        req.params.id,
      reason:    (req.body && req.body.reason) || 'Cancelled',
      actor:     actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ data });
  } catch (e) { next(e); }
}

/** GET /schedules/:id/ics — single-event ICS download. */
async function icsOne(req, res, next) {
  try {
    const body = await service.getIcsForSchedule(req.params.id);
    res.set('Content-Type',        'text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="schedule-${req.params.id}.ics"`);
    res.send(body);
  } catch (e) { next(e); }
}

/** GET /schedules/export.ics — bulk filtered feed. */
async function icsBulk(req, res, next) {
  try {
    const body = await service.getIcsForFilter(req.query);
    res.set('Content-Type',        'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="cmcmis-schedules.ics"');
    res.send(body);
  } catch (e) { next(e); }
}

module.exports = {
  list, getDetail, create, edit, transition, cancel, icsOne, icsBulk,
};
