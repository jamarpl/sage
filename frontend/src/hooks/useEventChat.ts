import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_ORIGIN } from '../constants/api';

const API_URL = API_ORIGIN;

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export function useEventChat(eventId: string, isAnonymous: boolean = false) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    connectSocket();
    
    return () => {
      disconnectSocket();
    };
  }, [eventId]);

  const connectSocket = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }

      // Create socket connection
      socketRef.current = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      const socket = socketRef.current;

      // Connection handlers
      socket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        socket.emit('join-event', eventId);
        loadMessages(); // re-sync messages on every (re)connect
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        setLoading(false);
      });

      // Message handlers
      socket.on('new-message', (message: Message) => {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
      });

      // Typing indicators
      socket.on('user-typing', ({ userId }: { userId: string }) => {
        setTypingUsers(prev => new Set(prev).add(userId));
      });

      socket.on('user-stopped-typing', ({ userId }: { userId: string }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      setLoading(false);
    } catch (error) {
      console.error('Error connecting socket:', error);
      setLoading(false);
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-event', eventId);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const loadMessages = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_URL}/api/events/${eventId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data?.messages || data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = useCallback((text: string) => {
    if (!socketRef.current || !text.trim()) return;
    
    socketRef.current.emit('send-message', {
      eventId,
      text: text.trim(),
      isAnonymous,
    });
  }, [eventId, isAnonymous]);

  const startTyping = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing-start', { eventId });
    
    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [eventId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing-stop', { eventId });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [eventId]);

  return {
    messages,
    loading,
    connected,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    startTyping,
    stopTyping,
    reload: loadMessages,
  };
}
