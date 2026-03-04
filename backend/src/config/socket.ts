/**
 * Socket.IO singleton
 *
 * Allows messaging.service (and other services) to emit events without
 * importing from app.ts and creating circular dependencies.
 *
 * Usage:
 *   - app.ts calls setIo(io) after creating the Socket.IO server
 *   - services call getIo() to access the instance
 */

import { Server } from 'socket.io';

let _io: Server | null = null;

export const setIo = (io: Server): void => {
  _io = io;
};

export const getIo = (): Server | null => _io;
