import { useState, useEffect, createContext, useContext } from 'react';
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, OperationType, handleFirestoreError } from './firebase';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Library, 
  BarChart3, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  Plus
} from 'lucide-react';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkoutTracker from './components/WorkoutTracker';
import ExerciseLibrary from './components/ExerciseLibrary';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';

// Context
interface AppContextType {
  user: UserProfile | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsMenuVisible(false);
      } else {
        setIsMenuVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setUser(userData);
            if (userData.theme) setTheme(userData.theme);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              theme: 'dark',
              createdAt: new Date()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { theme: newTheme }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Dumbbell className="w-12 h-12 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'tracker', label: 'Nouvelle séance', icon: Dumbbell },
    { id: 'calendar', label: 'Calendrier', icon: CalendarIcon },
    { id: 'library', label: 'Exercices', icon: Library },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'tracker': return <WorkoutTracker />;
      case 'calendar': return <CalendarView />;
      case 'library': return <ExerciseLibrary />;
      case 'stats': return <StatsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ user, theme, toggleTheme, currentPage, setCurrentPage }}>
      <div className={`min-h-screen flex flex-col lg:flex-row ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar (Desktop & Mobile Drawer) */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${theme === 'dark' ? 'bg-zinc-900 border-r border-zinc-800' : 'bg-white border-r border-zinc-200'}
        `}>
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">GymTrack Pro</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-zinc-800/10 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${currentPage === item.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : `hover:bg-zinc-800/10 ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-zinc-800/50 space-y-2">
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
                <span className="font-medium">{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              <button
                onClick={() => auth.signOut()}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 transition-all ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className={`lg:hidden flex items-center justify-between px-4 pb-4 pt-[calc(16px+env(safe-area-inset-top))] sticky top-0 z-30 backdrop-blur-md ${theme === 'dark' ? 'bg-zinc-950/80 border-b border-zinc-800' : 'bg-zinc-50/80 border-b border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold tracking-tight">GymTrack</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen">
          <div className="flex-1 p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Floating Action Button (FAB) */}
        <AnimatePresence>
          {currentPage !== 'tracker' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentPage('tracker')}
              className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-40 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-transform"
            >
              <Plus className="w-8 h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom Navigation (Mobile - Auto-hide on scroll) */}
        <AnimatePresence>
          {isMenuVisible && (
            <motion.nav 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className={`
                lg:hidden fixed bottom-6 left-6 right-6 z-40 px-2 py-2 border rounded-3xl backdrop-blur-xl shadow-2xl
                ${theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800 shadow-black/50' : 'bg-white/90 border-zinc-200 shadow-zinc-200/50'}
              `}
            >
              <div className="flex items-center justify-around">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`
                      flex flex-col items-center gap-1 p-3 rounded-2xl transition-all
                      ${currentPage === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}
                    `}
                  >
                    <item.icon className={`w-6 h-6`} />
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
}
