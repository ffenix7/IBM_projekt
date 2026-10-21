import { useGLTF } from '@react-three/drei';

export function CarModel({ url }) {
    const { scene } = useGLTF(url);

    scene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return <primitive object={scene} scale={1} position={[0, 0, 0]} rotation={[0, 3 * Math.PI / 4, 0]} />;
}