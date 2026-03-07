'use client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Theme color constants for consistency
const DARK_BG_COLOR = '#0a0a0a';
const LIGHT_BG_COLOR = '#f5f5f5';
const DARK_FOG_COLOR = 0x0a0a0a;
const LIGHT_FOG_COLOR = 0xf5f5f5;

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const { theme } = useTheme();
	// Initialize as null to indicate "checking" state - prevents flash of wrong content
	const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<{
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		particles: THREE.Points[];
		animationId: number;
		count: number;
	} | null>(null);

	useEffect(() => {
		// WebGL check runs in useEffect to avoid SSR issues
		if (!containerRef.current) {
			return;
		}

		// Check if WebGL is available
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) {
				setHasWebGL(false);
				// Add a fallback CSS background for offline/no-WebGL mode
				// Default to dark mode pattern since that's the default theme
				const isDarkMode = theme === 'dark' || theme === undefined;
				containerRef.current.style.background = isDarkMode
					? 'radial-gradient(circle, rgba(100,100,100,0.4) 1px, transparent 1px)'
					: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)';
				containerRef.current.style.backgroundSize = '30px 30px';
				containerRef.current.style.backgroundColor = isDarkMode ? DARK_BG_COLOR : LIGHT_BG_COLOR;
				return;
			}
		} catch (e) {
			setHasWebGL(false);
			return;
		}

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		// Determine if dark mode - default to dark if theme is undefined (offline/initial load)
		const isDark = theme === 'dark' || theme === undefined;

		// Scene setup with fog that matches background
		const scene = new THREE.Scene();
		const fogColor = isDark ? DARK_FOG_COLOR : LIGHT_FOG_COLOR;
		scene.fog = new THREE.Fog(fogColor, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(fogColor, 1); // Use fog color as clear color

		containerRef.current.appendChild(renderer.domElement);

		// Create particles
		const positions: number[] = [];
		const colors: number[] = [];

		// Create geometry for all particles
		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Will be animated
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
				// Use appropriate colors based on theme
				if (isDark) {
					colors.push(180, 180, 180); // Light gray for dark mode
				} else {
					colors.push(60, 60, 60); // Dark gray for light mode
				}
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		// Create material
		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		// Create points object
		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let count = 0;
		let animationId = 0;

		// Animation function
		const animate = () => {
			animationId = requestAnimationFrame(animate);

			const positionAttribute = geometry.attributes.position;
			const positions = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					// Animate Y position with sine waves
					positions[index + 1] =
						Math.sin((ix + count) * 0.3) * 50 +
						Math.sin((iy + count) * 0.5) * 50;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;

			renderer.render(scene, camera);
			count += 0.1;
		};

		// Handle window resize
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Start animation
		animate();

		// Store references
		sceneRef.current = {
			scene,
			camera,
			renderer,
			particles: [points],
			animationId,
			count,
		};

		// Cleanup function
		// Note: hasWebGL intentionally not in deps - we only check once on mount
		return () => {
			window.removeEventListener('resize', handleResize);

			if (sceneRef.current) {
				cancelAnimationFrame(sceneRef.current.animationId);

				// Clean up Three.js objects
				sceneRef.current.scene.traverse((object) => {
					if (object instanceof THREE.Points) {
						object.geometry.dispose();
						if (Array.isArray(object.material)) {
							object.material.forEach((material) => material.dispose());
						} else {
							object.material.dispose();
						}
					}
				});

				sceneRef.current.renderer.dispose();

				if (containerRef.current && sceneRef.current.renderer.domElement) {
					containerRef.current.removeChild(
						sceneRef.current.renderer.domElement,
					);
				}
			}
		};
	}, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

	// Render nothing while checking for WebGL (avoids flash of wrong content)
	if (hasWebGL === null) {
		return null;
	}

	// If no WebGL, return a pure CSS fallback
	if (!hasWebGL) {
		const isDark = theme === 'dark' || theme === undefined;
		return (
			<div
				className={cn(
					'pointer-events-none fixed inset-0 -z-10',
					isDark 
						? `bg-[radial-gradient(circle,rgba(100,100,100,0.4)_1px,transparent_1px)] bg-[size:30px_30px] bg-[${DARK_BG_COLOR}]`
						: `bg-[radial-gradient(circle,rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[size:30px_30px] bg-[${LIGHT_BG_COLOR}]`,
					className
				)}
				{...props}
			/>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 -z-10', className)}
			{...props}
		/>
	);
}
