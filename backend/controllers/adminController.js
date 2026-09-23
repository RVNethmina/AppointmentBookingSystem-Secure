// API for adding doctor
import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import { signAccessToken } from "../utils/token.js";
import { adminCredentialsMatch } from "../utils/adminCredentials.js";
import {
  isValidObjectId,
  parseAddress,
  parseFees,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "../utils/validators.js";
import { releaseSlot } from "../utils/slots.js";
import appointmentModel from "../models/AppointmentModel.js";
import userModel from "../models/userModel.js";

const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    //checking for all data to add doctor

    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    if (!req.file) {
      return res.json({ success: false, message: "Image file is required" });
    }

    // fees must be a sensible number and the address exactly two short lines
    const parsedFees = parseFees(fees);
    const parsedAddress = parseAddress(address);
    if (parsedFees === null || !parsedAddress) {
      return res.status(400).json({ success: false, message: "Invalid fees or address" });
    }

    //validating email format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    //validate strong password
    if (!isStrongPassword(password)) {
      return res.json({ success: false, message: PASSWORD_POLICY_MESSAGE });
    }

    //hashing doctor password
    //number 5 - 10 can be used, if we use higher number takes more time
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //upload image to cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees: parsedFees,
      address: parsedAddress,
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    res.json({ success: true, message: "Doctor Added!" });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//api for admin login

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email === "string" &&
      typeof password === "string" &&
      adminCredentialsMatch(email, password)
    ) {
      // the token carries a role claim and an expiry, never the password
      const token = signAccessToken({ role: "admin", email });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: "Invalid Credentials!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to get all doctors list

const allDoctors = async (req, res) => {
  try {
    // -password remove the password from the response
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to get All Appointments list
const appointmentsAdmin = async (req, res) => {
  try {
    //get all appointments
    const appointments = await appointmentModel.find({});
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API for appointment cancellation
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointment!" });
    }

    // atomic transition: only active appointments, and only once
    const appointmentData = await appointmentModel.findOneAndUpdate(
      { _id: appointmentId, cancelled: false, isCompleted: false },
      { cancelled: true }
    );

    if (!appointmentData) {
      return res.json({ success: false, message: "Cancellation failed!" });
    }

    //releasing cancelled doctor slot
    await releaseSlot(appointmentData.docId, appointmentData.slotDate, appointmentData.slotTime);

    res.json({ success: true, message: "Appointment Cancelled!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to get dashboard data for admin panel

const adminDashboard = async (req, res) => {

  try {

    const doctors =  await doctorModel.find({})
    const users = await userModel.find({})
    const appointments = await appointmentModel.find({})

    const dashData = {
        doctors: doctors.length,
        appointments : appointments.length,
        patients: users.length,
        latestAppointments: appointments.reverse().slice(0,5)

    }

    res.json({success:true, dashData})

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard
};
