import { readToken, verifyAccessToken } from '../utils/token.js'

//admin authentication middleware

const authAdmin = async (req,res,next) => {

    const atoken = readToken(req, 'atoken')

    if(!atoken){
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    let token_decode
    try {
        token_decode = verifyAccessToken(atoken)
    } catch (error) {
        return res.status(401).json({success:false, message:"Not Authorised, Login again!"})
    }

    // authorise on the verified role claim only
    if(!token_decode || token_decode.role !== 'admin'){
        return res.status(403).json({success:false, message:"Not Authorised, Login again!"})
    }

    req.auth = { role: 'admin', email: token_decode.email }

    next()
}

export default authAdmin
