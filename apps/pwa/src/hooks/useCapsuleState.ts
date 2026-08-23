import { useCallback, useState } from 'react';

// Domain model definitions for Capsule status and UI states
export type ProjectionStatus = 'idle' | 'projecting' | 'error';
export type ActiveRail = 'none' | 'cartridge' | 'transcript';
export type ConnectionState = 'online' | 'degraded' | 'offline';

export interface LocalUiState {
  isCartridgeDockOpen: boolean;
  isTranscriptRailOpen: boolean;
  activeRail: ActiveRail;
}

export interface ServerProjectionState {
  status: ProjectionStatus;
  activeKnightId: string | null;
  lastMessage: string | null;
  connectionState: ConnectionState;
  taskFailure: string | null;
}

export interface CapsuleHostState {
  localUi: LocalUiState;
  serverProjection: ServerProjectionState;
}

// Initial state configurations
const initialLocalUi: LocalUiState = {
  isCartridgeDockOpen: true,
  isTranscriptRailOpen: true,
  activeRail: 'none',
};

const initialServerProjection: ServerProjectionState = {
  status: 'idle',
  activeKnightId: null,
  lastMessage: null,
  connectionState: 'online',
  taskFailure: null,
};

export function useCapsuleState() {
  const [localUi, setLocalUi] = useState<LocalUiState>(initialLocalUi);
  const [serverProjection, setServerProjection] =
    useState<ServerProjectionState>(initialServerProjection);

  // Local UI Mutations
  const toggleCartridgeDock = useCallback(() => {
    setLocalUi((prev) => ({
      ...prev,
      isCartridgeDockOpen: !prev.isCartridgeDockOpen,
    }));
  }, []);

  const toggleTranscriptRail = useCallback(() => {
    setLocalUi((prev) => ({
      ...prev,
      isTranscriptRailOpen: !prev.isTranscriptRailOpen,
    }));
  }, []);

  const setActiveRail = useCallback((rail: ActiveRail) => {
    setLocalUi((prev) =>
      prev.activeRail === rail
        ? prev
        : {
            ...prev,
            activeRail: rail,
          },
    );
  }, []);

  // Server Projection Mutations
  const setProjectionStatus = useCallback((status: ProjectionStatus) => {
    setServerProjection((prev) =>
      prev.status === status
        ? prev
        : {
            ...prev,
            status,
          },
    );
  }, []);

  const mountKnight = useCallback((knightId: string) => {
    setServerProjection((prev) =>
      prev.activeKnightId === knightId && prev.status === 'projecting'
        ? prev
        : {
            ...prev,
            activeKnightId: knightId,
            status: 'projecting',
          },
    );
  }, []);

  const unmountKnight = useCallback(() => {
    setServerProjection((prev) =>
      prev.activeKnightId === null && prev.status === 'idle'
        ? prev
        : {
            ...prev,
            activeKnightId: null,
            status: 'idle',
          },
    );
  }, []);

  const updateLastMessage = useCallback((message: string) => {
    setServerProjection((prev) =>
      prev.lastMessage === message
        ? prev
        : {
            ...prev,
            lastMessage: message,
          },
    );
  }, []);

  const setConnectionState = useCallback((connectionState: ConnectionState) => {
    setServerProjection((prev) =>
      prev.connectionState === connectionState
        ? prev
        : {
            ...prev,
            connectionState,
          },
    );
  }, []);

  const setTaskFailure = useCallback((taskFailure: string | null) => {
    setServerProjection((prev) =>
      prev.taskFailure === taskFailure
        ? prev
        : {
            ...prev,
            taskFailure,
          },
    );
  }, []);

  return {
    // State Access
    localUi,
    serverProjection,

    // Local UI Actions
    toggleCartridgeDock,
    toggleTranscriptRail,
    setActiveRail,

    // Server Projection Actions
    setProjectionStatus,
    mountKnight,
    unmountKnight,
    updateLastMessage,
    setConnectionState,
    setTaskFailure,
  };
}
