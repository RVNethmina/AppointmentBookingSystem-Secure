import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='md:mx-10'>
        <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
            {/*----------- Left Section------------ */}
            <div className="">
                <img src={assets.logo} alt="" className="w-40 mb-5" />
                <p className="w-full leading-6 text-gray-600 md:w-2/3">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quod nesciunt cum magni magnam voluptatem earum adipisci ducimus et, voluptate ad facere eius expedita perferendis laboriosam autem dolores dolor nam hic?</p>

            </div>
            {/*----------- Center Section------------ */}
            <div className="">
                <p className="mb-5 text-xl font-medium">COMPANY</p>
                <ul className='flex flex-col gap-2 text-gray-600'>
                    <li>Home</li>
                    <li>About us</li>
                    <li>Contact us</li>
                    <li>Privacy policy</li>
                </ul>
            </div>
            {/*----------- Right Section------------ */}
            <div className="">
                <p className="mb-5 text-xl font-medium">GET IN TOUCH</p>
                <ul className='flex flex-col gap-2 text-gray-600'>
                    <li>+94 70 331 8808</li>
                    <li>ravindu.nethmina.work@gmail.com</li>
                </ul>
            </div>

        </div>

        {/* -----------Copyright Text-------- */}
        <div className="">
            <hr />
            <p className="py-5 text-sm text-center">Copyright © 2024 RavinDuNetmina - All Right Reserved.</p>
        </div>
      
    </div>
  )
}

export default Footer
