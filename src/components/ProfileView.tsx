import { useState } from 'react';
import { db, doc, setDoc } from '../firebase';
import { useApp } from '../App';
import { motion } from 'motion/react';
import { User, Save, CheckCircle2 } from 'lucide-react';

export default function ProfileView() {
  const { user, theme } = useApp();
  const [name, setName] = useState(user?.displayName || '');
  const [saved, setSaved] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      // Met à jour le nom dans la collection 'users' de Firestore
      await setDoc(doc(db, 'users', user.uid), { displayName: name }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Erreur mise à jour profil:", e);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 p-4">
      <h2 className="text-3xl font-bold tracking-tight">Mon Profil</h2>
      
      <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} shadow-xl`}>
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-5 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/30">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Ton Nom / Pseudo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 px-6 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>

          <button
            onClick={handleUpdateProfile}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] transition-all active:scale-95 shadow-lg"
          >
            {saved ? <CheckCircle2 className="w-6 h-6" /> : <Save className="w-6 h-6" />}
            {saved ? 'Enregistré !' : 'Mettre à jour'}
          </button>
        </div>
      </div>
    </div>
  );
}