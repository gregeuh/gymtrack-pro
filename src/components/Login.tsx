import { auth, googleProvider, signInWithPopup } from '../firebase';
import { motion } from 'motion/react';
import { Dumbbell } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 text-center shadow-2xl shadow-blue-500/5"
      >
        <div className="inline-flex p-5 bg-blue-600 rounded-3xl mb-8 shadow-xl shadow-blue-600/30">
          <Dumbbell className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">GymTrack Pro</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-lg leading-relaxed">Suivez vos progrès, atteignez vos objectifs et transformez votre corps.</p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-5 px-6 rounded-[1.5rem] hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
          Se connecter avec Google
        </button>

        <p className="mt-10 text-sm text-zinc-400 dark:text-zinc-500 font-medium">
          En vous connectant, vous acceptez nos <span className="underline cursor-pointer">conditions</span> et notre <span className="underline cursor-pointer">politique</span>.
        </p>
      </motion.div>
    </div>
  );
}
