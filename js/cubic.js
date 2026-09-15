// 长方体可视化模块：网格、立方体、分层、标记小方块、体积计算
function createInfinitePlatform() {
    const gridSize = 750;
    const gridDivisions = 75;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(gridSize * 2, gridSize * 2);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xeeeeee,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    platform = new THREE.Mesh(planeGeometry, planeMaterial);
    platform.rotation.x = -Math.PI / 2;
    platform.position.y = -0.1;
    scene.add(platform);
}

function getVolumeUnit() {
    const unit = document.getElementById('length-unit').value;
    if (unit === '0.000001') return '立方微米';
    if (unit === '0.001') return '立方毫米';
    if (unit === '1') return '立方厘米';
    if (unit === '10') return '立方分米';
    if (unit === '100') return '立方米';
    return '立方单位';
}

function formatVolume(volume) {
    if (volume > 1000000) {
        return volume.toExponential(2);
    }
    return volume.toLocaleString();
}

function updateCube() {
    while (cubeGroup.children.length > 0) {
        cubeGroup.remove(cubeGroup.children[0]);
    }

    const lengthValue = parseInt(document.getElementById('length').value) *
        parseFloat(document.getElementById('length-unit').value);
    const widthValue = parseInt(document.getElementById('width').value) *
        parseFloat(document.getElementById('width-unit').value);
    const heightValue = parseInt(document.getElementById('height').value) *
        parseFloat(document.getElementById('height-unit').value);

    document.getElementById('length-value').textContent = document.getElementById('length').value;
    document.getElementById('width-value').textContent = document.getElementById('width').value;
    document.getElementById('height-value').textContent = document.getElementById('height').value;

    const volume = lengthValue * widthValue * heightValue;
    const unit = getVolumeUnit();
    document.getElementById('volume').textContent = volume.toLocaleString();
    document.querySelector('.volume-display').innerHTML =
        `体积 = <span id="volume">${formatVolume(volume)}</span> ${unit}`;

    // 标记模式下显示小方块
    if (markerMode) {
        createSmallCubes(lengthValue, heightValue, widthValue);
        return;
    }

    const geometry = new THREE.BoxGeometry(lengthValue, heightValue, widthValue);

    const materials = [
        new THREE.MeshPhongMaterial({ color: 0x4CAF50 }),
        new THREE.MeshPhongMaterial({ color: 0x2196F3 }),
        new THREE.MeshPhongMaterial({ color: 0x9e9e9e }),
        new THREE.MeshPhongMaterial({ color: 0x9e9e9e }),
        new THREE.MeshPhongMaterial({ color: 0x9e9e9e }),
        new THREE.MeshPhongMaterial({ color: 0x9e9e9e })
    ];

    cube = new THREE.Mesh(geometry, materials);
    cubeGroup.add(cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    cubeGroup.add(line);

    const maxDimension = Math.max(lengthValue, widthValue, heightValue);
    const cameraDistance = Math.max(10, maxDimension * 2);
    camera.position.set(cameraDistance, cameraDistance / 2, cameraDistance);
    controls.update();

    if (layerMode) {
        showLayers(heightValue);
    }
}

// 创建标记模式的小方块
function createSmallCubes(length, height, width) {
    smallCubes = [];
    const unitSize = parseFloat(document.getElementById('length-unit').value);

    for (let x = 0; x < parseInt(document.getElementById('length').value); x++) {
        for (let y = 0; y < parseInt(document.getElementById('height').value); y++) {
            for (let z = 0; z < parseInt(document.getElementById('width').value); z++) {
                const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
                const material = new THREE.MeshPhongMaterial({
                    color: 0x3498db,
                    transparent: true,
                    opacity: 0.8
                });

                const smallCube = new THREE.Mesh(geometry, material);
                smallCube.position.set(
                    x * unitSize - (length / 2) + unitSize / 2,
                    y * unitSize - (height / 2) + unitSize / 2,
                    z * unitSize - (width / 2) + unitSize / 2
                );

                smallCube.userData = { originalPosition: smallCube.position.clone(), index: { x, y, z } };
                cubeGroup.add(smallCube);
                smallCubes.push(smallCube);

                // 添加边框
                const edges = new THREE.EdgesGeometry(geometry);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
                line.position.copy(smallCube.position);
                cubeGroup.add(line);
            }
        }
    }
}

// 选择小方块并打开注释窗口
function selectCube(cube) {
    if (selectedCube) {
        selectedCube.material.color.set(0x3498db);
    }

    selectedCube = cube;
    selectedCube.material.color.set(0xe74c3c);

    document.getElementById('annotation-modal').style.display = 'flex';
}

function showLayers(height) {
    const layerHeight = height / parseInt(document.getElementById('height').value);

    for (let i = 0; i < currentLayer; i++) {
        const layerGeometry = new THREE.BoxGeometry(
            parseInt(document.getElementById('length').value) *
            parseFloat(document.getElementById('length-unit').value),
            layerHeight,
            parseInt(document.getElementById('width').value) *
            parseFloat(document.getElementById('width-unit').value)
        );

        const layerMaterial = new THREE.MeshPhongMaterial({
            color: 0xff9800,
            transparent: true,
            opacity: 0.7
        });

        const layer = new THREE.Mesh(layerGeometry, layerMaterial);
        layer.position.y = (-height / 2) + (i * layerHeight) + (layerHeight / 2);
        cubeGroup.add(layer);

        const layerEdges = new THREE.EdgesGeometry(layerGeometry);
        const layerLine = new THREE.LineSegments(layerEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        layerLine.position.y = (-height / 2) + (i * layerHeight) + (layerHeight / 2);
        cubeGroup.add(layerLine);
    }
}

function onDoubleClick(event) {
    if (!markerMode) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(smallCubes);

    if (intersects.length > 0) {
        selectCube(intersects[0].object);
    }
}

function onMouseDown(event) {
    if (!markerMode) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(smallCubes);

    if (intersects.length > 0) {
        isDragging = true;
        selectedCube = intersects[0].object;
        selectedCube.material.color.set(0xe74c3c);
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onMouseMove(event) {
    if (!isDragging || !selectedCube) return;

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    const worldDirection = new THREE.Vector3();
    camera.getWorldDirection(worldDirection);

    const moveX = deltaMove.x * 0.01;
    const moveY = -deltaMove.y * 0.01;

    selectedCube.position.x += moveX;
    selectedCube.position.y += moveY;

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}