import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeFunctionError } from '../src/services/edge-function-error.js';

test('uses an Edge Function JSON error response instead of the generic SDK message', async () => {
  const error = {
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify({ error: 'Email is already registered.' }), {
      status: 409,
      headers: { 'content-type': 'application/json' }
    })
  };

  const result = await edgeFunctionError(error, null, 'Fallback');
  assert.equal(result.message, 'Email is already registered.');
});

test('uses a supplied response payload first', async () => {
  const result = await edgeFunctionError(null, { error: 'Not authorised.' }, 'Fallback');
  assert.equal(result.message, 'Not authorised.');
});

test('does not expose the generic non-2xx SDK message', async () => {
  const result = await edgeFunctionError(
    { message: 'Edge Function returned a non-2xx status code' },
    null,
    'Could not complete the request.'
  );
  assert.equal(result.message, 'Could not complete the request.');
});
