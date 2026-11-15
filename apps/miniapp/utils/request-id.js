// Idempotency key, not an authentication credential. Retained after a network error.
module.exports = {
  requestId: () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
};
