import React from 'react';
import { motion } from 'motion/react';
import { X, Share2, Copy, Check, Trophy, Clock, Dumbbell, Zap } from 'lucide-react';
import { Workout } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShareWorkoutModalProps {
  workout: Workout;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const ShareWorkoutModal: React.FC<ShareWorkoutModalProps> = ({ workout, onClose, theme }) => {
  const [copied, setCopied] = React.useState(false);

  const totalVolume = workout.exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((setAcc, set) => setAcc + (set.weight || 0) * (set.reps || 0), 0);
  }, 0);

  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  const shareText = `🔥 Séance terminée : ${workout.name || 'Entraînement'}
📅 ${format(workout.date.toDate(), 'EEEE d MMMM', { locale: fr })}
⏱️ Durée : ${workout.duration} min
💪 Volume total : ${totalVolume} kg
🏋️ ${totalSets} séries au total

Mes exercices clés :
${workout.exercises.slice(0, 3).map(ex => `- ${ex.exerciseName}`).join('\n')}

Fait avec GymTrack Pro 🚀`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma séance GymTrack Pro',
          text: shareText,
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] border shadow-2xl ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Visual Summary Card (The part users might screenshot) */}
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black italic tracking-tight uppercase">Session Terminée</h2>
                <p className="text-sm text-zinc-500 font-medium">{format(workout.date.toDate(), 'd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className={`p-6 rounded-[2rem] mb-6 ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-50 border border-zinc-100'}`}>
            <h3 className="text-xl font-bold mb-6 text-blue-500">{workout.name || 'Entraînement'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Durée</span>
                </div>
                <p className="text-xl font-black tracking-tight">{workout.duration} <span className="text-sm font-bold text-zinc-500">MIN</span></p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
                </div>
                <p className="text-xl font-black tracking-tight">{totalVolume} <span className="text-sm font-bold text-zinc-500">KG</span></p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Séries</span>
                </div>
                <p className="text-xl font-black tracking-tight">{totalSets} <span className="text-sm font-bold text-zinc-500">TOTAL</span></p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Intensité</span>
                </div>
                <p className="text-xl font-black tracking-tight">100% <span className="text-sm font-bold text-zinc-500">FEU</span></p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-700/20">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Exercices Clés</p>
              <div className="flex flex-wrap gap-2">
                {workout.exercises.slice(0, 3).map((ex, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold">
                    {ex.exerciseName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`p-6 pt-0 flex gap-3`}>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-95"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
          <button
            onClick={copyToClipboard}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 ${
              theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
            }`}
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        
        <p className="text-center pb-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest opacity-50">
          Généré par GymTrack Pro
        </p>
      </motion.div>
    </div>
  );
};

export default ShareWorkoutModal;
