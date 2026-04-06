import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Trophy, Clock, Zap, Dumbbell, Flame, TrendingUp } from 'lucide-react';
import { Workout } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShareWorkoutModalProps {
  workout: Workout;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export default function ShareWorkoutModal({ workout, onClose, theme }: ShareWorkoutModalProps) {
  const intensityMap: Record<number, string> = {
    1: "Récupération", 2: "Modérée", 3: "Intense", 4: "Très dure", 5: "Maximale"
  };

  const hasCardio = workout.exercises.some(ex => ex.sets.some(s => s.duration !== undefined && s.duration > 0));

  const totalVolume = workout.exercises.reduce((acc, ex) => acc + ex.sets.reduce((setAcc, set) => setAcc + ((set.weight || 0) * (set.reps || 0)), 0), 0);
  const totalReps = workout.exercises.reduce((acc, ex) => acc + ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0), 0), 0);
  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // LOGIQUE DE PARTAGE (VÉRITABLE FONCTIONNALITÉ)
  const handleShare = async () => {
    const text = `Séance : ${workout.name}\nVolume : ${totalVolume}kg\nIntensité : ${workout.intensity ? intensityMap[workout.intensity] : "Normale"}\nFait avec GymTrack Pro`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Ma Séance', text }); } catch (e) { console.log(e); }
    } else { alert("Partage non supporté, texte copié !"); navigator.clipboard.writeText(text); }
  };

  const handleCopy = () => {
    const text = `Séance : ${workout.name} - ${totalVolume}kg - Intensité : ${workout.intensity ? intensityMap[workout.intensity] : "Normale"}`;
    navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papier !");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} shadow-2xl`}>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 rounded-xl"><Trophy className="w-5 h-5 text-white" /></div><div><h3 className="font-black italic text-lg leading-none uppercase">Session Terminée</h3><p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{format(workout.date.toDate(), 'd MMMM yyyy', { locale: fr })}</p></div></div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800/10 rounded-full"><X className="w-5 h-5 text-zinc-500" /></button>
          </div>
          <div className={`p-6 rounded-[2rem] space-y-6 ${theme === 'dark' ? 'bg-zinc-950/50' : 'bg-zinc-50'}`}>
            <h4 className="text-xl font-black italic text-blue-600 leading-none">{workout.name}</h4>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="space-y-1"><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">{hasCardio ? <Clock className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}{hasCardio ? 'Durée' : 'Répétitions'}</span><span className="text-xl font-black italic">{hasCardio ? `${workout.duration} min` : `${totalReps} total`}</span></div>
              <div className="space-y-1"><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" /> Volume</span><span className="text-xl font-black italic">{totalVolume} kg</span></div>
              <div className="space-y-1"><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Séries</span><span className="text-xl font-black italic">{totalSets} total</span></div>
              <div className="space-y-1"><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Intensité</span><span className="text-xl font-black italic">{workout.intensity ? intensityMap[workout.intensity] : "Normale"}</span></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all"><Share2 className="w-4 h-4" /> Partager</button>
            <button onClick={handleCopy} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}><Copy className="w-5 h-5" /></button>
          </div>
          <p className="text-center text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Généré par GymTrack Pro</p>
        </div>
      </motion.div>
    </div>
  );
}