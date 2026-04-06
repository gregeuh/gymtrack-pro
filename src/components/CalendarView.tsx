import { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, OperationType, handleFirestoreError } from '../firebase';
import { useApp } from '../App';
import { Workout } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Clock,
  X,
  Activity,
  Share2
} from 'lucide-react';
import ShareWorkoutModal from './ShareWorkoutModal';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CalendarView() {
  const { user, theme } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<Workout | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
      setWorkouts(workoutsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });

    return () => unsubscribe();
  }, [user]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map(day => {
          const dayWorkouts = workouts.filter(w => isSameDay(w.date.toDate(), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <motion.button
              key={day.toString()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedDate(day);
                setSelectedWorkouts(dayWorkouts);
              }}
              className={`
                relative h-24 md:h-32 p-2 rounded-3xl border transition-all flex flex-col items-center justify-center gap-1
                ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                ${isToday ? 'border-blue-500 ring-2 ring-blue-500/20' : theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
                ${dayWorkouts.length > 0 ? 'border-blue-500/50 bg-blue-500/5' : ''}
              `}
            >
              <span className={`text-sm font-bold ${isToday ? 'text-blue-500' : ''}`}>{format(day, 'd')}</span>
              {dayWorkouts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {dayWorkouts.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-blue-500" />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {/* Workout Detail Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-8 max-h-[80vh] overflow-y-auto ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Séances du jour</h3>
                  <p className="text-zinc-500">{format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-zinc-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedWorkouts.length > 0 ? (
                  selectedWorkouts.map((workout) => (
                    <div key={workout.id} className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-bold">{workout.name || 'Séance de sport'}</h4>
                          <button
                            onClick={() => setSelectedWorkoutForShare(workout)}
                            className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-400 hover:text-blue-500' : 'hover:bg-zinc-100 text-zinc-500 hover:text-blue-600'}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Clock className="w-4 h-4" />
                          {workout.duration || 60} min
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {workout.exercises.map((ex, i) => (
                          <div key={i} className="space-y-1">
                            <p className="font-bold text-sm flex items-center gap-2">
                              <Dumbbell className="w-4 h-4 text-blue-500" />
                              {ex.exerciseName}
                            </p>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {ex.sets.map((set, j) => (
                                <span key={j} className={`text-xs px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-zinc-700 text-zinc-300' : 'bg-white border border-zinc-200 text-zinc-600'}`}>
                                  {set.duration !== undefined && set.duration > 0 ? (
                                    <>
                                      {set.duration}min
                                      {set.distance ? ` • ${set.distance}km` : ''}
                                      {set.speed ? ` • Vit ${set.speed}` : ''}
                                      {set.resistance ? ` • Res ${set.resistance}` : ''}
                                      {set.cadence ? ` • Cad ${set.cadence}` : ''}
                                    </>
                                  ) : (
                                    <>{set.weight}kg x {set.reps}</>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Aucune séance enregistrée pour cette date.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
