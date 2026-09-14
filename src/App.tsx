import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ReactCompilerPage } from './pages/ReactCompilerPage';
import { JsCompilerPage } from './pages/JsCompilerPage';
import { CCompilerPage } from './pages/CCompilerPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/react" replace />} />
        <Route path="/react" element={<ReactCompilerPage />} />
        <Route path="/js" element={<JsCompilerPage />} />
        <Route path="/c" element={<CCompilerPage />} />
        <Route path="*" element={<Navigate to="/react" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
