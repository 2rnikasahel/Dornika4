"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Mesh components                                                     */
/* ------------------------------------------------------------------ */

function PipeSegment({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh position={position} rotation={rotation}>
        <cylinderGeometry args={[0.18, 0.18, 1.6, 24]} />
        <meshStandardMaterial
          color="#2d97ad"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
    </Float>
  );
}

function ValveWheel({
  position,
}: {
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  return (
    <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.6}>
      <group ref={ref} position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.08, 16, 32]} />
          <meshStandardMaterial
            color="#1a3a5c"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        {/* Spokes */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[0, 0, (i * Math.PI) / 3]}
          >
            <boxGeometry args={[1.05, 0.04, 0.04]} />
            <meshStandardMaterial color="#237d90" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
          <meshStandardMaterial color="#0b2136" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

function Gauge3D({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.7}>
      <mesh position={position}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 32]} />
        <meshStandardMaterial color="#0b2136" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[position[0], position[1] + 0.07, position[2]]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 32]} />
        <meshStandardMaterial
          color="#f6f2e9"
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
    </Float>
  );
}

function Flange3D({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.3} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 32]} />
        <meshStandardMaterial color="#196374" metalness={0.6} roughness={0.35} />
      </mesh>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, -2]} intensity={0.4} color="#6cbccb" />
      <PipeSegment position={[-3.2, 1.0, -1]} rotation={[0.4, 0, 0.2]} />
      <PipeSegment position={[3.0, -0.8, -1.5]} rotation={[1.2, 0, -0.3]} />
      <ValveWheel position={[1.6, 1.4, 0]} />
      <Gauge3D position={[-1.8, -1.2, 0.4]} />
      <Flange3D position={[2.4, 1.6, -0.5]} />
    </>
  );
}

/**
 * R3F canvas with industrial props (pipes, valve wheel, gauge, flange)
 * that float gently. Mounted only on xl+ screens (see AuroraBackground).
 */
export function FloatingElements3D() {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 6], fov: 50 }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default FloatingElements3D;
