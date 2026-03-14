import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_ORIGIN } from '../constants/api';

interface UsePinSocketOptions {
  onNewPin: (pin: any) => void;
  onPinDeleted: (pinId: string) => void;
  enabled?: boolean;
}

/**
 * Connects to the Socket.IO server and listens for real-time pin events.
 * Broadcasts from the server reach all connected clients (including the creator),
 * so the map stays live for every user without polling.
 */
export function usePinSocket({ onNewPin, onPinDeleted, enabled = true }: UsePinSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const connect = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token || !active) return;

        socketRef.current = io(API_ORIGIN, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        socket.on('new-pin', (pin: any) => {
          if (active) onNewPin(pin);
        });

        socket.on('pin-deleted', ({ id }: { id: string }) => {
          if (active) onPinDeleted(id);
        });

        socket.on('connect_error', (err) => {
          console.warn('Pin socket connection error:', err.message);
        });
      } catch (err) {
        console.warn('usePinSocket: failed to connect', err);
      }
    };

    connect();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);
}
