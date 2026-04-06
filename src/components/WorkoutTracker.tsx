import React, { useState, useEffect } from 'react';
import { 
  db, collection, addDoc, getDocs, OperationType, handleFirestoreError, Timestamp, 
  query, where, onSnapshot, orderBy, limit, deleteDoc, doc 
} from '../firebase';
import { useApp } from '../App';
import ShareWorkoutModal from './ShareWorkoutModal';
import PlateCalculator from './PlateCalculator';
import { Exercise, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import RestTimer from './RestTimer';
import { 
  Plus, Trash2, Save, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2,
  X, History, Library, Timer, Zap, Copy, Layout, Calculator, Play, Clock, Flame 
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
  const [duration, setDuration] = useState(60);
  const [intensity, setIntensity] = useState(3);

  const intensityLabels = ["Récup", "Modéré", "Intense", "Très dur", "Maximal"];

  // RÉCUPÉRATION DES MODÈLES
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'workoutTemplates'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutTemplate)));
    });
    return () => unsubscribe();
  }, [user]);

  // RÉCUPÉRATION DES DERNIÈRES PERFORMANCES
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

  // RÉCUPÉRATION DE LA BIBLIOTHÈQUE
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
          ? [{ duration: lastSet?.duration || 10, distance: lastSet?.distance || 0, speed: lastSet?.speed || 0, resistance: lastSet?.resistance || 0, cadence: lastSet?.cadence || 0, isCompleted: false }]
          : [{ reps: lastSet?.reps || 10, weight: lastSet?.weight || 0, isCompleted: false }]
      }
    ]);
    setShowExercisePicker(false);
  };

  const addSet = (exerciseIndex: number) => {
    const newSelected = [...selectedExercises];
    const exercise = newSelected[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const isCardio = exercises.find(e => e.id === exercise.exerciseId)?.category === 'Cardio';

    newSelected[exerciseIndex].sets.push(
      isCardio 
        ? { duration: lastSet?.duration || 10, distance: lastSet?.distance || 0, speed: lastSet?.speed || 0, resistance: lastSet?.resistance || 0, cadence: lastSet?.cadence || 0, isCompleted: false }
        : { reps: lastSet?.reps || 10, weight: lastSet?.weight || 0, isCompleted: false }
    );
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
          sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, duration: s.duration, distance: s.distance, speed: s.speed, resistance: s.resistance, cadence: s.cadence }))
        })),
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'workoutTemplates'), templateData);
      alert('Modèle enregistré !');
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'workoutTemplates'); }
  };

  const loadTemplate = (template: WorkoutTemplate) => {
    setWorkoutName(template.name);
    setSelectedExercises(template.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets.map(s => ({ ...s, isCompleted: false })) as WorkoutSet[]
    })));
    setShowTemplatePicker(false);
  };

  const saveWorkout = async () => {
    if (!user || selectedExercises.length === 0) return;
    setIsSaving(true);
    try {
      const workoutData: Omit<Workout, 'id'> = {
        userId: user.uid,
        date: Timestamp.now(),
        name: workoutName || 'Séance de sport',
        duration: duration,
        intensity: intensity,
        exercises: selectedExercises
      };
      const docRef = await addDoc(collection(db, 'workouts'), workoutData);
      setLastSavedWorkout({ id: docRef.id, ...workoutData } as Workout);
      setShowShareModal(true);
      setSelectedExercises([]);
      setWorkoutName('');
      setIntensity(3);
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'workouts'); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 px-2 pb-32 overflow-x-hidden">
      {/* HEADER COMPLET ÉPURÉ DE LA DURÉE */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('dashboard')} className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Nouvelle séance</h2>
        </div>
        <button onClick={saveWorkout} disabled={isSaving || selectedExercises.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg active:scale-95 text-sm">
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </header>

      <div className="space-y-6">
        {/* NOM ET MODÈLES */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input type="text" placeholder="Nom de la séance..." value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} className={`flex-1 text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-zinc-600 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`} />
          <div className="flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}><Layout className="w-5 h-5" /></button>
            {selectedExercises.length > 0 && (
              <button onClick={saveAsTemplate} className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed text-xs font-bold ${theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}><Copy className="w-4 h-4" /> Sauver modèle</button>
            )}
          </div>
        </div>

        {/* LISTE EXERCICES */}
        <div className="space-y-6">
          {selectedExercises.map((ex, exIdx) => {
            const isCardio = exercises.find(e => e.id === ex.exerciseId)?.category === 'Cardio';
            return (
              <motion.div key={exIdx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`p-4 md:p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                      {isCardio ? <Timer className="w-6 h-6 text-orange-500" /> : <Dumbbell className="w-6 h-6 text-blue-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg md:text-xl font-bold">{ex.exerciseName}</h3>
                        {exercises.find(e => e.id === ex.exerciseId)?.videoUrl && (
                          <button onClick={() => setShowVideoModal(exercises.find(e => e.id === ex.exerciseId)!.videoUrl!)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-xl"><Play className="w-4 h-4 fill-current" /></button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">Précédent : {lastPerformances[ex.exerciseId]?.sets[0]?.weight || 0}kg x {lastPerformances[ex.exerciseId]?.sets[0]?.reps || 10}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedExercises(selectedExercises.filter((_, i) => i !== exIdx))} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                  {isCardio ? (
                    <div className="overflow-x-auto pb-2"><div className="min-w-[500px]">
                      <div className="grid grid-cols-7 gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 mb-2 text-center"><div>Série</div><div>Durée</div><div>Dist</div><div>Vit</div><div>Res</div><div>Cad</div><div>OK</div></div>
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="grid grid-cols-7 gap-2 items-center mb-2">
                          <div className="text-center font-black text-zinc-400 text-xs">{setIdx + 1}</div>
                          <input type="number" value={set.duration || ''} onChange={(e) => updateSet(exIdx, setIdx, 'duration', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <input type="number" value={set.distance || ''} onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <input type="number" value={set.speed || ''} onChange={(e) => updateSet(exIdx, setIdx, 'speed', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <input type="number" value={set.resistance || ''} onChange={(e) => updateSet(exIdx, setIdx, 'resistance', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <input type="number" value={set.cadence || ''} onChange={(e) => updateSet(exIdx, setIdx, 'cadence', parseFloat(e.target.value))} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <button onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)} className={`p-2 rounded-xl transition-all ${set.isCompleted ? 'bg-green-500 text-white shadow-lg' : 'bg-zinc-800/10 text-zinc-400'}`}><CheckCircle2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 text-center"><div>Série</div><div>Poids (kg)</div><div>Reps</div><div>Action</div></div>
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} className="grid grid-cols-4 gap-4 items-center group">
                          <div className="text-center font-black text-zinc-400 text-sm">{setIdx + 1}</div>
                          <div className="relative">
                            <input type="number" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))} className={`w-full text-center py-3 rounded-2xl border font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                            <button onClick={() => setShowPlateCalculator(set.weight || 0)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:scale-110 transition-all z-10"><Calculator className="w-4 h-4" /></button>
                          </div>
                          <input type="number" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))} className={`w-full text-center py-3 rounded-2xl border font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50'} outline-none`} />
                          <div className="flex justify-center gap-2">
                            <button onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)} className={`p-3 rounded-2xl transition-all ${set.isCompleted ? 'bg-green-500 text-white shadow-lg' : 'bg-zinc-800/10 text-zinc-400'}`}><CheckCircle2 className="w-5 h-5" /></button>
                            <button onClick={() => setSelectedExercises(selectedExercises.map((e, i) => i === exIdx ? {...e, sets: e.sets.filter((_, s) => s !== setIdx)} : e))} className="p-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <button onClick={() => addSet(exIdx)} className={`w-full py-4 rounded-3xl border border-dashed font-black text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-800/50 transition-all`}>+ Ajouter une série</button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* SÉLECTEUR D'INTENSITÉ */}
        {selectedExercises.length > 0 && (
          <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center gap-2 mb-4 text-orange-500"><Flame className="w-5 h-5 fill-current" /><span className="font-black text-sm uppercase tracking-widest">Intensité de la séance</span></div>
            <div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((val) => (<button key={val} onClick={() => setIntensity(val)} className={`py-3 rounded-2xl font-bold text-xs transition-all ${intensity === val ? 'bg-orange-500 text-white shadow-lg' : theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>{intensityLabels[val-1]}</button>))}</div>
          </div>
        )}

        <button onClick={() => setShowExercisePicker(true)} className="w-full flex items-center justify-center gap-3 font-black text-sm uppercase py-5 rounded-[2rem] border dark:bg-zinc-900 hover:bg-zinc-800 text-white transition-all active:scale-95 shadow-sm"><Plus className="w-6 h-6 text-blue-500" />Ajouter un exercice</button>
      </div>

      {/* TOUTES LES MODALES */}
      <AnimatePresence>{showPlateCalculator !== null && <PlateCalculator initialWeight={showPlateCalculator} onClose={() => setShowPlateCalculator(null)} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showExercisePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExercisePicker(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`relative w-full max-w-xl max-h-[80vh] overflow-hidden rounded-[2.5rem] border dark:bg-zinc-900 dark:border-zinc-800 flex flex-col shadow-2xl`}>
            <div className="p-8 border-b dark:border-zinc-800 flex items-center justify-between"><h3 className="text-2xl font-bold">Choisir un exercice</h3><button onClick={() => setShowExercisePicker(false)}><X className="w-8 h-8" /></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">{exercises.map((ex) => (<button key={ex.id} onClick={() => addExercise(ex)} className={`w-full flex items-center justify-between p-5 rounded-3xl hover:bg-zinc-800 transition-all text-left`}><div><p className="font-bold text-lg">{ex.name}</p><p className="text-sm text-zinc-500 uppercase tracking-widest">{ex.category}</p></div><div className="p-2 bg-blue-600/10 rounded-xl"><Plus className="w-6 h-6 text-blue-600" /></div></button>))}</div>
          </motion.div>
        </div>
      )}</AnimatePresence>
      <AnimatePresence>{showTemplatePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`relative w-full max-w-xl max-h-[80vh] overflow-hidden rounded-[2.5rem] border dark:bg-zinc-900 dark:border-zinc-800 flex flex-col shadow-2xl`}>
            <div className="p-8 border-b dark:border-zinc-800 flex items-center justify-between"><h3 className="text-2xl font-bold">Mes modèles</h3><button onClick={() => setShowTemplatePicker(false)}><X className="w-8 h-8" /></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">{allTemplates.map(template => (<button key={template.id} onClick={() => loadTemplate(template)} className={`w-full flex items-center justify-between p-6 rounded-3xl hover:bg-zinc-800 transition-all text-left`}><div className="flex items-center gap-4"><div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><Layout className="w-6 h-6" /></div><p className="font-bold text-lg">{template.name}</p></div><ChevronRight className="w-6 h-6 text-zinc-400" /></button>))}</div>
          </motion.div>
        </div>
      )}</AnimatePresence>
      <AnimatePresence>{showRestTimer && <RestTimer duration={restTimerDuration} onClose={() => setShowRestTimer(false)} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showShareModal && lastSavedWorkout && <ShareWorkoutModal workout={lastSavedWorkout} onClose={() => { setShowShareModal(false); setCurrentPage('dashboard'); }} theme={theme} />}</AnimatePresence>
      <AnimatePresence>{showVideoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setShowVideoModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-5xl aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800 bg-black" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowVideoModal(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/80"><X className="w-6 h-6" /></button>
            <iframe src={showVideoModal} className="w-full h-full border-none" allowFullScreen />
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}