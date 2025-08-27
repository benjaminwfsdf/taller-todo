import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { RP_ID, db } from '../_config';

export default async function handler(req, res) {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username requerido' });

  const user = db.users.get(username);
  if (!user || !user.credentials.length) {
    return res.status(404).json({ error: 'No hay passkey registrada' });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: user.credentials.map(c => ({ id: Buffer.from(c.id, 'base64url'), type: 'public-key' })),
    userVerification: 'preferred',
  });

  user.currentChallenge = options.challenge;
  res.json({ publicKey: options });
}
