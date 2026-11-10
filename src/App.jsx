import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Scene from './components/Scene';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Scene />} />

                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}