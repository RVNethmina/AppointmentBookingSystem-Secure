import express from 'express'
import cors from 'cors'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import useRouter from './routes/userRoutes.js'
import { createAuthLimiter, createApiLimiter, AUTH_PATHS } from './middleware/rateLimit.js'

// Builds the Express application without connecting to the database or
// listening, so that tests can create a fresh instance.
const createApp = () => {
    const app = express()

    // the API is deployed behind a reverse proxy
    app.set('trust proxy', 1)

    //middlewares
    app.use(express.json())
    app.use(cors()) //allow frontend to connect with backend

    // brute-force protection: limiters are created per app instance
    app.use('/api', createApiLimiter())
    app.use(AUTH_PATHS, createAuthLimiter())

    //api endpoints
    app.use('/api/admin',adminRouter)
    app.use('/api/doctor',doctorRouter)
    app.use('/api/user/',useRouter)

    app.get('/',(req,res)=>{
        res.send('API WORKING great')
    })

    return app
}

export default createApp
