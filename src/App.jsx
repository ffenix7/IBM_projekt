import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Scene from './components/Scene';
import AdminDashboard from './components/AdminDashboard';
import Menu from './components/Menu'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<Menu />} />

                <Route path="/garage" element={<Scene />} />

                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}