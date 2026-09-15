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

// 创建竖直的 Y 轴（青色细线，贯穿平台上下）
function createYAxis() {
    const axisGroup = new THREE.Group();
    axisGroup.name = 'y-axis';
    scene.add(axisGroup);

    const extent = 60;
    const axisMat = new THREE.LineBasicMaterial({ color: 0x00cccc, linewidth: 1 });
    const axisPoints = [
        new THREE.Vector3(0, -extent, 0),
        new THREE.Vector3(0, extent, 0)
    ];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
    axisGroup.add(new THREE.Line(axisGeo, axisMat));

    // Y 标签（青色 Sprite）
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#00cccc';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y', 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.5, 1.5, 1);
    sprite.position.set(0, extent + 1, 0);
    axisGroup.add(sprite);

    return axisGroup;
}

function updateCube() {
    while (cubeGroup.children.length > 0) {
        cubeGroup.remove(cubeGroup.children[0]);
    }

    const lengthValue = parseFloat(document.getElementById('length').value) *
        parseFloat(document.getElementById('length-unit').value);
    const widthValue = parseFloat(document.getElementById('width').value) *
        parseFloat(document.getElementById('width-unit').value);
    const heightValue = parseFloat(document.getElementById('height').value) *
        parseFloat(document.getElementById('height-unit').value);

    // 同步滑块与数字输入框
    document.getElementById('length-num').value = document.getElementById('length').value;
    document.getElementById('width-num').value = document.getElementById('width').value;
    document.getElementById('height-num').value = document.getElementById('height').value;

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
    cube.position.y = heightValue / 2;           // 底面贴地（y=0）
    cube.position.set(0, heightValue / 2, 0);
    cubeGroup.add(cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    line.position.copy(cube.position);
    cubeGroup.add(line);

    const maxDimension = Math.max(lengthValue, widthValue, heightValue);
    const cameraDistance = Math.max(10, maxDimension * 2);
    camera.position.set(cameraDistance, cameraDistance / 2, cameraDistance);
    controls.update();

    if (layerMode) {
        showLayers(heightValue);
    }
}

// 创建标记模式的小方块（从地面 y=0 向上堆叠）
function createSmallCubes(length, height, width) {
    smallCubes = [];
    const unitSize = parseFloat(document.getElementById('length-unit').value);
    let index = 0;

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
                    y * unitSize + unitSize / 2,
                    z * unitSize - (width / 2) + unitSize / 2
                );

                smallCube.userData = {
                    originalPosition: smallCube.position.clone(),
                    index: { x, y, z },
                    id: ++index
                };
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

// ============ 标记模式：选择 / 拖拽 / 尺寸 / 旋转 / 备注 / 删除 ============

const SELECT_COLOR = 0xf1c40f;  // 选中=黄色
const DESELECT_COLOR = 0x3498db; // 未选中=蓝色
let selectedCubes = [];
let currentTool = 'select';  // select | move | resize | rotate

function setMarkerTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.marker-tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.marker-tool-btn[data-tool="' + tool + '"]').forEach(b => b.classList.add('active'));
}

// 进入/退出标记模式（标记模式下仍可旋转视角，只在拖拽方块时临时禁用 OrbitControls）
function setMarkerMode(active) {
    markerMode = active;
    document.getElementById('marker-controls').style.display = active ? 'flex' : 'none';
    if (active) {
        setMarkerTool('select');
    } else {
        selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
        selectedCubes = [];
        syncSelection();
    }
}

// 确认所有更改：所有小方块恢复蓝色初始模样，取消选中
function confirmSelection() {
    selectedCubes.forEach(c => {
        setCubeColor(c, DESELECT_COLOR);
        // 恢复原始位置
        if (c.userData && c.userData.originalPosition) {
            c.position.copy(c.userData.originalPosition);
        }
        c.rotation.set(0, 0, 0);
        c.scale.set(1, 1, 1);
    });
    selectedCubes = [];
    syncSelection();
}

// 转换事件坐标到 NDC，支持触摸
function eventToNDC(event) {
    const src = event.touches && event.touches.length > 0 ? event.touches[0] : (event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : event);
    return {
        x: (src.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(src.clientY / renderer.domElement.clientHeight) * 2 + 1,
        clientX: src.clientX,
        clientY: src.clientY
    };
}

function pickSmallCube(clientX, clientY) {
    const mouse = new THREE.Vector2();
    mouse.x = (clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(clientY / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(smallCubes, true);
    return intersects.length > 0 ? intersects[0].object : null;
}

function setCubeColor(cube, color) {
    const materials = Array.isArray(cube.material) ? cube.material : [cube.material];
    materials.forEach(m => {
        m.color.set(color);
        // 选中时加发光，取消时去掉
        if (color === SELECT_COLOR) {
            m.emissive = new THREE.Color(0x333300);
        } else if (color === DESELECT_COLOR) {
            m.emissive = new THREE.Color(0x000000);
        }
    });
}

function syncSelection() {
    const toolbar = document.getElementById('marker-controls');
    if (!toolbar) return;
    const countEl = document.getElementById('marker-count');
    if (selectedCubes.length === 0) {
        countEl.textContent = '未选中';
    } else {
        countEl.textContent = '已选 ' + selectedCubes.length + ' 个';
    }
    // 更新备注按钮状态
    const noteBtn = document.getElementById('marker-note');
    if (noteBtn) {
        noteBtn.disabled = selectedCubes.length === 0;
        noteBtn.style.opacity = selectedCubes.length === 0 ? 0.5 : 1;
    }
}

function toggleCubeSelection(cube, event) {
    const multiSel = event && (event.ctrlKey || event.metaKey);
    const idx = selectedCubes.indexOf(cube);
    if (idx >= 0) {
        selectedCubes.splice(idx, 1);
        setCubeColor(cube, DESELECT_COLOR);
    } else {
        if (!multiSel) {
            selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
            selectedCubes = [];
        }
        selectedCubes.push(cube);
        setCubeColor(cube, SELECT_COLOR);
    }
    syncSelection();
}

function onPointerDown(event) {
    if (!markerMode) return;
    const ndc = eventToNDC(event);
    const cube = pickSmallCube(ndc.clientX, ndc.clientY);

    if (cube) {
        event.stopPropagation();
        // 临时禁用 OrbitControls，避免点击/拖拽方块时视角跟着旋转
        if (controls) controls.enabled = false;
        const idx = selectedCubes.indexOf(cube);
        if (currentTool === 'select') {
            // 选择工具：点击切换选中/取消
            if (idx >= 0) {
                selectedCubes.splice(idx, 1);
                setCubeColor(cube, DESELECT_COLOR);
            } else {
                selectedCubes.push(cube);
                setCubeColor(cube, SELECT_COLOR);
            }
        } else {
            // 移动/缩放/旋转工具：点击选中并开始拖拽
            isDragging = true;
            selectedCube = cube;
            if (idx < 0) {
                if (!event.ctrlKey && !event.metaKey) {
                    selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
                    selectedCubes = [];
                }
                selectedCubes.push(cube);
                setCubeColor(cube, SELECT_COLOR);
            }
            previousMousePosition = { x: ndc.clientX, y: ndc.clientY };
        }
        syncSelection();
        return;
    }

    // 点击空白：清除所有选中
    if (currentTool === 'select') {
        selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
        selectedCubes = [];
        syncSelection();
    }
}

function onPointerMove(event) {
    if (!isDragging || !selectedCube) return;
    const ndc = eventToNDC(event);

    const deltaMove = {
        x: ndc.clientX - previousMousePosition.x,
        y: ndc.clientY - previousMousePosition.y
    };

    const worldDirection = new THREE.Vector3();
    camera.getWorldDirection(worldDirection);
    const gridStep = parseFloat(document.getElementById('length-unit').value);

    if (currentTool === 'rotate') {
        selectedCubes.forEach(c => {
            // 水平拖动绕 Y 轴旋转，垂直拖动绕 X 轴旋转
            c.rotation.y += deltaMove.x * 0.02;
            c.rotation.x += deltaMove.y * 0.02;
        });
    } else {
        // 移动（吸附到单元网格）
        const moveX = deltaMove.x * gridStep / 2;
        const moveY = -deltaMove.y * gridStep / 2;
        selectedCubes.forEach(c => {
            c.position.x = Math.round((c.position.x + moveX) / gridStep) * gridStep;
            c.position.y = Math.round((c.position.y + moveY) / gridStep) * gridStep;
        });
    }

    previousMousePosition = { x: ndc.clientX, y: ndc.clientY };
}

function onPointerUp() {
    isDragging = false;
    previousMousePosition = { x: 0, y: 0 };
    // 恢复 OrbitControls 以便旋转视角
    if (controls) controls.enabled = true;
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

// 删除选中的小方块（形成不规则形状）
function deleteSelectedCube() {
    if (selectedCubes.length === 0) {
        alert('请先选择一个或多个小方块');
        return;
    }
    selectedCubes.forEach(cube => {
        const i = smallCubes.indexOf(cube);
        if (i >= 0) smallCubes.splice(i, 1);
        cubeGroup.remove(cube);
        if (cube.geometry) cube.geometry.dispose();
        if (cube.material) cube.material.dispose();
    });
    selectedCubes = [];
    syncSelection();
    updateVolumeFromMarked();
}

// 给选中的小方块添加备注
// 备注功能：支持图片+文字的模态编辑器
let currentNoteCube = null;

function onMarkerNote() {
    if (selectedCubes.length === 0) {
        alert('请先选择小方块再添加备注');
        return;
    }
    currentNoteCube = selectedCubes[0]; // 备注只对第一个选中的方块
    const modal = document.getElementById('note-modal');
    const textarea = document.getElementById('note-text');
    const preview = document.getElementById('note-image-preview');
    const fileInput = document.getElementById('note-image-input');
    
    // 加载已有备注
    const note = currentNoteCube.userData.note || {};
    textarea.value = note.text || '';
    if (note.image) {
        preview.src = note.image;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
    fileInput.value = '';
    modal.style.display = 'flex';
}

function saveNote() {
    if (!currentNoteCube) return;
    const text = document.getElementById('note-text').value;
    const preview = document.getElementById('note-image-preview');
    currentNoteCube.userData.note = {
        text: text,
        image: preview.src && preview.src !== window.location.href ? preview.src : null
    };
    // 标记有备注的方块加一个小标记
    if (text || currentNoteCube.userData.note.image) {
        currentNoteCube.material.emissive = new THREE.Color(0x004400);
    } else {
        currentNoteCube.material.emissive = new THREE.Color(0x000000);
    }
    document.getElementById('note-modal').style.display = 'none';
    currentNoteCube = null;
}

function handleNoteImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('note-image-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearMarkedCubes() {
    if (smallCubes.length === 0) return;
    if (!confirm('确定清空全部小方块？')) return;
    smallCubes.forEach(cube => cubeGroup.remove(cube));
    smallCubes = [];
    selectedCubes = [];
    syncSelection();
    updateVolumeFromMarked();
}

// 按指定角度旋转选中小方块
function rotateSelectedByAngle() {
    if (selectedCubes.length === 0) {
        alert('请先选择小方块');
        return;
    }
    const angle = parseFloat(document.getElementById('marker-angle-input').value);
    if (isNaN(angle)) {
        alert('请输入有效角度（度）');
        return;
    }
    const rad = angle * Math.PI / 180;
    selectedCubes.forEach(c => {
        c.rotation.y += rad;
    });
}

// 输入尺寸：缩放选中小方块（支持小数）
function applyMarkerSize() {
    if (selectedCubes.length === 0) {
        alert('请先选择小方块');
        return;
    }
    const sizeInput = document.getElementById('marker-size-input');
    const newSize = parseFloat(sizeInput.value);
    if (!newSize || newSize <= 0) {
        alert('请输入有效的尺寸（支持小数，如 0.5 / 1 / 2）');
        return;
    }
    const unitSize = parseFloat(document.getElementById('length-unit').value);
    selectedCubes.forEach(cube => {
        const k = newSize / unitSize;
        cube.scale.set(k, k, k);
        cube.userData.scale = k;
    });
    updateVolumeFromMarked();
}

// 根据现有小方块计算并显示体积（不规则形状的体积 = 小方块数 × 单位体积）
function updateVolumeFromMarked() {
    const unitSize = parseFloat(document.getElementById('length-unit').value);
    const bodyVolume = smallCubes.length * (unitSize * unitSize * unitSize);
    document.getElementById('volume').textContent = bodyVolume.toLocaleString();
    document.querySelector('.volume-display').innerHTML =
        `体积 = <span id="volume">${formatVolume(bodyVolume)}</span> 立方单位<br><small>（${smallCubes.length} 个小方块）</small>`;
}