import { useState, useCallback } from 'react';

/**
 * Custom hook for managing state with undo/redo functionality.
 * 
 * @template T The type of the state being managed.
 * @param {T} initialState - The initial state value.
 * @returns {Object} An object containing:
 * - state: The current state value.
 * - set: Function to update the state and add to history.
 * - undo: Function to revert to the previous state.
 * - redo: Function to move forward in history.
 * - canUndo: Boolean indicating if undo is possible.
 * - canRedo: Boolean indicating if redo is possible.
 */
export function useUndo<T>(initialState: T) {
  const [state, setState] = useState({
    past: [] as T[],
    present: initialState,
    future: [] as T[],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T) => {
    setState((curr) => {
      if (curr.present === newPresent) return curr;
      return {
        past: [...curr.past, curr.present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  return { state: state.present, set, undo, redo, canUndo, canRedo };
}
