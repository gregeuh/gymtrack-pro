import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Info } from 'lucide-react';

interface PlateCalculatorProps {
  onClose: () => void;
  theme: 'light' | 'dark';
  initialWeight?: number;
}

export default function PlateCalculator({ onClose, theme, initialWeight = 0 }: PlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState(initialWeight);
  const [barWeight, setBarWeight] = useState(20); // Standard Olympic bar
  
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  
  const calculatePlates = () => {
    let remainingWeight = (targetWeight - barWeight) / 2;
    if (remainingWeight <= 0) return [];
    
    const plates: number[] = [];
    for (const plate of availablePlates) {
      while (remainingWeight >= plate) {
        plates.push(plate);
        remainingWeight -= plate;
      }
    }
    return plates;
  };

  const platesPerSide = calculatePlates();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-8 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Calculateur de plaques</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Poids cible (kg)</label>
              <input 
                type="number" 
                value={targetWeight || ''}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                className={`w-full px-4 py-3 rounded-xl border font-bold text-xl ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Poids barre (kg)</label>
              <select 
                value={barWeight}
                onChange={(e) => setBarWeight(parseFloat(e.target.value))}
                className={`w-full px-4 py-3 rounded-xl border font-bold ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
              >
                <option value={20}>20 kg (Standard)</option>
                <option value={15}>15 kg (Femme)</option>
                <option value={10}>10 kg (Technique)</option>
                <option value={2}>2 kg (EZ Bar)</option>
              </select>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border border-dashed ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">Plaques par côté</p>
            
            <div className="flex flex-wrap justify-center gap-3">
              {platesPerSide.length > 0 ? (
                platesPerSide.map((plate, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 ${
                      plate >= 20 ? 'bg-red-600 border-red-700 text-white' :
                      plate >= 15 ? 'bg-yellow-500 border-yellow-600 text-white' :
                      plate >= 10 ? 'bg-green-600 border-green-700 text-white' :
                      plate >= 5 ? 'bg-blue-600 border-blue-700 text-white' :
                      'bg-zinc-400 border-zinc-500 text-white'
                    }`}
                  >
                    {plate}
                  </motion.div>
                ))
              ) : (
                <p className="text-zinc-500 text-sm italic">Poids inférieur ou égal à la barre.</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              Le calcul suppose que vous utilisez des plaques standards. Vérifiez toujours l'équilibre de votre barre.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
