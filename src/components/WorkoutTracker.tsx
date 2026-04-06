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
  Play
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
    // Fetch last 20 workouts to find previous performances
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => doc.data() as Workout);
      const perfMap: Record<string, WorkoutExercise> = {};
      
      // Go from oldest to newest in the slice to keep the most recent
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
    
    const exerciseDetails = exercises.find(e => e.id === exercise.exerciseId);
    const isCardio = exerciseDetails?.category === 'Cardio';

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

    // Trigger rest timer if set is completed
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
          sets: ex.sets.map(s => ({
            reps: s.reps,
            weight: s.weight,
            duration: s.duration,
            distance: s.distance,
            speed: s.speed,
            resistance: s.resistance,
            cadence: s.cadence
          }))
        })),
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'workoutTemplates'), templateData);
      alert('Modèle enregistré !');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workoutTemplates');
    }
  };

  const defaultTemplates: WorkoutTemplate[] = [
    {
      id: 'default-legs',
      userId: 'system',
      name: 'Séance Jambes (Force)',
      exercises: [
        { exerciseId: 'squat', exerciseName: 'Squat à la barre', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
        { exerciseId: 'legpress', exerciseName: 'Presse à cuisses', sets: [{ reps: 12, weight: 100 }, { reps: 12, weight: 100 }, { reps: 12, weight: 100 }] },
        { exerciseId: 'legcurl', exerciseName: 'Leg Curl', sets: [{ reps: 12, weight: 40 }, { reps: 12, weight: 40 }, { reps: 12, weight: 40 }] }
      ],
      createdAt: new Date()
    },
    {
      id: 'default-push',
      userId: 'system',
      name: 'Séance Poussée (Pecs/Épaules)',
      exercises: [
        { exerciseId: 'bench', exerciseName: 'Développé couché', sets: [{ reps: 10, weight: 50 }, { reps: 10, weight: 50 }, { reps: 10, weight: 50 }] },
        { exerciseId: 'ohp', exerciseName: 'Développé militaire', sets: [{ reps: 10, weight: 30 }, { reps: 10, weight: 30 }, { reps: 10, weight: 30 }] },
        { exerciseId: 'dips', exerciseName: 'Dips', sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] }
      ],
      createdAt: new Date()
    },
    {
      id: 'default-pull',
      userId: 'system',
      name: 'Séance Tirage (Dos/Biceps)',
      exercises: [
        { exerciseId: 'pullups', exerciseName: 'Tractions', sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
        { exerciseId: 'rowing', exerciseName: 'Rowing barre', sets: [{ reps: 10, weight: 40 }, { reps: 10, weight: 40 }, { reps: 10, weight: 40 }] },
        { exerciseId: 'curls', exerciseName: 'Curl biceps', sets: [{ reps: 12, weight: 12 }, { reps: 12, weight: 12 }, { reps: 12, weight: 12 }] }
      ],
      createdAt: new Date()
    }
  ];

  const allTemplates = [...defaultTemplates, ...templates];

  const loadTemplate = (template: WorkoutTemplate) => {
    setWorkoutName(template.name);
    
    // Try to find matching exercises in the library to get correct IDs if possible
    // but for default templates we'll just use the names provided
    setSelectedExercises(template.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets.map(s => ({
        ...s,
        isCompleted: false
      })) as WorkoutSet[]
    })));
    setShowTemplatePicker(false);
  };

  const deleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce modèle ?')) return;
    try {
      await deleteDoc(doc(db, 'workoutTemplates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workoutTemplates/${id}`);
    }
  };

  const saveWorkout = async () => {
    if (!user || selectedExercises.length === 0) return;
    setIsSaving(true);
    try {
      const workoutData: Omit<Workout, 'id'> = {
        userId: user.uid,
        date: Timestamp.now(),
        name: workoutName || 'Séance de sport',
        duration: 60, // Placeholder
        exercises: selectedExercises
      };
      const docRef = await addDoc(collection(db, 'workouts'), workoutData);
      setLastSavedWorkout({ id: docRef.id, ...workoutData } as Workout);
      setShowShareModal(true);
      
      // Clear form
      setSelectedExercises([]);
      setWorkoutName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-100'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Nouvelle séance</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-100'}`}
            title="Charger un modèle"
          >
            <Layout className="w-5 h-5" />
          </button>
          <div className={`flex items-center gap-2 p-1 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <Timer className="w-4 h-4 ml-2 text-zinc-500" />
            <select 
              value={restTimerDuration}
              onChange={(e) => setRestTimerDuration(parseInt(e.target.value))}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 pr-8"
            >
              <option value="30">30s</option>
              <option value="60">60s</option>
              <option value="90">90s</option>
              <option value="120">120s</option>
              <option value="180">180s</option>
            </select>
          </div>
          <button
            onClick={saveWorkout}
            disabled={isSaving || selectedExercises.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Nom de la séance (ex: Séance Pecs/Dos)"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className={`flex-1 text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-zinc-600 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}
          />
          {selectedExercises.length > 0 && (
            <button
              onClick={saveAsTemplate}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed text-sm font-bold ${theme === 'dark' ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'}`}
            >
              <Copy className="w-4 h-4" />
              Sauver modèle
            </button>
          )}
        </div>

        <div className="space-y-6">
          {selectedExercises.map((ex, exIdx) => (
            <motion.div
              key={exIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    {exercises.find(e => e.id === ex.exerciseId)?.category === 'Cardio' ? (
                      <Timer className="w-5 h-5 text-orange-500" />
                    ) : (
                      <Dumbbell className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{ex.exerciseName}</h3>
                      {exercises.find(e => e.id === ex.exerciseId)?.videoUrl && (
                        <button 
                          onClick={() => setShowVideoModal(exercises.find(e => e.id === ex.exerciseId)!.videoUrl!)}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Voir la démonstration"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                    {lastPerformances[ex.exerciseId] && (
                      <p className="text-xs text-zinc-500 font-medium">
                        Dernière fois : {lastPerformances[ex.exerciseId].sets.map(s => 
                          s.duration ? `${s.duration}min` : `${s.weight}kg x ${s.reps}`
                        ).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => removeExercise(exIdx)}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {exercises.find(e => e.id === ex.exerciseId)?.category === 'Cardio' ? (
                  <>
                    <div className="grid grid-cols-6 gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
                      <div className="text-center">Série</div>
                      <div className="text-center">Durée</div>
                      <div className="text-center">Dist</div>
                      <div className="text-center">Vit</div>
                      <div className="text-center">Res</div>
                      <div className="text-center">Cad</div>
                    </div>

                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-6 gap-2 items-center">
                        <div className="text-center font-bold text-zinc-500 text-sm">{setIdx + 1}</div>
                        <input
                          type="number"
                          value={set.duration || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'duration', parseFloat(e.target.value))}
                          className={`w-full text-center py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                        <input
                          type="number"
                          value={set.distance || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))}
                          className={`w-full text-center py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                        <input
                          type="number"
                          value={set.speed || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'speed', parseFloat(e.target.value))}
                          className={`w-full text-center py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                        <input
                          type="number"
                          value={set.resistance || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'resistance', parseFloat(e.target.value))}
                          className={`w-full text-center py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={set.cadence || ''}
                            onChange={(e) => updateSet(exIdx, setIdx, 'cadence', parseFloat(e.target.value))}
                            className={`w-full text-center py-2 rounded-xl border text-sm ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                          />
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)}
                              className={`p-1 rounded-lg transition-all ${set.isCompleted ? 'bg-green-500 text-white' : 'bg-zinc-800/10 text-zinc-500'}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="p-1 text-zinc-500 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 text-xs font-bold text-zinc-500 uppercase tracking-wider px-2">
                      <div className="text-center">Série</div>
                      <div className="text-center">Poids (kg)</div>
                      <div className="text-center">Reps</div>
                      <div className="text-center">Action</div>
                    </div>

                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-4 gap-4 items-center">
                        <div className="text-center font-bold text-zinc-500">{setIdx + 1}</div>
                        <div className="relative">
                          <input
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))}
                            className={`w-full text-center py-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                          />
                          <button 
                            onClick={() => setShowPlateCalculator(set.weight || 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100"
                            title="Calculateur de plaques"
                          >
                            <Calculator className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                          className={`w-full text-center py-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                        />
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => updateSet(exIdx, setIdx, 'isCompleted', !set.isCompleted)}
                            className={`p-2 rounded-xl transition-all ${set.isCompleted ? 'bg-green-500 text-white' : 'bg-zinc-800/10 text-zinc-500'}`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => removeSet(exIdx, setIdx)}
                            className="p-2 text-zinc-500 hover:text-red-500"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <button
                  onClick={() => addSet(exIdx)}
                  className={`w-full py-3 rounded-2xl border border-dashed font-bold transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-500'}`}
                >
                  + Ajouter une série
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => setShowExercisePicker(true)}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-2xl transition-all border ${theme === 'dark' ? 'bg-zinc-800/50 hover:bg-zinc-800 text-white border-zinc-800' : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200 shadow-sm'}`}
        >
          <Plus className="w-5 h-5" />
          Ajouter un exercice
        </button>
      </div>

      {/* Exercise Picker Modal */}
      <AnimatePresence>
        {showExercisePicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExercisePicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Choisir un exercice</h3>
                <button onClick={() => setShowExercisePicker(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {exercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    <div>
                      <p className="font-bold">{ex.name}</p>
                      <p className="text-sm text-zinc-500">{ex.category} • {ex.equipment || 'Poids libre'}</p>
                    </div>
                    <Plus className="w-5 h-5 text-blue-500" />
                  </button>
                ))}
                {exercises.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <Library className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Aucun exercice trouvé.</p>
                    <button 
                      onClick={() => setCurrentPage('library')}
                      className="mt-4 text-blue-500 font-bold hover:underline"
                    >
                      Créer un exercice
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Template Picker Modal */}
      <AnimatePresence>
        {showTemplatePicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplatePicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Mes modèles</h3>
                <button onClick={() => setShowTemplatePicker(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {allTemplates.map((template) => (
                  <div key={template.id} className="group relative">
                    <button
                      onClick={() => loadTemplate(template)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${template.userId === 'system' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                          {template.userId === 'system' ? <Zap className="w-5 h-5" /> : <Layout className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold">{template.name}</p>
                          <p className="text-sm text-zinc-500">
                            {template.userId === 'system' ? 'Modèle suggéré' : 'Mon modèle'} • {template.exercises.length} exercices
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-blue-500" />
                    </button>
                    {template.userId !== 'system' && (
                      <button 
                        onClick={(e) => deleteTemplate(e, template.id)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {allTemplates.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <Layout className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Aucun modèle enregistré.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rest Timer */}
      <AnimatePresence>
        {showRestTimer && (
          <RestTimer 
            duration={restTimerDuration} 
            onClose={() => setShowRestTimer(false)} 
            theme={theme} 
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && lastSavedWorkout && (
          <ShareWorkoutModal
            workout={lastSavedWorkout}
            onClose={() => {
              setShowShareModal(false);
              setCurrentPage('dashboard');
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Plate Calculator */}
      <AnimatePresence>
        {showPlateCalculator !== null && (
          <PlateCalculator 
            initialWeight={showPlateCalculator}
            onClose={() => setShowPlateCalculator(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVideoModal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl"
            >
              <button 
                onClick={() => setShowVideoModal(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <iframe 
                src={showVideoModal.includes('youtube.com') || showVideoModal.includes('youtu.be') 
                  ? `https://www.youtube.com/embed/${showVideoModal.split('v=')[1] || showVideoModal.split('/').pop()}`
                  : showVideoModal
                }
                className="w-full h-full border-none"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
