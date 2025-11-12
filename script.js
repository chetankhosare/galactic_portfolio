// script.js
// Uses global THREE + OrbitControls from CDN
const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls;

// --- Basic scene setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000008);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 60;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
camera.position.set(0, 5, 10);

// Interaction helpers
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedHelper = null;

// HUD elements
const hud = document.getElementById('hud');
const hudInner = document.getElementById('hud-inner');
const hudClose = document.getElementById('hud-close');

const hudName = document.getElementById('hud-name');
const hudType = document.getElementById('hud-type');
const hudDistance = document.getElementById('hud-distance');
const hudTemp = document.getElementById('hud-temp');
const hudCompA = document.getElementById('hud-comp-a');
const hudCompB = document.getElementById('hud-comp-b');
const hudDescText = document.getElementById('hud-desc-text');
const hudScan = document.getElementById('hud-scan');

hudClose.addEventListener('click', () => hideHUD(true));

// Helper: animate numeric counters (simple tween)
function animateNumber(element, from, to, duration = 900, fixed = 0) {
    const start = performance.now();
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        const value = from + (to - from) * e;
        element.textContent = value.toFixed(fixed);
        if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// HUD show/hide with small scan animation
let scanProgress = 0;
let scanAnimId = null;
function startScan() {
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
    scanProgress = 0;
    function step() {
        scanProgress += 0.6; // percent per frame approx
        hudScan.textContent = Math.min(100, Math.floor(scanProgress)) + '%';
        if (scanProgress < 100) {
            scanAnimId = requestAnimationFrame(step);
        } else {
            hudScan.textContent = '100%';
            scanAnimId = null;
        }
    }
    scanAnimId = requestAnimationFrame(step);
}
function stopScan() {
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
    scanAnimId = null;
    hudScan.textContent = '0%';
}

function showHUD(data) {
    // populate
    hudName.textContent = data.title || data.name || 'UNKNOWN';
    hudType.textContent = data.type || data.subtitle || 'UNKNOWN';
    hudDescText.textContent = data.desc || 'No additional description provided.';
    // animate numbers (use random/fake if not provided)
    const distanceVal = (data.distance !== undefined) ? Number(data.distance) : (Math.floor(5000 + Math.random() * 95000));
    const tempVal = (data.temperature !== undefined) ? Number(data.temperature) : Math.floor(2000 + Math.random() * 9000);
    const compAVal = (data.compA !== undefined) ? Number(data.compA) : +(10 + Math.random() * 80).toFixed(2);
    const compBVal = (data.compB !== undefined) ? Number(data.compB) : +(Math.random() * 40).toFixed(2);

    animateNumber(hudDistance, 0, distanceVal, 900, 0);
    animateNumber(hudTemp, 0, tempVal, 900, 0);
    animateNumber(hudCompA, 0, compAVal, 900, 2);
    animateNumber(hudCompB, 0, compBVal, 900, 2);

    // show panel with animation
    hud.classList.remove('hidden');
    // force reflow then add show so CSS transitions play
    void hudInner.offsetWidth;
    hud.classList.add('show');
    hudInner.style.opacity = '1';
    startScan();
}

function hideHUD(immediate = false) {
    // hide with animation
    if (immediate) {
        stopScan();
        hud.classList.remove('show');
        hud.classList.add('hidden');
        hudInner.style.opacity = '0';
    } else {
        hud.classList.remove('show');
        stopScan();
        // after transition hide
        setTimeout(() => {
            hud.classList.add('hidden');
            hudInner.style.opacity = '0';
        }, 380);
    }
}

// --- galaxy generation (same as before) ---
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
        if (saturationFactor > 0.9) mixedColor.lerp(new THREE.Color(0xFFFFFF), (saturationFactor - 0.9) / 0.1);

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

// --- Anchor assignment (worker fallback) ---
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

// --- Animation loop ---
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

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Picking utilities ---
function getPointer(event) {
    if (event.touches && event.touches.length > 0) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    return { x: event.clientX, y: event.clientY };
}

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

// --- Input: left-select, middle-drag pan, right-deselect, wheel-orbit ---
function getPointerEventCoords(event) {
    if (event.touches && event.touches.length > 0) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    return { x: event.clientX, y: event.clientY };
}

let isMiddleDown = false;
let middleLast = { x: 0, y: 0 };
const PAN_SPEED = 0.0025;

function onPointerDown(event) {
    const isTouch = event.pointerType === 'touch' || event.type === 'touchstart';
    const button = (isTouch ? 0 : (event.button === undefined ? 0 : event.button));

    // middle start
    if (button === 1) {
        isMiddleDown = true;
        const p = getPointerEventCoords(event);
        middleLast.x = p.x;
        middleLast.y = p.y;
        controls.autoRotate = false;
        return;
    }

    // right deselect
    if (button === 2) {
        if (selectedHelper) {
            scene.remove(selectedHelper);
            try { selectedHelper.geometry.dispose(); selectedHelper.material.dispose(); } catch (e) {}
            selectedHelper = null;
        }
        hideHUD(true);
        return;
    }

    // left select
    if (button === 0) {
        const p = getPointerEventCoords(event);
        pointer.x = (p.x / window.innerWidth) * 2 - 1;
        pointer.y = -(p.y / window.innerHeight) * 2 + 1;
        if (!points || !geometry) return;

        const { origin, dir } = getRayFromPointer(p.x, p.y);
        const hit = findNearestParticleToRay(origin, dir);

        if (hit) {
            const idx = hit.index;
            const pos = hit.position;

            if (selectedHelper) {
                scene.remove(selectedHelper);
                try { selectedHelper.geometry.dispose(); selectedHelper.material.dispose(); } catch (e) {}
            }
            const helperGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const helperMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
            selectedHelper = new THREE.Mesh(helperGeom, helperMat);
            selectedHelper.position.copy(pos);
            scene.add(selectedHelper);

            const camDir = camera.position.clone().sub(pos).normalize();
            const desiredCamPos = pos.clone().add(camDir.multiplyScalar(2.2));
            tweenCamera(desiredCamPos, pos.clone(), 1000);

            // show cinematic HUD populated from banner if available, otherwise use generated/fake
            const fakeData = {
                title: 'Star Node ' + idx,
                type: 'Cinematic Contact Point',
                distance: Math.floor(5000 + Math.random() * 90000),
                temperature: Math.floor(1000 + Math.random() * 10000),
                compA: +(10 + Math.random() * 70).toFixed(2),
                compB: +(Math.random() * 30).toFixed(2),
                desc: 'You have discovered a dense star cluster node — scanned and analyzed.'
            };
            showHUD(fakeData);
        } else {
            tweenCamera(new THREE.Vector3(0, 1.5, 3), null, 700);
        }
    }
}

function onPointerMove(event) {
    if (!isMiddleDown) return;
    const p = getPointerEventCoords(event);
    const dx = p.x - middleLast.x;
    const dy = p.y - middleLast.y;
    middleLast.x = p.x;
    middleLast.y = p.y;

    const offset = camera.position.clone().sub(controls.target);
    const targetDistance = offset.length();
    const panX = -dx * PAN_SPEED * targetDistance;
    const panY = dy * PAN_SPEED * targetDistance;

    const cameraMatrix = new THREE.Matrix4().extractRotation(camera.matrix);
    const right = new THREE.Vector3(1, 0, 0).applyMatrix4(cameraMatrix).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyMatrix4(cameraMatrix).normalize();

    const panOffset = new THREE.Vector3();
    panOffset.addScaledVector(right, panX);
    panOffset.addScaledVector(up, panY);

    controls.target.add(panOffset);
    camera.position.add(panOffset);
    controls.update();
}

function onPointerUp(event) {
    const isTouch = event.pointerType === 'touch' || event.type === 'touchend';
    const button = (isTouch ? 0 : (event.button === undefined ? 0 : event.button));
    if (button === 1) {
        isMiddleDown = false;
    }
}

function onContextMenu(evt) {
    const path = evt.composedPath ? evt.composedPath() : (evt.path || []);
    for (const el of path) {
        if (!el) continue;
        if (el.id === 'left-panel' || el.id === 'projects-scroll' || el.id === 'hud' || (el.classList && el.classList.contains('project-banner'))) {
            return;
        }
    }
    evt.preventDefault();
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('contextmenu', onContextMenu);

// --- Camera tween helper ---
let cameraTween = null;
function tweenCamera(toPos, toTarget = null, duration = 1000, onComplete) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    controls.enabled = false;
    cameraTween = function animateTween(time) {
        const t = Math.min(1, (time - start) / duration);
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

// --- Banner click behavior (uses anchors if present) ---
const bannerCards = document.querySelectorAll('.project-banner');
bannerCards.forEach((card) => {
    card.addEventListener('click', () => {
        bannerCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const ax = parseFloat(card.dataset.anchorX);
        const ay = parseFloat(card.dataset.anchorY);
        const az = parseFloat(card.dataset.anchorZ);

        // Build HUD data from banner
        const bannerData = {
            title: card.dataset.title || card.textContent.trim(),
            type: card.dataset.subtitle || '',
            desc: card.dataset.desc || ''
        };

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

            // populate HUD values (banner gives title/subtitle/desc; numbers can be faked until real data present)
            bannerData.distance = Math.floor(5000 + Math.random() * 90000);
            bannerData.temperature = Math.floor(1500 + Math.random() * 9000);
            bannerData.compA = +(10 + Math.random() * 60).toFixed(2);
            bannerData.compB = +(Math.random() * 35).toFixed(2);
            setTimeout(() => showHUD(bannerData), 650);
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
            bannerData.distance = Math.floor(5000 + Math.random() * 90000);
            bannerData.temperature = Math.floor(1500 + Math.random() * 9000);
            bannerData.compA = +(10 + Math.random() * 60).toFixed(2);
            bannerData.compB = +(Math.random() * 35).toFixed(2);
            setTimeout(() => showHUD(bannerData), 650);
        } else {
            tweenCamera(new THREE.Vector3(0, 1.5, 3), null, 700);
            setTimeout(() => showHUD(bannerData), 600);
        }
    });
});

// --- Wheel orbit (same as before) ---
let wheelVelocity = 0;
const WHEEL_SENSITIVITY = 0.0016;
const WHEEL_PHI_SENS = 0.0008;
const WHEEL_DAMPING = 0.92;

function isOverUI(evt) {
    const path = evt.composedPath ? evt.composedPath() : (evt.path || []);
    if (path && path.length) {
        for (const el of path) {
            if (!el || !el.classList) continue;
            if (el.id === 'left-panel' || el.id === 'projects-scroll' || el.id === 'hud' || el.classList.contains('project-banner')) {
                return true;
            }
        }
    } else {
        if (evt.target.closest && (evt.target.closest('#left-panel') || evt.target.closest('#hud'))) return true;
    }
    return false;
}

function onWheel(evt) {
    if (isOverUI(evt)) return;
    if (evt.ctrlKey) return; // Ctrl+wheel = zoom
    evt.preventDefault();
    wheelVelocity += (evt.deltaY) * WHEEL_SENSITIVITY;
    applyWheelTilt((evt.deltaY > 0 ? 1 : -1) * WHEEL_PHI_SENS * 6);
}

function applyWheelTilt(deltaPhi) {
    const target = controls.target.clone();
    const offset = camera.position.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + deltaPhi, 0.1, Math.PI - 0.1);
    const newPos = new THREE.Vector3().setFromSpherical(spherical).add(target);
    camera.position.copy(newPos);
    controls.update();
}

function updateWheelOrbit() {
    if (Math.abs(wheelVelocity) > 1e-5) {
        const angle = wheelVelocity;
        const target = controls.target.clone();
        const offset = camera.position.clone().sub(target);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        offset.applyQuaternion(q);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + (wheelVelocity * 0.12), 0.2, Math.PI - 0.2);
        const rotated = new THREE.Vector3().setFromSpherical(spherical);
        camera.position.copy(rotated.add(target));
        controls.update();
        wheelVelocity *= WHEEL_DAMPING;
    }
    requestAnimationFrame(updateWheelOrbit);
}
updateWheelOrbit();
renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

// --- Utility: show/hide HUD when window is resized or overlay overlaps ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Escape to close hud and deselect
        if (selectedHelper) {
            scene.remove(selectedHelper);
            try { selectedHelper.geometry.dispose(); selectedHelper.material.dispose(); } catch (e) {}
            selectedHelper = null;
        }
        hideHUD(true);
    }
});
