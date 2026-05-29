// ============================================================================
// src/middleware/validate.js  —  Generic zod schema runner
// ----------------------------------------------------------------------------
// PURPOSE
//   Turns any zod schema into an Express middleware that:
//     1. Parses the chosen request slice (body / query / params).
//     2. Replaces that slice with the *parsed* result, so downstream code
//        sees coerced and trimmed values rather than raw strings.
//     3. On failure, forwards the ZodError to next() — errorHandler.js
//        turns it into a 422 envelope with a details[] of field errors.
//
// USAGE
//
//     const validate = require('../../middleware/validate');
//     const { loginSchema } = require('./auth.validators');
//
//     router.post('/login', validate(loginSchema, 'body'), ctrl.postLogin);
//     router.get('/users',  validate(listSchema,  'query'), ctrl.list);
//
//   The second argument defaults to 'body'. Passing 'query' or 'params'
//   lets you reuse the same factory for URL-side inputs.
//
// WHY a separate file?
//   Validation belongs in the route definition (so the schema is visible
//   at the same place as the URL it guards). Embedding the try/catch
//   inline at every route would be 5+ lines of boilerplate per endpoint.
//   This factory keeps routes one line each.
// ============================================================================

'use strict';

/**
 * @param {import('zod').ZodTypeAny} schema  Any zod schema
 * @param {'body'|'query'|'params'} [source] Which req field to validate
 * @returns Express middleware
 */
function validate(schema, source = 'body') {
  // Validate the source name up front — a typo here would silently let
  // every request through, which is a serious security regression.
  const validSources = ['body', 'query', 'params'];
  if (!validSources.includes(source)) {
    throw new Error(
      `validate(): source must be one of ${validSources.join(', ')} — got "${source}"`,
    );
  }

  return function validateMiddleware(req, _res, next) {
    try {
      // schema.parse returns the *typed, coerced* value or throws ZodError.
      // We assign it BACK onto the request so controllers can trust the
      // shape (e.g. numbers really are numbers, optional fields are
      // present with undefined).
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      // ZodError flows through to errorHandler.js, which renders 422.
      next(err);
    }
  };
}

module.exports = validate;
