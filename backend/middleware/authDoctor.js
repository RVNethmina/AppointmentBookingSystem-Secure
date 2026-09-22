import jwt from 'jsonwebtoken'

//doctor authentication middleware

const authDoctor = async (req,res,next) => {
    try {

        const dtoken = req.headers.dtoken || req.headers.DToken;
        
        if(!dtoken){
            return res.json({success:false, message:"Not Authorised, Login again!"})
        }
        const  token_decode = jwt.verify(dtoken,process.env.JWT_SECRET)

        //get user id from the token
        req.body.docId = token_decode.id

        next()
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

export default authDoctor