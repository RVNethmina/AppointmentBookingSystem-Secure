import React, { useContext, useState } from "react";
import { assets } from "../../assets/assets";
import { AdminContext } from "../../Context/AdminContext";
import { toast } from 'react-toastify'
import axios from 'axios'


const AddDoctor = () => {

  // input data are stored this variables via setter functions
  const [docImg,setDocImg] = useState(false)
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [experience,setExperience] = useState('1 year')
  const [fees,setFees] = useState('')
  const [about,setAbout] = useState('')
  const [speciality,setSpeciality] = useState('General Physician')
  const [degree,setDegree] = useState('')
  const [address1,setAddress1] = useState('')
  const [address2,setAddress2] = useState('')

  const { backendUrl, aToken } = useContext(AdminContext)

  
  const onSubmitHandler = async (event) => {
    event.preventDefault()

    try {

      if (!docImg) {
        return toast.error("Image Not Selected!")
      }

      const formData = new FormData()

      //same name we use in the multer = 'image'
      formData.append('image',docImg)
      formData.append('name',name)
      formData.append('email',email)
      formData.append('password',password)
      formData.append('experience',experience)
      formData.append('fees',Number(fees))
      formData.append('about',about)
      formData.append('speciality',speciality)
      formData.append('degree',degree)
      formData.append('address',JSON.stringify({line1:address1,line2:address2}))

      //console log form data
      formData.forEach((value,key)=>{
        console.log(`${key} : ${value}`);
      })

      //aToken is coverted to 'atoken' backend authAdmin middleware
 
      const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers:{ aToken }})
      
      if (data.success) {
        toast.success(data.message)
        setDocImg(false)
        setName('')
        setPassword('')
        setEmail('')
        setAddress1('')
        setAddress2('')
        setDegree('')
        setAbout('')
        setFees('')
        
      }
      else{
        toast.error(data.message)
      }
      
    } catch (error) {
      toast.error(error.message)
      console.log(error)
    }
  }


  return (
    <form onSubmit={onSubmitHandler} className="w-full m-5">
      <p className="mb-3 text-lg font-medium">Add Doctor</p>

      <div className="bg-white px-8 py-8 border rounded w-full max-w-4xl max-h-[80vh] overflow-y-scroll">
        <div className="flex items-center gap-4 mb-8 text-gray-500">
          
          <label htmlFor="doc-img">
            <img src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} alt="" className="w-16 bg-gray-100 rounded-full cursor-pointer" />
          </label>

          <input onChange={(e)=> setDocImg(e.target.files[0])} type="file" id="doc-img" hidden className="" />
          <p className="">
            Upload doctor <br /> picture
          </p>
        </div>

        <div className="flex flex-col items-start gap-10 text-gray-600 lg:flex-row">
          {/*------------- Left side------------- */}
          <div className="flex flex-col w-full gap-4 lg:flex-1">

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Doctor name</p>
              <input onChange={(e)=> setName(e.target.value)} value={name} type="text" placeholder="Name" className="px-3 py-2 border rounded" />
            </div>

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Doctor Email</p>
              <input onChange={(e)=> setEmail(e.target.value)} value={email} type="email" placeholder="Email" className="px-3 py-2 border rounded" />
            </div>

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Doctor Password</p>
              <input onChange={(e)=> setPassword(e.target.value)} value={password} type="password" placeholder="Password" className="px-3 py-2 border rounded" />
            </div>

            <div className="">
              <p className="">Experience</p>
              <select onChange={(e)=> setExperience(e.target.value)} value={experience} id="1" className="px-3 py-2 border rounded">
                <option value="1 Year" className="">
                  1 Year
                </option>
                <option value="2 Year" className="">
                  2 Year
                </option>
                <option value="3 Year" className="">
                  3 Year
                </option>
                <option value="4 Year" className="">
                  4 Year
                </option>
                <option value="5 Year" className="">
                  5 Year
                </option>
                <option value="6 Year" className="">
                  6 Year
                </option>
                <option value="7 Year" className="">
                  7 Year
                </option>
                <option value="8 Year" className="">
                  8 Year
                </option>
                <option value="9 Year" className="">
                  9 Year
                </option>
                <option value="10 Year" className="">
                  10 Year
                </option>
              </select>
            </div>

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Fees</p>
              <input onChange={(e)=> setFees(e.target.value)} value={fees} type="number" placeholder="Fees" className="px-3 py-2 border rounded" />
            </div>
          </div>

          {/*------------- Right side------------- */}

          <div className="flex flex-col w-full gap-4 lg:flex-1">


            <div className="flex flex-col flex-1 gap-1">
              <p className="">Speciality</p>

              <select onChange={(e)=> setSpeciality(e.target.value)} value={speciality} id="2" className="px-3 py-2 border rounded">
                <option value="General physician" className="">
                  General physician
                </option>
                <option value="Gynecologist" className="">
                  Gynecologist
                </option>
                <option value="Dermatologist" className="">
                  Dermatologist
                </option>
                <option value="Pediatricians" className="">
                  Pediatricians
                </option>
                <option value="Neurologist" className="">
                  Neurologist
                </option>
                <option value="Gastroenterologist" className="">
                  Gastroenterologist
                </option>
              </select>
            </div>

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Education</p>
              <input onChange={(e)=> setDegree(e.target.value)} value={degree} type="text" placeholder="Education" className="px-3 py-2 border rounded" />
            </div>

            <div className="flex flex-col flex-1 gap-1">
              <p className="">Address</p>
              <input  onChange={(e)=> setAddress1(e.target.value)} value={address1} 
                type="text"
                placeholder="Address 1"
                required
                className="px-3 py-2 border rounded"
              />
              <input  onChange={(e)=> setAddress2(e.target.value)} value={address2} 
                type="text"
                placeholder="Address 2"
                required
                className="px-3 py-2 border rounded"
              />
            </div>
          </div>

          
        </div>

        <div className="">
            <p className="mt-4 mb-2">About Doctor</p>
            <textarea onChange={(e)=> setAbout(e.target.value)} value={about} placeholder="Write about Doctor" rows={5} required  className="w-full px-4 pt-2 border rounded"/>
        </div>

        <button type="submit" className="px-10 py-3 mt-4 text-white rounded-full bg-primary">Add Doctor</button>
        
      </div>
    </form>
  );
};

export default AddDoctor;
