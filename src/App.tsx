import { ThemeProvider } from '@/components/theme-provider';
import { Popup } from '@/components/popup';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tab-wise-theme">
      <Popup />
    </ThemeProvider>
  );
}

export default App;
