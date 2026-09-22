import React, { useContext, useState } from 'react'
import {assets} from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext';


const NavBar = () => {

    
    const navigate = useNavigate();

    const {token,setToken,userData} = useContext(AppContext)

    const [showMenu, setShowMenu] = useState(false);

    const logOut = ()=>{
        setToken(false)
        localStorage.removeItem('token')
    }

  return (

    <div className='flex items-center justify-between py-4 mb-5 text-sm border-b border-b-gray-400'>
        <img onClick={()=>navigate('/')} className="cursor-pointer w-44" src={assets.logo} alt="" />
        <ul className='hidden gap-5 font-medium md:flex item-start'>
            <NavLink to='/'>
                <li className='py-y1'>HOME</li>
                <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden'/>
            </NavLink>
            <NavLink to='/doctors'>
                <li className='py-y1'>ALL DOCTORS</li>
                <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden'/>
            </NavLink>
            <NavLink to='/about'>
                <li className='py-y1'>ABOUT</li>
                <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden'/>
            </NavLink>
            <NavLink to='/contact'>
                <li className='py-y1'>CONTACT</li>
                <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden'/>
            </NavLink>
        </ul>
        <div className='flex items-center gap-4'>
            {
                token && userData
                ?<div className='relative flex items-center gap-2 cursor-pointer group'>
                    <img className="w-8 rounded-full" src={userData.image} alt="" />
                    <img className="w-2.5" src={assets.dropdown_icon} alt="" />
                    <div className='absolute top-0 right-0 z-20 hidden text-base font-medium text-gray-600 pt-14 group-hover:block'>
                        <div className='flex flex-col gap-4 p-4 rounded min-w-48 bg-stone-100'>
                            <p onClick={()=>navigate('my-profile')} className='cursor-pointer hover:text-black'>My Profile</p>
                            <p onClick={()=>navigate('my-appointment')} className='cursor-pointer hover:text-black'>My Appointment</p>
                            <p onClick={logOut} className='cursor-pointer hover:text-black'>LogOut</p>
                        </div>
                    </div>
                </div>
                :<button onClick={()=>navigate('/login')} className='hidden px-8 py-3 font-light text-white rounded-full bg-primary md:block'> Create Account</button>
            }
            
            <img onClick={()=> setShowMenu(true)} src={assets.menu_icon} alt="" className="w-6 md:hidden" />

            {/* ------------Mobile Menu------------- */}
            <div className={`${showMenu ? 'fixed w-full' : 'h-0 w-0'} md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all `}>
                <div className="flex items-center justify-between px-5 py-6">
                    <img src={assets.logo} alt="" className="w-36" />
                    <img onClick={()=> setShowMenu(false)} src={assets.cross_icon} alt="" className="w-7" />
                </div>

                <ul className="flex flex-col items-center gap-2 px-5 mt-5 font-medium lext-lg">
                    <NavLink onClick={()=>setShowMenu(false)} to='/'><p className="inline-block px-4 py-2 rounded">HOME</p ></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/doctors'><p className="inline-block px-4 py-2 rounded">ALL Doctors</p></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/about'><p className="inline-block px-4 py-2 rounded">ABOUT</p></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/contact'><p className="inline-block px-4 py-2 rounded">CONTACTS</p ></NavLink>
                </ul>
            </div>
        </div>
    </div>
  )
}

export default NavBar
