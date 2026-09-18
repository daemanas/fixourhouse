import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};