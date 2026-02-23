/**
 * InteractionTracker — buffers user actions and flushes to the backend
 * every N interactions or when the simulation ends.
 */
export default class InteractionTracker {
  constructor(simulationId, interactionId, authFetch) {
    this.simulationId = simulationId;
    this.interactionId = interactionId;
    this.authFetch = authFetch;
    this.buffer = [];
    this.startTime = Date.now();
  }

  track(action, data = {}) {
    this.buffer.push({
      action,
      data,
      timestamp: Date.now(),
      elapsed_ms: Date.now() - this.startTime,
    });

    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.authFetch(
        `/api/simulations/${this.simulationId}/interactions`,
        {
          method: "POST",
          body: JSON.stringify({
            interaction_id: this.interactionId,
            interactions: batch,
          }),
        }
      );
    } catch {
      // push back for retry
      this.buffer.unshift(...batch);
    }
  }

  getTotalTime() {
    return Date.now() - this.startTime;
  }
}
