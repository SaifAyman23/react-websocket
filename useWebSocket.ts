import { useEffect, useState } from "react";

export default function useWebSocket({log, roomID }: {log: boolean, roomID: number}){
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isManuallyClosed = false;
    let socket: WebSocket;
    let retryDelay = 1000;
    const maxDelay = 30000;
  
    const connect = () => {
      if (!navigator.onLine) {
        log && console.warn("Offline. Waiting for connection...");
        return;
      }
  
      socket = new WebSocket(`ws://exampleURL/ws/chat/${roomID}/`);
  
      socket.onopen = () => {
        log && console.log("WebSocket Connected");
        setWs(socket);
        setIsConnected(true);
        retryDelay = 1000; // reset delay
        socket.send(JSON.stringify({ type: "entered" }));
      };
  
      socket.onclose = () => {
        if (isManuallyClosed) return;
        setIsConnected(false);
        const jitter = Math.random() * 500;
        setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, maxDelay);
          connect();
        }, retryDelay + jitter);
      };
  
      socket.onerror = (err) => {
        log && console.error("WebSocket Error", err);
        socket.close();
      };
    };
  
    const handleOnline = () => {
      log && console.log("Back online, reconnecting...");
      retryDelay = 1000;
      connect();
    };
  
    const handleOffline = () => {
      log && console.warn("Went offline, closing socket...");
      socket?.close();
    };
  
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  
    connect();
  
    return () => {
      isManuallyClosed = true;
      socket?.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [roomID, log]);

  return {
    ws, 
    isConnected
  }
}
