// 长方体可视化模块：网格、立方体、分层、标记小方块、体积计算
const GRID_HALF = 750; // 网格半径：网格 1500×1500，一格 10 单位，轴线延伸至此
let gridHelper = null;
let axesTextScale = 1;
let mainCube = null;
// 主体六面配色（BoxGeometry 材质顺序：右+右/左/上/下/前/后）
let bodyColors = { right: 0x4CAF50, left: 0x2196F3, top: 0x9e9e9e, bottom: 0x9e9e9e, front: 0x9e9e9e, back: 0x9e9e9e };
const FACE_ORDER = ['right', 'left', 'top', 'bottom', 'front', 'back'];
function createInfinitePlatform() {
    const gridSize = GRID_HALF * 2;
    const gridDivisions = gridSize / 10;
    const gridHelperObj = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
    gridHelper = gridHelperObj;
    scene.add(gridHelperObj);

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
    if (!isFinite(volume) || volume === 0) return '0';
    const v = Math.round(volume * 10000) / 10000; // 精确到万分位 0.0001
    if (Math.abs(volume) >= 1e-4) {
        return v.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
    }
    return volume.toExponential(2);
}

// 空间直角坐标系：X、Z 在网格平面内互相垂直，Y 竖直穿过网格中心交点 O（棋盘"天元"），三轴带刻度数字与字母标注
let axesGroup = null;

function makeAxisTextSprite(text, color, fontPx) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 160, 60);
    ctx.fillStyle = color;
    ctx.font = 'bold ' + fontPx + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 80, 30);
    const texture = new THREE.CanvasTexture(canvas);
    // depthTest 开启：刻度数字会被主体（立方体）遮挡，不会透过
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
    return new THREE.Sprite(spriteMat);
}

function niceStep(value) {
    if (value <= 0) return 1;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / power;
    if (n <= 1) return 1 * power;
    if (n <= 2) return 2 * power;
    if (n <= 5) return 5 * power;
    return 10 * power;
}

function fmtTick(v, step) {
    if (step >= 1) return String(Math.round(v));
    const d = step < 0.01 ? 3 : step < 0.1 ? 2 : 1;
    return parseFloat(v.toFixed(d)).toString();
}

function buildAxisLines(group, dir, color, name, extent, step) {
    // 轴线（穿过原点，延伸到网格边缘）
    const pts = [
        dir.clone().multiplyScalar(-extent),
        dir.clone().multiplyScalar(extent)
    ];
    const axisMat = new THREE.LineBasicMaterial({ color });
    const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), axisMat);
    axisLine.name = 'axis';
    group.add(axisLine);

    // 刻度方向：与轴线垂直
    let perp;
    if (dir.x === 1) perp = new THREE.Vector3(0, 0, 1);
    else perp = new THREE.Vector3(1, 0, 0);

    // 刻度与线同长：从头标到尾，每个刻度都标数字
    const tickLen = Math.max(1.5, extent * 0.01);
    const tickMat = new THREE.LineBasicMaterial({ color });
    const numScaleX = Math.max(1, step * 0.8);
    const numScaleY = numScaleX * (60 / 160);
    const first = Math.ceil(-extent / step);
    const last = Math.floor(extent / step);
    for (let k = first; k <= last; k++) {
        if (k === 0) continue; // 原点数字 0 单独绘制一次
        const p = dir.clone().multiplyScalar(k * step);
        const t0 = p.clone().addScaledVector(perp, -tickLen / 2);
        const t1 = p.clone().addScaledVector(perp, tickLen / 2);
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([t0, t1]), tickMat));
        const numSp = makeAxisTextSprite(fmtTick(k * step, step), color, 26);
        numSp.position.copy(p).addScaledVector(perp, tickLen * 1.1);
        numSp.scale.set(numScaleX, numScaleY, 1);
        numSp.userData.kind = 'num';
        numSp.userData.baseScale = { x: numScaleX, y: numScaleY };
        group.add(numSp);
    }

    // 字母标注 X/Y/Z（缩小、在线的端点附近）
    const nameSp = makeAxisTextSprite(name, color, 40);
    nameSp.position.copy(dir).multiplyScalar(extent).addScaledVector(perp, tickLen * 3);
    nameSp.scale.set(numScaleX * 1.4, numScaleY * 1.4, 1);
    nameSp.userData.kind = 'letter';
    nameSp.userData.baseScale = { x: numScaleX * 1.4, y: numScaleY * 1.4 };
    group.add(nameSp);
}

function refreshAxes() {
    if (!axesGroup) return;
    const extent = GRID_HALF; // 网格半径：轴线延伸到网格边缘
    const step = 10; // 10 为一组标刻度（与网格一格 10 单位一致），刻度标到线的尽头
    const ud = axesGroup.userData;
    if (ud.step === step && ud.extent === extent) return;

    while (axesGroup.children.length > 0) {
        const c = axesGroup.children[0];
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
            if (c.material.map) c.material.map.dispose();
            c.material.dispose();
        }
        axesGroup.remove(c);
    }
    ud.step = step;
    ud.extent = extent;

    buildAxisLines(axesGroup, new THREE.Vector3(1, 0, 0), '#e74c3c', 'X', extent, step);
    buildAxisLines(axesGroup, new THREE.Vector3(0, 1, 0), '#2ecc71', 'Y', extent, step);
    buildAxisLines(axesGroup, new THREE.Vector3(0, 0, 1), '#3498db', 'Z', extent, step);

    // 原点数字 0（O 即天元与 0 相交的网格中心交点）：正好标在交点上
    const zero = makeAxisTextSprite('0', '#555555', 42);
    zero.position.set(0, 0, 0);
    const zs = Math.max(1, step * 0.7) * 1.2;
    zero.scale.set(zs, zs * (60 / 160), 1);
    zero.userData.kind = 'zero';
    zero.userData.baseScale = { x: zs, y: zs * (60 / 160) };
    axesGroup.add(zero);
}

// ============ 调试面板·设置 ============
function setupSettingsPanel() {
    const showAxes = document.getElementById('set-show-axes');
    const showTicks = document.getElementById('set-show-ticks');
    const showGrid = document.getElementById('set-show-grid');
    const textScale = document.getElementById('set-text-scale');
    [showAxes, showTicks, showGrid].forEach(el => {
        if (el) el.addEventListener('change', applySettings);
    });
    if (textScale) textScale.addEventListener('input', applyTextScale);

    const bodyColor = document.getElementById('set-body-color');
    FACE_ORDER.forEach(face => {
        const input = document.getElementById('face-' + face);
        if (input) {
            input.addEventListener('input', function() {
                bodyColors[face] = '#' + input.value;
                applyBodyColors();
            });
        }
    });
    if (bodyColor) {
        bodyColor.addEventListener('input', function() {
            FACE_ORDER.forEach(face => {
                bodyColors[face] = '#' + bodyColor.value;
                const faceInput = document.getElementById('face-' + face);
                if (faceInput) faceInput.value = bodyColor.value;
            });
            applyBodyColors();
        });
    }
    applySettings();
    applyTextScale();
}

// 给当前主体重新上色（六面按 bodyColors）
function applyBodyColors() {
    if (!mainCube || !mainCube.material) return;
    const mats = Array.isArray(mainCube.material) ? mainCube.material : [mainCube.material];
    mats.forEach((m, i) => {
        if (m && i < FACE_ORDER.length) m.color.set(bodyColors[FACE_ORDER[i]]);
    });
}

function applySettings() {
    const showAxes = document.getElementById('set-show-axes');
    const showTicks = document.getElementById('set-show-ticks');
    const showGrid = document.getElementById('set-show-grid');
    if (axesGroup) axesGroup.visible = !showAxes || showAxes.checked;
    if (axesGroup) {
        axesGroup.traverse(o => {
            if (!o.isSprite) return;
            if (o.userData.kind === 'num' || o.userData.kind === 'zero') {
                if (showTicks) o.visible = showTicks.checked;
            }
        });
    }
    if (gridHelper) gridHelper.visible = !showGrid || showGrid.checked;
}

function applyTextScale() {
    const el = document.getElementById('set-text-scale');
    if (!el) return;
    axesTextScale = parseFloat(el.value) || 1;
    if (!axesGroup) return;
    axesGroup.traverse(o => {
        if (!o.isSprite || !o.userData.baseScale) return;
        o.scale.set(o.userData.baseScale.x * axesTextScale, o.userData.baseScale.y * axesTextScale, 1);
    });
}

function createAxes() {
    if (axesGroup) {
        scene.remove(axesGroup);
        axesGroup = null;
    }
    axesGroup = new THREE.Group();
    axesGroup.name = 'axes';
    scene.add(axesGroup);
    refreshAxes();
    return axesGroup;
}

function updateCube() {
    // 重画主体前保存旧主体的备注（换尺寸后要补挂回去）
    const prevMainNote = (mainCube && mainCube.userData && mainCube.userData.note) ? mainCube.userData.note : null;
    const prevMainSelected = !!noteSelection && noteSelection === mainCube;
    while (cubeGroup.children.length > 0) {
        cubeGroup.remove(cubeGroup.children[0]);
    }

    // 世界尺寸 = 滑块数值（单位只影响“立方厘米/毫米…”标签显示，不再缩放立方体造成悬殊）
    const lengthValue = parseFloat(document.getElementById('length').value);
    const widthValue = parseFloat(document.getElementById('width').value);
    const heightValue = parseFloat(document.getElementById('height').value);

    refreshAxes();

    // 同步滑块与数字输入框
    document.getElementById('length-num').value = document.getElementById('length').value;
    document.getElementById('width-num').value = document.getElementById('width').value;
    document.getElementById('height-num').value = document.getElementById('height').value;

    const volume = lengthValue * widthValue * heightValue;
    const unit = getVolumeUnit();
    document.getElementById('volume').textContent = formatVolume(volume);
    document.querySelector('.volume-display').innerHTML =
        `体积 = <span id="volume">${formatVolume(volume)}</span> ${unit}`;

    // 标记模式下显示小方块
    if (markerMode) {
        if (smallCubes.length > 0) {
            restoreMarkerCubes();
        } else {
            createSmallCubes(lengthValue, heightValue, widthValue);
            updateNoteVisuals();
        }
        return;
    }

    const geometry = new THREE.BoxGeometry(lengthValue, heightValue, widthValue);

    const materials = FACE_ORDER.map(face => new THREE.MeshPhongMaterial({ color: bodyColors[face] }));

    cube = new THREE.Mesh(geometry, materials);
    mainCube = cube;
    cube.position.set(lengthValue / 2, heightValue / 2, widthValue / 2); // 一个角在原点O，紧贴Y轴的一条高向上
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
        currentLayer = Math.max(1, parseInt(heightValue)); // 每次更新都以当前高度重算层数，避免改高度后分层错乱
        showLayers(heightValue);
    }

    // 主体重画后，把之前挂上的备注浮层补回去
    mainCube.userData.note = prevMainNote || {};
    const mainNote = mainCube.userData.note;
    if (mainNote && (mainNote.text || mainNote.image)) {
        ensureAnyNoteVisual(mainCube, mainNote);
    }
    // 主体重画后，若此前被点选，选中态转到新主体
    if (prevMainSelected) {
        noteSelection = mainCube;
        setObjHighlight(mainCube, true);
    }
}

// 创建标记模式的小方块（在地面上从 O 角向上堆叠，一格=1 世界单位）
function createSmallCubes(length, height, width) {
    smallCubes = [];
    const unitSize = 1;
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
                    x * unitSize + unitSize / 2,
                    y * unitSize + unitSize / 2,
                    z * unitSize + unitSize / 2
                );

                smallCube.userData = {
                    originalPosition: smallCube.position.clone(),
                    index: { x, y, z },
                    id: ++index
                };
                cubeGroup.add(smallCube);
                smallCubes.push(smallCube);

                // 边框作为方块的子节点，移动/旋转时自动跟随
                const edges = new THREE.EdgesGeometry(geometry);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
                smallCube.add(line);
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
    if (typeof closeEditor === 'function') closeEditor();
    if (active) {
        setMarkerTool('select');
    } else {
        selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
        selectedCubes = [];
        syncSelection();
    }
}

// 保存所有更改并退出标记模式（不恢复初始状态，改动保留；再次进入标记模式时可继续编辑）
function confirmSelection() {
    // 清空选中态，但保留所有编辑结果
    selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
    selectedCubes = [];
    syncSelection();
    exitMarkerMode();
}

function exitMarkerMode() {
    if (!markerMode) return;
    setMarkerMode(false);
    updateCube(); // 重新显示普通长方体；smallCubes 保存在内存中，重进标记模式时恢复
    const btn = document.getElementById('marker-mode');
    if (btn) {
        btn.style.background = '#f39c12';
        btn.textContent = '标记模式';
    }
}

// 重新进入标记模式时恢复之前保存的小方块（含删除/移动/缩放/旋转/备注等所有编辑）
function restoreMarkerCubes() {
    smallCubes.forEach(cube => {
        cubeGroup.add(cube);
    });
    syncSelection();
    updateNoteVisuals();
    updateVolumeFromMarked();
}

// 取事件相对画布的坐标（画布可能不在页面左上角，需减去元素偏移）
function eventToCanvas(event) {
    const src = event.touches && event.touches.length > 0 ? event.touches[0] : (event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : event);
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        x: src.clientX - rect.left,
        y: src.clientY - rect.top,
        clientX: src.clientX,
        clientY: src.clientY
    };
}

// 转换事件坐标到 NDC，支持触摸
function eventToNDC(event) {
    const c = eventToCanvas(event);
    return {
        x: (c.x / renderer.domElement.clientWidth) * 2 - 1,
        y: -(c.y / renderer.domElement.clientHeight) * 2 + 1,
        clientX: c.clientX,
        clientY: c.clientY
    };
}

function pickSmallCube(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -((clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(smallCubes, true);
    return intersects.length > 0 ? intersects[0].object : null;
}

function setCubeColor(cube, color) {
    const useColor = (color === DESELECT_COLOR && cube.userData && cube.userData.userColor)
        ? cube.userData.userColor : color;
    const materials = Array.isArray(cube.material) ? cube.material : [cube.material];
    materials.forEach(m => {
        m.color.set(useColor);
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
    // 更新备注按钮状态（保持可点：未选中时点了会弹提示，而不是按钮无反应）
    const noteBtn = document.getElementById('marker-note');
    if (noteBtn) {
        noteBtn.disabled = false;
        noteBtn.style.opacity = 1;
    }
    // 选中变化时同步通用编辑面板（选中任意立体即呼出）
    if (typeof syncMarkerEditorSelection === 'function') syncMarkerEditorSelection();
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

let dragStartClient = null;
let dragStartState = [];   // 每个选中块拖拽开始时的 position/rotation/scale

// 点选主体/函数3D：供「备注」按钮使用（必须先选中一个立体，再点备注）
let noteSelection = null;

function setObjHighlight(obj, on) {
    if (!obj) return;
    const has = !!(obj.userData && obj.userData.note && (obj.userData.note.text || obj.userData.note.image));
    const base = on ? 0x332200 : (has ? 0x004400 : 0x000000);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(m => { if (m && m.emissive) m.emissive.set(base); });
}

function setNoteSelection(obj) {
    if (noteSelection && noteSelection !== obj) setObjHighlight(noteSelection, false);
    noteSelection = obj;
    if (obj) setObjHighlight(obj, true);
}

function clearNoteSelection() {
    if (noteSelection) setObjHighlight(noteSelection, false);
    noteSelection = null;
}

function pickBodyOrFunction(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -((clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const targets = [];
    if (mainCube) targets.push(mainCube);
    if (typeof functionMesh !== 'undefined' && functionMesh) targets.push(functionMesh);
    if (targets.length === 0) return null;
    const hits = raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return null;
    let o = hits[0].object;
    while (o.parent && targets.indexOf(o) < 0) o = o.parent;
    return o;
}

function onPointerDown(event) {
    if (!markerMode) {
        const ndc = eventToNDC(event);
        const picked = pickBodyOrFunction(ndc.clientX, ndc.clientY);
        if (picked) {
            event.stopPropagation();
            if (typeof deselectModel === 'function') deselectModel();
            setNoteSelection(picked);
            return;
        }
        handleModelPointerDown(event);
        return;
    }
    const ndc = eventToNDC(event);
    const cube = pickSmallCube(ndc.clientX, ndc.clientY);

    if (cube) {
        clearNoteSelection(); // 选中/操作小方块时，取消此前点选的主体/函数3D
        event.stopPropagation();
        // 临时禁用 OrbitControls，避免点击/拖拽方块时视角跟着旋转
        if (controls) controls.enabled = false;
        const idx = selectedCubes.indexOf(cube);
        if (currentTool === 'select') {
            // 选择工具：点击切换选中/取消（不做拖拽）
            if (idx >= 0) {
                selectedCubes.splice(idx, 1);
                setCubeColor(cube, DESELECT_COLOR);
            } else {
                selectedCubes.push(cube);
                setCubeColor(cube, SELECT_COLOR);
            }
        } else {
            // 移动/缩放/旋转工具：点击选中并记录拖拽起始状态
            if (idx < 0) {
                if (!event.ctrlKey && !event.metaKey) {
                    selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
                    selectedCubes = [];
                }
                selectedCubes.push(cube);
                setCubeColor(cube, SELECT_COLOR);
            }
            isDragging = true;
            selectedCube = cube;
            dragStartClient = { x: ndc.clientX, y: ndc.clientY };
            dragStartState = selectedCubes.map(c => ({
                pos: c.position.clone(),
                rot: c.rotation.clone(),
                scale: c.scale.clone()
            }));
        }
        syncSelection();
        return;
    }

    // 没点中小方块：试试点中主体/函数3D（标记模式下也可选中，供备注）
    const pickedBody = pickBodyOrFunction(ndc.clientX, ndc.clientY);
    if (pickedBody) {
        event.stopPropagation();
        if (currentTool === 'select') {
            selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
            selectedCubes = [];
        }
        setNoteSelection(pickedBody);
        syncSelection();
        return;
    }

    // 点击空白：清除所有选中（含点选的立体）
    if (currentTool === 'select') {
        selectedCubes.forEach(c => setCubeColor(c, DESELECT_COLOR));
        selectedCubes = [];
        clearNoteSelection();
        syncSelection();
    }
}

// 在当前相机距离下，把屏幕像素距离换算成世界坐标距离（拖拽跟手不抖）
function computeWorldPerPixel(point) {
    const dist = camera.position.distanceTo(point || selectedCube.position);
    const h = renderer.domElement.clientHeight || 600;
    const w = renderer.domElement.clientWidth || 800;
    const vFov = camera.fov * Math.PI / 180;
    const worldPerPixY = 2 * dist * Math.tan(vFov / 2) / h;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (w / h));
    const worldPerPixX = 2 * dist * Math.tan(hFov / 2) / w;
    return { x: worldPerPixX, y: worldPerPixY };
}

function onPointerMove(event) {
    if (modelDragActive) {
        handleModelPointerMove(event);
        return;
    }
    if (!isDragging || !selectedCube || !dragStartClient) return;
    const ndc = eventToNDC(event);
    const dx = ndc.clientX - dragStartClient.x;
    const dy = ndc.clientY - dragStartClient.y;

    // 死区：小于 4px 视为点击，不做拖拽，防止误触瞬移
    if (Math.hypot(dx, dy) < 4) return;

    const wpp = computeWorldPerPixel();
    const unitSize = 1; // 世界单位=滑块数值，一格一格吸附

    if (currentTool === 'rotate') {
        // 旋转：水平拖动绕 Y 轴，垂直拖动绕 X 轴，采用起始角度+偏移
        selectedCubes.forEach((c, i) => {
            const start = dragStartState[i];
            c.rotation.y = start.rot.y + dx * 0.008;
            c.rotation.x = start.rot.x - dy * 0.008;
        });
    } else if (currentTool === 'resize') {
        // 缩放：水平拖动等比缩放（从起始比例开始，保持不小于 0.2）
        const k = 1 + dx * wpp.x * 0.02;
        selectedCubes.forEach((c, i) => {
            const start = dragStartState[i];
            const kk = Math.max(0.2, k * start.scale.x);
            c.scale.set(kk, kk, kk);
        });
        if (typeof syncMarkerEditorSelection === 'function') syncMarkerEditorSelection();
    } else {
        // 移动：绝对偏移 + 可选网格吸附（不累积误差，拖动稳定）
        const moveX = dx * wpp.x;
        const moveY = -dy * wpp.y;
        selectedCubes.forEach((c, i) => {
            const start = dragStartState[i];
            let px = start.pos.x + moveX;
            let py = start.pos.y + moveY;
            px = Math.round(px / unitSize) * unitSize;
            py = Math.max(unitSize / 2, Math.round(py / unitSize) * unitSize);
            c.position.x = px;
            c.position.y = py;
            c.position.z = start.pos.z;
            updateNotePosition(c);
        });
        if (typeof syncMarkerEditorPosition === 'function') syncMarkerEditorPosition();
    }
}

function onPointerUp() {
    if (modelDragActive) {
        handleModelPointerUp();
    }
    modelDragActive = null;
    isDragging = false;
    selectedCube = null;
    previousMousePosition = { x: 0, y: 0 };
    dragStartClient = null;
    dragStartState = [];
    // 恢复 OrbitControls 以便旋转视角
    if (controls) controls.enabled = true;
}

function showLayers(height) {
    const layers = Math.max(1, currentLayer || parseInt(document.getElementById('height').value));
    const layerHeight = height / layers;
    const lv = parseFloat(document.getElementById('length').value);
    const wv = parseFloat(document.getElementById('width').value);
    for (let i = 0; i < layers; i++) {
        const layerGeometry = new THREE.BoxGeometry(lv, layerHeight, wv);

        const layerMaterial = new THREE.MeshPhongMaterial({
            color: 0xff9800,
            transparent: true,
            opacity: 0.7
        });

        const layer = new THREE.Mesh(layerGeometry, layerMaterial);
        layer.position.set(lv / 2, (i * layerHeight) + (layerHeight / 2), wv / 2); // 与主体同心，一层层向上叠
        cubeGroup.add(layer);

        const layerEdges = new THREE.EdgesGeometry(layerGeometry);
        const layerLine = new THREE.LineSegments(layerEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        layerLine.position.set(lv / 2, (i * layerHeight) + (layerHeight / 2), wv / 2);
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
        removeNoteVisual(cube);
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

// 打开备注模态，目标可以是任意三维对象（主体/函数3D/小方块/自定义模型）
function openNoteFor(target) {
    if (!target) return;
    currentNoteCube = target;
    const modal = document.getElementById('note-modal');
    if (!modal) return;
    const textarea = document.getElementById('note-text');
    const preview = document.getElementById('note-image-preview');
    const fileInput = document.getElementById('note-image-input');

    // 加载已有备注
    const note = target.userData.note || {};
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

function onMarkerNote() {
    if (selectedCubes.length === 0) {
        alert('请先选择小方块再添加备注');
        return;
    }
    openNoteFor(selectedCubes[0]); // 备注对第一个选中的方块
}

function markNoteEmissive(mesh, has) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(m => { if (m && m.emissive) m.emissive.set(has ? 0x004400 : 0x000000); });
}

function saveNote() {
    if (!currentNoteCube) return;
    const text = document.getElementById('note-text').value;
    const preview = document.getElementById('note-image-preview');
    const note = {
        text: text,
        image: preview.src && preview.src !== window.location.href ? preview.src : null
    };
    currentNoteCube.userData.note = note;
    // 有备注的立体加一个标志色
    const has = !!(text || note.image);
    markNoteEmissive(currentNoteCube, has);

    document.getElementById('note-modal').style.display = 'none';
    notesVisible = true; // 保存后立即显示备注浮层，而不是藏起来让人以为没存上
    const nBtn = document.getElementById('marker-notes-toggle');
    if (nBtn) nBtn.textContent = '隐藏备注';

    if (smallCubes.indexOf(currentNoteCube) >= 0) {
        updateNoteVisuals(); // 小方块 → 既有浮层
    } else if (typeof definedModels !== 'undefined' && definedModels.some(m => m.mesh === currentNoteCube)) {
        syncModelNoteAfterSave(currentNoteCube); // 自定义模型 → recognize 浮层
    } else {
        ensureAnyNoteVisual(currentNoteCube, note); // 主体/函数3D → 通用浮层
    }
    currentNoteCube = null;
}

// 调试面板「备注」按钮：必须先在画布上点选一个立体（主体/函数3D/小方块/自定义模型），再为其加备注
function debugPanelNote() {
    // 识别模式选中的自定义模型
    if (typeof selectedModel !== 'undefined' && selectedModel && selectedModel.mesh) {
        openNoteFor(selectedModel.mesh);
        return;
    }
    // 标记模式选中的小方块
    if (markerMode && selectedCubes.length > 0) {
        openNoteFor(selectedCubes[0]);
        return;
    }
    // 点选的主体/函数3D
    if (noteSelection) {
        openNoteFor(noteSelection);
        return;
    }
    alert('请先在画布上点击选中一个立体（主体/函数3D/小方块/自定义模型），再点「备注」');
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

/* ---- 备注浮层：从方块拉一条引出线，末端悬浮文字/图片卡片 ---- */

let notesVisible = false;

function toggleNotes() {
    notesVisible = !notesVisible;
    smallCubes.forEach(cube => {
        if (cube.userData.noteSprite) cube.userData.noteSprite.visible = notesVisible;
        if (cube.userData.noteLine) cube.userData.noteLine.visible = notesVisible;
    });
    const btn = document.getElementById('marker-notes-toggle');
    if (btn) btn.textContent = notesVisible ? '隐藏备注' : '显示备注';
}

function removeNoteVisual(cube) {
    if (cube.userData.noteLine) {
        cubeGroup.remove(cube.userData.noteLine);
        if (cube.userData.noteLine.geometry) cube.userData.noteLine.geometry.dispose();
        cube.userData.noteLine = null;
    }
    if (cube.userData.noteSprite) {
        cubeGroup.remove(cube.userData.noteSprite);
        if (cube.userData.noteSprite.material && cube.userData.noteSprite.material.map) {
            cube.userData.noteSprite.material.map.dispose();
        }
        if (cube.userData.noteSprite.material) cube.userData.noteSprite.material.dispose();
        cube.userData.noteSprite = null;
    }
}

// 卡片画布：可容纳图片 + 文字
function buildNoteCanvas(note, done) {
    const text = (note.text || '').toString();
    const image = note.image || '';
    const hasImage = !!image;
    const W = hasImage ? 200 : 240;
    const TH = hasImage ? 56 : 112;   // 文字区高度
    const IH = hasImage ? 110 : 0;    // 图片区高度
    const H = (hasImage ? IH : 0) + (text ? TH : 0);
    if (H <= 0) return done(null);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    const drawText = function(y) {
        if (!text) return;
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '22px sans-serif';
        ctx.textBaseline = 'top';
        let line = '';
        let yy = y + 8;
        for (let i = 0; i < text.length; i++) {
            const t = line + text[i];
            if (ctx.measureText(t).width > W - 16 && line) {
                ctx.fillText(line, 8, yy);
                line = text[i];
                yy += 26;
            } else {
                line = t;
            }
            if (yy > y + TH - 4) break;
        }
        if (line) ctx.fillText(line, 8, yy);
    };

    let finished = false;
    const finish = function() {
        if (finished) return;
        finished = true;
        if (text) drawText(hasImage ? IH : 0);
        done(canvas);
    };

    if (hasImage) {
        const img = new Image();
        const drawImage = function() {
            if (img.naturalWidth <= 0) return;
            const iw = W - 16, ih = IH - 16;
            const s = Math.min(iw / img.naturalWidth, ih / img.naturalHeight);
            const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
            ctx.drawImage(img, (W - dw) / 2, 8 + (ih - dh) / 2, dw, dh);
        };
        img.onload = function() { drawImage(); finish(); };
        img.onerror = function() { finish(); };
        img.src = image;
        if (img.complete && img.naturalWidth > 0) {
            drawImage();
            finish();
        }
    } else {
        finish();
    }
}

// 备注浮层统一世界尺寸（卡宽固定约 6 个世界单位，避免卡片过大/过小）
const NOTE_WORLD_WIDTH = 6;

// 通用备注浮层：对任意三维对象（主体/函数3D等）挂一个引线+卡片
function removeAnyNoteVisual(obj) {
    if (!obj || !obj.userData) return;
    const sp = obj.userData.noteSprite;
    const ln = obj.userData.noteLine;
    const parent = obj.parent || scene;
    if (ln) parent.remove(ln);
    if (sp) parent.remove(sp);
    if (sp && sp.material) {
        if (sp.material.map) sp.material.map.dispose();
        sp.material.dispose();
    }
    if (ln && ln.geometry) ln.geometry.dispose();
    obj.userData.noteSprite = null;
    obj.userData.noteLine = null;
}

function ensureAnyNoteVisual(obj, note) {
    if (!obj) return;
    buildNoteCanvas(note || {}, function(canvas) {
        if (!canvas) { removeAnyNoteVisual(obj); return; }
        removeAnyNoteVisual(obj);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            depthTest: false
        }));
        const s = NOTE_WORLD_WIDTH / canvas.width;
        sprite.scale.set(canvas.width * s, canvas.height * s, 1);
        sprite.visible = notesVisible;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
            color: 0x2980b9,
            linewidth: 1
        }));
        line.visible = notesVisible;

        obj.userData.noteSprite = sprite;
        obj.userData.noteLine = line;
        const parent = obj.parent || scene;
        parent.add(sprite);
        parent.add(line);
        positionNoteAbove(obj);
    });
}

// 备注浮层跟随对象顶部（中心对齐、上方留缝），对小方块/主体/函数3D通用
function positionNoteAbove(obj) {
    const sprite = obj.userData.noteSprite;
    const line = obj.userData.noteLine;
    if (!sprite || !line) return;
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const gap = 1.2;
    sprite.position.set(c.x, box.max.y + gap, c.z);
    line.geometry.setFromPoints([
        new THREE.Vector3(c.x, box.max.y, c.z),
        new THREE.Vector3(c.x, box.max.y + gap * 0.6, c.z)
    ]);
}

function ensureNoteVisual(cube, note) {
    buildNoteCanvas(note || {}, function(canvas) {
        if (!canvas) return;
        if (cube.userData.noteSprite) {
            cubeGroup.remove(cube.userData.noteSprite);
            if (cube.userData.noteSprite.material && cube.userData.noteSprite.material.map) {
                cube.userData.noteSprite.material.map.dispose();
            }
            cube.userData.noteSprite = null;
        }
        if (cube.userData.noteLine) {
            cubeGroup.remove(cube.userData.noteLine);
            cube.userData.noteLine = null;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            depthTest: false
        }));
        const s = NOTE_WORLD_WIDTH / canvas.width;
        sprite.scale.set(canvas.width * s, canvas.height * s, 1);
        sprite.visible = notesVisible;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
            color: 0x2980b9,
            linewidth: 1
        }));
        line.visible = notesVisible;

        cube.userData.noteSprite = sprite;
        cube.userData.noteLine = line;
        cubeGroup.add(sprite);
        cubeGroup.add(line);
        updateNotePosition(cube);
    });
}

function updateNotePosition(cube) {
    positionNoteAbove(cube);
}

// 重建所有带备注方块的浮层
function updateNoteVisuals() {
    smallCubes.forEach(cube => {
        const note = cube.userData.note || {};
        const hasNote = !!(note.text || note.image);
        if (hasNote) {
            ensureNoteVisual(cube, note);
        } else {
            removeNoteVisual(cube);
        }
    });
}

function clearMarkedCubes() {
    if (smallCubes.length === 0) return;
    if (!confirm('确定清空全部小方块？')) return;
    smallCubes.forEach(cube => {
        removeNoteVisual(cube);
        cubeGroup.remove(cube);
    });
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
    smallCubes.forEach(c => updateNotePosition(c));
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
    const unitSize = 1; // 世界单位=滑块数值
    selectedCubes.forEach(cube => {
        const k = newSize / unitSize;
        cube.scale.set(k, k, k);
        cube.userData.scale = k;
    });
    smallCubes.forEach(c => updateNotePosition(c));
    updateVolumeFromMarked();
}

// 根据现有小方块计算并显示体积（不规则形状的体积 = 小方块数 × 单位体积）
function updateVolumeFromMarked() {
    const unitSize = 1; // 世界单位=滑块数值
    const bodyVolume = smallCubes.length * (unitSize * unitSize * unitSize);
    document.getElementById('volume').textContent = formatVolume(bodyVolume);
    document.querySelector('.volume-display').innerHTML =
        `体积 = <span id="volume">${formatVolume(bodyVolume)}</span> ${getVolumeUnit()}<br><small>（${smallCubes.length} 个小方块）</small>`;
}