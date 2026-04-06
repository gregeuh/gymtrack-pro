import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, OperationType, handleFirestoreError } from '../firebase';
import { useApp } from '../App';
import { Exercise } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Dumbbell, 
  X,
  PlusCircle,
  Settings2,
  Download,
  Loader2,
  Check,
  Play,
  Zap,
  ChevronDown,
  Link,
  Database
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const resizeImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error("Erreur lors du traitement de l'image."));
  });
};

export default function ExerciseLibrary() {
  const { user, theme } = useApp();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [creatorFilter, setCreatorFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null);
  
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'Pectoraux',
    equipment: '',
    videoUrl: '',
    imageUrl: ''
  });

  const categories = ['All', 'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Bras', 'Abdominaux', 'Cardio'];

  // --- MODÈLES DE MACHINES STANDARDS ---
  const defaultMachines = [
    { name: 'Développé Couché (Barre)', category: 'Pectoraux', equipment: 'Banc / Barre' },
    { name: 'Presse à Cuisses', category: 'Jambes', equipment: 'Machine' },
    { name: 'Tirage Vertical (Lat Pulldown)', category: 'Dos', equipment: 'Poulie' },
    { name: 'Développé Militaire', category: 'Épaules', equipment: 'Haltères' },
    { name: 'Leg Extension', category: 'Jambes', equipment: 'Machine' },
    { name: 'Curl Biceps', category: 'Bras', equipment: 'Haltères' },
    { name: 'Écartés à la poulie', category: 'Pectoraux', equipment: 'Poulie Vis-à-vis' },
    { name: 'Rowing Assis', category: 'Dos', equipment: 'Poulie' },
    { name: 'Élévations Latérales', category: 'Épaules', equipment: 'Haltères' },
    { name: 'Dips', category: 'Bras', equipment: 'Poids du corps' }
  ];

  // --- LOGIQUE DE FILTRAGE (INDISPENSABLE) ---
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filter === 'All' || ex.category === filter;
      const matchesEquipment = equipmentFilter === 'All' || ex.equipment === equipmentFilter;
      const matchesCreator = creatorFilter === 'All' || 
        (creatorFilter === 'User' && ex.isCustom) || 
        (creatorFilter === 'System' && !ex.isCustom);
      
      return matchesSearch && matchesCategory && matchesEquipment && matchesCreator;
    });
  }, [exercises, search, filter, equipmentFilter, creatorFilter]);

  const fetchExercises = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'exercises'));
      const exercisesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
      setExercises(exercisesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exercises');
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleImportDefaults = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      for (const machine of defaultMachines) {
        const exerciseData: Omit<Exercise, 'id'> = {
          name: machine.name,
          category: machine.category as any,
          equipment: machine.equipment,
          videoUrl: '',
          imageUrl: `https://loremflickr.com/400/300/gym,workout,${encodeURIComponent(machine.name)}`,
          isCustom: false,
          createdBy: 'system'
        };
        await addDoc(collection(db, 'exercises'), exerciseData);
      }
      fetchExercises();
    } catch (err) {
      setError("Erreur lors de l'importation des modèles.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newExercise.name) return;

    try {
      const exerciseData: Omit<Exercise, 'id'> = {
        name: newExercise.name,
        category: newExercise.category as any,
        equipment: newExercise.equipment,
        videoUrl: newExercise.videoUrl,
        imageUrl: newExercise.imageUrl || `https://loremflickr.com/400/300/gym,workout,${encodeURIComponent(newExercise.name)}`,
        isCustom: true,
        createdBy: user.uid
      };
      await addDoc(collection(db, 'exercises'), exerciseData);
      setNewExercise({ name: '', category: 'Pectoraux', equipment: '', videoUrl: '', imageUrl: '' });
      setShowAddModal(false);
      fetchExercises();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exercises');
    }
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
  };

  const handleUpdateCategory = async (exerciseId: string, newCategory: string) => {
    try {
      await updateDoc(doc(db, 'exercises', exerciseId), {
        category: newCategory
      });
      setEditingCategory(null);
      fetchExercises();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `exercises/${exerciseId}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;
    try {
      await deleteDoc(doc(db, 'exercises', exerciseToDelete.id));
      setExerciseToDelete(null);
      fetchExercises();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exercises/${exerciseToDelete.id}`);
    }
  };

  const handleGenerateAIImage = async (exercise: Exercise) => {
    const fallbackUrl = `https://loremflickr.com/400/300/gym,workout,${encodeURIComponent(exercise.name)}`;
    await updateDoc(doc(db, 'exercises', exercise.id), {
        imageUrl: fallbackUrl
    });
    fetchExercises();
  };

  const equipments = ['All', ...Array.from(new Set(exercises.map(ex => ex.equipment).filter(Boolean))) as string[]];
  const creators = ['All', 'User', 'System'];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bibliothèque d'exercices</h2>
          <p className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>Gérez vos machines et exercices personnalisés.</p>
        </div>
        <div className="flex gap-3">
          {exercises.length === 0 && (
            <button 
              onClick={handleImportDefaults}
              disabled={isGenerating}
              className={`flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-2xl transition-all border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-900'}`}
            >
              <Database className={`w-5 h-5 text-blue-500 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Importation...' : 'Modèles standards'}
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Ajouter un exercice
          </button>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Rechercher un exercice ou une machine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Équipement</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}
              >
                {equipments.map(eq => (
                  <option key={eq} value={eq}>{eq === 'All' ? 'Tous les équipements' : eq}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Créateur</label>
              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}
              >
                {creators.map(c => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'Tous' : c === 'User' ? 'Mes exercices' : 'Système'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === cat ? 'bg-blue-600 text-white' : `border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((ex, i) => (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-3xl border group transition-all flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  {ex.videoUrl && (
                    <button 
                      onClick={() => setShowVideoModal(ex.videoUrl!)}
                      className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-xl text-red-600 transition-all active:scale-90"
                      title="Voir la démonstration"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleGenerateAIImage(ex)}
                    className={`p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 transition-all active:scale-90 flex items-center gap-2`}
                    title="Générer une image"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  {ex.isCustom && (
                    <button 
                      onClick={() => handleDeleteExercise(ex)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <h4 className="text-lg font-bold mb-2">{ex.name}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => setEditingCategory(editingCategory === ex.id ? null : ex.id)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    {ex.category}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  <AnimatePresence>
                    {editingCategory === ex.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setEditingCategory(null)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={`absolute bottom-full left-0 mb-2 z-50 min-w-[140px] rounded-xl border shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}
                        >
                          {categories.filter(c => c !== 'All').map(cat => (
                            <button
                              key={cat}
                              onClick={() => handleUpdateCategory(ex.id, cat)}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${ex.category === cat ? 'bg-blue-600 text-white' : `hover:${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-50'}`}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {ex.equipment && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    {ex.equipment}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-8 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Nouvel exercice</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddExercise} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Nom de l'exercice</label>
                  <input 
                    type="text" 
                    required
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                    placeholder="ex: Développé couché"
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Catégorie</label>
                  <select 
                    value={newExercise.category}
                    onChange={(e) => setNewExercise({...newExercise, category: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Équipement</label>
                  <input 
                    type="text" 
                    value={newExercise.equipment}
                    onChange={(e) => setNewExercise({...newExercise, equipment: e.target.value})}
                    placeholder="ex: Smith Machine"
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">URL Image</label>
                  <input 
                    type="url" 
                    value={newExercise.imageUrl}
                    onChange={(e) => setNewExercise({...newExercise, imageUrl: e.target.value})}
                    placeholder="https://..."
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">URL Vidéo</label>
                  <input 
                    type="url" 
                    value={newExercise.videoUrl}
                    onChange={(e) => setNewExercise({...newExercise, videoUrl: e.target.value})}
                    placeholder="https://youtube.com/..."
                    className={`w-full px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 mt-4"
                >
                  Ajouter à la bibliothèque
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVideoModal(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl">
              <button onClick={() => setShowVideoModal(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all">
                <X className="w-6 h-6" />
              </button>
              <iframe 
                src={showVideoModal.includes('youtube.com') || showVideoModal.includes('youtu.be') ? `https://www.youtube.com/embed/${showVideoModal.split('v=')[1] || showVideoModal.split('/').pop()}` : showVideoModal}
                className="w-full h-full border-none"
                allowFullScreen
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {exerciseToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExerciseToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-8 text-center ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="inline-flex p-4 bg-red-500/10 rounded-2xl mb-6"><Trash2 className="w-10 h-10 text-red-500" /></div>
              <h3 className="text-2xl font-bold mb-2">Supprimer l'exercice ?</h3>
              <p className="text-zinc-500 mb-8">"{exerciseToDelete.name}" sera supprimé.</p>
              <div className="flex gap-3">
                <button onClick={() => setExerciseToDelete(null)} className={`flex-1 py-4 rounded-2xl font-bold ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}>Annuler</button>
                <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95">Supprimer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}