import type { ReactNode } from 'react';
import {
  Consumer,
  Context,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

export interface EventBusProviderProps {
  children: ReactNode;
}

export interface EventBus {
  dispatch: (
    eventType: string,
    callback?: (params: { [key: string]: any }) => void,
  ) => void;
  on: (
    eventType: string,
    listener: (callback?: (params: { [key: string]: any }) => void) => void,
  ) => () => void;
}

// @ts-ignore
const EventBusContext: Context<EventBus> = createContext<EventBus>();

export function EventBusProvider({ children }: EventBusProviderProps) {
  const listeners = useRef<
    Map<
      string,
      Set<(callback?: (params: { [key: string]: any }) => void) => void>
    >
  >(new Map());

  const dispatch = useCallback(
    (
      eventType: string,
      callback?: (params: { [key: string]: any }) => void,
    ) => {
      const eventListeners = listeners.current.get(eventType);

      if (eventListeners) {
        for (const listener of eventListeners) {
          listener(callback);
        }
      }
    },
    [],
  );

  const on = useCallback((eventType: string, listener: () => void) => {
    if (!listeners.current.has(eventType)) {
      listeners.current.set(eventType, new Set());
    }

    listeners.current.get(eventType)?.add(listener);

    return () => {
      listeners.current.get(eventType)?.delete(listener);

      if (listeners.current.size === 0) {
        listeners.current.delete(eventType);
      }
    };
  }, []);

  const state = useMemo(
    () => ({
      dispatch,
      on,
    }),
    [dispatch, on],
  );

  return (
    <EventBusContext.Provider value={state}>
      {children}
    </EventBusContext.Provider>
  );
}

export function useEventBus(): EventBus {
  return useContext(EventBusContext);
}

export function useEventBusListener(
  eventType: string,
  listener: (callback?: (params: { [key: string]: any }) => void) => void,
) {
  const { on } = useContext(EventBusContext);

  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    return on(
      eventType,
      (callback?: (params: { [key: string]: any }) => void) => {
        listenerRef.current(callback);
      },
    );
  }, [eventType, on]);
}

export const EventBusConsumer: Consumer<EventBus> = EventBusContext.Consumer;
