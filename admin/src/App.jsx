import React, { useContext } from 'react'
import Login from './Pages/Login'
import NavBar from './Components/NavBar';
import { ToastContainer, toast } from 'react-toastify';
import { AdminContext } from './Context/AdminContext'
import SideBar from './Components/SideBar';
import { Routes,Route } from 'react-router-dom';
import Dashboard from './Pages/Admin/Dashboard'
import AllAppointments from './Pages/Admin/AllAppointments';
import AddDoctor from './Pages/Admin/AddDoctor';
import DoctorsList from './Pages/Admin/DoctorsList';
import { DoctorContext } from './Context/DoctorContext';
import DoctorDashboard from './Pages/Doctor/DoctorDashboard';
import DoctorProfile from './Pages/Doctor/DoctorProfile';
import DoctorAppointments from './Pages/Doctor/DoctorAppointments';

// React-Toastify allows you to add notifications to your app with ease.

const App = () => {

  const { aToken } = useContext(AdminContext)
  const { dToken } = useContext(DoctorContext)

  return aToken || dToken ? (
    <div className='bg-[#F8F9FD]'>
      <ToastContainer/>
      <NavBar/>
      <div className='flex items-start'>
        <SideBar/> 
        <Routes>

           {/*--------Admin Route-------- */}
          <Route path='/' element={<></>}/>
          <Route path='/admin-dashboard' element={<Dashboard/>}/>
          <Route path='/all-appointments' element={<AllAppointments/>}/>
          <Route path='/add-doctor' element={<AddDoctor/>}/>
          <Route path='/doctor-list' element={<DoctorsList/>}/>


          {/*--------Doctor Route-------- */}
          <Route path='/doctor-dashboard' element={<DoctorDashboard/>}/>
          <Route path='/doctor-profile' element={<DoctorProfile/>}/>
          <Route path='/doctor-appointments' element={<DoctorAppointments/>}/>
          
        </Routes>
      </div>
    </div>
  ) : (
    
    <>  
      <Login/>
      <ToastContainer/>
    </>
  )
}

export default App
