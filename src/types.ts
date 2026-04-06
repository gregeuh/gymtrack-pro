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
  duration?: number; // in minutes
  distance?: number; // in km
  speed?: number; // in km/h or level
  resistance?: number; // resistance level
  cadence?: number; // RPM or steps/min
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
  date: any; // Firestore Timestamp
  name?: string;
  duration?: number;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  value: number; // weight in kg or duration in min
  unit: string; // 'kg', 'min', 'km', etc.
  date: any; // Firestore Timestamp
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: {
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
      speed?: number;
      resistance?: number;
      cadence?: number;
    }[];
  }[];
  createdAt: any;
}
