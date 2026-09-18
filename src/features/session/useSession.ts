'use client';

/**
 * useSession — 会话持久化 React Hook
 *
 * 职责：
 * 1. 页面加载时从 localStorage 恢复会话
 * 2. messages / resumeText 变化时自动持久化
 * 3. 提供 createNewSession() 用于"新建简历"
 * 4. SSR 安全（服务端不访问 localStorage）
 *
 * 不管理瞬态 UI 状态（isLoading, isGenerating 等），那些留在组件内。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ResumeMode } from '@/lib/types';
import { SESSION_CONFIG, type SessionStatus, type InitStatus } from '@/config/session';
import { sessionStore } from './BrowserSessionStore';
import { generateSessionId, isSessionExpired, type SessionData } from './types';

export function useSession(mode: ResumeMode) {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resumeText, setResumeText] = useState('');
  const [status, setStatus] = useState<SessionStatus>('collecting');
  const [initStatus, setInitStatus] = useState<InitStatus>('idle');
  const [restored, setRestored] = useState(false);
  const createdAtRef = useRef<number>(Date.now());
  const sessionRef = useRef<SessionData | null>(null);

  // 恢复会话
  useEffect(() => {
    const stored = sessionStore.load();
    if (stored && !isSessionExpired(stored, SESSION_CONFIG.ttl) && stored.mode === mode) {
      setSessionId(stored.sessionId);
      setMessages(stored.messages);
      setResumeText(stored.resumeText || '');
      setStatus(stored.status);
      setInitStatus(stored.initStatus);
      createdAtRef.current = stored.createdAt;
    } else {
      if (stored) sessionStore.clear();
      const newId = generateSessionId();
      setSessionId(newId);
      createdAtRef.current = Date.now();
      setInitStatus('idle');
    }
    setRestored(true);
  }, [mode]);

  // 持久化
  useEffect(() => {
    if (!restored || !sessionId) return;
    const data: SessionData = {
      sessionId,
      messages,
      mode,
      resumeText,
      status,
      initStatus,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    };
    sessionRef.current = data;
    sessionStore.save(data);
  }, [sessionId, messages, mode, resumeText, status, initStatus, restored]);

  // beforeunload 兜底：同步保存，不弹确认框，不替代正常持久化
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current) {
        sessionStore.save(sessionRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const createNewSession = useCallback(() => {
    sessionStore.clear();
    const newId = generateSessionId();
    createdAtRef.current = Date.now();
    setSessionId(newId);
    setMessages([]);
    setResumeText('');
    setStatus('collecting');
    setInitStatus('idle');
  }, []);

  return {
    sessionId,
    messages,
    setMessages,
    resumeText,
    setResumeText,
    status,
    setStatus,
    initStatus,
    setInitStatus,
    restored,
    createNewSession,
  };
}
