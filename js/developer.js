// 开发者模式模块：创建几何体（支持 8 种图形 + 小数尺寸 + 位置/旋转 + 自动落地）

function buildGeometry(type, sz) {
    const x = sz.x, y = sz.y, z = sz.z;
    switch (type) {
        case 'sphere':
            return new THREE.SphereGeometry(x, 32, 32);
        case 'cylinder':
            return new THREE.CylinderGeometry(x, x, y, 32);
        case 'cone':
            return new THREE.ConeGeometry(x, y, 32);
        case 'pyramid':
            return new THREE.ConeGeometry(x, y, 4);
        case 'prism':
            return new THREE.CylinderGeometry(x, x, y, 6);
        case 'torus':
            return new THREE.TorusGeometry(x, z, 16, 100);
        case 'plane':
            return new THREE.PlaneGeometry(x * 2, z * 2);
        case 'box':
        default:
            return new THREE.BoxGeometry(x, y, z);
    }
}

function addGeometry(type, sz, color, pos, rotDeg) {
    const geometry = buildGeometry(type, sz);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);

    // 旋转（度 -> 弧度）
    mesh.rotation.set(
        (rotDeg.x || 0) * Math.PI / 180,
        (rotDeg.y || 0) * Math.PI / 180,
        (rotDeg.z || 0) * Math.PI / 180
    );

    // 位置：未指定则自动落地（底部贴地 y=0）
    const defaultY = sz.y / 2;
    let px = (typeof pos.x === 'number' && !isNaN(pos.x)) ? pos.x : 0;
    let py = (typeof pos.y === 'number' && !isNaN(pos.y)) ? pos.y : -1;
    let pz = (typeof pos.z === 'number' && !isNaN(pos.z)) ? pos.z : 0;

    mesh.position.set(px, 0, pz);

    scene.add(mesh);

    if (py < 0) {
        // 自动落地：根据旋转后的包围盒把底部推到 y=0
        const box = new THREE.Box3().setFromObject(mesh);
        mesh.position.y = -box.min.y;
    } else {
        mesh.position.y = py;
    }

    customGeometries.push(mesh);
    document.getElementById('developer-modal').style.display = 'none';
    return mesh;
}

function clearGeometries() {
    while (customGeometries.length > 0) {
        const mesh = customGeometries.pop();
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    }
}