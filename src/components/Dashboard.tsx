import { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, OperationType, handleFirestoreError } from '../firebase';
import { useApp } from '../App';
import { Workout } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronRight,
  Plus,
  Activity,
  Share2,
  Heart
} from 'lucide-react';
import ShareWorkoutModal from './ShareWorkoutModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { user, theme, setCurrentPage } = useApp();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<Workout | null>(null);

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0,
    thisMonth: 0
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
      setRecentWorkouts(workouts.slice(0, 5));
      
      const totalDuration = workouts.reduce((acc, w) => acc + (w.duration || 0), 0);
      const now = new Date();
      const thisMonth = workouts.filter(w => {
        const d = w.date.toDate();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      setStats({
        totalWorkouts: workouts.length,
        totalDuration,
        thisMonth
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });

    return () => unsubscribe();
  }, [user]);

  const statCards = [
    { label: 'Séances totales', value: stats.totalWorkouts, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Ce mois-ci', value: stats.thisMonth, icon: CalendarIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Temps total (min)', value: stats.totalDuration, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bonjour, {user?.displayName?.split(' ')[0]} 👋</h2>
          <p className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>Prêt(e) pour votre séance d'aujourd'hui ?</p>
        </div>
        <button 
          onClick={() => setCurrentPage('tracker')}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nouvelle séance
        </button>
      </header>

      {/* Stats Grid */}
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
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Workouts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Séances récentes</h3>
          <button 
            onClick={() => setCurrentPage('calendar')}
            className="text-blue-500 hover:text-blue-400 font-medium text-sm flex items-center gap-1"
          >
            Voir tout <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {recentWorkouts.length > 0 ? (
            recentWorkouts.map((workout, i) => (
              <motion.div
                key={workout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-5 rounded-3xl border flex items-center justify-between group cursor-pointer transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{workout.name || 'Séance de sport'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {format(workout.date.toDate(), 'EEEE d MMMM', { locale: fr })}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                        <p className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                          <Clock className="w-3 h-3" />
                          {workout.duration || 0} min
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorkoutForShare(workout);
                    }}
                    className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-blue-500' : 'hover:bg-zinc-100 text-zinc-500 hover:text-blue-600'}`}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-blue-500 transition-colors ml-4" />
              </motion.div>
            ))
          ) : (
            <div className={`p-12 rounded-3xl border border-dashed text-center ${theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucune séance enregistrée pour le moment.</p>
              <button 
                onClick={() => setCurrentPage('tracker')}
                className="mt-4 text-blue-500 font-bold hover:underline"
              >
                Commencer ma première séance
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Share Modal */}
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