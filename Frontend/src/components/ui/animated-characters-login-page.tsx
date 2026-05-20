"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Code,
  Cpu,
  Globe,
  Database,
  Terminal,
  Settings,
  Monitor,
  Smartphone,
  Server,
  HardDrive,
} from "lucide-react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
  isBlinking?: boolean;
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY,
  isBlinking = false,
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    // If forced look direction is provided, use that instead of mouse tracking
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px) scaleY(${isBlinking ? 0.05 : 1})`,
        transition: "transform 0.1s ease-out",
        overflow: "hidden",
        borderRadius: "50%",
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    // If forced look direction is provided, use that instead of mouse tracking
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
        overflow: "hidden",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
};

interface AnimatedCharactersLoginProps {
  email?: string;
  password?: string;
  showPassword?: boolean;
  isTyping?: boolean;
  children?: React.ReactNode;
  logo?: string;
  overlay?: React.ReactNode;
}

interface FloatingIconProps {
  icon: React.ElementType;
  delay: number;
  left: number;
  duration: number;
  size: number;
  color: string;
}

const FloatingIcon = ({
  icon: Icon,
  delay,
  left,
  duration,
  size,
  color,
}: FloatingIconProps) => (
  <div
    className="absolute pointer-events-none opacity-[0.8] animate-float-up"
    style={{
      left: `${left}%`,
      bottom: "-10%",
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      transform: `scale(${size})`,
      color: color,
      filter: `drop-shadow(0 0 8px ${color}44)`,
    }}
  >
    <Icon size={40} />
  </div>
);

export function AnimatedCharactersLogin({
  email = "",
  password = "",
  showPassword = false,
  isTyping = false,
  children,
  logo,
  overlay,
}: AnimatedCharactersLoginProps) {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isOrangeBlinking, setIsOrangeBlinking] = useState(false);
  const [isYellowBlinking, setIsYellowBlinking] = useState(false);
  const [interactionStage, setInteractionStage] = useState<"idle" | "noticing" | "privacy">("idle");
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking effect for purple character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000; // Random between 3-7 seconds

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150); // Blink duration 150ms
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for black character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000; // Random between 3-7 seconds

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150); // Blink duration 150ms
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for orange character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 4000;
    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsOrangeBlinking(true);
        setTimeout(() => {
          setIsOrangeBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());
      return blinkTimeout;
    };
    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for yellow character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 2000;
    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsYellowBlinking(true);
        setTimeout(() => {
          setIsYellowBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());
      return blinkTimeout;
    };
    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Privacy-aware interaction animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTyping) {
      setInteractionStage("noticing");
      timer = setTimeout(() => {
        setInteractionStage("privacy");
      }, 700); // Look towards the input for 700ms, then look away for privacy
    } else {
      setInteractionStage("idle");
    }
    return () => clearTimeout(timer);
  }, [isTyping]);

  // Purple sneaky peeking animation when typing password and it's visible
  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(
          () => {
            setIsPurplePeeking(true);
            setTimeout(() => {
              setIsPurplePeeking(false);
            }, 800); // Peek for 800ms
          },
          Math.random() * 3000 + 2000,
        ); // Random peek every 2-5 seconds
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword, isPurplePeeking]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    if (interactionStage === "noticing") {
      return { faceX: 12, faceY: 2, bodySkew: -4 }; // Look towards the form
    }
    
    if (interactionStage === "privacy") {
      return { faceX: -15, faceY: 5, bodySkew: 5 }; // Look away for privacy
    }

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden relative">
      {/* Background Decor Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-gradient-to-br from-[#0075CF]/10 via-white to-[#FD5A1A]/10" />

      {/* Left Content Section */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#004E8C] via-[#0059a4] to-[#E64E00] p-12 text-white">
        <div className="relative z-20">
          <a
            href="/"
            className="inline-block transition-transform hover:scale-105 active:scale-95 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10"
          >
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="h-12 lg:h-14 w-auto object-contain brightness-0 invert"
              />
            ) : (
              <div className="flex items-center gap-2 text-lg font-black uppercase tracking-widest">
                <div className="size-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <span>AOTMS</span>
              </div>
            )}
          </a>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          {/* Cartoon Characters */}
          <div className="relative" style={{ width: "550px", height: "400px" }}>
            {/* Purple tall rectangle character - Back layer */}
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out border-2 border-white/40 shadow-2xl shadow-black/20"
              style={{
                left: "70px",
                width: "180px",
                height:
                  isTyping || (password.length > 0 && !showPassword)
                    ? "440px"
                    : "400px",
                backgroundColor: "#6C3FF5",
                borderRadius: "10px 10px 0 0",
                zIndex: 1,
                transform:
                  password.length > 0 && showPassword
                    ? `skewX(0deg)`
                    : interactionStage !== "idle"
                      ? `skewX(${purplePos.bodySkew || 0}deg)`
                      : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Eyes */}
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${20}px`
                      : `${45 + purplePos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${35}px`
                      : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 4 :
                    interactionStage === "privacy" ? -5 :
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 4
                        : -4
                      : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 2 :
                    interactionStage === "privacy" ? 3 :
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 5
                        : -4
                      : undefined
                  }
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 4 :
                    interactionStage === "privacy" ? -5 :
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 4
                        : -4
                      : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 2 :
                    interactionStage === "privacy" ? 3 :
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 5
                        : -4
                      : undefined
                  }
                />
              </div>
              {/* Purple Mouth - Smile */}
              <div
                className="absolute w-12 h-6 border-b-4 border-[#2D2D2D] rounded-full transition-all duration-300"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${35}px`
                      : `${65 + purplePos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${75}px`
                      : `${85 + purplePos.faceY}px`,
                  transform: isTyping ? "scale(1.2)" : "scale(1)",
                }}
              />
            </div>

            {/* Black tall rectangle character - Middle layer */}
            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out border-2 border-white/40 shadow-2xl shadow-black/30"
              style={{
                left: "240px",
                width: "120px",
                height: "310px",
                backgroundColor: "#2D2D2D",
                borderRadius: "8px 8px 0 0",
                zIndex: 2,
                transform:
                  password.length > 0 && showPassword
                    ? `skewX(0deg)`
                    : interactionStage !== "idle"
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Eyes */}
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${10}px`
                      : `${26 + blackPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${28}px`
                      : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
              </div>
              {/* Black Mouth - Neutral line */}
              <div
                className="absolute w-8 h-[3px] bg-white/40 rounded-full transition-all duration-300"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${30}px`
                      : `${45 + blackPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${65}px`
                      : `${75 + blackPos.faceY}px`,
                  transform: isTyping ? "scaleX(1.5)" : "scaleX(1)",
                }}
              />
            </div>

            {/* Orange semi-circle character - Front left */}
            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out border-2 border-white/40 shadow-2xl shadow-black/10"
              style={{
                left: "0px",
                width: "240px",
                height: "200px",
                zIndex: 3,
                backgroundColor: "#FF9B6B",
                borderRadius: "120px 120px 0 0",
                transform:
                  password.length > 0 && showPassword
                    ? `skewX(0deg)`
                    : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Eyes - with white EyeBall like other characters */}
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${55}px`
                      : `${75 + (orangePos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${80}px`
                      : `${85 + (orangePos.faceY || 0)}px`,
                }}
              >
                <EyeBall
                  size={20}
                  pupilSize={8}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isOrangeBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
                <EyeBall
                  size={20}
                  pupilSize={8}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isOrangeBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
              </div>
              {/* Orange Mouth - Small 'o' */}
              <div
                className="absolute w-3 h-3 border-2 border-[#2D2D2D] rounded-full transition-all duration-300"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${95}px`
                      : `${115 + (orangePos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${115}px`
                      : `${125 + (orangePos.faceY || 0)}px`,
                  transform: isTyping ? "scale(1.5)" : "scale(1)",
                }}
              />
            </div>

            {/* Yellow tall rectangle character - Front right */}
            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out border-2 border-white/40 shadow-2xl shadow-black/10"
              style={{
                left: "310px",
                width: "140px",
                height: "230px",
                backgroundColor: "#E8D754",
                borderRadius: "70px 70px 0 0",
                zIndex: 4,
                transform:
                  password.length > 0 && showPassword
                    ? `skewX(0deg)`
                    : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Eyes - with white EyeBall like other characters */}
              <div
                className="absolute flex gap-5 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${25}px`
                      : `${48 + (yellowPos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${32}px`
                      : `${38 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isYellowBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isYellowBlinking}
                  forceLookX={
                    interactionStage === "noticing" ? 3 :
                    interactionStage === "privacy" ? -4 :
                    password.length > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    interactionStage === "noticing" ? 1 :
                    interactionStage === "privacy" ? 2 :
                    password.length > 0 && showPassword ? -4 : undefined
                  }
                />
              </div>
              {/* Yellow Mouth - Dynamic smile/line */}
              <div
                className="absolute w-14 h-4 border-b-2 border-[#2D2D2D] rounded-full transition-all duration-300"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? `${20}px`
                      : `${45 + (yellowPos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? `${75}px`
                      : `${85 + (yellowPos.faceY || 0)}px`,
                  borderRadius: isTyping ? "0 0 40px 40px" : "0",
                  height: isTyping ? "12px" : "2px",
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
          <a href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a href="/contact" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-[#FD5A1A]/10 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Right Form Section */}
      <div className="flex items-center justify-center p-8 bg-white relative z-10 shrink-0 min-h-screen overflow-hidden">
        {/* Floating Tech Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <FloatingIcon
            icon={Code}
            delay={0}
            left={10}
            duration={15}
            size={1.5}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Cpu}
            delay={2}
            left={35}
            duration={18}
            size={2}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Globe}
            delay={4}
            left={65}
            duration={20}
            size={1.2}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Database}
            delay={1}
            left={85}
            duration={16}
            size={1.8}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Terminal}
            delay={6}
            left={20}
            duration={22}
            size={1.4}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Settings}
            delay={3}
            left={50}
            duration={19}
            size={1.6}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Monitor}
            delay={7}
            left={42}
            duration={17}
            size={1.8}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Smartphone}
            delay={1.5}
            left={75}
            duration={21}
            size={1.1}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Server}
            delay={5}
            left={15}
            duration={19}
            size={1.5}
            color="#0075CF"
          />
          <FloatingIcon
            icon={HardDrive}
            delay={8}
            left={55}
            duration={23}
            size={1.3}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Code}
            delay={10}
            left={28}
            duration={16}
            size={2.2}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Cpu}
            delay={4.5}
            left={92}
            duration={24}
            size={1.5}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Globe}
            delay={12}
            left={7}
            duration={18}
            size={1.9}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Terminal}
            delay={3.5}
            left={80}
            duration={20}
            size={1.6}
            color="#0075CF"
          />
          <FloatingIcon
            icon={Settings}
            delay={11}
            left={48}
            duration={22}
            size={1.4}
            color="#FD5A1A"
          />
          <FloatingIcon
            icon={Monitor}
            delay={6.5}
            left={70}
            duration={15}
            size={2}
            color="#0075CF"
          />

          {/* Style for the floating animation */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes float-up {
              0% {
                transform: translateY(0) rotate(0deg) scale(var(--tw-scale-x));
                opacity: 0;
              }
              10% {
                opacity: 0.1;
              }
              90% {
                opacity: 0.1;
              }
              100% {
                transform: translateY(-120vh) rotate(360deg) scale(var(--tw-scale-x));
                opacity: 0;
              }
            }
            .animate-float-up {
              animation: float-up linear infinite;
            }
          `,
            }}
          />
        </div>

        <div className="absolute top-8 left-8 lg:hidden">
          <a
            href="/"
            className="inline-block transition-transform hover:scale-105 active:scale-95"
          >
            {logo ? (
              <img src={logo} alt="Logo" className="h-8 brightness-0 invert" />
            ) : (
              <div className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-[#0075CF]">
                <Sparkles className="size-5" />
                <span>AOTMS</span>
              </div>
            )}
          </a>
        </div>
        <div className="w-full max-w-[420px] relative z-20">{children}</div>
      </div>
      {overlay}
    </div>
  );
}
