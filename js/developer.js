// 开发者模式模块：添加自定义几何体
function addGeometry(type, size, color) {
    let geometry;

    switch (type) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(size, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(size, size, size * 2, 32);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(size, size * 2, 32);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(size, size / 3, 16, 100);
            break;
        case 'pyramid':
            geometry = new THREE.ConeGeometry(size, size * 2, 4);
            break;
        case 'plane':
            geometry = new THREE.PlaneGeometry(size * 2, size * 2);
            break;
        default:
            geometry = new THREE.BoxGeometry(size, size, size);
    }

    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);

    const gridSize = 750;
    mesh.position.set(
        (Math.random() - 0.5) * gridSize / 10,
        size,
        (Math.random() - 0.5) * gridSize / 10
    );

    mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );

    scene.add(mesh);
    customGeometries.push(mesh);

    document.getElementById('developer-modal').style.display = 'none';
}