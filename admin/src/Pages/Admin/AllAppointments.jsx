import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../Context/AdminContext";
import { AppContext } from "../../Context/AppContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment} = useContext(AdminContext);
  const {calculateAge,slotDateFormat,currency} = useContext(AppContext)
 
  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken]);

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="mb-3 text-lg font-medium">All Appointments</p>

      <div className="bg-white border rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
        <div className="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b">
          <p className="">#</p>
          <p className="">Patient</p>
          <p className="">Age</p>
          <p className="">Date & Time</p>
          <p className="">Doctor</p>
          <p className="">Fees</p>
          <p className="">Actions</p>
        </div>

        {appointments.map((item,index)=>(

          <div key={index} className="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50">

            <p className="mac-sm:hidden">{index + 1}</p>
            
            <div className="flex items-center gap-2">
              <img src={item.userData.image} className="w-8 rounded-full" />
              <p className="">{item.userData.name}</p>
            </div>

            <p className="max-sm:hidden">{calculateAge(item.userData.dob)}</p>
            <p className="">{slotDateFormat(item.slotDate)} , {item.slotTime}</p>
            
            <div className="flex items-center gap-2">
              <img src={item.docData.image} className="w-8 bg-gray-200 rounded-full" />
              <p className="">{item.docData.name}</p>
            </div>

            <p className="">{currency}{item.amount}</p>

            {
              item.cancelled
              ? <p className="text-xs font-medium text-red-400">Cancelled!</p>
              : item.isCompleted 
                ? <p className="text-xs font-medium text-green-500">Completed</p>
                :<img onClick={()=>cancelAppointment(item._id)} src={assets.cancel_icon} alt="" className="w-10 cursor-pointer" />
            }

          </div>

        ))}
      </div>
    </div>
  );
};

export default AllAppointments;
