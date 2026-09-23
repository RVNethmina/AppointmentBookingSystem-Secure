import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import createApp from './app.js'
import { assertJwtSecret } from './utils/token.js'
import { assertAdminCredentials } from './utils/adminCredentials.js'

// refuse to start with a missing or weak JWT secret or admin credential
try {
    assertJwtSecret()
    assertAdminCredentials()
} catch (error) {
    console.error(error.message)
    process.exit(1)
}

//app config
const app = createApp()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

//start express app
app.listen(port, ()=> console.log("Server Started" , port))
