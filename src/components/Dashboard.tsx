import { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, // Ajout pour la suppression
  doc,       // Ajout pour cibler le document
  OperationType, 
  handleFirestoreError 
} from '../firebase';
import { useApp } from '../App';
import { Workout } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Activity, 
  Share2,
  Trash2 // Icône de suppression
} from 'lucide-react';
import ShareWorkoutModal from './ShareWorkoutModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { user, theme, setCurrentPage } = useApp();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<Workout | null>(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalDuration: 0, thisMonth: 0 });

  // --- LOGIQUE DE RÉCUPÉRATION DES SÉANCES ---
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'workouts'), 
      where('userId', '==', user.uid), 
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Workout));

      setRecentWorkouts(workouts.slice(0, 5));

      // Calcul des statistiques
      const totalDuration = workouts.reduce((acc, w) => acc + (w.duration || 0), 0);
      const now = new Date();
      const thisMonth = workouts.filter(w => {
        const workoutDate = w.date.toDate();
        return workoutDate.getMonth() === now.getMonth() && 
               workoutDate.getFullYear() === now.getFullYear();
      }).length;

      setStats({ totalWorkouts: workouts.length, totalDuration, thisMonth });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workouts'));

    return () => unsubscribe();
  }, [user]);

  // --- FONCTION DE SUPPRESSION ---
  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche de déclencher d'autres événements
    
    if (!window.confirm("Es-tu sûr(e) de vouloir supprimer cette séance définitivement ?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'workouts', workoutId));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("Impossible de supprimer la séance.");
    }
  };

  const statCards = [
    { label: 'Séances totales', value: stats.totalWorkouts, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Ce mois-ci', value: stats.thisMonth, icon: CalendarIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Minutes totales', value: stats.totalDuration, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header avec Bienvenue */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Bonjour, {user?.displayName?.split(' ')[0]} 👋
          </h2>
          <p className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>
            Prêt(e) pour votre séance d'aujourd'hui ?
          </p>
        </div>
        <button 
          onClick={() => setCurrentPage('tracker')} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle séance
        </button>
      </header>

      {/* Cartes de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }} 
            className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Liste des Séances Récentes */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold px-1">Séances récentes</h3>
        <div className="space-y-3">
          {recentWorkouts.length === 0 ? (
            <div className={`p-10 rounded-3xl border border-dashed text-center ${theme === 'dark' ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
              Aucune séance enregistrée pour le moment.
            </div>
          ) : (
            recentWorkouts.map(workout => (
              <div 
                key={workout.id} 
                className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold">{workout.name}</h4>
                    <p className="text-sm text-zinc-500">
                      {format(workout.date.toDate(), 'EEEE d MMMM', { locale: fr })} • {workout.duration} min
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedWorkoutForShare(workout)} 
                    className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Partager"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  
                  {/* BOUTON SUPPRIMER */}
                  <button 
                    onClick={(e) => handleDeleteWorkout(workout.id, e)} 
                    className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-zinc-400 hover:text-red-500' : 'hover:bg-red-50 text-zinc-500 hover:text-red-600'}`}
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modale de Partage */}
      {selectedWorkoutForShare && (
        <ShareWorkoutModal 
          workout={selectedWorkoutForShare} 
          onClose={() => setSelectedWorkoutForShare(null)} 
          theme={theme} 
        />
      )}
    </div>
  );
}