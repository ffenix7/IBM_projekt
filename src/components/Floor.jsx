import { MeshReflectorMaterial } from "@react-three/drei";

export function Floor() {
    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            position={[0, 0, 0]}
        >
            <planeGeometry args={[50, 50]} />
            <MeshReflectorMaterial
                blur={[300, 100]}
                resolution={1024}
                mirror={0.6}
                mixBlur={0.8}
                mixStrength={1.5}
                roughness={0.3}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#111113"
                metalness={0.5}
            />
        </mesh>
    );
}