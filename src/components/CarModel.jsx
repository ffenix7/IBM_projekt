import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';

export function CarModel({
    url,
    bodyColor = '#00c946',
    tiresColor = '#b10fdd',
    chassisColor = '#c0210c',
    spoilerColor = '#1091b1',
    windowsColor = '#101211'
}) {
    const gltf = useGLTF(url);
    const car = gltf.scene;

    useEffect(() => {
        car.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.name === 'Karoseria') {
                    child.material = child.material.clone();
                    child.material.color.set(bodyColor);
                }

                else if (child.name === 'Opony_przod_material' || child.name === 'Opony_tyl_material') {
                    child.material = child.material.clone();
                    child.material.color.set(tiresColor);
                }

                else if (child.name === 'Podwozie') {
                    child.material = child.material.clone();
                    child.material.color.set(chassisColor);
                }

                //Spojler
                else if (child.name === 'Object_50') {
                    child.material = child.material.clone();
                    child.material.color.set(spoilerColor);
                }

                else if (child.name === 'Gumy_od_szyb' || child.name === 'Szyby') {
                    child.material = new THREE.MeshStandardMaterial({
                        color: windowsColor,
                        roughness: 0.1,
                        metalness: 0.9,
                        transparent: true,
                        opacity: 1.0,
                        side: THREE.DoubleSide
                    });
                }
            }
        });
    }, [car, bodyColor, tiresColor, chassisColor, spoilerColor, windowsColor]);

    return <primitive object={car} scale={0.65} position={[0, 0, 0]} rotation={[0, 3 * Math.PI / 4, 0]} />;
}