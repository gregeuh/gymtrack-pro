import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'motion/react';
import { Dumbbell, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Tentative de connexion
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // Si l'utilisateur n'existe pas, on crée le compte automatiquement
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr: any) {
          if (createErr.code === 'auth/weak-password') {
            setError("Le mot de passe doit faire au moins 6 caractères.");
          } else {
            setError("Identifiants incorrects ou erreur de création.");
          }
        }
      } else {
        setError("Une erreur est survenue lors de la connexion.");
      }
    } finally {
      setLoading(false);
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
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-lg leading-relaxed">Connectez-vous pour suivre vos séances.</p>

        <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
          {/* Champ Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Champ Mot de Passe */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-black py-5 px-6 rounded-[1.5rem] hover:opacity-90 transition-all active:scale-95 shadow-lg mt-6"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Se connecter / S'inscrire"}
          </button>
        </form>

        <p className="mt-10 text-sm text-zinc-400 dark:text-zinc-500 font-medium italic">
          Note : Si vous n'avez pas de compte, il sera créé automatiquement avec cet e-mail.
        </p>
      </motion.div>
    </div>
  );
}