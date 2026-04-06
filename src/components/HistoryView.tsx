import { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, deleteDoc, doc, OperationType, handleFirestoreError } from '../firebase';
import { useApp } from '../App';
import { Workout } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Share2, Trash2, ChevronRight, Clock, Calendar as CalIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ShareWorkoutModal from './ShareWorkoutModal';

export default function HistoryView() {
  const { user, theme } = useApp();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Récupération de TOUTES les séances
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workouts'), 
      where('userId', '==', user.uid), 
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkouts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Workout)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workouts'));
    
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Supprimer définitivement cette séance de ton historique ?")) {
      await deleteDoc(doc(db, 'workouts', id));
    }
  };

  // Groupement intelligent par mois
  const groupedWorkouts = workouts.reduce((groups: any, workout) => {
    const month = format(workout.date.toDate(), 'MMMM yyyy', { locale: fr });
    if (!groups[month]) groups[month] = [];
    groups[month].push(workout);
    return groups;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <header className="px-1">
        <h2 className="text-3xl font-bold tracking-tight">Historique complet</h2>
        <p className="text-zinc-500">{workouts.length} séances enregistrées au total</p>
      </header>

      <div className="space-y-10">
        {Object.keys(groupedWorkouts).length === 0 ? (
          <div className="p-12 border-2 border-dashed border-zinc-800 rounded-[2.5rem] text-center text-zinc-500">
            Ton historique est encore vide. Commence une séance !
          </div>
        ) : (
          Object.keys(groupedWorkouts).map((month) => (
            <section key={month} className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 px-4">
                {month}
              </h3>
              <div className="grid gap-3">
                {groupedWorkouts[month].map((workout: Workout) => (
                  <motion.div 
                    key={workout.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{workout.name}</h4>
                        <p className="text-sm text-zinc-500">
                          {format(workout.date.toDate(), 'eeee d MMMM', { locale: fr })} • {workout.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSelectedWorkout(workout)} 
                        className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(workout.id, e)} 
                        className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-zinc-400 hover:text-red-500' : 'hover:bg-red-50 text-zinc-500 hover:text-red-600'}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {selectedWorkout && (
        <ShareWorkoutModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} theme={theme} />
      )}
    </div>
  );
}