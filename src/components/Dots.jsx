export function Dots({ onDotClick }) {
    const dotsData = [
        { id: 'rear-wheel', position: [-0.25, 0.55, 2.6] },
        { id: 'front-wheel', position: [2.7, 0.55, -0.35] },
        { id: 'plate', position: [-2.8, 0.4, 2.8] },
        { id: 'spoiler', position: [-2.3, 2.2, 2.3] },
        //{ id: 'windows', position: [0.6, 1.75, -0.6] },
        { id: 'body', position: [2.7, 0.75, -2.7] },
        //{ id: 'chassis', position: [1.15, 0.2, 1.15] },
    ];

    return (
        <group>
            {dotsData.map((dot) => (
                <mesh
                    key={dot.id}
                    position={dot.position}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDotClick) onDotClick(dot.id);
                        document.body.style.cursor = 'auto';
                    }}
                    onPointerOver={() => document.body.style.cursor = 'pointer'}
                    onPointerOut={() => document.body.style.cursor = 'auto'}
                >
                    <sphereGeometry args={[0.05, 32]} />
                    <meshBasicMaterial color="white" />
                </mesh>
            ))}
        </group>
    );
}