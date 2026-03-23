import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndo } from './useUndo';

describe('useUndo', () => {
  it('should initialize with the initial state', () => {
    const { result } = renderHook(() => useUndo('initial'));
    expect(result.current.state).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update state and allow undo', () => {
    const { result } = renderHook(() => useUndo('initial'));
    
    act(() => {
      result.current.set('updated');
    });
    
    expect(result.current.state).toBe('updated');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to the previous state', () => {
    const { result } = renderHook(() => useUndo('initial'));
    
    act(() => {
      result.current.set('updated');
    });
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.state).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to the next state', () => {
    const { result } = renderHook(() => useUndo('initial'));
    
    act(() => {
      result.current.set('updated');
    });
    
    act(() => {
      result.current.undo();
    });
    
    act(() => {
      result.current.redo();
    });
    
    expect(result.current.state).toBe('updated');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future when setting a new state', () => {
    const { result } = renderHook(() => useUndo('initial'));
    
    act(() => {
      result.current.set('state1');
    });
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.canRedo).toBe(true);
    
    act(() => {
      result.current.set('state2');
    });
    
    expect(result.current.state).toBe('state2');
    expect(result.current.canRedo).toBe(false);
  });

  it('should not update if the new state is identical to the current one', () => {
    const { result } = renderHook(() => useUndo('initial'));
    
    act(() => {
      result.current.set('initial');
    });
    
    expect(result.current.canUndo).toBe(false);
  });
});
