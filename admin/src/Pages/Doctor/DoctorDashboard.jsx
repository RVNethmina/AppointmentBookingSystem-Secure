import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../Context/DoctorContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../Context/AppContext";

const DoctorDashboard = () => {
  const { dToken, dashData, setDashData, getDashData ,completeAppointment,cancleAppointment} = useContext(DoctorContext);
  const {currency, slotDateFormat} = useContext(AppContext)

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  return (
    dashData && (
      <div className="m-5">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 p-4 transition-all bg-white border-2 border-gray-100 rounded cursor-pointer min-w-52 hover:scale-105">
            <img src={assets.earning_icon} className="w-14" />

            <div className="">
              <p className="text-xl font-semibold text-gray-600">
                {currency} {dashData.earnings}
              </p>
              <p className="text-gray-400">Earnings</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 transition-all bg-white border-2 border-gray-100 rounded cursor-pointer min-w-52 hover:scale-105">
            <img src={assets.appointments_icon} className="w-14" />

            <div className="">
              <p className="text-xl font-semibold text-gray-600">
                {dashData.appointments}
              </p>
              <p className="text-gray-400">Appointments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 transition-all bg-white border-2 border-gray-100 rounded cursor-pointer min-w-52 hover:scale-105">
            <img src={assets.patients_icon} className="w-14" />

            <div className="">
              <p className="text-xl font-semibold text-gray-600">
                {dashData.patients}
              </p>
              <p className="text-gray-400">Patients</p>
            </div>
          </div>
        </div>


        {/* ---------------Latest Appointments----------------- */}
        <div className="bg-white">
            <div className="flex items-center gap-2.5 px-4 py-4  mt-10 rounded-t border">
              <img src={assets.list_icon} alt="" className="" />
              <p className="font-semibold">Latest Bookings</p>
            </div>
  
            <div className="pt-4 border border-t-0">
              {dashData.latestAppointments.map((item, index) => (
                <div key={index} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-100">
                  <img src={item.userData.image} className="w-10 rounded-full" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-800">{item.userData.name}</p>
                    <p className="text-gray-600">{slotDateFormat(item.slotDate)}</p>
                  </div>
  
                  {/* if appointments cancelled we show "Cancelled" the if not, if appointments completed "completed" if not show buttons*/}
                  { 
                    item.cancelled 
                    ? <p className="text-xs font-medium text-red-400">Cancelled!</p>
                    : item.isCompleted
                      ? <p className="text-xs font-medium text-green-500">Completed!</p>
                      : <div className="flex">
                          <img onClick={()=>cancleAppointment(item._id)} src={assets.cancel_icon} className="w-10 cursor-pointer" />
                          <img onClick={()=>completeAppointment(item._id)} src={assets.tick_icon} className="w-10 cursor-pointer" />
                        </div>
                  }
                </div>
              ))}
            </div>
          </div>

      </div>
    )
  );
};

export default DoctorDashboard;
