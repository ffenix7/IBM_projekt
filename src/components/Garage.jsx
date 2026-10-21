import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const SIZE = 20;
const HEIGHT = 10;

const WALLS = [
    { position: [0, HEIGHT / 2, -8], rotation: [0, 0, 0] },
    { position: [0, HEIGHT / 2, 8], rotation: [0, Math.PI, 0] },
    { position: [-8, HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [8, HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0] },
];

function usePbrTextures(path, repeat) {
    const textures = useTexture({
        map: `${path}_diff_1k.jpg`,
        displacementMap: `${path}_disp_1k.png`,
        aoMap: `${path}_arm_1k.jpg`,
        roughnessMap: `${path}_arm_1k.jpg`,
    });

    useLayoutEffect(() => {
        Object.values(textures).forEach((tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(...repeat);
            tex.needsUpdate = true;
        });
    }, [textures, repeat]);

    return textures;
}

const FLOOR_REPEAT = [4, 4];
const WALL_REPEAT = [4, 2];

export function Garage() {
    const asphalt = usePbrTextures("/textures/asphalt/aerial_asphalt_01", FLOOR_REPEAT);
    const concrete = usePbrTextures("/textures/concrete/cracked_concrete_02", WALL_REPEAT);

    return (
        <group rotation={[0, (3 * Math.PI) / 4, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[SIZE, SIZE, 64, 64]} />
                <meshStandardMaterial {...asphalt} displacementScale={0.05} />
            </mesh>

            {WALLS.map(({ position, rotation }, i) => (
                <mesh key={i} position={position} rotation={rotation} receiveShadow>
                    <planeGeometry args={[SIZE, HEIGHT]} />
                    <meshStandardMaterial {...concrete} />
                </mesh>
            ))}
        </group>
    );
}