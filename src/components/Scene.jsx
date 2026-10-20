import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { Loader } from './AssetLoader';
import { CarModel } from './CarModel';
import { Floor } from './Floor';

export default function Scene() {
    return (
        <div className="w-full h-full relative">
            <Loader />  {/* pasek postępu */}

            <Canvas 
                shadows 
                camera={{ position: [0, 2, 8], fov: 50 }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight 
                    position={[5, 8, 5]} 
                    intensity={1.5} 
                    castShadow 
                    shadow-mapSize={[1024, 1024]}
                />

                <Floor />

                <Suspense fallback={null}>
                    <CarModel url="https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb" />
                </Suspense>

                <OrbitControls enableDamping />
            </Canvas>
        </div>
    );
}