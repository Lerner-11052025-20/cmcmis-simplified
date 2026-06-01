---
name: project-cmcmis-overview
description: "CMCMIS — Computerized Maintenance & Calibration MIS for T&ME / F&PE departments; org-wide production system handling instrument calibration, repair, registration"
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**Project:** CMCMIS (Computerized Maintenance & Calibration Management Information System)

**Domain:** High-precision engineering environment (ISRO SAC-style — T&ME = Test & Measurement Equipment, F&PE = Functional & Performance Equipment). Manages the full lifecycle of laboratory instruments and equipment: registration → calibration → maintenance → repair → retirement.

**Status:** Real organizational production project (NOT a prototype or college project). User is building it during his internship as Software Developer.

**Why:** Org needs a unified system for technical users (engineers, lab staff, admin) replacing manual/paper or fragmented processes. Must be efficient, minimal-click, and optimized for engineers who use it daily.

**How to apply:**
- Always treat this as industry-grade — security, audit trails, data integrity, scalability matter.
- Target users are technical (engineers/lab staff/admin), so UX should be data-dense and keyboard-friendly, not consumer-style.
- Government-grade / mission-critical mindset: ISRO SAC-style organizations cannot tolerate data loss, ambiguity in state, or audit gaps.
- Database design is the *load-bearing* part (target 60+ tables) — invest most architectural effort here first.

See [[project-cmcmis-tech-stack]] and [[project-cmcmis-modules-roles]] for technical specifics.
