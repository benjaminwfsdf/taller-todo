import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { RP_ID, ORIGIN, db } from '../_config';

export default async function handler(req, res) {
  const { username, credential } = req.body || {};
  const user = db.users.get(username);
  if (!user || !user.currentChallenge) return res.status(400).json({ error: 'Sesión inválida' });

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedRPID: RP_ID,
      expectedOrigin: ORIGIN,
      expectedChallenge: user.currentChallenge,
    });
    if (!verification.verified) return res.status(400).json({ error: 'No verificado' });

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
    user.credentials.push({
      id: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
    });
    user.currentChallenge = null;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Error verificación' });
  }
}
