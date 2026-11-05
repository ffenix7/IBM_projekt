import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Loader } from './AssetLoader';
import { CarModel } from './CarModel';
import { Garage } from './Garage';
import { Dots } from './Dots';
import AuthPanel from './AuthPanel';

// Left menu: parts that can be changed
const PARTS = [
    { id: 'body', label: 'Karoseria', icon: './icons/main/body.png' },
    { id: 'rims', label: 'Felgi', icon: './icons/main/rims.png' },
    { id: 'tires', label: 'Opony', icon: './icons/main/tires.png' },
    { id: 'spoiler', label: 'Spoiler', icon: './icons/main/spoiler.png' },
    // { id: 'chassis', label: 'Podwozie', icon: './icons/main/chassis.png' },
    // { id: 'windows', label: 'Szyby', icon: './icons/main/windows.png' },
    { id: 'plate', label: 'Tablica', icon: './icons/main/plate.png' },
];

// Bottom menu: available variants
const RIM_OPTIONS = [
    { value: 'Felgi1', label: 'Sportowe', icon: './icons/rims/felgi1.png' },
    { value: 'Felgi2', label: 'Klasyczne', icon: './icons/rims/felgi2.png' },
];

const SPOILER_OPTIONS = [
    { value: 'Spoiler1', label: 'Klasyczny', icon: './icons/spoilers/spoiler1.png' },
    { value: 'Spoiler2', label: 'Sportowy', icon: './icons/spoilers/spoiler2.png' },
];

// Parts changed only by color (part id -> key in the colors state)
const COLOR_PARTS = {
    tires: 'tires',
    body: 'body',
};

const COLOR_PRESETS = [
    '#ffffff', '#101211', '#8a8d91', '#c0210c', '#f97316', '#facc15',
    '#00c946', '#1091b1', '#176193', '#6d28d9', '#db2777',
];

// Which menu part opens after clicking a dot on the car
const DOT_TO_PART = {
    'rear-wheel': 'rims',
    'front-wheel': 'rims',
    plate: 'plate',
    spoiler: 'spoiler',
    body: 'body',
};

// Which camera view fits a part picked in the left menu
const PART_TO_VIEW = {
    rims: 'front-wheel',
    tires: 'front-wheel',
    body: 'body',
    spoiler: 'spoiler',
    plate: 'plate',
};

// Camera
function CameraRig({ targetPos, cameraPos, isAnimated, onArrived, controlsRef }) {
    useFrame((state, delta) => {
        if (!isAnimated) return;

        const desiredCameraPosition = new THREE.Vector3(...cameraPos);
        const desiredTargetPosition = new THREE.Vector3(...targetPos);

        state.camera.position.lerp(desiredCameraPosition, delta * 4);
        state.camera.updateProjectionMatrix();

        if (controlsRef && controlsRef.current) {
            controlsRef.current.target.lerp(desiredTargetPosition, delta * 4);
            controlsRef.current.update();
        }

        if (state.camera.position.distanceTo(desiredCameraPosition) < 0.1) {
            if (onArrived) onArrived();
        }
    });
    return null;
}

// UI elements
function Icon({ src, label, className }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <span className={`flex items-center justify-center rounded-md bg-white/10 font-semibold text-white/70 ${className}`}>
                {label.charAt(0)}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            className={`object-contain ${className}`}
        />
    );
}

// Left menu part
function PartButton({ part, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex w-40 h-20 cursor-pointer items-center gap-3 rounded-xl border px-3 text-left text-sm transition
                ${active
                    ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                    : 'border-white/10 bg-black/30 text-white/80 backdrop-blur-md hover:border-white/30 hover:bg-white/10'}`}
        >
            <Icon src={part.icon} label={part.label} className="h-12 w-12 shrink-0" />
            <span>{part.label}</span>
        </button>
    );
}

// Bottom menu part
function OptionTile({ option, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex w-28 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-xs transition
                ${active
                    ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'}`}
        >
            <Icon src={option.icon} label={option.label} className="h-16 w-16" />
            <span>{option.label}</span>
        </button>
    );
}

function ColorOptions({ value, onChange }) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            {COLOR_PRESETS.map((color) => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    aria-label={`Kolor ${color}`}
                    style={{ backgroundColor: color }}
                    className={`h-10 w-10 shrink-0 cursor-pointer rounded-full border-2 transition
                        ${value.toLowerCase() === color ? 'border-sky-400 scale-110' : 'border-white/20 hover:border-white/60'}`}
                />
            ))}
            <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 pl-2 text-xs text-white/70">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-full border-2 border-white/20 bg-transparent p-0.5"
                />
                Własny
            </label>
        </div>
    );
}

function Divider() {
    return <div className="mx-1 h-20 w-px shrink-0 bg-white/10" />;
}

// Scene
export default function Scene() {
    const controlsRef = useRef();

    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef(null);

    const resetIdleTimer = () => {
        setIsIdle(false);

        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }

        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
        }, 10000);
    };

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];

        events.forEach(event => {
            window.addEventListener(event, resetIdleTimer);
        });

        resetIdleTimer();

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetIdleTimer);
            });
        };
    }, []);

    const [animConfig, setAnimConfig] = useState({
        targetPos: [0, 0.5, 0],
        cameraPos: [0, 2, 8],
        isAnimated: false
    });

    const [colors, setColors] = useState({
        body: '#1091B1',
        tires: '#000000',
        chassis: '#060606',
        spoiler: '#374b50',
        windows: '#101211',
    });

    const [registrationText, setRegistrationText] = useState('Default');

    const [selectedRim, setSelectedRim] = useState('Felgi1');
    const [rimSize] = useState(21);
    const [selectedSpoiler, setSelectedSpoiler] = useState('Spoiler2');

    const [activePart, setActivePart] = useState(null); // id from PARTS or null

    const [isFocused, setIsFocused] = useState(false);
    const [isShown, setIsShown] = useState(true);

    const setColor = (part) => (color) => {
        setColors((current) => ({ ...current, [part]: color }));
    };

    // Only moves the camera; never touches activePart
    const focusCamera = (viewId) => {
        let targetPosition = [0, 0.5, 0];
        let cameraPosition = [0, 2, 8];

        setIsFocused(true);

        switch (viewId) {
            case 'rear-wheel':
                targetPosition = [-0.35, 0.55, 2.5];
                cameraPosition = [1, 1.5, 4];
                break;
            case 'front-wheel':
                targetPosition = [2.6, 0.55, -0.45];
                cameraPosition = [4, 1.5, 1];
                break;
            case 'plate':
                targetPosition = [-2.7, 0.5, 2.7];
                cameraPosition = [-4.5, 1.2, 4.5];
                break;
            case 'spoiler':
                targetPosition = [-2.5, 2, 2.5];
                cameraPosition = [-4.5, 2.8, 4.5];
                break;
            case 'windows':
                targetPosition = [0.9, 1.6, 0.4];
                cameraPosition = [2.9, 2.4, 0.5];
                break;
            case 'body':
                targetPosition = [5.3, 2.5, 0];
                cameraPosition = [7.4, 3.2, 0];
                break;
            case 'chassis':
                targetPosition = [1, 0.2, 1];
                cameraPosition = [0.3, 0.3, 3.0];
                break;
            default:
                break;
        }

        setAnimConfig({
            targetPos: targetPosition,
            cameraPos: cameraPosition,
            isAnimated: true
        });
    };

    const handleResetView = () => {
        setIsFocused(false);
        setAnimConfig({
            targetPos: [0, 0.5, 0],
            cameraPos: [5.6, 1.5, 5.6],
            isAnimated: true
        });
        setActivePart(null);
    };

    // Click on a dot on the car
    const handleDotClick = (dotId) => {
        focusCamera(dotId);
        setActivePart(DOT_TO_PART[dotId] ?? null);
    };

    // Click on a part in the left menu
    const togglePart = (id) => {
        if (activePart === id) {
            handleResetView(); // second click closes the menu and resets the camera
            return;
        }
        setActivePart(id);
        focusCamera(PART_TO_VIEW[id]);
    };

    const handleDotsView = () => {
        setIsShown((current) => !current);
    };

    const renderBottomContent = () => {
        if (activePart === 'rims') {
            return (
                <>
                    {RIM_OPTIONS.map((option) => (
                        <OptionTile
                            key={option.value}
                            option={option}
                            active={selectedRim === option.value}
                            onClick={() => setSelectedRim(option.value)}
                        />
                    ))}
                </>
            );
        }

        if (activePart === 'spoiler') {
            return (
                <>
                    {SPOILER_OPTIONS.map((option) => (
                        <OptionTile
                            key={option.value}
                            option={option}
                            active={selectedSpoiler === option.value}
                            onClick={() => setSelectedSpoiler(option.value)}
                        />
                    ))}
                    <Divider />
                    <ColorOptions value={colors.spoiler} onChange={setColor('spoiler')} />
                </>
            );
        }

        if (activePart === 'plate') {
            return (
                <label className="flex shrink-0 flex-col gap-1.5 text-xs text-white/70">
                    Napis na tablicy rejestracyjnej
                    <input
                        type="text"
                        maxLength={8}
                        value={registrationText}
                        onChange={(event) => setRegistrationText(event.target.value)}
                        className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center font-mono text-base tracking-widest text-white outline-none focus:border-sky-400"
                    />
                </label>
            );
        }

        if (COLOR_PARTS[activePart]) {
            const key = COLOR_PARTS[activePart];
            return <ColorOptions value={colors[key]} onChange={setColor(key)} />;
        }

        return null;
    };

    const activePartData = PARTS.find((part) => part.id === activePart);

    return (
        <div className="w-full h-full relative">
            <Loader />  {/* pasek postępu */}
            <AuthPanel />

            <button
                onClick={() => window.location.href = '/admin'}
                className="absolute right-4 top-28 z-20 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
                Panel Admina
            </button>

            {isFocused && (
                <button
                    onClick={handleResetView}
                    className="absolute right-4 top-4 z-10 bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
                >
                    Resetuj widok
                </button>
            )}
            {!isFocused && (
                <button
                    onClick={handleDotsView}
                    className="absolute right-4 top-4 z-10 bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
                >
                    {isShown ? 'Schowaj' : 'Pokaż'} kropki
                </button>
            )}

            {/* Left menu */}
            <nav
                aria-label="Części samochodu"
                className="absolute left-4 top-4 z-10 flex max-h-[calc(100%-2rem)] flex-col gap-2 overflow-y-auto"
            >
                {PARTS.map((part) => (
                    <PartButton
                        key={part.id}
                        part={part}
                        active={activePart === part.id}
                        onClick={() => togglePart(part.id)}
                    />
                ))}
            </nav>

            {/* Bottom menu */}
            {activePartData && (
                <div className="pointer-events-none absolute bottom-4 left-48 right-4 z-10 flex justify-center">
                    <div className="pointer-events-auto flex max-w-full flex-col gap-2 rounded-2xl border border-white/10 bg-black/70 p-3 text-white shadow-xl backdrop-blur-md">
                        <div className="flex items-center justify-between px-1 text-sm">
                            <span className="font-semibold text-white/80">{activePartData.label}</span>
                            <button
                                type="button"
                                onClick={handleResetView}
                                aria-label="Zamknij menu"
                                className="cursor-pointer rounded-md px-2 text-lg leading-none text-white/50 hover:text-white"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                            {renderBottomContent()}
                        </div>
                    </div>
                </div>
            )}

            <Canvas
                shadows
                camera={{ position: [0, 2, 8], fov: 40 }}
            >
                <CameraRig
                    targetPos={animConfig.targetPos}
                    cameraPos={animConfig.cameraPos}
                    isAnimated={animConfig.isAnimated}
                    controlsRef={controlsRef}
                    onArrived={() => {
                        setAnimConfig(prev => ({ ...prev, isAnimated: false }));
                    }}
                />

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
                        selectedSpoilerName={selectedSpoiler}
                        rimSize={rimSize}
                        bodyColor={colors.body}
                        tiresColor={colors.tires}
                        chassisColor={colors.chassis}
                        spoilerColor={colors.spoiler}
                        windowsColor={colors.windows}
                        registrationText={registrationText}
                    />
                    {!isFocused && isShown && (
                        <Dots onDotClick={handleDotClick} />
                    )}
                </Suspense>

                <Environment preset="city" blur={0.5} />

                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    autoRotate={isIdle && !isFocused}
                    autoRotateSpeed={1.0}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                    minAzimuthAngle={isIdle ? -Infinity : -Math.PI / 4}
                    maxAzimuthAngle={isIdle ? -Infinity : 3 * Math.PI / 4}
                    enableRotate={!isFocused}
                    enablePan={false}
                    minDistance={isFocused ? 0.8 : 5}
                    maxDistance={isFocused ? 3 : 8}
                    target={[0, 0.5, 0]}
                    mouseButtons={{ RIGHT: THREE.MOUSE.ROTATE }}
                />
            </Canvas>
        </div>
    );
}