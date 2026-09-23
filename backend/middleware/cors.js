import cors from 'cors'

// Development defaults: the Vite dev servers of the patient app and the panel.
const DEFAULT_ORIGINS = 'http://localhost:5173,http://localhost:5174'

const parseOrigins = () =>
    (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)

// Browsers send an Origin header on cross-origin requests (and on same-origin
// POSTs). Requests from origins that are not on the allow-list are refused;
// requests without an Origin (curl, server-to-server) are not browser
// requests and are left to authentication.
const createCors = () => {
    const allowedOrigins = parseOrigins()

    const rejectUnknownOrigins = (req, res, next) => {
        const origin = req.headers.origin
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ success: false, message: "Origin not allowed." })
        }
        next()
    }

    const corsHeaders = cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'token', 'atoken', 'dtoken'],
    })

    return [rejectUnknownOrigins, corsHeaders]
}

export default createCors
