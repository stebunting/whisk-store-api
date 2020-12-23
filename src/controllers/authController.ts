// Requirements
import bcrypt from 'bcrypt';
import log from 'winston';
import Debug from 'debug';
import { Request, Response, NextFunction } from 'express';

// Controllers
import { getAdminUser } from './dbController';

// Page Tag
const tag = 'store-api:authController';
const debug = Debug(tag);

// Global Variables
const key = process.env.ADMIN_KEY || '';

async function login(req: Request, res: Response): Promise<Response> {
  const { username, password } = req.body;
  const adminUsers = await getAdminUser(username.toLowerCase());

  let valid;
  if (adminUsers.length > 0) {
    try {
      valid = await bcrypt.compare(password, adminUsers[0].password);
    } catch (error) {
      log.error('Bcrypt failed when comparing admin password to db value', { metadata: tag, error });
    }
  }
  return valid
    ? res.status(200).json({ status: 'ok', login: true, key })
    : res.status(200).json({ status: 'ok', login: false });
}

function checkAdminKey(
  req: Request, res: Response, next?: NextFunction
): void | Response {
  const { authorization } = req.headers;
  if (authorization && authorization === `Basic ${key}` && next) {
    return next();
  }
  return res.json({ status: 'error' });
}

export { login, checkAdminKey };
