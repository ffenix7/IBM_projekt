import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';
import { Loader } from './AssetLoader';
import { CarModel } from './CarModel';
import { Garage } from './Garage';

export default function Scene() {
    return (
        <div className="w-full h-full relative">
            <Loader />  {/* pasek postępu */}

            <Canvas
                shadows
                camera={{ position: [0, 2, 8], fov: 40 }}
            >

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

                <spotLight
                    position={[-5, 7, 3]}
                    angle={0.6}
                    penumbra={0.7}
                    intensity={60}
                    color="#38bdf8"
                />

                <spotLight
                    position={[5, 7, 3]}
                    angle={0.6}
                    penumbra={0.7}
                    intensity={60}
                    color="#f43f5e"
                />

                <spotLight
                    position={[0, 7, -5]}
                    angle={0.8}
                    penumbra={0.9}
                    intensity={30}
                    color="#a855f7"
                />

                <Garage />

                <Suspense fallback={null}>
                    <CarModel url="./Car.glb" />
                </Suspense>

                <Environment preset="city" blur={0.5} />

                <OrbitControls
                    enableDamping
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                    minAzimuthAngle={-Math.PI / 4}
                    maxAzimuthAngle={3 * Math.PI / 4}
                    enablePan={false}
                    minDistance={5}
                    maxDistance={8}
                    target={[0, 0.5, 0]}
                    mouseButtons={{
                        RIGHT: THREE.MOUSE.ROTATE
                    }}
                />
            </Canvas>
        </div>
    );
}