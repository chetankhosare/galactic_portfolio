// script.js
const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls;

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000008);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 60;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
camera.position.set(0, 5, 10);

// --- Interaction helpers ---
const raycaster = new THREE.Raycaster();
let selectedHelper = null;
let selectedAnchorPos = null;

// --- HUD elements ---
const hudContainer = document.getElementById('hud-container');
const hudWindow = document.getElementById('hud-window');
const hudLine = document.getElementById('hud-connector');
const hudDot = document.getElementById('hud-dot');
const hudClose = document.getElementById('hud-close');

const hudName = document.getElementById('hud-title');
const hudSub = document.getElementById('hud-sub');
const hudDistance = document.getElementById('hud-distance');
const hudTemp = document.getElementById('hud-temp');
const hudCompA = document.getElementById('hud-comp-a');
const hudCompB = document.getElementById('hud-comp-b');
const hudDescText = document.getElementById('hud-desc');
const hudScan = document.getElementById('hud-scan');
const hudReadMore = document.getElementById('hud-read-more');

hudClose && hudClose.addEventListener('click', () => hideHUD(true));

// --- READ MORE LOGIC ---
if(hudReadMore) {
    hudReadMore.addEventListener('click', () => {
        const url = hudReadMore.dataset.targetUrl;
        if(url && url !== '#' && url !== 'undefined') {
            window.open(url, '_blank');
        } else {
            console.log("No detail URL provided for this node.");
        }
    });
}

// --- Preloader / Intro ---
const introOverlay = document.getElementById('intro-overlay');
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
    introOverlay.classList.add('hidden');
});

// --- Numeric animation helper ---
function animateNumber(el, from, to, duration = 900, fixed = 0) {
    const start = performance.now();
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; 
        const value = from + (to - from) * e;
        if(el) el.textContent = value.toFixed(fixed);
        if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// --- HUD scan animation ---
let scanAnimId = null;
function startScan() {
    let val = 0;
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
    function step() {
        val += 0.7;
        if(hudScan) hudScan.textContent = Math.min(100, Math.floor(val)) + '%';
        if (val < 100) scanAnimId = requestAnimationFrame(step);
        else scanAnimId = null;
    }
    step();
}
function stopScan() {
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
    scanAnimId = null;
    if(hudScan) hudScan.textContent = '0%';
}

function showHUD(data) {
    if(hudName) hudName.textContent = data.title || data.name || 'UNKNOWN';
    if(hudSub) hudSub.textContent = data.type || data.subtitle || 'UNKNOWN';
    if(hudDescText) hudDescText.textContent = data.desc || 'No description provided.';
    
    // Set Read More URL
    if(hudReadMore) {
        if(data.url) {
            hudReadMore.dataset.targetUrl = data.url;
            hudReadMore.style.display = 'inline-block';
        } else {
            hudReadMore.style.display = 'none';
        }
    }
    
    const distanceVal = data.distance !== undefined ? Number(data.distance) : Math.floor(5000 + Math.random() * 90000);
    const tempVal = data.temperature !== undefined ? Number(data.temperature) : Math.floor(1000 + Math.random() * 9000);
    const compAVal = data.compA !== undefined ? Number(data.compA) : +(10 + Math.random() * 80).toFixed(2);
    const compBVal = data.compB !== undefined ? Number(data.compB) : +(Math.random() * 40).toFixed(2);

    animateNumber(hudDistance, 0, distanceVal, 900, 0);
    animateNumber(hudTemp, 0, tempVal, 900, 0);
    animateNumber(hudCompA, 0, compAVal, 900, 2);
    animateNumber(hudCompB, 0, compBVal, 900, 2);

    hudContainer.classList.add('visible');
    startScan();
}

function hideHUD(immediate = false) {
    stopScan();
    hudContainer.classList.remove('visible');
    
    // Force hide opacity to prevent loop glitch
    hudContainer.style.opacity = '0';
    
    selectedAnchorPos = null;
    if (selectedHelper) {
         scene.remove(selectedHelper);
         selectedHelper = null;
    }
}

// --- Sci-Fi Reticle Generator ---
function createSciFiReticle() {
    const group = new THREE.Group();

    // 1. Spinning Outer Ring
    const ringGeo = new THREE.TorusGeometry(0.15, 0.003, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);
    
    // 2. Inner Rotating Brackets
    const bracketGeo = new THREE.RingGeometry(0.09, 0.11, 4, 1, 0, Math.PI * 0.5);
    const bracketMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
    const bracket1 = new THREE.Mesh(bracketGeo, bracketMat);
    const bracket2 = new THREE.Mesh(bracketGeo, bracketMat);
    bracket2.rotation.z = Math.PI;
    const bracketGroup = new THREE.Group();
    bracketGroup.add(bracket1);
    bracketGroup.add(bracket2);
    group.add(bracketGroup);

    // 3. Central Core
    const coreGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    group.userData = {
        animate: function(delta) {
            ring.rotation.x += delta * 0.5;
            ring.rotation.y += delta * 0.5;
            bracketGroup.rotation.z -= delta * 1.5;
            const scale = 1 + Math.sin(performance.now() * 0.005) * 0.1;
            core.scale.set(scale, scale, scale);
        }
    };
    return group;
}

// --- Galaxy parameters & generation ---
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

function generateGalaxy() {
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const insideColor = new THREE.Color(parameters.insideColor);
    const outsideColor = new THREE.Color(parameters.outsideColor);
    const tempColor = new THREE.Color();

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

        const mixedColor = tempColor.copy(insideColor).lerp(outsideColor, radius / parameters.radius);
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
    const range = 100;
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        starPositions[i3] = (Math.random() - 0.5) * range;
        starPositions[i3 + 1] = (Math.random() - 0.5) * range;
        starPositions[i3 + 2] = (Math.random() - 0.5) * range;
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
                assignProjectAnchorsMainThread();
                worker.terminate();
            };
        } catch (err) {
            assignProjectAnchorsMainThread();
        }
    } else {
        setTimeout(assignProjectAnchorsMainThread, 50);
    }
}

// --- Animation loop ---
const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    requestAnimationFrame(animate);
    
    if (points) points.rotation.y = elapsedTime * 0.05;
    if (starField) starField.rotation.y = elapsedTime * 0.005;

    // Reticle Animation
    if (selectedHelper && selectedHelper.visible && selectedHelper.userData.animate) {
        selectedHelper.userData.animate(delta);
    }

    // Floating HUD Positioning
    if (selectedAnchorPos && hudContainer.classList.contains('visible')) {
        const vector = selectedAnchorPos.clone();
        vector.project(camera);

        // Hide if behind camera
        if (vector.z > 1) {
             hudContainer.style.opacity = 0;
        } else {
             // Only force opacity 1 if visible class is active
             if(hudContainer.classList.contains('visible')) {
                hudContainer.style.opacity = 1;
             }
             
             const x = (vector.x * .5 + .5) * window.innerWidth;
             const y = -(vector.y * .5 - .5) * window.innerHeight;

             hudDot.setAttribute('cx', x);
             hudDot.setAttribute('cy', y);

             // Position window offset
             const winX = Math.min(x + 60, window.innerWidth - 300);
             const winY = Math.max(y - 150, 80);

             hudWindow.style.left = winX + 'px';
             hudWindow.style.top = winY + 'px';

             hudLine.setAttribute('x1', x);
             hudLine.setAttribute('y1', y);
             hudLine.setAttribute('x2', winX);
             hudLine.setAttribute('y2', winY + 20);
        }
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
function getPointerCoords(event) {
    if (event.touches && event.touches.length > 0) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    return { x: event.clientX, y: event.clientY };
}

function getRayFromPointer(x, y) {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return { origin: raycaster.ray.origin.clone(), dir: raycaster.ray.direction.clone() };
}

function findNearestParticleToRay(origin, dir, sampleStep = Math.max(1, Math.floor(geometry.getAttribute('position').count / 150000)), maxPerpDist = 0.6) {
    const posAttr = geometry.getAttribute('position');
    const count = posAttr.count;
    let bestIndex = -1;
    let bestScore = Infinity;

    for (let i = 0; i < count; i += sampleStep) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        const vx = px - origin.x;
        const vy = py - origin.y;
        const vz = pz - origin.z;
        const t = vx * dir.x + vy * dir.y + vz * dir.z;
        const cx = origin.x + dir.x * t;
        const cy = origin.y + dir.y * t;
        const cz = origin.z + dir.z * t;
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
        const vx = px - origin.x;
        const vy = py - origin.y;
        const vz = pz - origin.z;
        const t = vx * dir.x + vy * dir.y + vz * dir.z;
        const cx = origin.x + dir.x * t;
        const cy = origin.y + dir.y * t;
        const cz = origin.z + dir.z * t;
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

// --- Beam creation from banner to anchor ---
let activeBeam = null;
function getWorldPointFromScreen(screenX, screenY, distanceFromCamera = 1.2) {
    const ndc = new THREE.Vector2((screenX / window.innerWidth) * 2 - 1, -(screenY / window.innerHeight) * 2 + 1);
    const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(distanceFromCamera));
}

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
    function animateBeam(now) {
        const elapsed = now - start;
        if (!activeBeam) return;
        if (elapsed < fadeIn) activeBeam.material.opacity = (elapsed / fadeIn) * 0.95;
        else if (elapsed < fadeIn + hold) activeBeam.material.opacity = 0.95;
        else if (elapsed < fadeIn + hold + fadeOut) activeBeam.material.opacity = 0.95 * (1 - (elapsed - (fadeIn + hold)) / fadeOut);
        else {
            scene.remove(activeBeam);
            try { activeBeam.geometry.dispose(); activeBeam.material.dispose(); } catch (e) {}
            activeBeam = null;
            return;
        }
        requestAnimationFrame(animateBeam);
    }
    requestAnimationFrame(animateBeam);
}

// --- Input handling ---
let isMiddleDown = false;
let middleLast = { x: 0, y: 0 };
const PAN_SPEED = 0.0025;

renderer.domElement.addEventListener('pointerdown', (event) => {
    const isTouch = event.pointerType === 'touch' || event.type === 'touchstart';
    const button = (isTouch ? 0 : (event.button === undefined ? 0 : event.button));

    if (button === 1) {
        isMiddleDown = true;
        const p = getPointerCoords(event);
        middleLast.x = p.x; middleLast.y = p.y;
        controls.autoRotate = false;
        return;
    }

    if (button === 2) {
        if (selectedHelper) {
            scene.remove(selectedHelper);
            selectedHelper = null;
        }
        if (activeBeam) {
            scene.remove(activeBeam);
            activeBeam = null;
        }
        hideHUD(true);
        return;
    }

    if (button === 0) {
        // Check if clicking inside panel, ignore raycast if so
        const leftPanel = document.getElementById('left-panel');
        const contactPanel = document.getElementById('contact-panel');
        if ((leftPanel && leftPanel.contains(event.target)) || (contactPanel && contactPanel.contains(event.target))) return;

        const p = getPointerCoords(event);
        if (!points || !geometry) return;
        const { origin, dir } = getRayFromPointer(p.x, p.y);
        const hit = findNearestParticleToRay(origin, dir);
        if (hit) {
            const idx = hit.index;
            const pos = hit.position;

            if (selectedHelper) {
                scene.remove(selectedHelper);
            }
            selectedHelper = createSciFiReticle();
            selectedHelper.position.copy(pos);
            scene.add(selectedHelper);

            selectedAnchorPos = pos.clone();

            const camDir = camera.position.clone().sub(pos).normalize();
            const desiredCamPos = pos.clone().add(camDir.multiplyScalar(2.2));
            tweenCamera(desiredCamPos, pos.clone(), 1000);

            const fakeData = {
                title: 'Star Node ' + idx,
                type: 'Cinematic Contact Point',
                distance: Math.floor(5000 + Math.random() * 90000),
                temperature: Math.floor(1000 + Math.random() * 9000),
                compA: +(10 + Math.random() * 70).toFixed(2),
                compB: +(Math.random() * 30).toFixed(2),
                desc: 'You have discovered a dense star cluster node — scanned and analyzed.',
                url: null // Stars don't have read more links
            };
            showHUD(fakeData);
        }
    }
});

window.addEventListener('pointermove', (event) => {
    if (!isMiddleDown) return;
    const p = getPointerCoords(event);
    const dx = p.x - middleLast.x;
    const dy = p.y - middleLast.y;
    middleLast.x = p.x; middleLast.y = p.y;
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
});

window.addEventListener('pointerup', (event) => {
    const isTouch = event.pointerType === 'touch' || event.type === 'touchend';
    const button = (isTouch ? 0 : (event.button === undefined ? 0 : event.button));
    if (button === 1) isMiddleDown = false;
});

renderer.domElement.addEventListener('contextmenu', (evt) => {
    const path = evt.composedPath ? evt.composedPath() : (evt.path || []);
    for (const el of path) {
        if (!el) continue;
        if (el.id === 'left-panel' || el.id === 'contact-panel' || el.id === 'projects-scroll' || el.id === 'hud-window' || (el.classList && el.classList.contains('project-banner'))) {
            return; 
        }
    }
    evt.preventDefault();
});

function tweenCamera(toPos, toTarget = null, duration = 1000, onComplete) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    controls.enabled = false;
    function frame(time) {
        const t = Math.min(1, (time - start) / duration);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        camera.position.lerpVectors(fromPos, toPos, e);
        if (toTarget) {
            const targetVec = new THREE.Vector3().lerpVectors(fromTarget, toTarget, e);
            controls.target.copy(targetVec);
        }
        controls.update();
        if (t < 1) requestAnimationFrame(frame);
        else {
            controls.enabled = true;
            if (onComplete) onComplete();
        }
    }
    requestAnimationFrame(frame);
}

// --- Banner click behavior ---
const bannerCards = document.querySelectorAll('.project-banner');
bannerCards.forEach((card) => {
    card.addEventListener('click', () => {
        bannerCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const ax = parseFloat(card.dataset.anchorX);
        const ay = parseFloat(card.dataset.anchorY);
        const az = parseFloat(card.dataset.anchorZ);

        const bannerData = {
            title: card.dataset.title || card.textContent.trim(),
            type: card.dataset.subtitle || '',
            desc: card.dataset.desc || '',
            url: card.dataset.url // Pass URL to HUD
        };

        const onTargetFound = (anchorPos, idx) => {
             if (selectedHelper) scene.remove(selectedHelper);
             selectedHelper = createSciFiReticle();
             selectedHelper.position.copy(anchorPos);
             scene.add(selectedHelper);
             
             selectedAnchorPos = anchorPos.clone();

             const camDir = camera.position.clone().sub(anchorPos).normalize();
             const desiredCamPos = anchorPos.clone().add(camDir.multiplyScalar(2.2));
             tweenCamera(desiredCamPos, anchorPos.clone(), 1200);

             createBeamFromCardToAnchor(card, anchorPos);

             bannerData.distance = Math.floor(5000 + Math.random() * 90000);
             bannerData.temperature = Math.floor(1500 + Math.random() * 9000);
             bannerData.compA = +(10 + Math.random() * 60).toFixed(2);
             bannerData.compB = +(Math.random() * 35).toFixed(2);
             setTimeout(() => showHUD(bannerData), 650);
        };

        if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
            onTargetFound(new THREE.Vector3(ax, ay, az), -1);
            return;
        }

        const projectIndex = Array.from(bannerCards).indexOf(card);
        const total = bannerCards.length;
        const target = computeTargetPositionForProject(projectIndex, total);
        const nearest = findNearestParticleTo(target);
        if (nearest && nearest.position) {
            card.dataset.particleIndex = nearest.index;
            card.dataset.anchorX = nearest.position.x;
            card.dataset.anchorY = nearest.position.y;
            card.dataset.anchorZ = nearest.position.z;
            onTargetFound(nearest.position.clone(), nearest.index);
        } else {
            tweenCamera(new THREE.Vector3(0, 1.5, 3), null, 700);
            setTimeout(() => showHUD(bannerData), 600);
        }
    });
});

renderer.domElement.addEventListener('wheel', (event) => {
    const path = event.composedPath ? event.composedPath() : (event.path || []);
    for (const el of path) {
        if (!el) continue;
        if (el.id === 'left-panel' || el.id === 'contact-panel' || el.id === 'projects-scroll' || el.id === 'hud-window' || (el.classList && el.classList.contains('project-banner'))) {
            return; 
        }
    }
    if (event.ctrlKey) return;
    event.preventDefault(); 
    const zoomSpeed = 0.0035;
    const delta = -event.deltaY * zoomSpeed;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const move = dir.multiplyScalar(delta);
    camera.position.add(move);
    const dist = camera.position.distanceTo(controls.target);
    if (dist < controls.minDistance) {
        const correction = camera.position.clone().sub(controls.target).normalize().multiplyScalar(controls.minDistance - dist);
        camera.position.add(correction);
    } else if (dist > controls.maxDistance) {
        const correction = camera.position.clone().sub(controls.target).normalize().multiplyScalar(controls.maxDistance - dist);
        camera.position.add(correction);
    }
    controls.update();
}, { passive: false });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (selectedHelper) {
            scene.remove(selectedHelper);
            selectedHelper = null;
        }
        if (activeBeam) {
            scene.remove(activeBeam);
            activeBeam = null;
        }
        hideHUD(true);
    }
});

// --- PANEL LOGIC (Left & Right) ---
const leftPanel = document.getElementById('left-panel');
const navProjectsLink = document.getElementById('nav-projects-link');
const heroCta = document.getElementById('hero-cta');
const closeLeftPanelBtn = document.getElementById('close-left-panel');

// Contact Panel Elements
const contactPanel = document.getElementById('contact-panel');
const navContactLink = document.getElementById('nav-contact-link');
const closeContactPanelBtn = document.getElementById('close-contact-panel');

// Projects Panel Functions
function openLeftPanel(e) {
    if(e) e.preventDefault();
    contactPanel.classList.remove('active'); // Close other panel
    leftPanel.classList.add('active');
}
function closeLeftPanel() {
    leftPanel.classList.remove('active');
}

// Contact Panel Functions
function openContactPanel(e) {
    if(e) e.preventDefault();
    leftPanel.classList.remove('active'); // Close other panel
    contactPanel.classList.add('active');
}
function closeContactPanel() {
    contactPanel.classList.remove('active');
}

// Event Listeners for Projects
if(navProjectsLink) navProjectsLink.addEventListener('click', openLeftPanel);
if(heroCta) heroCta.addEventListener('click', openLeftPanel);
if(closeLeftPanelBtn) closeLeftPanelBtn.addEventListener('click', closeLeftPanel);

// Event Listeners for Contact
if(navContactLink) navContactLink.addEventListener('click', openContactPanel);
if(closeContactPanelBtn) closeContactPanelBtn.addEventListener('click', closeContactPanel);

// Global click to close panels
document.addEventListener('click', (e) => {
    // Logic for Left Panel
    if (leftPanel.classList.contains('active') && 
        !leftPanel.contains(e.target) && 
        e.target !== navProjectsLink && 
        e.target !== heroCta) {
        closeLeftPanel();
    }
    
    // Logic for Right (Contact) Panel
    if (contactPanel.classList.contains('active') && 
        !contactPanel.contains(e.target) && 
        e.target !== navContactLink) {
        closeContactPanel();
    }
});