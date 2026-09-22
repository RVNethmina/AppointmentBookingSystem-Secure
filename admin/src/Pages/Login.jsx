import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { AdminContext } from '../Context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { DoctorContext } from '../Context/DoctorContext'
import { useNavigate } from 'react-router-dom'


const Login = () => {

  const [state,setState] = useState('Admin')

  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')

  const {setAtoken,backendUrl} = useContext(AdminContext)
  const {dToken,setDtoken} = useContext(DoctorContext)

  const navigate = useNavigate()

  // when we submit the form it will not reload the page
  
  const onSubmitHandler = async (event) => {
    event.preventDefault()

    try {
      
      if (state === 'Admin') {
        
        const { data } = await axios.post(backendUrl + '/api/admin/login', {email,password})

        if(data.success) {
          navigate('/admin-dashboard')
          localStorage.setItem('aToken',data.token)
          setAtoken(data.token)
        }
        else{
          toast.error(data.message)
        }

      }else{
        //Now doctor login

        const { data } = await axios.post(backendUrl + '/api/doctor/login',{email,password})

        if(data.success) {
          navigate('/doctor-dashboard')
          localStorage.setItem('dToken',data.token)
          setDtoken(data.token)
          console.log(data.token);
          
        }
        else{
          toast.error(data.message)
        }
        
      }

    } catch (error) {
      
    }
  }




  return (
    <form onSubmit={onSubmitHandler} action="" className="min-h-[80vh] flex items-center">
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E]  text-sm shadow-lg">
        <p className="m-auto text-2xl font-semibold">
          <span className="text-primary">{state} </span>
          Login
        </p>

        <div className="w-full">
          <p className="">
            Email
          </p>
          <input onChange={(e)=>setEmail(e.target.value)} value={email} type="email" required className="border border-[#DADADA] rounded w-full p-2 mt-1" />
        </div>

        <div className="w-full">
        <p className="">
            Password
          </p>
          <input onChange={(e)=>setPassword(e.target.value)} value={password} type="password" required className="border border-[#DADADA] rounded w-full p-2 mt-1" />
        </div>

        <button className="w-full py-2 text-base text-white rounded bg-primary">
          Login
        </button>

        {
          state === 'Admin'
          ? <p className="">Doctor Login? <span onClick={()=> setState('Doctor')} className="underline cursor-pointer text-primary">Click Here!</span></p>
          : <p className="">Admin Login? <span onClick={()=> setState('Admin')} className="underline cursor-pointer text-primary">Click Here!</span></p>
        }
      </div>
    </form>
  )
}

export default Login
