import { useEffect, useState } from "react";

/**
 * Custom React hook to manage a WebSocket connection with automatic reconnection,
 * online/offline awareness, and connection state tracking.
 *
 * @param {Object} params - Hook parameters.
 * @param {boolean} params.log - Whether to enable console logging for debugging.
 * @param {number} params.roomID - The chat room ID to connect to.
 *
 * @returns {Object} - An object containing:
 *   - ws: The active WebSocket instance (or null if disconnected).
 *   - isConnected: Boolean indicating whether the WebSocket is connected.
 */
export default function useWebSocket({
  log,
  roomID,
}: {
  log: boolean;
  roomID: number;
}) {
  // Holds the current WebSocket instance
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Tracks whether the WebSocket is currently connected
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isManuallyClosed = false; // Prevents auto-reconnect when unmounting
    let socket: WebSocket; // Will store the active WebSocket instance
    let retryDelay = 1000; // Initial reconnect delay (in ms)
    const maxDelay = 30000; // Max reconnect delay (in ms)

    /**
     * Establishes a WebSocket connection to the given room.
     * Handles connection events, retries on disconnect, and jitter for load distribution.
     */
    const connect = () => {
      // If browser is offline, don't try to connect yet
      if (!navigator.onLine) {
        log && console.warn("Offline. Waiting for connection...");
        return;
      }

      // Create WebSocket connection
      socket = new WebSocket(`ws://exampleURL/ws/chat/${roomID}/`);

      // On successful connection
      socket.onopen = () => {
        log && console.log("WebSocket Connected");
        setWs(socket);
        setIsConnected(true);
        retryDelay = 1000; // Reset retry delay on success

        // Example: send a message to indicate user entered the room
        socket.send(JSON.stringify({ type: "entered" }));
      };

      // On connection close
      socket.onclose = () => {
        if (isManuallyClosed) return; // If closed manually, don't reconnect
        setIsConnected(false);

        // Add small randomness to avoid simultaneous reconnection spikes
        const jitter = Math.random() * 500;

        // Retry connection with exponential backoff
        setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, maxDelay);
          connect();
        }, retryDelay + jitter);
      };

      // On error — log it, then close to trigger reconnect
      socket.onerror = (err) => {
        log && console.error("WebSocket Error", err);
        socket.close();
      };
    };

    /**
     * Triggered when the browser goes back online.
     * Resets retry delay and attempts to reconnect immediately.
     */
    const handleOnline = () => {
      log && console.log("Back online, reconnecting...");
      retryDelay = 1000;
      connect();
    };

    /**
     * Triggered when the browser goes offline.
     * Closes the WebSocket to prevent failed sends.
     */
    const handleOffline = () => {
      log && console.warn("Went offline, closing socket...");
      socket?.close();
    };

    // Listen for browser network state changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial connection attempt
    connect();

    // Cleanup: close connection, remove listeners
    return () => {
      isManuallyClosed = true; // Prevent auto-reconnect
      socket?.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [roomID, log]); // Reconnect when roomID or logging preference changes

  return {
    ws, // WebSocket instance
    isConnected, // Connection status
  };
}
