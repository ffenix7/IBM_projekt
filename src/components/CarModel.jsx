import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const RIM_FILES = {
    Felgi1: './Felgi1.glb',
    Felgi2: './Felgi2.glb',
};

const RIM_POSITION = [0, 0, 0];
const RIM_ROTATION = [0, 0, 0];

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
    selectedRimName = 'Felgi1',
    bodyColor = '#00c946',
    tiresColor = '#176193',
    chassisColor = '#c0210c',
    spoilerColor = '#1091b1',
    windowsColor = '#101211',
    registrationText = 'Default',
}) {
    const gltf = useGLTF(url);
    const car = gltf.scene;
    const materials = useRef(new WeakMap());

    const rim1 = useGLTF(RIM_FILES.Felgi1);
    const rim2 = useGLTF(RIM_FILES.Felgi2);

    const rimScenes = useMemo(
        () => ({
            Felgi1: rim1.scene.clone(true),
            Felgi2: rim2.scene.clone(true),
        }),
        [rim1.scene, rim2.scene]
    );

    // Rim visibility
    useLayoutEffect(() => {
        Object.entries(rimScenes).forEach(([name, scene]) => {
            scene.visible = name === selectedRimName;
        });
    }, [rimScenes, selectedRimName]);

    // Colors, window material, registration plate, hiding default tires
    useLayoutEffect(() => {
        car.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (!materials.current.has(child)) {
                    materials.current.set(child, cloneMaterials(child.material));
                }

                const material = materials.current.get(child);
                child.material = material;

                if (child.name === 'Karoseria') {
                    setMaterialColor(material, bodyColor);
                } else if (child.name === 'Opony_przod_material' || child.name === 'Opony_tyl_material') {
                    setMaterialColor(material, tiresColor, true);
                } else if (child.name === 'Podwozie') {
                    setMaterialColor(material, chassisColor, true);
                } else if (child.name === 'Object_50') {
                    // Spojler
                    setMaterialColor(material, spoilerColor, true);
                } else if (child.name === 'Gumy_od_szyb' || child.name === 'Szyby') {
                    if (!child.userData.windowMaterial) {
                        child.userData.windowMaterial = new THREE.MeshStandardMaterial({
                            roughness: 0.1,
                            metalness: 0.9,
                            transparent: true,
                            opacity: 1.0,
                            side: THREE.DoubleSide,
                        });
                    }
                    child.material = child.userData.windowMaterial;
                    setMaterialColor(child.material, windowsColor);
                } else if (child.name === 'Tablica_rejestracyjna_tekst') {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 128;
                    const context = canvas.getContext('2d');

                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    context.strokeStyle = '#000000';
                    context.lineWidth = 8;
                    context.strokeRect(0, 0, canvas.width, canvas.height);

                    context.font = 'bold 44px Arial';
                    context.fillStyle = '#000000';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(registrationText, canvas.width / 2, canvas.height / 2);

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;

                    child.material.map = texture;
                    child.material.needsUpdate = true;
                } 
                // Default rims/tires of the original model
                else if (
                    ['Object_38', 'Object_39', 'Object_40', 'Object_42', 'Object_43', 'Object_44'].includes(child.name)
                ) {
                    child.visible = false;
                }
            }
        });
    }, [car, bodyColor, tiresColor, chassisColor, spoilerColor, windowsColor, registrationText]);

    return (
        <group scale={0.65} position={[0, 0, 0]} rotation={[0, (3 * Math.PI) / 4, 0]}>
            <primitive object={car} />

            <group position={RIM_POSITION} rotation={RIM_ROTATION}>
                <primitive object={rimScenes.Felgi1} />
                <primitive object={rimScenes.Felgi2} />
            </group>
        </group>
    );
}

useGLTF.preload(RIM_FILES.Felgi1);
useGLTF.preload(RIM_FILES.Felgi2);