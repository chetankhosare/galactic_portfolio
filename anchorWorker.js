// anchorWorker.js
self.onmessage = function (e) {
    const data = e.data;
    const buffer = data.positions;
    const targets = data.targets || [];
    const step = data.step || 1;

    const positions = new Float32Array(buffer);
    const count = positions.length / 3;

    function findNearestToTarget(tx, ty, tz) {
        let bestIndex = 0;
        let bestDist = Infinity;

        for (let i = 0; i < count; i += step) {
            const j = i * 3;
            const dx = positions[j] - tx;
            const dy = positions[j + 1] - ty;
            const dz = positions[j + 2] - tz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < bestDist) {
                bestDist = d2;
                bestIndex = i;
            }
        }

        if (step > 1) {
            const start = Math.max(0, bestIndex - step * 4);
            const end = Math.min(count - 1, bestIndex + step * 4);
            for (let i = start; i <= end; i++) {
                const j = i * 3;
                const dx = positions[j] - tx;
                const dy = positions[j + 1] - ty;
                const dz = positions[j + 2] - tz;
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < bestDist) {
                    bestDist = d2;
                    bestIndex = i;
                }
            }
        }

        const j = bestIndex * 3;
        return { index: bestIndex, x: positions[j], y: positions[j + 1], z: positions[j + 2] };
    }

    const anchors = targets.map(t => findNearestToTarget(t.x, t.y, t.z));
    self.postMessage({ anchors });
};
