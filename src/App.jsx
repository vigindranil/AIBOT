import { useState } from 'react';
import LandingPage     from './components/LandingPage';
import VoiceAssistant  from './components/VoiceAssistant';
import SummaryPage     from './components/SummaryPage';

// View states: 'landing' | 'chat' | 'summary'
export default function App() {
  const [view,     setView]     = useState('landing');
  const [userData, setUserData] = useState(null);

  const handleStart    = ()     => setView('chat');
  const handleComplete = (data) => { setUserData(data); setView('summary'); };
  const handleRestart  = ()     => { setUserData(null); setView('landing'); };

  return (
    <div className="app-root">
      {view !== 'summary' && <LandingPage onStart={handleStart} />}
      {view === 'summary' && <SummaryPage userData={userData} onRestart={handleRestart} />}
      {view === 'chat' && (
        <VoiceAssistant
          onComplete={handleComplete}
          onClose={() => setView('landing')}
        />
      )}
    </div>
  );
}
