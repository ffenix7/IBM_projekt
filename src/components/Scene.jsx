import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function Cube() {
    return (
        <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color={'rgb(110, 192, 3)'} wireframe={true} />
        </mesh>
    );
}

export default function Scene() {
    return (
        <div className="w-full h-full">
            <Canvas camera={{ position: [0, 0, 5] }}>

                <Cube />

                <OrbitControls />
            </Canvas>
        </div>
    );
}