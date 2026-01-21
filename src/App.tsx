import { RosieAuthProvider } from './components/rosie/RosieAuthContext';
import { RosieAI } from './components/rosie/RosieAI';
import './App.css';

function App() {
  return (
    <RosieAuthProvider>
      <RosieAI />
    </RosieAuthProvider>
  );
}

export default App;
