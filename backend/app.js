import express from 'express'
import cors from 'cors'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import useRouter from './routes/userRoutes.js'

// Builds the Express application without connecting to the database or
// listening, so that tests can create a fresh instance.
const createApp = () => {
    const app = express()

    //middlewares
    app.use(express.json())
    app.use(cors()) //allow frontend to connect with backend

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
