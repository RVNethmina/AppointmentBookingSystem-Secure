import doctorModel from "../models/doctorModel.js";
import { signAccessToken } from "../utils/token.js";
import { verifyPassword } from "../utils/password.js";
import appointmentModel from "../models/AppointmentModel.js";

const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

const doctorList = async (req, res) => {
  // we get all data from doctorModel.find({}) -> {}
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API for doctor Login

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // only plain strings may reach the database query
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid Credentials!" });
    }

    const doctor = await doctorModel.findOne({ email });

    // always exactly one bcrypt comparison (see utils/password.js)
    const isMatch = await verifyPassword(password, doctor && doctor.password);

    if (doctor && isMatch) {
      const token = signAccessToken({ id: doctor._id, role: "doctor" });

      res.json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: "Invalid Credentials!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API for get all appointsments for doctor panel

const appointmentsDoctor = async (req, res) => {
  try {
    //get docid
    const docId = req.auth.id;

    //find appointments for this relevent doctor
    const appointments = await appointmentModel.find({ docId });

    //send this data
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to mark appointments completed for doctor panel
const appointmentComplete = async (req, res) => {
  try {
    const docId = req.auth.id;
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {isCompleted: true});
      return res.json({ success: true, message: "Appointment Completed!" });
    } else {
      return res.json({ success: false, message: "Mark failed!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to cancel appointments for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const docId = req.auth.id;
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {cancelled: true });
      return res.json({ success: true, message: "Appointment Cancelled!" });
    } else {
      return res.json({ success: false, message: "Cancellationfailed!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};


//API to get dashboard data for doctor panel
const doctorDashboard = async (req,res) => {
  
  try {

    const docId = req.auth.id
    const appointments = await appointmentModel.find({docId})

    let earnings = 0

    appointments.map((item)=>{

      if(item.isCompleted || item.payment) {
        earnings += item.amount
      }
    })

    let patients = []

    appointments.map((item)=>{

      if(!patients.includes(item.userId)){
        patients.push(item.userId)
      }
    })

    const dashData = {
      earnings,
      appointments:appointments.length,
      patients:patients.length,
      latestAppointments:appointments.reverse().slice(0,5)
    }

    res.json({success:true,dashData})
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};


//API to get Doctor profile for doctor panel
const doctorProfile = async (req,res) => {

  try {

    const docId = req.auth.id

    const profileData = await doctorModel.findById(docId).select('-password')

    res.json({success:true,profileData})
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
  
}


//API to update doctor profile data from doctor panel
const updateDoctorProfile = async (req,res) => {
  
  try {

    const docId = req.auth.id
    const { fees, address, available } = req.body

    await doctorModel.findByIdAndUpdate(docId,{fees,address,available})

    res.json({success:true,message:'Profile Updated!'})
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }

}

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorDashboard,
  updateDoctorProfile,
  doctorProfile
};
