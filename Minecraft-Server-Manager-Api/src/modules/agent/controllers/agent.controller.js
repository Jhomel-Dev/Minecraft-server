import prisma from '../../../core/database/prisma.client.js';
import crypto from 'crypto';

const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PAIRING_CODE_VALIDITY_MINUTES = 15;

const generateRandomString = (length) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC_CHARS.charAt(Math.floor(Math.random() * ALPHANUMERIC_CHARS.length));
  }
  return result;
};

const createUniquePairingPin = async () => {
  const pin = generateRandomString(6);
  const existingCode = await prisma.pairingCode.findUnique({ where: { pin } });
  
  if (existingCode) return createUniquePairingPin();
  return pin;
};

const calculateExpirationDate = () => {
  return new Date(Date.now() + PAIRING_CODE_VALIDITY_MINUTES * 60 * 1000);
};

export const requestPairingCode = async (req, res) => {
  try {
    const pin = await createUniquePairingPin();
    const expiresAt = calculateExpirationDate();

    const pairingCode = await prisma.pairingCode.create({
      data: { pin, expiresAt }
    });

    return res.status(200).json({ pin: pairingCode.pin, expiresAt: pairingCode.expiresAt });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

const getValidPairingCode = async (pin) => {
  const pairingCode = await prisma.pairingCode.findUnique({ where: { pin: pin.toUpperCase() } });
  
  if (!pairingCode) throw new Error('InvalidPIN');
  if (pairingCode.isClaimed) throw new Error('ClaimedPIN');
  if (pairingCode.expiresAt < new Date()) throw new Error('ExpiredPIN');
  
  return pairingCode;
};

const getOrGenerateUserAgentToken = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.agentToken) return user.agentToken;

  const newAgentToken = crypto.randomBytes(32).toString('hex');
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { agentToken: newAgentToken }
  });
  
  return updatedUser.agentToken;
};

const markPairingCodeAsClaimed = async (pairingCodeId, userId) => {
  await prisma.pairingCode.update({
    where: { id: pairingCodeId },
    data: { isClaimed: true, userId }
  });
};

const notifyAgentViaSocket = (io, pin, agentToken) => {
  if (!io) return;
  io.to(`room_${pin.toUpperCase()}`).emit('paired', { token: agentToken });
};

export const claimPairingCode = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin) return res.status(400).json({ error: 'MissingPIN' });

    const pairingCode = await getValidPairingCode(pin);
    const agentToken = await getOrGenerateUserAgentToken(userId);
    
    await markPairingCodeAsClaimed(pairingCode.id, userId);
    notifyAgentViaSocket(req.app.get('io'), pin, agentToken);

    return res.status(200).json({ success: true });
  } catch (error) {
    if (['InvalidPIN', 'ClaimedPIN', 'ExpiredPIN'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const checkAgentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'UserNotFound' });
    
    return res.status(200).json({ isLinked: !!user.agentToken });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};
