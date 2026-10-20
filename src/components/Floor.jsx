export function Floor() {
    return (
        <mesh 
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            position={[0, -1, 0]}
        >
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial 
                color="#303030"
                roughness={0.8}
                metalness={0.2}
            />
        </mesh>
    );
}