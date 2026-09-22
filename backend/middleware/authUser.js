import { readToken, verifyAccessToken } from '../utils/token.js'

//user authentication middleware

const authUser = async (req,res,next) => {
    try {

        const token = readToken(req, 'token')
        
        if(!token){
            return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
        }
        // rejects tampered, expired and wrongly signed tokens
        const  token_decode = verifyAccessToken(token)

        //get user id from the token
        req.body.userId = token_decode.id

        next()
        
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }
}

export default authUser
