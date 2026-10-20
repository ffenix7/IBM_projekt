import { useProgress } from '@react-three/drei';

export function Loader() {
    const { active, progress } = useProgress();

    if (!active) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="flex flex-col items-center text-white px-6 py-4 rounded-xl shadow-2xl">
                <div className="text-lg font-semibold mb-2">Ładowanie modelu 3D...</div>
                <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-150" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="text-sm text-gray-400 mt-2">{progress.toFixed(0)}%</div>
            </div>
        </div>
    );
}