import { io } from "socket.io-client";
import { resolveApiUrl } from "./config";

const socket = io(resolveApiUrl(), {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;
