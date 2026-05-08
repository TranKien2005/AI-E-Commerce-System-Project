"use client";

import { useState, useEffect } from "react";
import { X, Mic } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AiSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiSearchOverlay({ isOpen, onClose }: AiSearchOverlayProps) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "auto";
      };
    } else {
      document.body.style.overflow = "auto";
      setIsListening(false);
    }
  }, [isOpen, onClose]);

  const suggestions = [
    "máy lọc không khí",
    "robot hút bụi",
    "đèn ngủ thông minh",
    "quạt không cánh",
    "máy tạo ẩm",
    "đèn bàn làm việc",
    "camera an ninh"
  ];

  const containerVariants = {
    hidden: { opacity: 0, scale: 1.05 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      opacity: 0, 
      scale: 1.05,
      transition: { duration: 0.3, ease: [0.4, 0, 1, 1] }
    }
  };

  const chipVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.4 + i * 0.05,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex flex-col bg-background/90 backdrop-blur-2xl"
        >
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-3 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-secondary/80 z-20"
            aria-label="Đóng"
          >
            <X size={28} strokeWidth={1.5} />
          </button>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 max-w-4xl mx-auto w-full">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-light mb-16 text-center tracking-tight"
            >
              {isListening ? "Tôi đang lắng nghe..." : "Bạn muốn tìm gì?"}
            </motion.h2>

            {/* Waveform Animation */}
            <div className="h-32 w-full max-w-md flex items-center justify-center gap-2 mb-16">
              {[...Array(20)].map((_, i) => (
                <motion.div 
                  key={i} 
                  animate={{ 
                    height: isListening ? [20, Math.random() * 80 + 20, 20] : 4,
                    opacity: isListening ? 1 : 0.3
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.6 + Math.random() * 0.6,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 rounded-full bg-gradient-to-t from-primary/40 to-primary"
                />
              ))}
            </div>

            {/* Mic Button */}
            <div className="relative group mb-20">
              <AnimatePresence>
                {isListening && (
                  <>
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                      className="absolute inset-0 bg-primary/20 rounded-full"
                    />
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 1 }}
                      className="absolute inset-0 bg-primary/20 rounded-full"
                    />
                  </>
                )}
              </AnimatePresence>
              
              <button 
                onClick={() => setIsListening(!isListening)}
                className={cn(
                  "relative w-32 h-32 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                  isListening 
                    ? "bg-primary border-primary shadow-[0_0_50px_rgba(121,134,176,0.5)]" 
                    : "bg-background border-border group-hover:border-primary/50 shadow-2xl"
                )}
              >
                <Mic 
                  size={44} 
                  strokeWidth={1.5} 
                  className={cn(
                    "transition-colors duration-300",
                    isListening ? "text-primary-foreground" : "text-foreground group-hover:text-primary"
                  )} 
                />
              </button>
            </div>

            {/* Text Input */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-2xl mb-16 relative"
            >
              <input 
                type="text"
                placeholder="Hỏi Aeris về bất cứ điều gì..."
                className="w-full bg-secondary/30 border border-border/40 rounded-3xl h-20 px-10 text-xl font-light focus:outline-none focus:border-primary focus:bg-background transition-all"
                autoFocus
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded border border-border/40">ESC</span>
              </div>
            </motion.div>

            {/* Suggestions */}
            <div className="w-full text-center">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-semibold text-muted-foreground mb-8 uppercase tracking-[0.25em]"
              >
                Gợi ý cho bạn
              </motion.p>
              <div className="flex flex-wrap justify-center gap-4">
                {suggestions.map((suggestion, idx) => (
                  <motion.div
                    key={suggestion}
                    custom={idx}
                    variants={chipVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link 
                      href={`/search?q=${encodeURIComponent(suggestion)}`}
                      onClick={onClose}
                      className="px-7 py-3.5 bg-secondary/40 border border-transparent hover:border-primary/20 hover:bg-background hover:shadow-xl rounded-full text-sm font-medium transition-all"
                    >
                      {suggestion}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
