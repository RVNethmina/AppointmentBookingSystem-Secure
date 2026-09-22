import { readToken, verifyAccessToken } from '../utils/token.js'

//doctor authentication middleware

const authDoctor = async (req,res,next) => {
    try {

        const dtoken = readToken(req, 'dtoken')
        
        if(!dtoken){
            return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
        }
        // rejects tampered, expired and wrongly signed tokens
        const  token_decode = verifyAccessToken(dtoken)

        //get user id from the token
        req.body.docId = token_decode.id

        next()
        
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }
}

export default authDoctor
