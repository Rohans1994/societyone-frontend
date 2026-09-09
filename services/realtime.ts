import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../apiClient';
import { getAccessToken } from '../supabaseClient';

// One shared Socket.io connection for the whole app — works identically
// whether running as a plain website or inside the Capacitor Android app
// (Socket.io's client has no native-platform dependency, unlike FCM).
//
// This is a *complement* to FCM push notifications, not a replacement:
//   - This gives instant, no-refresh-needed updates while the app/tab is
//     actively open and connected (e.g. a guard's live gate-request queue,
//     or a resident who happens to have the app open when a visitor arrives).
//   - FCM (services/pushNotifications.ts) is still what reliably reaches a
//     resident's Android app when it's backgrounded or closed — a
//     WebSocket connection doesn't survive that, so it can't replace FCM.
let socket: Socket | null = null;

export async function connectRealtime(): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    // A function (not a plain object) so Socket.io calls it fresh on every
    // connection attempt, including automatic reconnects after a network
    // drop or backgrounding — avoids reconnecting with a token that expired
    // while disconnected.
    auth: (cb) => {
      getAccessToken().then((freshToken) => cb({ token: freshToken }));
    },
    transports: ['websocket', 'polling']
  });

  socket.on('connect_error', (err) => {
    console.warn('[Realtime] Connection error:', err.message);
  });
  socket.on('connect', () => {
    console.log('[Realtime] Connected, socket id:', socket!.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[Realtime] Disconnected, reason:', reason);
  });

  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

export function getRealtimeSocket(): Socket | null {
  return socket;
}
