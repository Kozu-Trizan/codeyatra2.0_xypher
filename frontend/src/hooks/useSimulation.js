import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import InteractionTracker from "../components/simulations/shared/InteractionTracker";

/**
 * Custom hook that manages the lifecycle of a simulation session:
 *   1. Fetches simulation metadata for the given concept
 *   2. Starts an interaction session on the backend
 *   3. Provides `trackInteraction` for logging actions
 *   4. Provides `submitAnswer` for final validation
 */
export default function useSimulation(conceptId) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState(null);
  const [interactionId, setInteractionId] = useState(null);
  const [error, setError] = useState(null);
  const trackerRef = useRef(null);

  // Fetch simulation meta + start session
  useEffect(() => {
    if (!conceptId) return;
    let cancelled = false;

    (async () => {
      try {
        // 1. load meta
        const metaRes = await authFetch(`/api/simulations/${conceptId}`);
        const metaJson = await metaRes.json();
        if (cancelled) return;
        const sim = metaJson.data?.simulation ?? null;
        setSimulation(sim);

        if (!sim) {
          setLoading(false);
          return;
        }

        // 2. start interaction
        const startRes = await authFetch(
          `/api/simulations/${sim.id}/start`,
          { method: "POST", body: JSON.stringify({}) }
        );
        const startJson = await startRes.json();
        if (cancelled) return;
        const iid = startJson.data?.interaction_id;
        setInteractionId(iid);

        // 3. init tracker
        trackerRef.current = new InteractionTracker(sim.id, iid, authFetch);
        setLoading(false);
      } catch (err) {
        console.error("useSimulation init error", err);
        if (!cancelled) {
          setError(err.message || "Failed to load simulation");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      trackerRef.current?.flush();
    };
  }, [conceptId]);

  const trackInteraction = useCallback((action, data) => {
    trackerRef.current?.track(action, data);
  }, []);

  const submitAnswer = useCallback(
    async (finalState) => {
      // flush remaining interactions first
      await trackerRef.current?.flush();

      if (!simulation) return { error: "No simulation loaded" };

      try {
        const res = await authFetch(
          `/api/simulations/${simulation.id}/submit`,
          {
            method: "POST",
            body: JSON.stringify({
              interaction_id: interactionId,
              final_state: finalState,
            }),
          }
        );
        const json = await res.json();
        return json.data?.validation ?? json;
      } catch (err) {
        console.error("submitAnswer error", err);
        return { error: "Submission failed" };
      }
    },
    [simulation, interactionId, authFetch]
  );

  return { loading, simulation, interactionId, error, trackInteraction, submitAnswer };
}
