import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

function cloneMaterials(material) {
    if (Array.isArray(material)) {
        return material.map((item) => item.clone());
    }

    return material.clone();
}

function setMaterialColor(material, color, removeColorMap = false) {
    const materials = Array.isArray(material) ? material : [material];

    materials.forEach((item) => {
        if (item?.color) {
            if (removeColorMap) {
                item.map = null;
            }

            item.color.set(color);
            item.needsUpdate = true;
        }
    });
}

export function CarModel({
    url,
    bodyColor = '#00c946',
    tiresColor = '#176193',
    chassisColor = '#c0210c',
    spoilerColor = '#1091b1',
    windowsColor = '#101211'
}) {
    const gltf = useGLTF(url);
    const car = gltf.scene;
    const materials = useRef(new WeakMap());

    useLayoutEffect(() => {
        car.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (!materials.current.has(child)) {
                    materials.current.set(child, cloneMaterials(child.material));
                }

                const material = materials.current.get(child);

                if (child.name === 'Karoseria') {
                    child.material = material;
                    setMaterialColor(material, bodyColor);
                }

                else if (child.name === 'Opony_przod_material' || child.name === 'Opony_tyl_material') {
                    child.material = material;
                    setMaterialColor(material, tiresColor, true);
                }

                else if (child.name === 'Podwozie') {
                    child.material = material;
                    setMaterialColor(material, chassisColor, true);
                }

                //Spojler
                else if (child.name === 'Object_50') {
                    child.material = material;
                    setMaterialColor(material, spoilerColor, true);
                }

                else if (child.name === 'Gumy_od_szyb' || child.name === 'Szyby') {
                    if (!child.userData.windowMaterial) {
                        child.userData.windowMaterial = new THREE.MeshStandardMaterial({
                            roughness: 0.1,
                            metalness: 0.9,
                            transparent: true,
                            opacity: 1.0,
                            side: THREE.DoubleSide
                        });
                    }

                    child.material = child.userData.windowMaterial;
                    setMaterialColor(child.material, windowsColor);
                }
            }
        });
    }, [car, bodyColor, tiresColor, chassisColor, spoilerColor, windowsColor]);

    return <primitive object={car} scale={0.65} position={[0, 0, 0]} rotation={[0, 3 * Math.PI / 4, 0]} />;
}