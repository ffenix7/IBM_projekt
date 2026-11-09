import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const SPOILER_FILES = {
    Spoiler1: '/Spoiler.glb',
    Spoiler2: '/Spoiler2.glb'
}

export const RIM_FILES = {
    Felgi1: '/Felgi1.glb',
    Felgi2: '/Felgi2.glb',
};
const TIRES_FILE = '/Opony.glb';

const MAX_RIM = 22;

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

function getWheelNodes(scene) {
    let node = scene;
    while (node.children.length === 1) node = node.children[0];
    return [...node.children];
}

function createPivots(scene) {
    scene.updateMatrixWorld(true);
    
    return getWheelNodes(scene).map((wheel) => {
        const parent = wheel.parent;
        const box = new THREE.Box3().setFromObject(wheel);
        const pivot = new THREE.Group();

        pivot.position.copy(parent.worldToLocal(box.getCenter(new THREE.Vector3())));
        parent.add(pivot);
        pivot.attach(wheel);
        return pivot;
    });
}

function makeWheelSet(source, { cloneMats = false } = {}) {
    const scene = source.clone(true);

    scene.traverse((child) => {
        if (child.isMesh && cloneMats) {
            child.material = cloneMaterials(child.material);
        }
    });

    return { scene, pivots: createPivots(scene) };
}

export function CarModel({
    url,
    selectedRimName = 'Felgi1',
    selectedSpoilerName = 'Spoiler2',
    rimSize = 21,
    bodyColor = '#1091B1',
    tiresColor = '#000000',
    chassisColor = '#060606',
    spoilerColor = '#1091b1',
    windowsColor = '#101211',
    registrationText = 'Default',
}) {
    const gltf = useGLTF(url);
    const car = gltf.scene;
    const materials = useRef(new WeakMap());

    const rim1 = useGLTF(RIM_FILES.Felgi1);
    const rim2 = useGLTF(RIM_FILES.Felgi2);
    const tires = useGLTF(TIRES_FILE);

    const spoiler1 = useGLTF(SPOILER_FILES.Spoiler1);
    const spoiler2 = useGLTF(SPOILER_FILES.Spoiler2);

    // Clones of the rims and tires, each wheel wrapped in its own pivot
    const wheelSets = useMemo(
        () => ({
            Felgi1: makeWheelSet(rim1.scene),
            Felgi2: makeWheelSet(rim2.scene),
            tires: makeWheelSet(tires.scene, { cloneMats: true }),
        }),
        [rim1.scene, rim2.scene, tires.scene]
    );

    // Parts visibility
    useLayoutEffect(() => {
        wheelSets.Felgi1.scene.visible = selectedRimName === 'Felgi1';
        wheelSets.Felgi2.scene.visible = selectedRimName === 'Felgi2';
        spoiler1.scene.visible = selectedSpoilerName === 'Spoiler1';
        spoiler2.scene.visible = selectedSpoilerName === 'Spoiler2';
    }, [wheelSets, spoiler1, spoiler2, selectedRimName, selectedSpoilerName]);

    useLayoutEffect(() => {
        const s = rimSize / MAX_RIM;
        const scale = new THREE.Vector3(s, s, 1);

        Object.values(wheelSets).forEach(({ pivots }) =>
            pivots.forEach((pivot) => pivot.scale.copy(scale))
        );
    }, [wheelSets, rimSize]);

    useLayoutEffect(() => {
        wheelSets.tires.scene.traverse((child) => {
            if (child.isMesh) {
                setMaterialColor(child.material, tiresColor, true);
            }
        });
        spoiler1.scene.traverse((child) =>{
            if (child.isMesh){
                setMaterialColor(child.material, spoilerColor, true);
            }
        })

        spoiler2.scene.traverse((child) =>{
            if (child.isMesh){
                setMaterialColor(child.material, spoilerColor, true);
            }
        })
    }, [wheelSets, tiresColor, spoilerColor]);

    // Colors, window material, registration plate
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
                }  else if (child.name === 'Podwozie') {
                    setMaterialColor(material, chassisColor, true);
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
            }
        });
    }, [car, bodyColor, tiresColor, chassisColor, spoilerColor, windowsColor, registrationText]);

    return (
        <group scale={0.65} position={[0, 0, 0]} rotation={[0, (3 * Math.PI) / 4, 0]}>
            <primitive object={car} />
            <primitive object={wheelSets.Felgi1.scene} />
            <primitive object={wheelSets.Felgi2.scene} />
            <primitive object={wheelSets.tires.scene} />
            <primitive object={spoiler1.scene} />
            <primitive object={spoiler2.scene} />
        </group>
    );
}

useGLTF.preload(RIM_FILES.Felgi1);
useGLTF.preload(RIM_FILES.Felgi2);
useGLTF.preload(SPOILER_FILES.Spoiler1);
useGLTF.preload(SPOILER_FILES.Spoiler2);
useGLTF.preload(TIRES_FILE);