// script.js
// Uses global THREE + OrbitControls from the included CDN scripts
const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls;

// --- 1. SETUP SCENE, CAMERA, RENDERER ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000008);

// --- 2. ADD CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 60;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

camera.position.set(0, 5, 10);

// Interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedHelper = null;

// Overlay elements
const infoOverlay = document.getElementById('info-overlay');
const infoTitle = document.getElementById('info-title');
const infoSubtitle = document.getElementById('info-subtitle');
const infoDesc = document.getElementById('info-desc');
const infoClose = document.getElementById('info-close');

function showInfo(data) {
    infoTitle.textContent = data.title || 'Unknown';
    infoSubtitle.textContent = data.subtitle || '';
    infoDesc.textContent = data.desc || '';
    infoOverlay.classList.remove('hidden');
}
infoClose.addEventListener('click', () => infoOverlay.classList.add('hidden'));

// --- Camera tween helper ---
let cameraTween = null;
function tweenCamera(toPos, toTarget = null, duration = 1000, onComplete) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    controls.enabled = false;

    cameraTween = function animateTween(time) {
        const t = Math.min(1, (time - start) / duration);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
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

// --- 3. GALAXY PARAMETERS & GENERATION ---
const parameters = {
    count: 350000,
    radius: 5,
    branches: 5,
    spin: 1.5,
    randomness: 0.3,
    randomnessPower: 3,
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

function generateGalaxy() {
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
        const radius = Math.pow(Math.random(), 5) * parameters.radius;
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;
        const spinAngle = radius * parameters.spin;
        const x = Math.cos(branchAngle + spinAngle) * radius;
        const y = 0;
        const z = Math.sin(branchAngle + spinAngle) * radius;

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), 1.5) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.5;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        positions[i3] = x + randomX;
        positions[i3 + 1] = y + randomY;
        positions[i3 + 2] = z + randomZ;

        const mixedColor = tempColor.copy(insideColor);
        mixedColor.lerp(outsideColor, radius / parameters.radius);

        const saturationFactor = 1 - (radius / parameters.radius);
        if (saturationFactor > 0.9) {
            mixedColor.lerp(new THREE.Color(0xFFFFFF), (saturationFactor - 0.9) / 0.1);
        }

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

function generateStarField() {
    const starCount = 10000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
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

generateGalaxy();
generateStarField();

// --- 4. ANCHOR ASSIGNMENT (worker or fallback) ---
function computeTargetPositionForProject(index, total) {
    const t = index / total;
    const branch = index % parameters.branches;
    const branchAngle = (branch / parameters.branches) * Math.PI * 2 + t * Math.PI * 0.5;
    const radius = parameters.radius * (0.35 + 0.55 * t);
    const spinAngle = radius * parameters.spin;
    const x = Math.cos(branchAngle + spinAngle) * radius;
    const y = 0;
    const z = Math.sin(branchAngle + spinAngle) * radius;
    return new THREE.Vector3(x, y, z);
}

// single-thread nearest (used as fallback)
function findNearestParticleTo(pos) {
    const posAttr = geometry.getAttribute('position');
    let bestIndex = 0;
    let bestDistSq = Infinity;
    const count = posAttr.count;
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

function assignProjectAnchorsMainThread() {
    const projectCards = document.querySelectorAll('.project-card');
    const total = projectCards.length;
    projectCards.forEach((card, i) => {
        const target = computeTargetPositionForProject(i, total);
        const nearest = findNearestParticleTo(target);
        card.dataset.particleIndex = nearest.index;
        card.dataset.anchorX = nearest.position.x;
        card.dataset.anchorY = nearest.position.y;
        card.dataset.anchorZ = nearest.position.z;
    });
}

if (geometry) {
    const posAttr = geometry.getAttribute('position');
    const positionsCopy = new Float32Array(posAttr.array.slice());
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const total = projectCards.length;
    const targets = projectCards.map((_, i) => {
        const v = computeTargetPositionForProject(i, total);
        return { x: v.x, y: v.y, z: v.z };
    });

    if (window.Worker) {
        try {
            const worker = new Worker('anchorWorker.js');
            worker.postMessage({
                positions: positionsCopy.buffer,
                targets,
                step: Math.max(1, Math.floor(posAttr.count / 100000))
            }, [positionsCopy.buffer]);

            worker.onmessage = (m) => {
                const anchors = m.data.anchors;
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
                assignProjectAnchorsMainThread();
                worker.terminate();
            };
        } catch (err) {
            console.warn('Worker creation failed, fallback to main-thread anchor compute', err);
            assignProjectAnchorsMainThread();
        }
    } else {
        setTimeout(assignProjectAnchorsMainThread, 50);
    }
}

// --- 5. ANIMATION LOOP ---
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();
    requestAnimationFrame(animate);
    if (points) {
        points.rotation.y = elapsedTime * 0.05;
        if (starField) starField.rotation.y = elapsedTime * 0.005;
    }
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- 6. RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- 7. POINTER HELPERS ---
function getPointer(event) {
    if (event.touches && event.touches.length > 0) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    return { x: event.clientX, y: event.clientY };
}

// Advanced picking: nearest particle to mouse ray (fast subsample + refine)
function findNearestParticleToRay(rayOrigin, rayDir, sampleStep = Math.max(1, Math.floor(geometry.getAttribute('position').count / 150000)), maxPerpDist = 0.6) {
    const posAttr = geometry.getAttribute('position');
    const count = posAttr.count;
    let bestIndex = -1;
    let bestScore = Infinity;

    for (let i = 0; i < count; i += sampleStep) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);

        const vx = px - rayOrigin.x;
        const vy = py - rayOrigin.y;
        const vz = pz - rayOrigin.z;

        const t = vx * rayDir.x + vy * rayDir.y + vz * rayDir.z;
        const cx = rayOrigin.x + rayDir.x * t;
        const cy = rayOrigin.y + rayDir.y * t;
        const cz = rayOrigin.z + rayDir.z * t;

        const dx = px - cx;
        const dy = py - cy;
        const dz = pz - cz;
        const perpDist2 = dx*dx + dy*dy + dz*dz;

        if (perpDist2 < bestScore) {
            bestScore = perpDist2;
            bestIndex = i;
        }
    }

    if (bestIndex === -1) return null;
    if (bestScore > (maxPerpDist * maxPerpDist)) return null;

    const radius = Math.max(sampleStep * 6, 64);
    const start = Math.max(0, bestIndex - radius);
    const end = Math.min(count - 1, bestIndex + radius);

    for (let i = start; i <= end; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);

        const vx = px - rayOrigin.x;
        const vy = py - rayOrigin.y;
        const vz = pz - rayOrigin.z;

        const t = vx * rayDir.x + vy * rayDir.y + vz * rayDir.z;
        const cx = rayOrigin.x + rayDir.x * t;
        const cy = rayOrigin.y + rayDir.y * t;
        const cz = rayOrigin.z + rayDir.z * t;

        const dx = px - cx;
        const dy = py - cy;
        const dz = pz - cz;
        const perpDist2 = dx*dx + dy*dy + dz*dz;

        if (perpDist2 < bestScore) {
            bestScore = perpDist2;
            bestIndex = i;
        }
    }

    const px = posAttr.getX(bestIndex);
    const py = posAttr.getY(bestIndex);
    const pz = posAttr.getZ(bestIndex);

    return { index: bestIndex, position: new THREE.Vector3(px, py, pz), perpDist2: bestScore };
}

function getRayFromPointer(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return { origin: raycaster.ray.origin.clone(), dir: raycaster.ray.direction.clone() };
}

// beam helper
function getWorldPointFromScreen(screenX, screenY, distanceFromCamera = 1.2) {
    const ndc = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
    const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(distanceFromCamera));
}

let activeBeam = null;
function createBeamFromCardToAnchor(card, anchorPos) {
    if (activeBeam) {
        scene.remove(activeBeam);
        try { activeBeam.geometry.dispose(); activeBeam.material.dispose(); } catch (e) {}
        activeBeam = null;
    }

    const rect = card.getBoundingClientRect();
    const screenX = rect.left + rect.width / 2;
    const screenY = rect.top + rect.height / 2;

    const from = getWorldPointFromScreen(screenX, screenY, 1.2);
    const to = anchorPos.clone();

    const positions = new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({ color: 0x6ad3ff, transparent: true, opacity: 0.0 });
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    activeBeam = line;

    const fadeIn = 250, hold = 900, fadeOut = 600;
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
            scene.remove(activeBeam);
            try { activeBeam.geometry.dispose(); activeBeam.material.dispose(); } catch (e) {}
            activeBeam = null;
            return;
        }
        requestAnimationFrame(animateBeam);
    }
    requestAnimationFrame(animateBeam);
}

// Pointer down handler (mouse/touch) -> pick nearest particle to mouse-ray
function onPointerDown(event) {
    const p = getPointer(event);
    pointer.x = (p.x / window.innerWidth) * 2 - 1;
    pointer.y = -(p.y / window.innerHeight) * 2 + 1;

    if (!points || !geometry) return;

    const { origin, dir } = getRayFromPointer(p.x, p.y);
    const hit = findNearestParticleToRay(origin, dir);

    if (hit) {
        const idx = hit.index;
        const pos = hit.position;

        if (selectedHelper) scene.remove(selectedHelper);
        const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
        const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        selectedHelper = new THREE.Mesh(helperGeom, helperMat);
        selectedHelper.position.copy(pos);
        scene.add(selectedHelper);

        const camDir = camera.position.clone().sub(pos).normalize();
        const desiredCamPos = pos.clone().add(camDir.multiplyScalar(2.2));
        tweenCamera(desiredCamPos, pos.clone(), 1000);

        const fakeData = {
            title: 'Star Node ' + idx,
            subtitle: 'Cinematic Contact Point',
            desc: 'You have discovered a dense star cluster node. Visuals: lens flares, atmospheric scan, and an encrypted transmission hinting at a lost colony.'
        };
        showInfo(fakeData);
    } else {
        tweenCamera(new THREE.Vector3(0, 1.5, 3), null, 700);
    }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// Banner click behavior: zoom to precomputed anchor or compute nearest on demand
const bannerCards = document.querySelectorAll('.project-banner');
bannerCards.forEach((card) => {
    card.addEventListener('click', () => {
        bannerCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const ax = parseFloat(card.dataset.anchorX);
        const ay = parseFloat(card.dataset.anchorY);
        const az = parseFloat(card.dataset.anchorZ);

        if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
            const anchorPos = new THREE.Vector3(ax, ay, az);
            const camDir = camera.position.clone().sub(anchorPos).normalize();
            const desiredCamPos = anchorPos.clone().add(camDir.multiplyScalar(2.2));
            tweenCamera(desiredCamPos, anchorPos.clone(), 1200, () => {
                if (selectedHelper) scene.remove(selectedHelper);
                const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
                const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
                selectedHelper = new THREE.Mesh(helperGeom, helperMat);
                selectedHelper.position.copy(anchorPos);
                scene.add(selectedHelper);
            });

            createBeamFromCardToAnchor(card, anchorPos);

            const data = {
                title: card.dataset.title || 'Project',
                subtitle: card.dataset.subtitle || '',
                desc: card.dataset.desc || ''
            };
            setTimeout(() => showInfo(data), 650);
            return;
        }

        // fallback: compute deterministic target and find nearest
        const projectIndex = Array.from(bannerCards).indexOf(card);
        const total = bannerCards.length;
        const target = computeTargetPositionForProject(projectIndex, total);
        const nearest = findNearestParticleTo(target);
        if (nearest && nearest.position) {
            card.dataset.particleIndex = nearest.index;
            card.dataset.anchorX = nearest.position.x;
            card.dataset.anchorY = nearest.position.y;
            card.dataset.anchorZ = nearest.position.z;

            const anchorPos = nearest.position.clone();
            const camDir = camera.position.clone().sub(anchorPos).normalize();
            const desiredCamPos = anchorPos.clone().add(camDir.multiplyScalar(2.2));
            tweenCamera(desiredCamPos, anchorPos.clone(), 1200, () => {
                if (selectedHelper) scene.remove(selectedHelper);
                const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
                const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
                selectedHelper = new THREE.Mesh(helperGeom, helperMat);
                selectedHelper.position.copy(anchorPos);
                scene.add(selectedHelper);
            });

            createBeamFromCardToAnchor(card, anchorPos);

            const data = {
                title: card.dataset.title || 'Project',
                subtitle: card.dataset.subtitle || '',
                desc: card.dataset.desc || ''
            };
            setTimeout(() => showInfo(data), 650);
        } else {
            tweenCamera(new THREE.Vector3(0, 1.5, 3), null, 700);
            setTimeout(() => showInfo({
                title: card.dataset.title || 'Project',
                subtitle: card.dataset.subtitle || '',
                desc: card.dataset.desc || ''
            }), 600);
        }
    });
});
