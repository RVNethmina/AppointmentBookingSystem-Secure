import { readToken, verifyAccessToken } from '../utils/token.js'
import userModel from '../models/userModel.js'

//user authentication middleware

const authUser = async (req,res,next) => {

    const token = readToken(req, 'token')

    if(!token){
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    let token_decode
    try {
        // rejects tampered, expired and wrongly signed tokens
        token_decode = verifyAccessToken(token)
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    // only patient tokens with a subject identifier are accepted
    if(!token_decode || token_decode.role !== 'user' || !token_decode.id){
        return res.status(403).json({success:false, message:"Not Authorised, Login again!"})
    }

    try {
        // the account must still exist, and the token must not predate a
        // revocation (e.g. when a Google identity was linked)
        const user = await userModel.findById(token_decode.id).select('sessionsValidAfter')
        if(!user){
            return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
        }
        if(user.sessionsValidAfter && token_decode.iat < Math.floor(user.sessionsValidAfter.getTime() / 1000)){
            return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
        }
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    // identity comes from the verified token, never from the request body
    req.auth = { id: String(token_decode.id), role: 'user' }

    next()
}

export default authUser
