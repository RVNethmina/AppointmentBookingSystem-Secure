import { readToken, verifyAccessToken } from '../utils/token.js'

//doctor authentication middleware

const authDoctor = async (req,res,next) => {

    const dtoken = readToken(req, 'dtoken')

    if(!dtoken){
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    let token_decode
    try {
        // rejects tampered, expired and wrongly signed tokens
        token_decode = verifyAccessToken(dtoken)
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    // only doctor tokens with a subject identifier are accepted
    if(!token_decode || token_decode.role !== 'doctor' || !token_decode.id){
        return res.status(403).json({success:false, message:"Not Authorised, Login again!"})
    }

    // identity comes from the verified token, never from the request body
    req.auth = { id: String(token_decode.id), role: 'doctor' }

    next()
}

export default authDoctor
