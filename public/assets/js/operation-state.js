// One active operation across the toolkit. Cancellation invalidates late results.
export function createOperationState() {
  let active = null;
  return {
    begin(mode) {
      if (active) return null;
      active = { mode, controller: new AbortController() };
      return active;
    },
    current() { return active; },
    isCurrent(operation) { return operation !== null && active === operation; },
    finish(operation) {
      if (active !== operation) return false;
      active = null;
      return true;
    },
    cancel() {
      const previous = active;
      active = null;
      previous?.controller.abort();
      return previous;
    },
  };
}
