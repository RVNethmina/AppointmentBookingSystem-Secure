import React, { useContext } from 'react'
import { AdminContext } from '../Context/AdminContext'
import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'
import { DoctorContext } from '../Context/DoctorContext'

const SideBar = () => {

    const { aToken } = useContext(AdminContext)
    const { dToken } = useContext(DoctorContext)
    
  return (
    <div className='min-h-screen bg-white border-r'>

      {/* -----------------Admin Sidebar----------------------- */}
      
      {
        aToken && <ul className='text-[#515151] mt-5'>
            <NavLink to={'/admin-dashboard'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.home_icon} alt="" className="" />
                <p className="">Dashboard</p>
            </NavLink>

            <NavLink to={'/all-appointments'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.add_icon} alt="" className="" />
                <p className="">Appointments</p>
            </NavLink>

            <NavLink to={'/add-doctor'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.appointment_icon} alt="" className="" />
                <p className="">Add Doctor</p>
            </NavLink>

            <NavLink to={'/doctor-list'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.people_icon} alt="" className="" />
                <p className="">Doctors List</p>
            </NavLink>
        </ul>
      }


      {/* -----------------Doctor Sidebar----------------------- */}
      {
        dToken && <ul className='text-[#515151] mt-5'>
            <NavLink to={'/doctor-dashboard'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.home_icon} alt="" className="" />
                <p className="hidden md:block">Dashboard</p>
            </NavLink>

            <NavLink to={'/doctor-appointments'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.add_icon} alt="" className="" />
                <p className="hidden md:block">Appointments</p>
            </NavLink>

            <NavLink to={'/doctor-profile'} className={({isActive})=> `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`}>
                <img src={assets.people_icon} alt="" className="" />
                <p className="hidden md:block">Profile</p>
            </NavLink>
        </ul>
      }
    </div>
  )
}

export default SideBar
