"use client";

import { Canvas, useFrame, extend } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

extend({ LineSegments: THREE.LineSegments });

function GateNetwork() {
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  const { pointPositions, linePositions } = useMemo(() => {
    const count = 80;
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push((Math.random() - 0.5) * 8);
      pos.push((Math.random() - 0.5) * 8);
      pos.push((Math.random() - 0.5) * 8);
    }

    const linePos: number[] = [];
    const threshold = 2.5;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < threshold) {
          linePos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          linePos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        }
      }
    }

    return {
      pointPositions: new Float32Array(pos),
      linePositions: new Float32Array(linePos),
    };
  }, []);

  useFrame(({ pointer, clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      pointsRef.current.rotation.x = pointer.y * 0.1;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      linesRef.current.rotation.x = pointer.y * 0.1;
    }
  });

  const lineGeometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: linePositions.length / 3 }, (_, i) =>
        new THREE.Vector3(
          linePositions[i * 3],
          linePositions[i * 3 + 1],
          linePositions[i * 3 + 2]
        )
      )
    ),
    [linePositions]
  );

  return (
    <>
      <Points limit={80} positions={pointPositions} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#F2A93B"
          size={0.12}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
        />
      </Points>

      <lineSegments ref={linesRef} frustumCulled={false} args={[lineGeometry]}>
        <lineBasicMaterial attach="material" color="#5B4FE0" transparent opacity={0.4} />
      </lineSegments>
    </>
  );
}

export function HeroThreeScene() {
  const cameraPosition: [number, number, number] = [0, 0, 12];

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 50 }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0B0B12"]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#F2A93B" />
      <GateNetwork />
    </Canvas>
  );
}
