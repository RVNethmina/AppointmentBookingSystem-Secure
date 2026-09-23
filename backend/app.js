import express from 'express'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import useRouter from './routes/userRoutes.js'
import errorHandler from './middleware/errorHandler.js'
import createCors from './middleware/cors.js'
import { createAuthLimiter, createApiLimiter, AUTH_PATHS } from './middleware/rateLimit.js'

// Builds the Express application without connecting to the database or
// listening, so that tests can create a fresh instance.
const createApp = () => {
    const app = express()

    // Trust X-Forwarded-For only when a reverse proxy that overwrites it is
    // configured (TRUST_PROXY = number of proxy hops, e.g. 1). Otherwise the
    // header is attacker-controlled and would defeat per-IP rate limiting.
    const trustProxy = process.env.TRUST_PROXY
    if (trustProxy) {
        app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy)
    }

    //middlewares
    // security headers (nosniff, frameguard, HSTS, CSP, ...) and no X-Powered-By
    app.use(helmet())
    // only the configured front-end origins may call the API from a browser
    app.use(createCors())
    app.use(express.json())
    // strip $-prefixed and dotted keys so request data cannot become query operators
    app.use(mongoSanitize())

    // brute-force protection: limiters are created per app instance
    app.use('/api', createApiLimiter())
    // exact POST routes, so e.g. the Google nonce endpoint is not counted
    app.post(AUTH_PATHS, createAuthLimiter())

    //api endpoints
    app.use('/api/admin',adminRouter)
    app.use('/api/doctor',doctorRouter)
    app.use('/api/user/',useRouter)

    app.get('/',(req,res)=>{
        res.send('API WORKING great')
    })

    // must be registered after all routes
    app.use(errorHandler)

    return app
}

export default createApp
