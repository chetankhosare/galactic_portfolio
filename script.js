// Ensure we use the global references available from the CDNs
const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls; 

// --- 1. SETUP SCENE, CAMERA, RENDERER ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true allows the body background color to show through

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000008); 

// --- 2. ADD INTERACTIVE CONTROLS (Zoom/Rotation) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.minDistance = 2; 
controls.maxDistance = 60; 
controls.autoRotate = true; // Optional: Auto rotate when the user isn't interacting
controls.autoRotateSpeed = 0.5;

camera.position.set(0, 5, 10);

// --- Interaction state ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedHelper = null; // marker for selected particle

// Overlay elements
const infoOverlay = document.getElementById('info-overlay');
const infoTitle = document.getElementById('info-title');
const infoSubtitle = document.getElementById('info-subtitle');
const infoDesc = document.getElementById('info-desc');
const infoClose = document.getElementById('info-close');

// Simple camera + controls tween helper (animates camera position and controls.target)
let cameraTween = null;
function tweenCamera(toPos, toTarget = null, duration = 1000, onComplete) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();

    // disable controls while animating
    controls.enabled = false;

    cameraTween = function animateTween(time) {
        const t = Math.min(1, (time - start) / duration);
        // easeInOutQuad
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        camera.position.lerpVectors(fromPos, toPos, e);

        if (toTarget) {
            const targetVec = new THREE.Vector3().lerpVectors(fromTarget, toTarget, e);
            controls.target.copy(targetVec);
        }

        controls.update();

        if (t < 1) requestAnimationFrame(cameraTween);
        else {
            cameraTween = null;
            controls.enabled = true;
            if (onComplete) onComplete();
        }
    };
    requestAnimationFrame(cameraTween);
}

// Utility to show overlay with data
function showInfo(data) {
    infoTitle.textContent = data.title || 'Unknown';
    infoSubtitle.textContent = data.subtitle || '';
    infoDesc.textContent = data.desc || '';
    infoOverlay.classList.remove('hidden');
}

infoClose.addEventListener('click', () => {
    infoOverlay.classList.add('hidden');
});

// --- 3. GALAXY PARAMETERS ---
const parameters = {
    count: 350000,
    radius: 5,
    branches: 5,
    spin: 1.5,
    randomness: 0.3,
    randomnessPower: 3,
    
    // Color Palette
    insideColor: '#ffddaa',
    outsideColor: '#1b3984'
};

let geometry = null;
let material = null;
let points = null;
let starField = null; 

const insideColor = new THREE.Color(parameters.insideColor);
const outsideColor = new THREE.Color(parameters.outsideColor);
const tempColor = new THREE.Color();


// --- 4. PROCEDURAL GALAXY GENERATION FUNCTION ---
function generateGalaxy() {
    // Clean up previous objects
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3; 

        // 4a. Star Density (Hyper-Denser Core)
        const radius = Math.pow(Math.random(), 5) * parameters.radius; 
        
        // 4b. Calculate base position (spiral)
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;
        const spinAngle = radius * parameters.spin;
        
        const x = Math.cos(branchAngle + spinAngle) * radius;
        const y = 0; 
        const z = Math.sin(branchAngle + spinAngle) * radius;

        // 4c. Apply controlled randomness for star thickness (bulge effect)
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), 1.5) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.5; 
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        positions[i3] = x + randomX;
        positions[i3 + 1] = y + randomY;
        positions[i3 + 2] = z + randomZ;

        // 4d. Apply Color Gradient (Brighter, Yellow-White Core)
        const mixedColor = tempColor.copy(insideColor);
        mixedColor.lerp(outsideColor, radius / parameters.radius); 
        
        // Final color adjustment for super bright, saturated center
        const saturationFactor = 1 - (radius / parameters.radius);
        if (saturationFactor > 0.9) {
            mixedColor.lerp(new THREE.Color(0xFFFFFF), (saturationFactor - 0.9) / 0.1); 
        }

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    // Set Attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); 

    // 4e. Material setup
    material = new THREE.PointsMaterial({
        size: 0.025,
        sizeAttenuation: true, 
        depthWrite: false, 
        blending: THREE.AdditiveBlending, 
        vertexColors: true 
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
}

// --- 5. BACKGROUND STARFIELD GENERATION ---
function generateStarField() {
    const starCount = 10000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3; 
        
        // Distribute stars randomly within a large sphere
        const starRadius = 50; 
        starPositions[i3] = (Math.random() - 0.5) * starRadius * 2;
        starPositions[i3 + 1] = (Math.random() - 0.5) * starRadius * 2;
        starPositions[i3 + 2] = (Math.random() - 0.5) * starRadius * 2;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xAAAAAA,
        size: 0.05,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

// Generate the galaxy and the background
generateGalaxy(); 
generateStarField();

// --- 10. ASSIGN PROJECTS TO NEAREST PARTICLES (ANCHORS) ---
function computeTargetPositionForProject(index, total) {
    // Deterministic placement around the galaxy: choose a branch and a radius
    const t = index / total;
    const branch = index % parameters.branches;
    const branchAngle = (branch / parameters.branches) * Math.PI * 2 + t * Math.PI * 0.5;
    const radius = parameters.radius * (0.35 + 0.55 * t); // avoid core and edge extremes
    const spinAngle = radius * parameters.spin;
    const x = Math.cos(branchAngle + spinAngle) * radius;
    const y = 0;
    const z = Math.sin(branchAngle + spinAngle) * radius;
    return new THREE.Vector3(x, y, z);
}

function findNearestParticleTo(pos) {
    const posAttr = geometry.getAttribute('position');
    let bestIndex = 0;
    let bestDistSq = Infinity;
    const count = posAttr.count;

    // Sampling step to speed up search on very large clouds
    const step = Math.max(1, Math.floor(count / 100000));

    for (let i = 0; i < count; i += step) {
        const dx = posAttr.getX(i) - pos.x;
        const dy = posAttr.getY(i) - pos.y;
        const dz = posAttr.getZ(i) - pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bestDistSq) {
            bestDistSq = d2;
            bestIndex = i;
        }
    }

    // If we sampled, refine search locally around bestIndex
    if (step > 1) {
        const start = Math.max(0, bestIndex - step * 4);
        const end = Math.min(count - 1, bestIndex + step * 4);
        for (let i = start; i <= end; i++) {
            const dx = posAttr.getX(i) - pos.x;
            const dy = posAttr.getY(i) - pos.y;
            const dz = posAttr.getZ(i) - pos.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < bestDistSq) {
                bestDistSq = d2;
                bestIndex = i;
            }
        }
    }

    return { index: bestIndex, position: new THREE.Vector3(posAttr.getX(bestIndex), posAttr.getY(bestIndex), posAttr.getZ(bestIndex)) };
}

function assignProjectAnchors() {
    const projectCards = document.querySelectorAll('.project-card');
    const total = projectCards.length;
    projectCards.forEach((card, i) => {
        const target = computeTargetPositionForProject(i, total);
        const nearest = findNearestParticleTo(target);
        card.dataset.particleIndex = nearest.index;
        card.dataset.anchorX = nearest.position.x;
        card.dataset.anchorY = nearest.position.y;
        card.dataset.anchorZ = nearest.position.z;
        // store a small preview string
        card.dataset.anchorInfo = `anchor:${nearest.index}`;
    });
}

// Assign anchors after geometry created
if (geometry) {
    // compute anchors asynchronously to avoid blocking the UI thread with large searches
    // Use a Web Worker when available to compute anchors off the main thread.
    if (window.Worker) {
        // Prepare data to send: a copy of the positions buffer and deterministic targets
        const posAttr = geometry.getAttribute('position');
        const positionsCopy = new Float32Array(posAttr.array.slice());

        const projectCards = Array.from(document.querySelectorAll('.project-card'));
        const total = projectCards.length;
        const targets = projectCards.map((_, i) => {
            const v = computeTargetPositionForProject(i, total);
            return { x: v.x, y: v.y, z: v.z };
        });

        const worker = new Worker('anchorWorker.js');
        worker.postMessage({ positions: positionsCopy.buffer, targets, step: Math.max(1, Math.floor(posAttr.count / 100000)) }, [positionsCopy.buffer]);

        worker.onmessage = (m) => {
            const anchors = m.data.anchors;
            // assign back to DOM cards
            projectCards.forEach((card, i) => {
                const a = anchors[i];
                if (!a) return;
                card.dataset.particleIndex = a.index;
                card.dataset.anchorX = a.x;
                card.dataset.anchorY = a.y;
                card.dataset.anchorZ = a.z;
            });
            worker.terminate();
        };
        worker.onerror = (err) => {
            console.warn('Anchor worker error, falling back to main-thread compute', err);
            assignProjectAnchors();
            worker.terminate();
        };
    } else {
        setTimeout(() => {
            assignProjectAnchors();
        }, 50);
    }
}

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    requestAnimationFrame(animate);

    // Continuous, subtle rotation of the galaxy
    if (points) {
        points.rotation.y = elapsedTime * 0.05; 
        // Optional: rotate the starfield slowly for a deeper parallax effect
        starField.rotation.y = elapsedTime * 0.005; 
    }

    controls.update(); 
    renderer.render(scene, camera);
}

animate();

// --- 7. HANDLE RESIZING ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- 8. CLICK / TOUCH HANDLERS FOR PARTICLE PICKING ---
function getPointer(event) {
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
}

function onPointerDown(event) {
    const p = getPointer(event);
    pointer.x = (p.x / window.innerWidth) * 2 - 1;
    pointer.y = -(p.y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    if (!points) return;
    const intersects = raycaster.intersectObject(points);

    if (intersects.length > 0) {
        // Points intersection returns face/point index in 'index' or 'instanceId' depending
        const intersect = intersects[0];
        const idx = intersect.index; // index into the position buffer

        // Get the selected particle position
        const posAttr = geometry.getAttribute('position');
        const sx = posAttr.getX(idx);
        const sy = posAttr.getY(idx);
        const sz = posAttr.getZ(idx);

        // Move marker (small sphere) to this position
        if (selectedHelper) scene.remove(selectedHelper);
        const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
        const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        selectedHelper = new THREE.Mesh(helperGeom, helperMat);
        selectedHelper.position.set(sx, sy, sz);
        scene.add(selectedHelper);

        // Show overlay with generated sci-fi style info (could be enriched by project data)
        const fakeData = {
            title: 'Star Node ' + idx,
            subtitle: 'Cinematic Contact Point',
            desc: 'You have discovered a dense star cluster node. Visuals: lens flares, atmospheric scan, and an encrypted transmission hinting at a lost colony.'
        };

        showInfo(fakeData);
    }
}

// Add both mouse and touch listeners on renderer.domElement
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// --- Beam and UI-to-world helpers ---
function getWorldPointFromScreen(screenX, screenY, distanceFromCamera = 2) {
    // screenX/Y in client coordinates
    const ndc = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
    const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5);
    vec.unproject(camera);
    // Direction from camera to unprojected point
    const dir = vec.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(distanceFromCamera));
}

let activeBeam = null;
let beamTimeout = null;
function createBeamFromCardToAnchor(card, anchorPos) {
    // remove existing beam
    if (activeBeam) {
        scene.remove(activeBeam);
        activeBeam.geometry.dispose();
        activeBeam.material.dispose();
        activeBeam = null;
    }

    const rect = card.getBoundingClientRect();
    const screenX = rect.left + rect.width / 2;
    const screenY = rect.top + rect.height / 2;

    // place a world point a short distance in front of the camera corresponding to the card
    const from = getWorldPointFromScreen(screenX, screenY, 1.2);
    const to = anchorPos.clone();

    const positions = new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({ color: 0x6ad3ff, transparent: true, opacity: 0.0 });
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    activeBeam = line;

    // animate opacity in and out
    const fadeIn = 250;
    const hold = 900;
    const fadeOut = 600;
    const start = performance.now();

    function animateBeam(time) {
        const elapsed = time - start;
        if (!activeBeam) return;
        if (elapsed < fadeIn) {
            activeBeam.material.opacity = (elapsed / fadeIn) * 0.95;
        } else if (elapsed < fadeIn + hold) {
            activeBeam.material.opacity = 0.95;
        } else if (elapsed < fadeIn + hold + fadeOut) {
            activeBeam.material.opacity = 0.95 * (1 - (elapsed - (fadeIn + hold)) / fadeOut);
        } else {
            // done
            scene.remove(activeBeam);
            activeBeam.geometry.dispose();
            activeBeam.material.dispose();
            activeBeam = null;
            return;
        }
        requestAnimationFrame(animateBeam);
    }

    requestAnimationFrame(animateBeam);
}

// --- 9. PROJECT CLICK: Zoom into galaxy and enable selection ---
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach(card => {
    card.addEventListener('click', (e) => {
        // remove other highlights
        projectCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // If an anchor was assigned, zoom to that particle's world position
        const ix = card.dataset.particleIndex;
        if (ix !== undefined) {
            const ax = parseFloat(card.dataset.anchorX);
            const ay = parseFloat(card.dataset.anchorY);
            const az = parseFloat(card.dataset.anchorZ);
            const anchorPos = new THREE.Vector3(ax, ay, az);

            // Camera target position: offset slightly along camera view direction so the anchor is in front
            const offset = new THREE.Vector3(0, 0.6, 1.6); // local offset from anchor
            // Transform offset relative to camera orientation (keep it simple — world offset)
            const camTarget = new THREE.Vector3(anchorPos.x + offset.x, anchorPos.y + offset.y, anchorPos.z + offset.z);

            // compute camera target to look at anchor position smoothly
            const lookAtTarget = anchorPos.clone();
            // position the camera slightly offset from the anchor along the current camera->anchor direction
            const camDir = camera.position.clone().sub(anchorPos).normalize();
            const desiredCamPos = anchorPos.clone().add(camDir.multiplyScalar(2.2));

            tweenCamera(desiredCamPos, lookAtTarget, 1200, () => {
                // after zoom complete, place selection helper
                if (selectedHelper) scene.remove(selectedHelper);
                const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
                const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
                selectedHelper = new THREE.Mesh(helperGeom, helperMat);
                selectedHelper.position.copy(anchorPos);
                scene.add(selectedHelper);
            });

            // create a cinematic beam from the clicked card DOM element to the anchor
            createBeamFromCardToAnchor(card, anchorPos);

            // Show the project info in overlay (after short delay so it feels synced with zoom)
            const data = {
                title: card.dataset.title || 'Project',
                subtitle: card.dataset.subtitle || '',
                desc: card.dataset.desc || ''
            };
            setTimeout(() => showInfo(data), 650);
        } else {
            // fallback: zoom to center
            tweenCamera(new THREE.Vector3(0, 1.5, 3), 900);
            const data = {
                title: card.dataset.title || 'Project',
                subtitle: card.dataset.subtitle || '',
                desc: card.dataset.desc || ''
            };
            setTimeout(() => showInfo(data), 600);
        }
    });
});