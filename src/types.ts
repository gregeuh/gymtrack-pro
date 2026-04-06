export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  theme?: 'light' | 'dark';
  createdAt?: any;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'Pectoraux' | 'Dos' | 'Jambes' | 'Épaules' | 'Bras' | 'Abdominaux' | 'Cardio';
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
  isCustom: boolean;
  createdBy: string;
}

export interface WorkoutSet {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  speed?: number;
  resistance?: number;
  cadence?: number;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  userId: string;
  date: any;
  name?: string;
  duration?: number;
  intensity?: number; // Ajouté
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: string;
  date: any;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: Partial<WorkoutSet>[];
  }[];
  createdAt: any;
}