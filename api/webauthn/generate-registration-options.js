import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RP_ID, RP_NAME, db } from '../_config';

export default async function handler(req, res) {
  const { username, displayName } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username requerido' });

  let user = db.users.get(username);
  if (!user) {
    user = { id: Buffer.from(username).toString('base64url'), credentials: [] };
    db.users.set(username, user);
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: username,
    userDisplayName: displayName || username,
    attestationType: 'none',
    excludeCredentials: user.credentials.map(c => ({ id: Buffer.from(c.id, 'base64url'), type: 'public-key' })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  user.currentChallenge = options.challenge;
  res.json({ publicKey: options });
}
