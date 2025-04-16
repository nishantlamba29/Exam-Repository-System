import React from "react";
import { motion } from "motion/react";
import mayank from "../../Assets/mayank.jpg";
import lamba from "../../Assets/lamba.jpg"
import nikhil from "../../Assets/nikhil.jpg"

const developers = [
  {  
      image:mayank,
      name:'Mayank Gupta',
      role:'Fullstack Developer',
      stars:5,
      text:`I'm Mayank, a Computer Science undergrad at IIT (ISM) Dhanbad, someone who genuinely enjoys building things with code and understanding how systems work behind the scenes.`
  },
  {
      image:nikhil,
      name:"Nikhil Kumar",
      role:'Fullstack Developer',
      stars:5,
      text:`I'm Nishant, a Computer Science undergrad at IIT (ISM) Dhanbad, someone who genuinely enjoys building things with code and understanding how systems work behind the scenes.`
  },
  {
      image:lamba,
      name:'Nishant',
      role:'Backend Developer',
      stars:5,
      text:`I'm Nikhil, a Computer Science undergrad at IIT (ISM) Dhanbad, someone who genuinely enjoys building things with code and understanding how systems work behind the scenes.`
  },
]

const Testimonials = () => {
  return (
    <motion.div
      className="flex bg-gradient-to-b from-teal-50 to-orange-50  flex-col items-center justify-center mt-16"
      initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div
       className="flex flex-col items-center justify-center rounded-lg p-10"
       ><h1 className="text-4xl font-medium">Developers</h1>
      <p className="text-md text-stone-500 mt-2">Know About Us</p>
      <div className="flex flex-col md:flex-row gap-6 p-16 items-center">
        {developers.map((developer, index) => (
          // <TestimonialCard key={index} testimonial={testimonial} />
          <div className='flex flex-col border border-gray-200 shadow rounded-lg items-center p-5 bg-white/20 hover:scale-[1.05] cursor-pointer transition-all duration-200'>
          <img src={developer.image} alt="" className='mt-5 p-2 w-14 rounded-full w-30' />
          <h1 className='text-xl font-medium'>{developer.name}</h1>
          <h1 className='text-sm'>{developer.role}</h1>
          <p className='text-sm text-stone-500 text-center px-10 py-5'>{developer.text}</p>
        </div>
        ))}
      </div>
      </div>
    </motion.div>
  );
};

export default Testimonials;