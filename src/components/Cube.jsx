export function Cube() {
    return (
        <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color={'rgb(110, 192, 3)'} wireframe={true} />
        </mesh>
    );
}