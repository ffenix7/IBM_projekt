import { Suspense, memo, useLayoutEffect } from "react";
import { Clone, useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// Room is ROOM x ROOM metres; walls sit exactly on the edge of the floor
const ROOM = 24;
const HALF = ROOM / 2;
const HEIGHT = 8;

// How many metres one texture tile covers (smaller = finer detail, more repeats)
const FLOOR_TILE = 2.5;
const WALL_TILE = 3;
const FLOOR_REPEAT = [ROOM / FLOOR_TILE, ROOM / FLOOR_TILE];
const WALL_REPEAT = [ROOM / WALL_TILE, HEIGHT / WALL_TILE];

const WALLS = [
    { position: [0, HEIGHT / 2, -HALF], rotation: [0, 0, 0] },
    { position: [0, HEIGHT / 2, HALF], rotation: [0, Math.PI, 0] },
    { position: [-HALF, HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [HALF, HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0] },
];

// Background props (garage-local coordinates, the group below is already rotated).
// Keep them ~9-11.5 m from the centre so the camera (max distance 8) never clips them.
// Rotation Y: 0 faces +z (back wall), PI/2 faces +x (left wall), -PI/2 faces -x (right wall).
// Add your own .glb files to /public/models and uncomment. A missing file will throw.
const PROPS = [
    // { url: "/models/toolbox.glb",    position: [-10.5, 0, -6],   rotation: [0, Math.PI / 2, 0], scale: 1 },
    // { url: "/models/tire_stack.glb", position: [-9.5, 0, -10.5], rotation: [0, 0.4, 0],         scale: 1 },
    // { url: "/models/shelf.glb",      position: [0, 0, -11.5],    rotation: [0, 0, 0],           scale: 1 },
    // { url: "/models/workbench.glb",  position: [10.5, 0, 4],     rotation: [0, -Math.PI / 2, 0], scale: 1 },
];

function usePbrTextures(path, repeat) {
    const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

    const textures = useTexture({
        map: `${path}_diff_1k.jpg`,
        aoMap: `${path}_arm_1k.jpg`,
        roughnessMap: `${path}_arm_1k.jpg`,
    });
    const { map, aoMap, roughnessMap } = textures;

    useLayoutEffect(() => {
        [map, aoMap, roughnessMap].forEach((tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(repeat[0], repeat[1]);
            tex.anisotropy = maxAnisotropy;
        });
        map.colorSpace = THREE.SRGBColorSpace;
        map.needsUpdate = true;
    }, [map, aoMap, roughnessMap, repeat, maxAnisotropy]);

    return textures;
}

function Prop({ url, ...transform }) {
    const { scene } = useGLTF(url);
    return <Clone object={scene} castShadow receiveShadow {...transform} />;
}

function CeilingStrips() {
    return [-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, HEIGHT - 0.05, 0]}>
            <boxGeometry args={[0.3, 0.1, 16]} />
            <meshBasicMaterial color="#e8f1ff" toneMapped={false} />
        </mesh>
    ));
}

export const Garage = memo(function Garage() {
    const floor = usePbrTextures("/textures/asphalt/aerial_asphalt_01", FLOOR_REPEAT);
    const wall = usePbrTextures("/textures/concrete/cracked_concrete_02", WALL_REPEAT);

    return (
        <group rotation={[0, (3 * Math.PI) / 4, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[ROOM, ROOM]} />
                <meshStandardMaterial {...floor} />
            </mesh>

            {WALLS.map(({ position, rotation }, i) => (
                <mesh key={i} position={position} rotation={rotation} receiveShadow>
                    <planeGeometry args={[ROOM, HEIGHT]} />
                    <meshStandardMaterial {...wall} envMapIntensity={0.4} />
                </mesh>
            ))}

            <mesh position={[0, HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[ROOM, ROOM]} />
                <meshStandardMaterial color="#0b0b10" roughness={0.9} />
            </mesh>
            <CeilingStrips />

            <Suspense fallback={null}>
                {PROPS.map(({ url, ...transform }, i) => (
                    <Prop key={i} url={url} {...transform} />
                ))}
            </Suspense>
        </group>
    );
});

PROPS.forEach(({ url }) => useGLTF.preload(url));