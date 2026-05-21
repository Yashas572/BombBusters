import { useGameStore } from './store/gameStore';
import { MainMenu } from './components/screens/MainMenu';
import { MissionSelect } from './components/screens/MissionSelect';
import { GameScreen } from './components/screens/GameScreen';
import { GameOver } from './components/screens/GameOver';
import { Settings } from './components/screens/Settings';

function App() {
  const screen = useGameStore(s => s.screen);

  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'missionSelect':
      return <MissionSelect />;
    case 'game':
      return <GameScreen />;
    case 'gameOver':
      return <GameOver />;
    case 'settings':
      return <Settings />;
    default:
      return <MainMenu />;
  }
}

export default App;
