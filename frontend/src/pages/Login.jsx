import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const Login = () => {

  const { backendUrl, token, setToken } = useContext(AppContext) 
  const navigate = useNavigate()

  const [state,setState] = useState('Sign Up')

  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [name,setName] = useState('')

  // event.preventDefault() -> this will not reload the page again
  const onSubmitHandler = async (event) => {
    event.preventDefault()

    try {
      
      if (state === 'Sign Up') {
        
        const {data} = await axios.post(backendUrl + '/api/user/register',{name,password,email})

        if(data.success){
          localStorage.setItem('token',data.token)
          setToken(data.token)
        }
        else{
          toast.error(data.message)
        }

      } 
      else{

        const {data} = await axios.post(backendUrl + '/api/user/login',{password,email})

        if(data.success){
          localStorage.setItem('token',data.token)
          setToken(data.token)
        }
        else{
          toast.error(data.message)
        }
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Single-use nonce from the API. Google embeds it in the ID token, and the
  // API only accepts that ID token together with this attempt's nonce token.
  const [googleNonce, setGoogleNonce] = useState(null)

  const loadGoogleNonce = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/auth/google/nonce')
      setGoogleNonce(data.success ? { nonce: data.nonce, nonceToken: data.nonceToken } : null)
    } catch {
      setGoogleNonce(null)
    }
  }

  useEffect(()=>{
    if (googleClientId) {
      loadGoogleNonce()
    }
  },[])

  // Google sign-in: send the ID token to the API, which verifies it and
  // returns the application's own session token
  const onGoogleSuccess = async (credentialResponse) => {
    const nonceToken = googleNonce && googleNonce.nonceToken
    // every attempt uses a fresh nonce
    setGoogleNonce(null)

    try {
      const { data } = await axios.post(backendUrl + '/api/user/auth/google', { credential: credentialResponse.credential, nonceToken })

      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      }
      else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      loadGoogleNonce()
    }
  }

  //once we are logged(that means token gets updated) then we navigate to the home page 
  useEffect(()=>{
    if(token){
      navigate('/')
    }
  },[token])

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center '>
      
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 tx-sm shadow-lg ">
        <p className="text-2xl font-semibold">
          {state === 'Sign Up' ? "Create Account" : "Login"}
        </p>

        <p className="">
          Please {state === 'Sign Up' ? "signup" : "log in"} to book appointment
        </p>

        {
          state === 'Sign Up' && <div className="w-full">
                                    <p className="">Full Name</p>
                                    <input type="text" onChange={(e)=>setName(e.target.value)} value={name} className="w-full p-2 mt-1 border rounded border-zinc-300" />
                                  </div>

        }

        
        <div className="w-full">
          <p className="">Email</p>
          <input type="email" onChange={(e)=>setEmail(e.target.value)} value={email} className="w-full p-2 mt-1 border rounded border-zinc-300" />
        </div>

        <div className="w-full">
          <p className="">Password</p>
          <input type="password" onChange={(e)=>setPassword(e.target.value)} value={password} className="w-full p-2 mt-1 border rounded border-zinc-300" />
          {state === 'Sign Up' && <p className="mt-1 text-xs text-zinc-400">At least 8 characters, with uppercase and lowercase letters, a number and a symbol.</p>}
        </div>

        <button type='submit' className="w-full py-2 text-base text-white rounded-md bg-primary">
          {state === 'Sign Up' ? "Create Account" : "Log In"}    
        </button>

        {
          googleClientId && googleNonce && <div className="flex flex-col items-center w-full gap-2">
                               <p className="text-xs text-zinc-400">or</p>
                               {/* the key recreates the button whenever a new nonce arrives */}
                               <GoogleLogin key={googleNonce.nonce} nonce={googleNonce.nonce} onSuccess={onGoogleSuccess} onError={() => toast.error('Google sign-in failed')} text={state === 'Sign Up' ? 'signup_with' : 'signin_with'} />
                             </div>
        }

        {
          state === 'Sign Up'
          ? <p className="">Already have an account? <span onClick={()=>setState('Login')}  className="underline cursor-pointer text-primary">Login here</span></p>
          : <p className="">Create a new Account? <span onClick={()=>setState('Sign Up')}className="underline cursor-pointer text-primary">Click here!</span></p>
        }

      </div>
    </form>
  )
}

export default Login
