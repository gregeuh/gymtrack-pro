import React, { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, OperationType, handleFirestoreError, getDocs } from '../firebase';
import { useApp } from '../App';
import { Workout, PersonalRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  format, 
  subDays, 
  eachDayOfInterval, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  subMonths
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart3, TrendingUp, Activity, Clock, Trophy, Plus, X, Trash2, Edit2, Dumbbell } from 'lucide-react';
import { addDoc, deleteDoc, doc, updateDoc, Timestamp } from '../firebase';

export default function StatsView() {
  const { user, theme } = useApp();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [cardioData, setCardioData] = useState<any[]>([]);
  const [muscleData, setMuscleData] = useState<any[]>([]);
  
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [newRecord, setNewRecord] = useState({
    exerciseId: '',
    exerciseName: '',
    value: 0,
    unit: 'kg'
  });

  useEffect(() => {
    if (!user) return;

    // Fetch exercises for the record modal
    const fetchExercises = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'exercises'));
        setExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'exercises');
      }
    };
    fetchExercises();

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribeWorkouts = onSnapshot(q, (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
      setWorkouts(workoutsData);

      // Prepare chart data for last 30 days
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date()
      });

      const data = last30Days.map(day => {
        const dayWorkouts = workoutsData.filter(w => isSameDay(w.date.toDate(), day));
        return {
          date: format(day, 'd MMM', { locale: fr }),
          count: dayWorkouts.length,
          duration: dayWorkouts.reduce((acc, w) => acc + (w.duration || 0), 0)
        };
      });
      setChartData(data);

      // Prepare volume data (total weight lifted per workout)
      const volume = workoutsData.slice(-10).map(w => {
        const totalVolume = w.exercises.reduce((acc, ex) => {
          return acc + ex.sets.reduce((setAcc, set) => setAcc + ((set.weight || 0) * (set.reps || 0)), 0);
        }, 0);
        return {
          name: format(w.date.toDate(), 'd MMM', { locale: fr }),
          volume: totalVolume
        };
      });
      setVolumeData(volume);

      // Prepare cardio data (total distance per workout)
      const cardio = workoutsData.slice(-10).map(w => {
        const totalDistance = w.exercises.reduce((acc, ex) => {
          return acc + ex.sets.reduce((setAcc, set) => setAcc + (set.distance || 0), 0);
        }, 0);
        return {
          name: format(w.date.toDate(), 'd MMM', { locale: fr }),
          distance: totalDistance
        };
      });
      setCardioData(cardio);

      // Prepare muscle group distribution
      const muscleCounts: Record<string, number> = {};
      workoutsData.forEach(w => {
        w.exercises.forEach(ex => {
          const exercise = exercises.find(e => e.id === ex.exerciseId);
          const category = exercise?.category || 'Autre';
          muscleCounts[category] = (muscleCounts[category] || 0) + ex.sets.length;
        });
      });
      const muscleDist = Object.entries(muscleCounts).map(([name, value]) => ({ name, value }));
      setMuscleData(muscleDist);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });

    const prQuery = query(
      collection(db, 'personalRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribePRs = onSnapshot(prQuery, (snapshot) => {
      const prs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalRecord));
      setPersonalRecords(prs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'personalRecords');
    });

    return () => {
      unsubscribeWorkouts();
      unsubscribePRs();
    };
  }, [user]);

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRecord.exerciseId || isNaN(newRecord.value) || newRecord.value <= 0) {
      alert("Veuillez sélectionner un exercice et entrer une valeur positive.");
      return;
    }

    try {
      const recordData = {
        userId: user.uid,
        exerciseId: newRecord.exerciseId,
        exerciseName: newRecord.exerciseName.substring(0, 99), // Ensure size limit
        value: Number(newRecord.value),
        unit: newRecord.unit,
        date: Timestamp.now()
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'personalRecords', editingRecord.id), recordData);
      } else {
        await addDoc(collection(db, 'personalRecords'), recordData);
      }

      setShowRecordModal(false);
      setEditingRecord(null);
      setNewRecord({ exerciseId: '', exerciseName: '', value: 0, unit: 'kg' });
      alert("Record enregistré avec succès !");
    } catch (error) {
      console.error("Save Record Error:", error);
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, 'personalRecords');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Supprimer ce record ?')) return;
    try {
      await deleteDoc(doc(db, 'personalRecords', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `personalRecords/${id}`);
    }
  };

  const stats = [
    { label: 'Volume total (kg)', value: volumeData.reduce((acc, d) => acc + d.volume, 0).toLocaleString(), icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Distance Cardio (km)', value: cardioData.reduce((acc, d) => acc + d.distance, 0).toFixed(1), icon: Activity, color: 'text-orange-500' },
    { label: 'Temps moyen (min)', value: workouts.length > 0 ? Math.round(workouts.reduce((acc, w) => acc + (w.duration || 0), 0) / workouts.length) : 0, icon: Clock, color: 'text-green-500' },
  ];

  const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4'];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Statistiques & Progrès</h2>
        <p className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>Analysez vos performances et restez motivé.</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
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

      {/* Personal Records Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Records Personnels
          </h3>
          <button 
            onClick={() => {
              setEditingRecord(null);
              setNewRecord({ exerciseId: '', exerciseName: '', value: 0, unit: 'kg' });
              setShowRecordModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nouveau Record
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personalRecords.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-6 rounded-3xl border group relative transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingRecord(record);
                      setNewRecord({
                        exerciseId: record.exerciseId,
                        exerciseName: record.exerciseName,
                        value: record.value,
                        unit: record.unit
                      });
                      setShowRecordModal(true);
                    }}
                    className="p-2 text-zinc-500 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteRecord(record.id)}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h4 className="text-lg font-bold mb-1">{record.exerciseName}</h4>
              <p className="text-3xl font-black text-blue-500">
                {record.value} <span className="text-sm font-bold text-zinc-500 uppercase">{record.unit}</span>
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Obtenu le {format(record.date.toDate(), 'd MMMM yyyy', { locale: fr })}
              </p>
            </motion.div>
          ))}
          {personalRecords.length === 0 && (
            <div className={`col-span-full p-12 rounded-3xl border border-dashed text-center ${theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucun record personnel enregistré.</p>
            </div>
          )}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workout Frequency */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Fréquence d'entraînement (30j)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="date" stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Volume Progression */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Progression du volume (kg)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#a855f7' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#a855f7" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cardio Distance Progression */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Progression Cardio (km)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cardioData}>
                <defs>
                  <linearGradient id="colorCardio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Area type="monotone" dataKey="distance" stroke="#f97316" fillOpacity={1} fill="url(#colorCardio)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Muscle Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-blue-500" />
            Répartition Musculaire (Séries)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={muscleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {muscleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
            {muscleData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs font-medium text-zinc-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      {/* Record Modal */}
      <AnimatePresence>
        {showRecordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecordModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-8 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">{editingRecord ? 'Modifier le record' : 'Nouveau record'}</h3>
                <button onClick={() => setShowRecordModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveRecord} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Exercice</label>
                  <select 
                    required
                    value={newRecord.exerciseId}
                    onChange={(e) => {
                      const ex = exercises.find(ex => ex.id === e.target.value);
                      setNewRecord({
                        ...newRecord, 
                        exerciseId: e.target.value,
                        exerciseName: ex ? ex.name : '',
                        unit: ex?.category === 'Cardio' ? 'min' : 'kg'
                      });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    <option value="">Sélectionner un exercice</option>
                    {exercises.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Valeur</label>
                    <input 
                      type="number" 
                      required
                      step="0.1"
                      value={newRecord.value || ''}
                      onChange={(e) => setNewRecord({...newRecord, value: parseFloat(e.target.value)})}
                      className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Unité</label>
                    <select 
                      value={newRecord.unit}
                      onChange={(e) => setNewRecord({...newRecord, unit: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                    >
                      <option value="kg">kg</option>
                      <option value="min">min</option>
                      <option value="km">km</option>
                      <option value="reps">reps</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 mt-4"
                >
                  {editingRecord ? 'Mettre à jour' : 'Enregistrer le record'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
