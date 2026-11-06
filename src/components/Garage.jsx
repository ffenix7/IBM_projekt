import { Suspense, memo, useEffect, useLayoutEffect } from "react";
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

const PROPS = [
    { url: "/models/desk.glb", position: [10, 0, -3], rotation: [0, 0, 0], scale: 2.5 },
    { url: "/models/cork.glb", position: [12, 3, 0], rotation: [0, Math.PI * 3 / 2, 0], scale: 6 },
    { url: "/models/toolbox.glb", position: [9.5, 2, -3], rotation: [0, 0.3, 0], scale: 4 },
    { url: "/models/toolbox.glb", position: [-9.5, 0, 8], rotation: [0, 2, 0], scale: 4 },
    { url: "/models/barrel.glb", position: [-10.5, 0, -8], rotation: [0, 0, 0], scale: 10 },
    { url: "/models/barrel.glb", position: [-10, 0, -5], rotation: [0, 2, 0], scale: 10 },
    { url: "/models/barrel.glb", position: [-8.7, 0, -7], rotation: [0, 5, 0], scale: 10 },
    { url: "/models/barrel.glb", position: [10, 0, 7], rotation: [0, 0.8, 0], scale: 10 },
    { url: "/models/cone.glb", position: [10, 0.4, 2], rotation: [0, 0, 0], scale: 5 },
    { url: "/models/cone.glb", position: [10, 0.4, 4], rotation: [0, 0.5, 0], scale: 5 },
    { url: "/models/cone.glb", position: [9, 0.4, 3], rotation: [0, 0.5, 0], scale: 5 },
    { url: "/models/ladder.glb", position: [7, 0, -10], rotation: [0, 0.5, 0], scale: 3 },
    { url: "/models/shelf.glb", position: [7, 0, 11], rotation: [0, 0, 0], scale: 1.5 }
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

    // Dev only: log triangle count so you can spot heavy models (aim for a few thousand per prop)
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        let tris = 0;
        scene.traverse((o) => {
            if (o.isMesh) {
                const g = o.geometry;
                tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
            }
        });
        console.log(`[Garage] ${url}: ${Math.round(tris)} triangles`);
    }, [scene, url]);

    // Props sit outside the shadow cameras, so shadows would only cost performance
    return <Clone object={scene} castShadow={false} receiveShadow={false} {...transform} />;
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

            {/* Corner lights so the walls are actually lit */}
            {[[-9, 5.5, -9], [9, 5.5, -9], [-9, 5.5, 9], [9, 5.5, 9]].map((position, i) => (
                <pointLight key={i} position={position} intensity={90} distance={26} color="#ffe2c0" />
            ))}

            <Suspense fallback={null}>
                {PROPS.map(({ url, ...transform }, i) => (
                    <Prop key={i} url={url} {...transform} />
                ))}
            </Suspense>
        </group>
    );
});

PROPS.forEach(({ url }) => useGLTF.preload(url));