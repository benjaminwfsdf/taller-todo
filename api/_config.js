export const RP_ID = process.env.RP_ID || 'localhost';            // sin https
export const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';
export const RP_NAME = 'Gestor de Vehículos';

// DEMO en memoria (cámbialo por Google Sheets/DB para persistencia real)
export const db = {
  users: new Map(), // username -> { id, credentials:[{id, publicKey, counter}], currentChallenge? }
};
