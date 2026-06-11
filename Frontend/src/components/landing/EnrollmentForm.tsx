import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  LogIn,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  Rocket
} from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required").max(15, "Phone number is too long"),
  course: z.string().min(1, "Course selection is required"),
});

type FormData = z.infer<typeof formSchema>;

const EnrollmentForm = () => {
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://loyola-lms.onrender.com'}/api/public/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit enrollment');
      }

      toast({
        title: "Success! Your journey with AOTMS has begun.",
      });
      reset();
    } catch (error) {
      console.error("Enrollment Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  };
  return (
    <section
      id="enroll"
      className="relative py-24 lg:py-32 overflow-hidden bg-white"
    >
      {/* Premium Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0075CF]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#FD5A1A]/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/4" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(#0075CF 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container-width px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-50 border border-slate-100 text-[#0075CF] text-[10px] font-black uppercase tracking-[0.25em] mb-6 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-[#0075CF]/20" /> Accelerated
              Enrollment
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-950 mb-7 leading-[0.95] tracking-tighter"
            >
              Ready to Secure <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0075CF] via-[#00aaff] to-[#FD5A1A]">
                Your Dream Career?
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Choose your path below to start your transformation. Join 2000+ graduates who have already accelerated their futures.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            {/* Left Content: Trust & Benefits */}
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-8">
                {[
                  {
                    icon: CheckCircle2,
                    title: "Curriculum Excellence",
                    desc: "Industry-mapped tracks updated for current tech requirements.",
                    color: "bg-blue-50 text-[#0075CF]",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Career Assurance",
                    desc: "Dedicated placement cell connecting you with MNC partners.",
                    color: "bg-orange-50 text-[#FD5A1A]",
                  },
                  {
                    icon: Sparkles,
                    title: "Elite Mentorship",
                    desc: "Learn directly from tech leads and architects from top firms.",
                    color: "bg-blue-50 text-[#0075CF]",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-5 group cursor-default"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
                        {item.title}
                      </h4>
                      <p className="text-slate-500 font-medium leading-normal text-sm">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Success Stat */}
              <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-[2.5rem] p-7 text-slate-900 relative overflow-hidden shadow-xl border border-slate-50"
              >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FD5A1A]/5 blur-3xl rounded-full" />
                  <div className="relative z-10 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                          <Rocket className="w-7 h-7 text-[#FD5A1A]" />
                      </div>
                      <div>
                          <p className="text-xl font-black tracking-tight leading-none mb-1 text-slate-900">
                              LMS Driven Success
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                              Powered by modern tech
                          </p>
                      </div>
                  </div>
              </motion.div>
            </div>

            {/* Right Side: Gateway Options */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Register Path */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  className="flex"
                >
                  <Link 
                    to="/signup" 
                    className="group relative flex flex-col justify-between w-full p-8 md:p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-xl hover:shadow-[#0075CF]/10 hover:border-[#0075CF]/20 transition-all duration-500 text-left overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#0075CF]/5 blur-[60px] rounded-full transition-all group-hover:bg-[#0075CF]/10" />
                    
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#0075CF] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#0075CF]/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <UserPlus className="w-8 h-8" />
                      </div>
                      <h3 className="text-3xl font-black text-slate-950 mb-4 tracking-tighter leading-tight italic uppercase">
                        New <br /> 
                        <span className="text-[#0075CF]">Student?</span>
                      </h3>
                      <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Register now to unlock your personalized dashboard and start learning immediately.
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3 text-[#0075CF] font-black uppercase text-xs tracking-widest group-hover:gap-5 transition-all">
                      Register Now <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.div>

                {/* Login Path */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ y: -10 }}
                  className="flex"
                >
                  <Link 
                    to="/login" 
                    className="group relative flex flex-col justify-between w-full p-8 md:p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-xl hover:shadow-[#FD5A1A]/10 hover:border-[#FD5A1A]/20 transition-all duration-500 text-left overflow-hidden"
                  >
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#FD5A1A]/5 blur-[60px] rounded-full transition-all group-hover:bg-[#FD5A1A]/10" />
                    
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#FD5A1A] to-[#FD8C5E] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#FD5A1A]/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                        <LogIn className="w-8 h-8" />
                      </div>
                      <h3 className="text-3xl font-black text-slate-950 mb-4 tracking-tighter leading-tight italic uppercase">
                        Already <br />
                        <span className="text-[#FD5A1A]">Enrolled?</span>
                      </h3>
                      <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Sign in to resume your curriculum and continue your professional journey.
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3 text-[#FD5A1A] font-black uppercase text-xs tracking-widest group-hover:gap-5 transition-all">
                      Access Portal <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnrollmentForm;