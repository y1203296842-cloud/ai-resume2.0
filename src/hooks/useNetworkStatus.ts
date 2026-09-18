'use client';

/**
 * useNetworkStatus — 网络状态监听
 *
 * - online: 正常
 * - offline: 断网，禁止发送请求，但不清空任何数据
 *
 * 使用浏览器 navigator.onLine + online/offline 事件。
 */

import { useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline';

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>('online');

  useEffect(() => {
    setStatus(navigator.onLine ? 'online' : 'offline');

    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
