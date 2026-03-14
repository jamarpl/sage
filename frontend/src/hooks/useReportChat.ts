import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_ORIGIN } from '../constants/api';

const API_URL = API_ORIGIN;

interface Message {
  id: string;
  report_id: string;
  user_id: string;
  message: string;
  is_anonymous: boolean;
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export function useReportChat(reportId: string, isAnonymous: boolean = false) {
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
  }, [reportId]);

  const connectSocket = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      socketRef.current = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join-report', reportId);
        loadMessages(); // re-sync messages on every (re)connect
      });

      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => {
        setConnected(false);
        setLoading(false);
      });

      socket.on('new-report-message', (message: Message) => {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
      });

      socket.on('user-typing-report', ({ userId }: { userId: string }) => {
        setTypingUsers(prev => new Set(prev).add(userId));
      });

      socket.on('user-stopped-typing-report', ({ userId }: { userId: string }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      setLoading(false);
    } catch (error) {
      console.error('Error connecting report chat socket:', error);
      setLoading(false);
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-report', reportId);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const loadMessages = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_URL}/api/report-chats/${reportId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data?.messages || data.messages || []);
      }
    } catch (error) {
      console.error('Error loading report messages:', error);
    }
  };

  const sendMessage = useCallback((text: string) => {
    if (!socketRef.current || !text.trim()) return;
    socketRef.current.emit('send-report-message', {
      reportId,
      text: text.trim(),
      isAnonymous,
    });
  }, [reportId, isAnonymous]);

  const startTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing-start-report', { reportId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 3000);
  }, [reportId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing-stop-report', { reportId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [reportId]);

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
