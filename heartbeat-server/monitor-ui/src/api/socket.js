import { io } from "socket.io-client";
import { DEMO_MODE } from "../demo/mockApi";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:3002`;

const socket = DEMO_MODE
  ? {
      on() {},
      off() {},
      emit() {}
    }
  : io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true
    });

export default socket;
