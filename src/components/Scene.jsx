import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Loader } from './AssetLoader';
import { CarModel } from './CarModel';
import { Garage } from './Garage';
import { Dots } from './Dots';
import { AuthPanel, get, post, storedUser } from './AuthPanel';
import { apiUrl } from '../api';

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
const RIM_INFO = {
    Felgi1: { label: 'Sportowe', icon: './icons/rims/felgi1.png' },
    Felgi2: { label: 'Klasyczne', icon: './icons/rims/felgi2.png' },
};

const SPOILER_INFO = {
    Spoiler1: { label: 'Klasyczny', icon: './icons/spoilers/spoiler1.png' },
    Spoiler2: { label: 'Sportowy', icon: './icons/spoilers/spoiler2.png' },
};

function hasVipAccess(subscriptionTier) {
    return String(subscriptionTier || '').trim().toLowerCase() === 'vip';
}

// Parts changed only by color (part id -> key in the colors state)
const COLOR_PARTS = {
    tires: 'tires',
    body: 'body',
};

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
function OptionTile({ option, active, onClick, locked }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={locked}
            aria-pressed={active}
            className={`flex w-28 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-xs transition
                ${option.tier === 'vip'
                    ? 'border-amber-400 bg-white/5 text-white/80'
                    : active
                        ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                        : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'}
                ${locked ? 'cursor-not-allowed opacity-75' : ''}`}
        >
            <Icon src={option.icon} label={option.label} className="h-16 w-16" />
            <span>{option.label} {option.tier === 'vip' && <strong className="text-amber-300">VIP</strong>}</span>
        </button>
    );
}

function ColorOptions({ value, onChange, paints, subscriptionTier }) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            {paints.map((color) => {
                const locked = color.tier === 'vip' && subscriptionTier !== 'vip';
                return (
                    <button
                        key={color.value}
                        type="button"
                        disabled={locked}
                        onClick={() => onChange(color.value)}
                        aria-label={`Kolor ${color.value}`}
                        style={{ backgroundColor: color.value }}
                        className={`h-10 w-10 shrink-0 cursor-pointer rounded-full border-2 transition
                            ${locked ? 'cursor-not-allowed border-amber-400 opacity-60' : ''}
                            ${value.toLowerCase() === color.value ? 'border-sky-400 scale-110' : 'border-white/20 hover:border-white/60'}`}
                    />
                );
            })}
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
    const buildCacheRef = useRef(new Map());

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
    const [activeSlot, setActiveSlot] = useState(1);
    const [buildSlots, setBuildSlots] = useState([]);
    const [isBuildsLoading, setIsBuildsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('token')));
    const [subscriptionTier, setSubscriptionTier] = useState(() => storedUser()?.subscriptionTier || 'free');

    const [activePart, setActivePart] = useState(null); // id from PARTS or null

    const [isFocused, setIsFocused] = useState(false);
    const [isShown, setIsShown] = useState(true);


    //fetching the info from backend catalog
    const [catalog, setCatalog] = useState({ paints: [], rims: [], spoilers: [] });

    useEffect(() => {
        fetch(apiUrl('/api/catalog'))
            .then((res) => res.json())
            .then(setCatalog)
            .catch((error) => console.error('Nie udało się pobrać katalogu:', error.message));
    }, []);

    const rimOptions = catalog.rims.map((item) => ({
        ...item,
        label: RIM_INFO[item.value]?.label ?? item.value,
        icon: RIM_INFO[item.value]?.icon,
    }));

    const spoilerOptions = catalog.spoilers.map((item) => ({
        ...item,
        label: SPOILER_INFO[item.value]?.label ?? item.value,
        icon: SPOILER_INFO[item.value]?.icon,
    }));

    const refreshSession = async () => {
        if (!localStorage.getItem('token')) {
            setSubscriptionTier('free');
            return;
        }

        try {
            const result = await get('/api/session');
            setSubscriptionTier(result.user.subscriptionTier);
            localStorage.setItem('user', JSON.stringify(result.user));
        } catch (error) {
            console.error('Nie udało się odświeżyć sesji:', error.message);
        }
    };

    const setColor = (part) => (color) => {
        setColors((current) => ({ ...current, [part]: color }));
    };

    const applyBuild = (config) => {
        if (!config) return;
        if (config.rim || config.tire) setSelectedRim(config.rim || config.tire);
        if (config.spoiler) setSelectedSpoiler(config.spoiler);
        if (config.registrationText !== undefined) setRegistrationText(config.registrationText);
        if (config.colors) setColors((current) => ({ ...current, ...config.colors }));
    };

    const loadBuildSlot = async (slot) => {
        setActiveSlot(slot);
        if (!localStorage.getItem('token')) return;

        try {
            let config = buildCacheRef.current.get(slot);
            if (config === undefined) {
                const result = await get(`/api/builds/${slot}`);
                config = result.config;
                buildCacheRef.current.set(slot, config);
            }
            applyBuild(config);
        } catch (error) {
            console.error('Nie udało się załadować buildu:', error.message);
        }
    };

    const loadAvailableBuilds = async () => {
        if (!localStorage.getItem('token')) {
            buildCacheRef.current.clear();
            setBuildSlots([]);
            return;
        }

        setIsBuildsLoading(true);
        try {
            const session = await get('/api/session');
            setSubscriptionTier(session.user.subscriptionTier);
            localStorage.setItem('user', JSON.stringify(session.user));
            const result = await get('/api/builds');
            setBuildSlots(result.slots);
            const latest = result.slots
                .filter((slot) => slot.hasBuild)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            await loadBuildSlot(latest?.slot || 1);
        } catch (error) {
            console.error('Nie udało się pobrać buildów:', error.message);
        } finally {
            setIsBuildsLoading(false);
        }
    };

    useEffect(() => {
        const handleAuthChanged = () => {
            setIsAuthenticated(Boolean(localStorage.getItem('token')));
            setSubscriptionTier(storedUser()?.subscriptionTier || 'free');
            loadAvailableBuilds();
        };
        window.addEventListener('auth-changed', handleAuthChanged);
        loadAvailableBuilds();
        return () => window.removeEventListener('auth-changed', handleAuthChanged);
    }, []);

    useEffect(() => {
        if (isSettingsOpen) refreshSession();
    }, [isSettingsOpen]);

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
                    {rimOptions.map((option) => (
                        <OptionTile
                            key={option.value}
                            option={option}
                            active={selectedRim === option.value}
                            locked={option.tier === 'vip' && !hasVipAccess(subscriptionTier)}
                            onClick={() => {
                                if (option.tier !== 'vip' || hasVipAccess(subscriptionTier)) {
                                    setSelectedRim(option.value);
                                }
                            }}
                        />
                    ))}
                </>
            );
        }

        if (activePart === 'spoiler') {
            return (
                <>
                    {spoilerOptions.map((option) => (
                        <OptionTile
                            key={option.value}
                            option={option}
                            active={selectedSpoiler === option.value}
                            onClick={() => setSelectedSpoiler(option.value)}
                        />
                    ))}
                    <Divider />
                    <ColorOptions value={colors.spoiler} onChange={setColor('spoiler')} paints={catalog.paints} subscriptionTier={subscriptionTier} />
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
            return <ColorOptions value={colors[key]} onChange={setColor(key)} paints={catalog.paints} subscriptionTier={subscriptionTier} />;
        }

        return null;
    };

    const activePartData = PARTS.find((part) => part.id === activePart);

    const saveBuild = async () => {
        if (!localStorage.getItem('token')) {
            setSaveMessage('Zaloguj się, aby zapisać build.');
            return;
        }

        try {
            setSaveMessage('Zapisywanie...');
            const result = await post('/api/saveBuild', {
                slot: activeSlot,
                config: {
                    rim: selectedRim,
                    spoiler: selectedSpoiler,
                    registrationText,
                    colors,
                },
            });
            buildCacheRef.current.set(activeSlot, result.slot.config);
            setBuildSlots((current) => current.map((slot) => (
                slot.slot === activeSlot
                    ? { ...slot, hasBuild: true, updatedAt: result.slot.updatedAt }
                    : slot
            )));
            setSaveMessage(`Build ${activeSlot} zapisany.`);
        } catch (error) {
            console.error('Nie udało się zapisać buildu:', error.message);
            setSaveMessage(error.message);
        }
    };
    return (
        <div className="w-full h-full relative">
            <Loader />  {/* pasek postępu */}
            <div className="absolute right-4 top-4 z-20">
                <button
                    type="button"
                    onClick={() => setIsSettingsOpen((current) => !current)}
                    aria-label="Ustawienia"
                    aria-expanded={isSettingsOpen}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 2.8h3.4l.5 2.1a7.7 7.7 0 0 1 1.6.9l2-.8 1.7 2.9-1.6 1.5c.1.6.2 1.1.2 1.7s-.1 1.1-.2 1.7l1.6 1.5-1.7 2.9-2-.8a7.7 7.7 0 0 1-1.6.9l-.5 2.1h-3.4l-.5-2.1a7.7 7.7 0 0 1-1.6-.9l-2 .8-1.7-2.9 1.6-1.5a7.7 7.7 0 0 1-.2-1.7c0-.6.1-1.1.2-1.7L4.5 7.9l1.7-2.9 2 .8a7.7 7.7 0 0 1 1.6-.9l.5-2.1Z" />
                        <circle cx="12" cy="11.1" r="2.7" />
                    </svg>
                </button>

                {isSettingsOpen && (
                    <div className="mt-2 flex w-56 flex-col gap-3 rounded-2xl border border-white/10 bg-black/75 p-3 text-white shadow-xl backdrop-blur-md">
                        <AuthPanel embedded />
                        {isAuthenticated && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleDotsView}
                                    className="rounded-lg bg-white/20 px-3 py-2 text-sm hover:bg-white/30"
                                >
                                    {isShown ? 'Schowaj kropki' : 'Pokaż kropki'}
                                </button>
                                <button
                                    type="button"
                                    onClick={saveBuild}
                                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm hover:bg-sky-500"
                                >
                                    Zapisz build {activeSlot}
                                </button>
                                {saveMessage && (
                                    <p className="text-xs text-white/70">{saveMessage}</p>
                                )}
                                <div>
                                    <p className="mb-2 text-xs text-white/60">Wybierz build</p>
                                    <div className="grid grid-cols-3 gap-1">
                                        {[1, 2, 3].map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => loadBuildSlot(slot)}
                                                disabled={isBuildsLoading}
                                                className={`rounded px-2 py-1 text-xs ${activeSlot === slot ? 'bg-sky-600' : 'bg-white/20 hover:bg-white/30'
                                                    }`}
                                            >
                                                {slot}{buildSlots.find((item) => item.slot === slot)?.hasBuild ? ' •' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Left menu */}
            <nav
                aria-label="Części samochodu"
                className="absolute left-4 top-20 z-10 flex max-h-[calc(100%-5rem)] flex-col gap-2 overflow-y-auto"
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

                <hemisphereLight args={['#bcd4ff', '#1a1a22', 0.6]} />

                <color attach="background" args={['#0a0a10']} />
                <fog attach="fog" args={['#050508', 18, 40]} />

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

                <Suspense fallback={null}>
                    <Garage />
                </Suspense>

                <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={12} blur={2.5} far={2.5} />

                <Suspense fallback={null}>
                    <CarModel
                        url="/compressed/Car.glb"
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

                <Environment resolution={256}>
                    <color attach="background" args={['#000']} />
                    <Lightformer form="rect" intensity={5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 4, 1]} />
                    <Lightformer form="rect" intensity={3} color="#38bdf8" position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
                    <Lightformer form="rect" intensity={3} color="#f43f5e" position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
                    <Lightformer form="rect" intensity={2} position={[0, 3, -8]} scale={[12, 4, 1]} />
                    <Lightformer form="rect" intensity={4} position={[-9, 1.5, 0]} rotation-y={Math.PI / 2} scale={[14, 2, 1]} />
                    <Lightformer form="rect" intensity={4} position={[9, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[14, 2, 1]} />
                    <Lightformer form="rect" intensity={3} position={[0, 1.5, 9]} rotation-y={Math.PI} scale={[14, 2, 1]} />
                    <Lightformer form="rect" intensity={3} position={[0, 1.5, -9]} scale={[14, 2, 1]} />
                </Environment>

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