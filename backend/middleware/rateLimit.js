import { rateLimit } from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000

const limitReached = (req, res) => {
    res.status(429).json({ success: false, message: "Too many requests, please try again later." })
}

// Authentication endpoints: 10 attempts per client IP per 15 minutes.
const createAuthLimiter = () => rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitReached,
})

// Whole API: 300 requests per client IP per 15 minutes.
const createApiLimiter = () => rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitReached,
})

// Endpoints that accept credentials.
const AUTH_PATHS = [
    '/api/user/login',
    '/api/user/register',
    '/api/doctor/login',
    '/api/admin/login',
]

export { createAuthLimiter, createApiLimiter, AUTH_PATHS }
