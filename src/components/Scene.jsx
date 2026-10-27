import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useState } from 'react';
import { Loader } from './AssetLoader';
import { CarModel } from './CarModel';
import { Garage } from './Garage';

const RIM_OPTIONS = [
    { value: 'Felgi1', label: 'Felgi Sportowe (1)' },
    { value: 'Felgi2', label: 'Felgi Klasyczne (2)' },
];

export default function Scene() {
    const [colors, setColors] = useState({
        body: '#00c946',
        tires: '#176193',
        chassis: '#c0210c',
        spoiler: '#1091b1',
        windows: '#101211',
    });

    const [registrationText, setRegistrationText] = useState('Default');

    const [selectedRim, setSelectedRim] = useState('Felgi1');
    const [rimSize, setRimSize] = useState(21);

    const updateColor = (part) => (event) => {
        setColors((current) => ({ ...current, [part]: event.target.value }));
    };

    return (
        <div className="w-full h-full relative">
            <Loader /> {/* pasek postępu */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg bg-black/70 p-4 text-sm text-white">
                <label className="flex items-center justify-between gap-4 font-semibold text-sky-400">
                    Wzór felg
                    <select
                        className="bg-gray-800 text-white p-1 rounded border border-gray-600"
                        value={selectedRim}
                        onChange={(e) => setSelectedRim(e.target.value)}
                    >
                        {RIM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                {/* <label className="flex items-center justify-between gap-4 font-semibold">
                    Rozmiar felg: {rimSize}"
                    <input
                        type="range"
                        min="19"
                        max="21"
                        step="1"
                        value={rimSize}
                        onChange={(event) => setRimSize(Number(event.target.value))}
                    />
                </label> */}

                <hr className="border-gray-600 my-1" />

                <label className="flex items-center justify-between gap-4">
                    Karoseria
                    <input type="color" value={colors.body} onChange={updateColor('body')} />
                </label>
                <label className="flex items-center justify-between gap-4">
                    Opony
                    <input type="color" value={colors.tires} onChange={updateColor('tires')} />
                </label>
                <label className="flex items-center justify-between gap-4">
                    Podwozie
                    <input type="color" value={colors.chassis} onChange={updateColor('chassis')} />
                </label>
                <label className="flex items-center justify-between gap-4">
                    Spojler
                    <input type="color" value={colors.spoiler} onChange={updateColor('spoiler')} />
                </label>
                <label className="flex items-center justify-between gap-4">
                    Szyby
                    <input type="color" value={colors.windows} onChange={updateColor('windows')} />
                </label>
                <label className="flex items-center justify-between gap-4">
                    Napis na rejestracji
                    <input
                        type="text"
                        className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 w-32"
                        value={registrationText}
                        onChange={(event) => setRegistrationText(event.target.value)}
                    />
                </label>
            </div>

            <Canvas shadows camera={{ position: [0, 2, 8], fov: 40 }}>
                <color attach="background" args={['#050508']} />
                <fog attach="fog" args={['#050508', 14, 32]} />

                <directionalLight
                    position={[0, 8, 4]}
                    intensity={0.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-8}
                    shadow-camera-right={8}
                    shadow-camera-top={8}
                    shadow-camera-bottom={-8}
                    shadow-bias={-0.0003}
                    shadow-normalBias={0.03}
                />

                <spotLight
                    position={[0, 7, 1]}
                    angle={0.35}
                    penumbra={1}
                    intensity={120}
                    color="#fa8e28"
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    shadow-bias={-0.0003}
                    shadow-normalBias={0.03}
                />

                <spotLight position={[-5, 7, 3]} angle={0.6} penumbra={0.7} intensity={60} color="#38bdf8" />
                <spotLight position={[5, 7, 3]} angle={0.6} penumbra={0.7} intensity={60} color="#f43f5e" />
                <spotLight position={[0, 7, -5]} angle={0.8} penumbra={0.9} intensity={30} color="#a855f7" />

                <Garage />

                <Suspense fallback={null}>
                    <CarModel
                        url="./Car.glb"
                        selectedRimName={selectedRim}
                        rimSize={rimSize}
                        bodyColor={colors.body}
                        tiresColor={colors.tires}
                        chassisColor={colors.chassis}
                        spoilerColor={colors.spoiler}
                        windowsColor={colors.windows}
                        registrationText={registrationText}
                    />
                </Suspense>

                <Environment preset="city" blur={0.5} />

                <OrbitControls
                    enableDamping
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                    minAzimuthAngle={-Math.PI / 4}
                    maxAzimuthAngle={(3 * Math.PI) / 4}
                    enablePan={false}
                    minDistance={5}
                    maxDistance={8}
                    target={[0, 0.5, 0]}
                    mouseButtons={{ RIGHT: THREE.MOUSE.ROTATE }}
                />
            </Canvas>
        </div>
    );
}