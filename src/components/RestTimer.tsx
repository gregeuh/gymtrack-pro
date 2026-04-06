import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, X, Play, Pause, RotateCcw, Bell, BellOff } from 'lucide-react';

interface RestTimerProps {
  duration: number; // in seconds
  onClose: () => void;
  theme: 'light' | 'dark';
}

export default function RestTimer({ duration: initialDuration, onClose, theme }: RestTimerProps) {
  const [duration, setDuration] = useState(initialDuration);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isActive, setIsActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = () => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playBeep();
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        backgroundColor: timeLeft === 0 ? (theme === 'dark' ? '#1e1b4b' : '#e0e7ff') : (theme === 'dark' ? '#18181b' : '#ffffff')
      }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      className={`fixed bottom-[calc(96px+env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-8 md:w-80 p-6 rounded-3xl border shadow-2xl z-50 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${timeLeft === 0 ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-500/10 text-blue-500'}`}>
            <Timer className="w-5 h-5" />
          </div>
          <span className="font-bold">Repos</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className={`relative h-2 rounded-full overflow-hidden mb-6 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`absolute inset-y-0 left-0 ${timeLeft === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
        />
      </div>

      <div className="text-center mb-6">
        <motion.span 
          key={timeLeft}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={`text-6xl font-black tabular-nums block ${timeLeft === 0 ? 'text-green-500' : ''}`}
        >
          {formatTime(timeLeft)}
        </motion.span>
        {timeLeft === 0 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold text-green-500 mt-2 uppercase tracking-widest"
          >
            C'est reparti !
          </motion.p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            setTimeLeft(duration);
            setIsActive(true);
          }}
          className={`p-4 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
          title="Réinitialiser"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setIsActive(!isActive)}
          className={`p-5 rounded-2xl text-white shadow-lg transition-all active:scale-90 ${
            timeLeft === 0 
              ? 'bg-green-500 shadow-green-500/20' 
              : 'bg-blue-600 shadow-blue-600/20'
          }`}
        >
          {isActive ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
        </button>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setTimeLeft((prev) => prev + 30);
              setDuration((prev) => prev + 30);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-90 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
          >
            +30s
          </button>
          <button
            onClick={() => {
              const newTime = Math.max(0, timeLeft - 30);
              setTimeLeft(newTime);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-90 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
          >
            -30s
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-6">
        {[30, 60, 90, 120].map((s) => (
          <button
            key={s}
            onClick={() => {
              setDuration(s);
              setTimeLeft(s);
              setIsActive(true);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              duration === s 
                ? 'bg-blue-500 text-white' 
                : (theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200')
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
    </motion.div>
  );
}
