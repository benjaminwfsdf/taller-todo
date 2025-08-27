import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { RP_ID, ORIGIN, db } from '../_config';

export default async function handler(req, res) {
  const { username, credential } = req.body || {};
  const user = db.users.get(username);
  if (!user || !user.currentChallenge) return res.status(400).json({ error: 'Sesión inválida' });

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedRPID: RP_ID,
      expectedOrigin: ORIGIN,
      expectedChallenge: user.currentChallenge,
      authenticator: undefined,
    });

    const credId = Buffer.from(verification.authenticationInfo.credentialID).toString('base64url');
    const auth = user.credentials.find(c => c.id === credId);
    if (!auth) return res.status(400).json({ error: 'Credencial no asociada' });

    auth.counter = verification.authenticationInfo.newCounter;
    user.currentChallenge = null;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Error autenticación' });
  }
}
