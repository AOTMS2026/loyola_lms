import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const API_URL = import.meta.env.VITE_API_URL || 'https://loyola-lms.onrender.com/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/aliet_logo.png";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Upload,
  Briefcase,
  GraduationCap,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";

const instructorSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(100, { message: "Name must be less than 100 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
    areaOfExpertise: z
      .string()
      .min(1, { message: "Please select your area of expertise" }),
    customExpertise: z.string().optional(),
    experience: z
      .string()
      .min(1, { message: "Please select your experience level" }),
    resume: z.any().optional(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms & Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.areaOfExpertise === "Other") {
        return data.customExpertise && data.customExpertise.trim().length >= 2;
      }
      return true;
    },
    {
      message: "Please specify your area of expertise",
      path: ["customExpertise"],
    },
  );

type InstructorFormData = z.infer<typeof instructorSchema>;

import { motion } from "framer-motion";

const expertiseOptions = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "Cloud Computing",
  "Cybersecurity",
  "DevOps",
  "UI/UX Design",
  "Database Management",
  "Software Engineering",
  "Other",
];

const experienceOptions = [
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

const getPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
};

export default function InstructorRegister() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      areaOfExpertise: "",
      customExpertise: "",
      experience: "",
      agreeToTerms: false,
    },
  });

  const watchPassword = form.watch("password");
  const watchExpertise = form.watch("areaOfExpertise");
  const passwordStrength = getPasswordStrength(watchPassword || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setResumeFile(file);
      form.setValue("resume", file);
    }
  };

  const handleSubmit = async (data: InstructorFormData) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("areaOfExpertise", data.areaOfExpertise);
      if (data.customExpertise)
        formData.append("customExpertise", data.customExpertise);
      formData.append("experience", data.experience);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const res = await fetch(`${API_URL}/instructor/register`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Registration failed");
      }

      navigate("/");
    } catch (error: unknown) {
      toast({
        title: "Registration Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({
    met,
    text,
  }: {
    met: boolean;
    text: string;
  }) => (
    <div
      className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}
    >
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden bg-gradient-to-br from-[#0075CF]/20 via-white to-[#FD5A1A]/20">
        {/* Subtle Brand Orbs for Depth */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#0075CF]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#FD5A1A]/10 rounded-full blur-[120px]" />
      </div>

      {/* Left Panel — Visual Spacing */}
      <div className="md:w-1/2 relative flex flex-col pointer-events-none min-h-0 md:min-h-screen">
        <div className="relative md:absolute top-0 left-0 w-full p-8 lg:p-12 z-20 flex flex-col md:flex-row items-center justify-between pointer-events-none gap-6">
          <Link
            to="/"
            className="pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-[#0075CF] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest leading-none">
              Exit
            </span>
          </Link>
          <a
            href="/"
            className="pointer-events-auto transition-transform hover:scale-105 active:scale-95 inline-block"
          >
            <img src={logo} alt="Logo" className="h-10 lg:h-12" />
          </a>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10 min-h-screen">
        <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl relative">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0075CF]/10 to-[#FD5A1A]/10 rounded-3xl flex items-center justify-center border border-slate-100 shadow-xl mb-6">
              <GraduationCap className="h-8 w-8 text-[#0075CF]" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Mentor <span className="text-[#0075CF]">Consortium</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-sm">
              Empower the next generation and build industry-grade curriculum.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Row 1: Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Full Name
                      </FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <FormControl>
                          <Input
                            placeholder="Your Full Name"
                            className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Email Address
                      </FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="instructor@example.com"
                            className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Password
                      </FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Confirm Password
                      </FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <FormControl>
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Strength Indicator */}
              {watchPassword && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <PasswordRequirement
                    met={passwordStrength.checks.length}
                    text="8+ characters"
                  />
                  <PasswordRequirement
                    met={passwordStrength.checks.uppercase}
                    text="Uppercase letter"
                  />
                  <PasswordRequirement
                    met={passwordStrength.checks.lowercase}
                    text="Lowercase letter"
                  />
                  <PasswordRequirement
                    met={passwordStrength.checks.number}
                    text="Number"
                  />
                </div>
              )}

              {/* Row 3: Area of Expertise & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="areaOfExpertise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Area of Expertise
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all">
                            <SelectValue placeholder="Select expertise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border border-border shadow-lg z-[100]">
                          {expertiseOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Experience
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all">
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border border-border shadow-lg z-[100]">
                          {experienceOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Custom Expertise Field - Shows when "Other" is selected */}
              {watchExpertise === "Other" && (
                <FormField
                  control={form.control}
                  name="customExpertise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Specify Your Expertise
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Blockchain Development, Game Design..."
                          className="h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0075CF]/10 transition-all"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Resume Upload */}
              <FormField
                control={form.control}
                name="resume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Resume/CV{" "}
                      <span className="text-muted-foreground text-xs">
                        (Optional, Max 5MB)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          aria-label="Upload Resume"
                          title="Upload Resume"
                        />
                        <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0075CF]/30 transition-all group-hover:bg-[#0075CF]/5">
                          <Upload className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-500 font-medium">
                            {resumeFile
                              ? resumeFile.name
                              : "Upload your resume (PDF, DOC)"}
                          </span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Terms & Conditions */}
              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-muted/20 rounded-xl">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm cursor-pointer">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setShowTermsDialog(true)}
                          className="text-[#0075CF] hover:underline font-bold"
                        >
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => setShowPrivacyDialog(true)}
                          className="text-[#0075CF] hover:underline font-bold"
                        >
                          Privacy Policy
                        </button>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#0075CF] to-[#3391D9] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#0075CF]/20 hover:shadow-[#0075CF]/40 transition-all duration-300 active:scale-[0.98]"
              >
                {loading ? "Submitting Application..." : "Submit Application"}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/auth"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </div>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Terms of Service
            </DialogTitle>
            <DialogDescription>
              Please read our terms of service carefully before registering as
              an instructor.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">
                1. Instructor Agreement
              </h3>
              <p>
                By registering as an instructor on AOTMS, you agree to provide
                accurate and truthful information about your qualifications,
                experience, and expertise. You are responsible for maintaining
                the accuracy of your profile information.
              </p>

              <h3 className="font-semibold text-foreground">
                2. Content Guidelines
              </h3>
              <p>
                All course content must be original or properly licensed. You
                retain ownership of your content but grant AOTMS a non-exclusive
                license to distribute and promote your courses on our platform.
              </p>

              <h3 className="font-semibold text-foreground">
                3. Quality Standards
              </h3>
              <p>
                Instructors must maintain high-quality standards in their
                courses, including clear audio/video, well-structured content,
                and responsive student support. Courses may be reviewed and
                removed if they don't meet our quality guidelines.
              </p>

              <h3 className="font-semibold text-foreground">
                4. Payment Terms
              </h3>
              <p>
                Instructor earnings are calculated based on student enrollments
                and course completions. Payments are processed monthly, with a
                minimum threshold of applicable currency. Detailed payment terms
                will be provided upon approval.
              </p>

              <h3 className="font-semibold text-foreground">
                5. Code of Conduct
              </h3>
              <p>
                Instructors must maintain professional behavior in all
                interactions with students. Harassment, discrimination, or any
                form of misconduct will result in immediate account suspension.
              </p>

              <h3 className="font-semibold text-foreground">
                6. Intellectual Property
              </h3>
              <p>
                You must not upload content that infringes on third-party
                intellectual property rights. AOTMS reserves the right to remove
                any content that violates copyright or trademark laws.
              </p>

              <h3 className="font-semibold text-foreground">
                7. Account Termination
              </h3>
              <p>
                AOTMS reserves the right to terminate instructor accounts that
                violate these terms, receive consistent negative feedback, or
                fail to meet platform standards after appropriate warnings.
              </p>

              <h3 className="font-semibold text-foreground">
                8. Dispute Resolution
              </h3>
              <p>
                Any disputes arising from this agreement shall be resolved
                through arbitration in accordance with applicable laws. Both
                parties agree to attempt resolution through good-faith
                negotiation first.
              </p>
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowTermsDialog(false)}>
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Privacy Policy
            </DialogTitle>
            <DialogDescription>
              Learn how we collect, use, and protect your personal information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">
                1. Information We Collect
              </h3>
              <p>
                We collect information you provide during registration including
                your name, email address, professional qualifications, and
                resume. We also collect usage data to improve our services.
              </p>

              <h3 className="font-semibold text-foreground">
                2. How We Use Your Information
              </h3>
              <p>
                Your information is used to verify your identity, process your
                instructor application, facilitate course creation, process
                payments, and communicate important updates about our platform.
              </p>

              <h3 className="font-semibold text-foreground">
                3. Information Sharing
              </h3>
              <p>
                We do not sell your personal information. We may share necessary
                information with payment processors, identity verification
                services, and as required by law.
              </p>

              <h3 className="font-semibold text-foreground">
                4. Data Security
              </h3>
              <p>
                We implement industry-standard security measures to protect your
                data, including encryption, secure servers, and regular security
                audits. However, no system is completely secure.
              </p>

              <h3 className="font-semibold text-foreground">5. Your Rights</h3>
              <p>
                You have the right to access, correct, or delete your personal
                information. You can also request a copy of your data or opt out
                of certain communications. Contact our support team for
                assistance.
              </p>

              <h3 className="font-semibold text-foreground">
                6. Cookies and Tracking
              </h3>
              <p>
                We use cookies and similar technologies to enhance your
                experience, analyze usage patterns, and personalize content. You
                can manage cookie preferences in your browser settings.
              </p>

              <h3 className="font-semibold text-foreground">
                7. Data Retention
              </h3>
              <p>
                We retain your information for as long as your account is active
                or as needed to provide services. You can request deletion of
                your account and associated data at any time.
              </p>

              <h3 className="font-semibold text-foreground">
                8. Policy Updates
              </h3>
              <p>
                We may update this privacy policy periodically. We will notify
                you of significant changes via email or through our platform.
                Continued use of our services constitutes acceptance of updates.
              </p>

              <h3 className="font-semibold text-foreground">9. Contact Us</h3>
              <p>
                If you have questions about this privacy policy or our data
                practices, please contact our Data Protection Officer at
                privacy@aotms.com.
              </p>
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowPrivacyDialog(false)}>
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}