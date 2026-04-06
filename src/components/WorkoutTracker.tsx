import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, getDocs, OperationType, handleFirestoreError, Timestamp, query, where, onSnapshot, orderBy, limit, deleteDoc, doc } from '../firebase';
import { useApp } from '../App';
import ShareWorkoutModal from './ShareWorkoutModal';
import PlateCalculator from './PlateCalculator';
import { Exercise, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import RestTimer from './RestTimer';
import { 
  Plus, 
  Trash2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  CheckCircle2,
  X,
  History,
  Library,
  Timer,
  Map,
  Zap,
  Copy,
  Layout,
  Calculator,
  Play,
  Clock // Ajout de l'icône Horloge
} from 'lucide-react';

export default function WorkoutTracker() {
  const { user, theme, setCurrentPage } = useApp();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [lastPerformances, setLastPerformances] = useState<Record<string, WorkoutExercise>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastSavedWorkout, setLastSavedWorkout] = useState<Workout | null>(null);
  const [showPlateCalculator, setShowPlateCalculator] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null);

  // --- NOUVEAU : ÉTAT POUR LA DURÉE PERSONNALISÉE ---
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'workoutTemplates'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutTemplate)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => doc.data() as Workout);
      const perfMap: Record<string, WorkoutExercise> = {};
      [...workouts].reverse().forEach(w => {
        w.exercises.forEach(ex => {
          perfMap[ex.exerciseId] = ex;
        });
      });
      setLastPerformances(perfMap);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'exercises'));
        const exercisesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
        setExercises(exercisesData);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'exercises');
      }
    };
    fetchExercises();
  }, []);

  const addExercise = (exercise: Exercise) => {
    const isCardio = exercise.category === 'Cardio';
    const lastPerf = lastPerformances[exercise.id];
    const lastSet = lastPerf?.sets[0];

    setSelectedExercises([
      ...selectedExercises,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: isCardio 
          ? [{ 
              duration: lastSet?.duration || 10, 
              distance: lastSet?.distance || 0, 
              speed: lastSet?.speed || 0, 
              resistance: lastSet?.resistance || 0, 
              cadence: lastSet?.cadence || 0, 
              isCompleted: false 
            }]
          : [{ 
              reps: lastSet?.reps || 10, 
              weight: lastSet?.weight || 0, 
              isCompleted: false 
            }]
      }
    ]);
    setShowExercisePicker(false);
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const newSelected = [...selectedExercises];
    const exercise = newSelected[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const isCardio = exercises.find(e => e.id === exercise.exerciseId)?.category === 'Cardio';

    newSelected[exerciseIndex].sets.push(
      isCardio 
        ? { 
            duration: lastSet?.duration || 10, 
            distance: lastSet?.distance || 0, 
            speed: lastSet?.speed || 0, 
            resistance: lastSet?.resistance || 0, 
            cadence: lastSet?.cadence || 0, 
            isCompleted: false 
          }
        : { 
            reps: lastSet?.reps || 10, 
            weight: lastSet?.weight || 0, 
            isCompleted: false 
          }
    );
    setSelectedExercises(newSelected);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newSelected = [...selectedExercises];
    newSelected[exerciseIndex].sets = newSelected[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    setSelectedExercises(newSelected);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
    const newSelected = [...selectedExercises];
    newSelected[exerciseIndex].sets[setIndex] = {
      ...newSelected[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setSelectedExercises(newSelected);
    if (field === 'isCompleted' && value === true) {
      setShowRestTimer(true);
    }
  };

  const saveAsTemplate = async () => {
    if (!user || selectedExercises.length === 0) return;
    const name = prompt('Nom du modèle :');
    if (!name) return;
    try {
      const templateData: Omit<WorkoutTemplate, 'id'> = {
        userId: user.uid,
        name,
        exercises: selectedExercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(s => ({ ...s, isCompleted: false }))
        })),
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'workoutTemplates'), templateData);
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'workoutTemplates'); }
  };

  const defaultTemplates: WorkoutTemplate[] = [
    {
      id: 'default-legs', userId: 'system', name: 'Séance Jambes (Force)',
      exercises: [
        { exerciseId: 'squat', exerciseName: 'Squat à la barre', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
        { exerciseId: 'legpress', exerciseName: 'Presse à cuisses', sets: [{ reps: 12, weight: 100 }, { reps: 12, weight: 100 }] }
      ],
      createdAt: new Date()
    },
    {
      id: 'default-push', userId: 'system', name: 'Séance Poussée',
      exercises: [
        { exerciseId: 'bench', exerciseName: 'Développé couché', sets: [{ reps: 10, weight: 50 }, { reps: 10, weight: 50 }] }
      ],
      createdAt: new Date()
    }
  ];

  const allTemplates = [...defaultTemplates, ...templates];

  const loadTemplate = (template: WorkoutTemplate) => {
    setWorkoutName(template.name);
    setSelectedExercises(template.exercises.map(ex => ({
      exerciseId: ex.exerciseId, exerciseName: ex.exerciseName,
      sets: ex.sets.map(s => ({ ...s, isCompleted: false })) as WorkoutSet[]
    })));
    setShowTemplatePicker(false);
  };

  const deleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce modèle ?')) return;
    try { await deleteDoc(doc(db, 'workoutTemplates', id)); } catch (error) { handleFirestoreError(error, OperationType.DELETE, `workoutTemplates/${id}`); }
  };

  const saveWorkout = async () => {
    if (!user || selectedExercises.length === 0) return;
    setIsSaving(true);
    try {
      const workoutData: Omit<Workout, 'id'> = {
        userId: user.uid,
        date: Timestamp.now(),
        name: workoutName || 'Séance de sport',
        duration: duration, // --- DURÉE PERSONNALISÉE ---
        exercises: selectedExercises
      };
      const docRef = await addDoc(collection(db, 'workouts'), workoutData);
      setLastSavedWorkout({ id: docRef.id, ...workoutData } as Workout);
      setShowShareModal(true);
      setSelectedExercises([]);
      setWorkoutName('');
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'workouts'); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 px-2 overflow-x-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('dashboard')} className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-100'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Nouvelle séance</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* --- INPUT DURÉE COMPACT POUR MOBILE --- */}
          <div className={`flex items-center gap-2 p-1 px-3 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <Clock className="w-4 h-4 text-zinc-500" />
            <input 
              type="number" 
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              className="w-10 bg-transparent border-none text-sm font-bold focus:ring-0 p-0 text-center"
            />
            <span className="text-[10px] font-bold text-zinc-500 uppercase">min</span>
          </div>

          <div className={`hidden sm:flex items-center gap-2 p-1 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <Timer className="w-4 h-4 ml-2 text-zinc-500" />
            <select value={restTimerDuration} onChange={(e) => setRestTimerDuration(parseInt(e.target.value))} className="bg-transparent border-none text-sm font-bold focus:ring-0 pr-8">
              <option value="60">60s</option>
              <option value="90">90s</option>
              <option value="120">120s</option>
            </select>
          </div>
          
          <button onClick={saveWorkout} disabled={isSaving || selectedExercises.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg active:scale-95 text-sm">
            <Save className="w-4 h-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input type="text" placeholder="Nom de la séance..." value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} className={`flex-1 text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-zinc-600 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`} />
          <div className="flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}><Layout className="w-5 h-5" /></button>
            {selectedExercises.length > 0 && (
              <button onClick={saveAsTemplate} className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed text-xs font-bold ${theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
                <Copy className="w-4 h-4" /> Sauver modèle
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedExercises.map((ex, exIdx) => (
            <motion.div key={exIdx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`p-4 md:p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                    {exercises.find(e => e.id === ex.exerciseId)?.category === 'Cardio' ? <Timer className="w-6 h-6 text-orange-500" /> : <Dumbbell className="w-6 h-6 text-blue-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg md:text-xl font-bold">{ex.exerciseName}</h3>
                      {exercises.find(e => e.id === ex.exerciseId)?.videoUrl && (
                        <button onClick={() => setShowVideoModal(exercises.find(e => e.id === ex.exerciseId)!.videoUrl!)} className="p-1.5 text-red-500"><Play className="w-4 h-4 fill-current" /></button>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeExercise(exIdx)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                {exercises.find(e => e.id === ex.exerciseId)?.category === 'Cardio' ? (
                  <div className="overflow-x-auto pb-2">
                    <div className="min-w-[450px]">
                      <div className="grid grid-cols-7 gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 mb-2">
                        <div className="text-center">Série</div><div className="text-center">Durée</div><div className="text-center">Dist</div><div className="text-center">Vit</div><div className="text-center">Res</div><div className="text-center">Cad</div><div className="text-center">OK</div>
                      </div>
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="grid grid-cols-7 gap-2 items-center mb-2">
                          <div className="text-center font-black text-zinc-400 text-xs">{setIdx + 1}</div>
                          <input type="number" value={set.duration || ''} onChange={(e) => updateSet(exIdx, setIdx, 'duration', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                          <input type="number" value={set.distance || ''} onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                          <input type="number" value={set.speed || ''} onChange={(e) => updateSet(exIdx, setIdx, 'speed', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                          <input type="number" value={set.resistance || ''} onChange={(e) => updateSet(exIdx, setIdx, 'resistance', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                          <input type="number" value={set.cadence || ''} onChange={(e) => updateSet(exIdx, setIdx, 'cadence', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                          <div className="flex justify-center gap-1"><button onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)} className={`p-2 rounded-xl transition-all ${set.isCompleted ? 'bg-green-500 text-white' : 'bg-zinc-800/10 text-zinc-400'}`}><CheckCircle2 className="w-4 h-4" /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">
                      <div className="text-center">Série</div><div className="text-center">Poids (kg)</div><div className="text-center">Reps</div><div className="text-center">Action</div>
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-4 gap-4 items-center group">
                        <div className="text-center font-black text-zinc-400 text-sm">{setIdx + 1}</div>
                        <div className="relative"><input type="number" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))} className={`w-full text-center py-3 rounded-2xl border font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} /></div>
                        <input type="number" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))} className={`w-full text-center py-3 rounded-2xl border font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`} />
                        <div className="flex justify-center gap-2">
                          <button onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)} className={`p-3 rounded-2xl transition-all ${set.isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-zinc-800/10 text-zinc-400'}`}><CheckCircle2 className="w-5 h-5" /></button>
                          <button onClick={() => removeSet(exIdx, setIdx)} className="p-3 text-zinc-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <button onClick={() => addSet(exIdx)} className={`w-full py-4 rounded-3xl border border-dashed font-black text-xs uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-500' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-400'}`}>+ Ajouter une série</button>
              </div>
            </motion.div>
          ))}
        </div>

        <button onClick={() => setShowExercisePicker(true)} className={`w-full flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest py-5 rounded-[2rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-900 shadow-sm'}`}><Plus className="w-6 h-6 text-blue-500" />Ajouter un exercice</button>
      </div>

      {/* --- MODALS (PICKER, TEMPLATES, SHARE, ETC.) --- */}
      <AnimatePresence>
        {showExercisePicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExercisePicker(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-[2.5rem] border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between"><h3 className="text-2xl font-bold">Choisir un exercice</h3><button onClick={() => setShowExercisePicker(false)}><X className="w-8 h-8" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {exercises.map((ex) => (
                  <button key={ex.id} onClick={() => addExercise(ex)} className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all text-left ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                    <div><p className="font-bold text-lg">{ex.name}</p><p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">{ex.category} • {ex.equipment || 'Poids libre'}</p></div>
                    <div className="p-2 bg-blue-600/10 rounded-xl"><Plus className="w-6 h-6 text-blue-600" /></div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplatePicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTemplatePicker(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-[2.5rem] border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between"><h3 className="text-2xl font-bold">Mes modèles</h3><button onClick={() => setShowTemplatePicker(false)}><X className="w-8 h-8" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {allTemplates.map((template) => (
                  <button key={template.id} onClick={() => loadTemplate(template)} className={`w-full flex items-center justify-between p-6 rounded-3xl transition-all text-left ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                    <div className="flex items-center gap-4"><p className="font-bold text-lg">{template.name}</p></div>
                    <ChevronRight className="w-6 h-6 text-zinc-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{showRestTimer && <RestTimer duration={restTimerDuration} onClose={() => setShowRestTimer(false)} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showShareModal && lastSavedWorkout && <ShareWorkoutModal workout={lastSavedWorkout} onClose={() => { setShowShareModal(false); setCurrentPage('dashboard'); }} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showPlateCalculator !== null && <PlateCalculator initialWeight={showPlateCalculator} onClose={() => setShowPlateCalculator(null)} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showVideoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setShowVideoModal(null)}>
          <div className="relative w-full max-w-5xl aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800">
            <iframe src={showVideoModal} className="w-full h-full border-none" allowFullScreen />
          </div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}