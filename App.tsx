
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Trophy,
  Loader2,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserAvailability, Subject, Grade, CalendarBlock } from './types';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import GradeBook from './components/GradeBook';
import AvailabilitySettings from './components/AvailabilitySettings';
import AuthPage from './components/AuthPage';
import Logo from './components/Logo';
import Tutorial from './components/Tutorial';
import LegalConsent from './components/LegalConsent';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'grades' | 'settings'>('dashboard');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showLegal, setShowLegal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [availability, setAvailability] = useState<UserAvailability>(() => {
    const defaultDays: Record<string, any> = {};
    const defaultHolidayDays: Record<string, any> = {};
    ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'].forEach(day => {
      defaultDays[day] = { start: "17:00", end: "21:00", active: true };
      defaultHolidayDays[day] = { start: "09:00", end: "17:00", active: true };
    });
    return { 
      days: defaultDays, 
      holidayDays: defaultHolidayDays, 
      holidayRanges: [], 
      holidayMode: false,
      dinnerTime: "18:00",
      dinnerDuration: 1
    };
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        setCurrentUser(user);
        await loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setIsDataLoaded(false);
        setPermissionError(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      setPermissionError(null);
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (!data) return;
        if (data.availability) setAvailability(data.availability);
        if (data.subjects) setSubjects(data.subjects);
        if (data.blocks) setBlocks(data.blocks);
        if (data.grades) setGrades(data.grades);
        if (data.theme) setTheme(data.theme || 'light');
        
        if (!data.acceptedTerms) {
          setShowLegal(true);
        } else if (data.tutorialDone === false) {
          setShowTutorial(true);
        }
      } else {
        await setDoc(userDocRef, { 
          tutorialDone: false, 
          acceptedTerms: false,
          createdAt: new Date().toISOString(),
          theme: 'light'
        }, { merge: true });
        setShowLegal(true);
      }
      setIsDataLoaded(true);
      isInitialLoad.current = false;
    } catch (e: any) {
      console.error("Firestore error:", e);
      if (e.message.toLowerCase().includes('permission') || e.code === 'permission-denied') {
        setPermissionError("Toegang geweigerd door Firebase Security Rules.");
      }
    }
  };

  useEffect(() => {
    if (!isDataLoaded || !currentUser || isInitialLoad.current) return;

    const syncTimeout = setTimeout(async () => {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, { 
          availability,
          subjects,
          blocks,
          grades,
          theme,
          updatedAt: new Date().toISOString() 
        }, { merge: true });
      } catch (e: any) {
        console.error("Sync gefaald:", e.message);
        if (e.code === 'permission-denied') {
          setPermissionError("Sync geweigerd door Firebase. Controleer je rules.");
        }
      }
    }, 1500);

    return () => clearTimeout(syncTimeout);
  }, [availability, subjects, blocks, grades, theme, isDataLoaded, currentUser]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setPermissionError(null);
      setIsDataLoaded(false);
    } catch (e) {
      console.error("Logout Error:", e);
    }
  };

  const handleAcceptTerms = async () => {
    setShowLegal(false);
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { acceptedTerms: true });
        
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.tutorialDone === false) {
          setShowTutorial(true);
        }
      } catch (e) {
        console.error("Fout bij opslaan legal status:", e);
      }
    }
  };

  const handleCloseTutorial = async () => {
    setShowTutorial(false);
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { tutorialDone: true });
      } catch (e) {
        console.error("Fout bij opslaan tutorial status:", e);
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Logo size="lg" className="mb-8 animate-pulse" showText={false} />
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Laden...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  if (permissionError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 border border-red-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Database Toegang Geweigerd</h2>
          <p className="text-slate-500 font-medium">
            Je bent ingelogd als <b>{currentUser.email}</b>, maar Firestore weigert de data te laden. Controleer je <b>Security Rules</b> in de Firebase Console.
          </p>
          <div className="pt-4 space-y-3">
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
            >
              Naar Firebase Console <ExternalLink size={16} />
            </a>
            <button onClick={handleLogout} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 py-2 w-full">
              Uitloggen en opnieuw inloggen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300`}>
      {showLegal && <LegalConsent onAccept={handleAcceptTerms} />}
      {showTutorial && !showLegal && <Tutorial onClose={handleCloseTutorial} />}
      
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="p-8">
          <Logo />
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Calendar size={20} />} label="Planning" />
          <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label="Assistant" />
          <NavItem active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<Trophy size={20} />} label="Puntenboek" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Instellingen" />
        </nav>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <UserIcon size={18} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate uppercase tracking-tighter">{currentUser.email?.split('@')[0]}</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-widest">
                {isDataLoaded ? 'Cloud Verbonden' : 'Synchroniseren...'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-sm font-bold">
            <LogOut size={18} />
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          {!isDataLoaded ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <Loader2 className="animate-spin mb-4" />
               <p className="text-xs font-black uppercase tracking-widest">Gegevens ophalen...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  blocks={blocks} 
                  subjects={subjects} 
                  availability={availability}
                  onAddBlock={() => setActiveTab('chat')} 
                  onAddSubject={() => setActiveTab('settings')}
                  onUpdateBlocks={setBlocks}
                  onUpdateAvailability={setAvailability}
                />
              )}
              {activeTab === 'chat' && (
                <ChatAssistant 
                  subjects={subjects} 
                  setSubjects={setSubjects} 
                  availability={availability} 
                  blocks={blocks} 
                  setBlocks={setBlocks}
                  grades={grades}
                />
              )}
              {activeTab === 'grades' && (
                <GradeBook 
                  subjects={subjects} 
                  grades={grades} 
                  setGrades={setGrades} 
                />
              )}
              {activeTab === 'settings' && (
                <AvailabilitySettings 
                  availability={availability} 
                  setAvailability={setAvailability} 
                  subjects={subjects} 
                  setSubjects={setSubjects}
                  onSave={(a) => setAvailability(a)}
                  theme={theme}
                  setTheme={setTheme}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}
        </div>

        <nav className="md:hidden flex border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Calendar size={22} />} />
          <MobileNavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={22} />} />
          <MobileNavItem active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<Trophy size={22} />} />
          <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={22} />} />
        </nav>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
    <div className={`p-3 rounded-2xl ${active ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>{icon}</div>
  </button>
);

export default App;
