// 定义模型模块（开发模式"添加/定义模型"）：上传三视图图片 → 自动分析正面/上面/左面 → 生成自定义几何体
// 支持：文件名标注尺寸(3x4x5.png)与坐标(_x1_y2_z3)、文件末尾文本(dims=..&pos=..)
// 生成的立体可选中：移动坐标、改大小、上色、添加备注标签

let definedModels = [];        // 已定义并放入场景的自定义几何体（含 UI 对象引用）
let defineModelCounter = 0;    // 自动命名：新建几何图形1/2/3...
let selectedModel = null;      // 当前选中的自定义几何体
let defineImage = null;        // 当前待分析的图片
let defineResult = null;       // 分析结果 { dims, pos, faces, name }
let modelDragActive = null;    // 正在拖拽的模型

/* ---------- 上传与解析 ---------- */

function openDefineModelFile() {
    document.getElementById('define-model-input').click();
}

function readTailText(dataUrl) {
    try {
        const comma = dataUrl.indexOf(',');
        const b64 = dataUrl.slice(comma + 1);
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const start = Math.max(0, bytes.length - 2048);
        let s = '';
        for (let i = start; i < bytes.length; i++) {
            const c = bytes[i];
            s += (c >= 32 && c < 127) ? String.fromCharCode(c) : ' ';
        }
        return s;
    } catch (err) {
        return '';
    }
}

// 从文件名/尾部文本解析尺寸与坐标
function parseHiddenMeta(name, text, dimsFrom) {
    const out = { dims: dimsFrom || null, pos: null };
    const all = (name || '') + ' ' + (text || '');
    if (!out.dims) {
        const dm = all.match(/dims\s*[:=]\s*([\d.]+)[xX×*]([\d.]+)[xX×*]([\d.]+)/) ||
            all.match(/(\d+(?:\.\d+)?)[xX×*](\d+(?:\.\d+)?)[xX×*](\d+(?:\.\d+)?)/);
        if (dm) out.dims = [parseFloat(dm[1]), parseFloat(dm[2]), parseFloat(dm[3])];
    }
    const pm = all.match(/pos\s*[:=]\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)/) ||
        all.match(/[_\-\s]x(-?[\d.]+)[_\-\s]y(-?[\d.]+)[_\-\s]z(-?[\d.]+)/i) ||
        all.match(/(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)/);
    if (pm) out.pos = [parseFloat(pm[1]), parseFloat(pm[2]), parseFloat(pm[3])];
    return out;
}

function handleDefineModelFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            defineImage = img;
            const preview = document.getElementById('define-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            const metaText = readTailText(e.target.result);
            const faces = analyzeProjectionFaces(img);
            defineResult = { faces: faces, meta: metaText, name: file.name };
            renderDefineResult(defineResult);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 三视图面检测：把图片转到小画布，找深色矩形面（白底分隔）
function analyzeProjectionFaces(img) {
    const maxW = 640;
    const sc = Math.min(1, maxW / img.width);
    const cw = Math.max(1, Math.round(img.width * sc));
    const ch = Math.max(1, Math.round(img.height * sc));
    let canvas = document.getElementById('define-full-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'define-full-canvas';
        // 移出屏幕：仅作像素缓冲，不显示在页面上
        canvas.style.position = 'absolute';
        canvas.style.left = '-99999px';
        canvas.style.top = '0';
        canvas.style.width = '1px';
        canvas.style.height = '1px';
        document.body.appendChild(canvas);
    }
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    const data = ctx.getImageData(0, 0, cw, ch).data;
    const emptyCol = new Array(cw).fill(true);
    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            const i = (y * cw + x) * 4;
            const dark = data[i] < 155 && data[i + 1] < 155 && data[i + 2] < 155;
            if (dark) emptyCol[x] = false;
        }
    }
    // 深色列 => 面区间（≤3列空隙视为同一面内部间隙）
    const spans = [];
    let start = -1;
    for (let x = 0; x <= cw; x++) {
        const empty = x >= cw || emptyCol[x];
        if (!empty && start < 0) {
            start = x;
        } else if (empty && start >= 0) {
            let gapEnd = x;
            while (gapEnd < cw && emptyCol[gapEnd]) gapEnd++;
            if (gapEnd - x > 3 || gapEnd >= cw) {
                spans.push({ start: start, end: x - 1 });
                start = -1;
            }
        }
    }
    const faces = [];
    spans.forEach(sp => {
        let top = ch, bottom = 0, left = cw, right = 0;
        for (let y = 0; y < ch; y++) {
            let rowDark = false;
            for (let x = sp.start; x <= sp.end; x++) {
                const i = (y * cw + x) * 4;
                if (data[i] < 155 && data[i + 1] < 155 && data[i + 2] < 155) {
                    rowDark = true;
                    if (x < left) left = x;
                    if (x > right) right = x;
                }
            }
            if (rowDark) {
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
        const w = right - left + 1;
        const h = bottom - top + 1;
        if (h > 0 && w > 0) faces.push({ x: left, y: top, w: w, h: h });
    });

    // 若只有单个宽条：按等宽切分为近似正方形面（处理紧贴无间隔）
    if (faces.length === 1) {
        const f = faces[0];
        const ratio = f.w / f.h;
        if (ratio >= 1.8) {
            const n = Math.round(ratio);
            faces.length = 0;
            const segW = f.w / n;
            for (let i = 0; i < n; i++) {
                faces.push({ x: Math.round(f.x + i * segW), y: f.y, w: Math.round(segW), h: f.h });
            }
        }
    }
    return faces;
}

// 从三视图推断尺寸：正面(最大面)=宽×高，上面(位于正面之上)=深度，左面=备选深度
function projectDims(faces) {
    if (!faces || faces.length === 0) return null;
    const byArea = faces.slice().sort((a, b) => b.w * b.h - a.w * a.h);
    const front = byArea[0];
    // 深度(D)取最小面（顶面或左面）的较短边：顶面高=深，左面宽=深
    // 若只有一个面则退化为与…宽/高的比例
    const side = byArea.length > 1 ? byArea[byArea.length - 1] : null;
    const W = Math.max(front.w, 1);
    const H = Math.max(front.h, 1);
    let D = side ? Math.min(side.w, side.h) : Math.min(W, H);
    if (!D || D <= 0) D = Math.min(W, H);
    return { dims: [W, H, D], faces: byArea };
}

function renderDefineResult(result) {
    const el = document.getElementById('define-result');
    const pd = projectDims(result.faces);
    let lines = [];
    if (!pd) {
        lines.push('未能识别到图形轮廓，请使用浅色背景 + 深色线条的图片。');
    } else {
        const d = pd.dims;
        lines.push('检测到 ' + result.faces.length + ' 个面，正面约 ' + pd.faces[0].w + '×' + pd.faces[0].h + 'px');
        lines.push('建议尺寸：<b>' + d[0].toFixed(1) + ' × ' + d[1].toFixed(1) + ' × ' + d[2].toFixed(1) + '</b> 单位');
    }
    const meta = result.meta || '';
    const pm = meta.match(/pos\s*[:=]\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)/) ||
        result.name.match(/[_\-\s]x(-?[\d.]+)[_\-\s]y(-?[\d.]+)[_\-\s]z(-?[\d.]+)/i);
    if (pm) {
        lines.push('读取到隐藏坐标：(' + pm[1] + ', ' + pm[2] + ', ' + pm[3] + ')');
    } else {
        lines.push('未读取到坐标，将自动放置在场景中央附近（可选中后手动移动）。');
    }
    el.innerHTML = lines.join('<br>');
}

/* ---------- 定义模型：生成立体、注册选择器按钮、选择/编辑 ---------- */

function defineModelFromImage() {
    if (!defineImage || !defineResult) {
        alert('请先通过上方文件管理器上传三视图图片（拖入或点击选择均可）。');
        return;
    }
    const pd = projectDims(defineResult.faces);
    if (!pd) {
        alert('未能识别图形轮廓，请更换图片。');
        return;
    }
    let dims = pd.dims.map(v => Math.max(0.5, v));
    const meta = parseHiddenMeta(defineResult.name, defineResult.meta, null);
    if (meta.dims) dims = meta.dims.map(v => Math.max(0.5, v));

    // 归一化：最大边长≈8 单位
    const maxDim = Math.max(dims[0], dims[1], dims[2]);
    const scale = 8 / maxDim;
    dims = dims.map(v => v * scale);

    defineModelCounter++;
    const name = '新建几何图形' + defineModelCounter;

    const geometry = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    const material = new THREE.MeshPhongMaterial({ color: 0x3498db });
    const mesh = new THREE.Mesh(geometry, material);
    const box = new THREE.Box3().setFromObject(mesh);
    const h = box.max.y - box.min.y;

    let px = (Math.random() - 0.5) * 4;
    let py = h / 2;
    let pz = (Math.random() - 0.5) * 4;
    if (meta.pos) {
        px = meta.pos[0];
        py = Math.max(h / 2, isFinite(meta.pos[1]) ? meta.pos[1] : h / 2);
        pz = meta.pos[2];
    }
    mesh.position.set(px, py, pz);

    scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    edgeLine.position.copy(mesh.position);
    scene.add(edgeLine);

    const model = {
        kind: 'model',
        mesh: mesh,
        edge: edgeLine,
        name: name,
        noteSprite: null,
        noteLine: null
    };
    definedModels.push(model);
    customGeometries.push(mesh);

    registerDefineButton(name);
    addModelNameLabel(model);
    selectModel(model);

    document.getElementById('define-preview').style.display = 'none';
    document.getElementById('define-result').innerHTML = '';
    alert('已生成「' + name + '」：' + dims[0].toFixed(1) + ' × ' + dims[1].toFixed(1) + ' × ' + dims[2].toFixed(1) + ' 单位。可拖动调整位置，或使用底部面板改大小/颜色/备注。');
    return model;
}

// 在选择器追加一个"新建几何图形N"按钮（位于金字塔之后）
function registerDefineButton(name) {
    const selector = document.querySelector('.geometry-selector');
    if (!selector) return;
    let btn = document.querySelector('.geometry-btn.defined-btn[data-name="' + name + '"]');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'geometry-btn defined-btn';
        btn.dataset.type = 'defined';
        btn.dataset.name = name;
        btn.textContent = name;
        selector.insertBefore(btn, selector.children[6] ? selector.children[6] : null);
        btn.addEventListener('click', function() {
            document.querySelectorAll('.geometry-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('sides-group').style.display = 'none';
        });
    }
}

/* ---------- 名称标签与备注浮层（复用卡片画布） ---------- */

function addModelNameLabel(model) {
    buildNoteCanvas({ text: model.name }, function(canvas) {
        if (!canvas) return;
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
        const s = 0.05;
        sprite.scale.set(canvas.width * s, canvas.height * s, 1);
        scene.add(sprite);
        model.nameSprite = sprite;
        updateModelNameLabel(model);
    });
}

function updateModelNameLabel(model) {
    if (!model.nameSprite) return;
    const box = new THREE.Box3().setFromObject(model.mesh);
    model.nameSprite.position.set(model.mesh.position.x, box.max.y + 1.5, model.mesh.position.z);
}

function modelHasNote(model) {
    const n = model.mesh.userData.note || {};
    return !!(n.text || n.image);
}

function updateModelNoteVisual(model, note) {
    buildNoteCanvas(note || {}, function(canvas) {
        if (!canvas) return;
        if (model.noteSprite) {
            scene.remove(model.noteSprite);
            if (model.noteSprite.material && model.noteSprite.material.map) model.noteSprite.material.map.dispose();
            model.noteSprite = null;
        }
        if (model.noteLine) {
            scene.remove(model.noteLine);
            model.noteLine = null;
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
        const s = 0.05;
        sprite.scale.set(canvas.width * s, canvas.height * s, 1);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x2980b9 }));
        scene.add(sprite);
        scene.add(line);
        model.noteSprite = sprite;
        model.noteLine = line;
        updateModelNotePosition(model);
    });
}

function updateModelNotePosition(model) {
    if (!model.noteSprite || !model.noteLine) return;
    const box = new THREE.Box3().setFromObject(model.mesh);
    const gap = Math.max(box.max.y - box.min.y, 1) + 1.5;
    model.noteSprite.position.set(model.mesh.position.x, box.max.y + gap, model.mesh.position.z);
    const pts = [
        new THREE.Vector3(model.mesh.position.x, box.max.y, model.mesh.position.z),
        new THREE.Vector3(model.mesh.position.x, box.max.y + gap * 0.6, model.mesh.position.z)
    ];
    model.noteLine.geometry.setFromPoints(pts);
}

function clearModelNote(model) {
    if (model.noteSprite) { scene.remove(model.noteSprite); model.noteSprite = null; }
    if (model.noteLine) { scene.remove(model.noteLine); model.noteLine = null; }
}

/* ---------- 选择 / 拖拽 / 编辑面板 ---------- */

function pickModelFromRay(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -((clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const meshes = definedModels.map(m => m.mesh);
    if (meshes.length === 0) return null;
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return null;
    return definedModels.find(m => m.mesh === hits[0].object) || null;
}

/* ---------- 通用编辑面板：自定义模型 / 标记模式小方块 共用 ---------- */

function round3(v) { return Math.round(v * 1000) / 1000; }

function markerUnit() {
    const u = parseFloat(document.getElementById('length-unit').value);
    return u > 0 ? u : 1;
}

// 打开面板（target: { kind, mesh, name, edge?, nameSprite? }）
function openEditor(target) {
    closeEditor();
    selectedModel = target;
    fillModelEditor(target);
    const el = document.getElementById('model-editor');
    el.style.display = 'block';
}

function closeEditor() {
    const el = document.getElementById('model-editor');
    if (el) el.style.display = 'none';
    selectedModel = null;
}

function deselectModel() { closeEditor(); }

// 标记模式：选中任意小方块 → 呼出同一个编辑面板
function selectMarkerCube(cube) {
    if (!cube) return;
    openEditor({ kind: 'cube', mesh: cube, name: '小方块', edge: null, nameSprite: null });
}

// 标记模式选择变化时同步面板：无选中/目标不在选中集则关闭，否则刷新数值
function syncMarkerEditorSelection() {
    if (!markerMode) return;
    if (!selectedModel || selectedModel.kind !== 'cube') {
        if (selectedCubes.length > 0) selectMarkerCube(selectedCubes[0]);
        return;
    }
    if (selectedCubes.indexOf(selectedModel.mesh) < 0) {
        if (selectedCubes.length > 0) selectMarkerCube(selectedCubes[0]);
        else closeEditor();
    } else {
        fillModelEditor(selectedModel);
    }
}

// 标记模式拖拽后同步面板坐标
function syncMarkerEditorPosition() {
    if (!selectedModel || selectedModel.kind !== 'cube') return;
    const el = document.getElementById('model-editor');
    if (!el || el.style.display === 'none') return;
    const p = selectedModel.mesh.position;
    document.getElementById('me-pos-x').value = round3(p.x);
    document.getElementById('me-pos-y').value = round3(p.y);
    document.getElementById('me-pos-z').value = round3(p.z);
}

// 删除单个小方块（面板"删除"按钮用）
function removeSingleCube(cube) {
    removeNoteVisual(cube);
    const i = smallCubes.indexOf(cube);
    if (i >= 0) smallCubes.splice(i, 1);
    const si = selectedCubes.indexOf(cube);
    if (si >= 0) selectedCubes.splice(si, 1);
    cubeGroup.remove(cube);
    if (cube.geometry) cube.geometry.dispose();
    if (cube.material && cube.material.dispose) cube.material.dispose();
    closeEditor();
    syncSelection();
    updateVolumeFromMarked();
}

function selectModel(model) { openEditor(model); }

function syncModelEditorPosition(model) {
    const el = document.getElementById('model-editor');
    if (!el || el.style.display === 'none') return;
    document.getElementById('me-pos-x').value = round3(model.mesh.position.x);
    document.getElementById('me-pos-y').value = round3(model.mesh.position.y);
    document.getElementById('me-pos-z').value = round3(model.mesh.position.z);
}

// 非标记模式下：点击自定义几何体 → 选择 + 拖拽移动
function handleModelPointerDown(event) {
    const ndc = eventToNDC(event);
    const model = pickModelFromRay(ndc.clientX, ndc.clientY);
    if (model) {
        event.stopPropagation();
        if (controls) controls.enabled = false;
        selectModel(model);
        modelDragActive = model;
        isDragging = true;
        dragStartClient = { x: ndc.clientX, y: ndc.clientY };
        dragStartState = [{ pos: model.mesh.position.clone() }];
    } else {
        deselectModel();
    }
}

function handleModelPointerMove(event) {
    if (!isDragging || !dragStartClient || !modelDragActive) return;
    const ndc = eventToNDC(event);
    const dx = ndc.clientX - dragStartClient.x;
    const dy = ndc.clientY - dragStartClient.y;
    if (Math.hypot(dx, dy) < 6) return;
    const wpp = computeWorldPerPixel(modelDragActive.mesh.position);
    modelDragActive.mesh.position.x = dragStartState[0].pos.x + dx * wpp.x;
    modelDragActive.mesh.position.y = Math.max(dragStartState[0].pos.y - dy * wpp.y, 0.05);
    modelDragActive.mesh.position.z = dragStartState[0].pos.z;
    syncModelEditorPosition(modelDragActive);
    updateModelNameLabel(modelDragActive);
    updateModelNotePosition(modelDragActive);
}

function handleModelPointerUp() {
    if (modelDragActive && modelDragActive.edge) {
        modelDragActive.edge.position.copy(modelDragActive.mesh.position);
    }
    modelDragActive = null;
}

function removeModel(model) {
    if (!model) return;
    clearModelNote(model);
    if (model.nameSprite) { scene.remove(model.nameSprite); model.nameSprite = null; }
    if (model.edge) { scene.remove(model.edge); if (model.edge.geometry) model.edge.geometry.dispose(); }
    scene.remove(model.mesh);
    if (model.mesh.geometry) model.mesh.geometry.dispose();
    if (model.mesh.material) model.mesh.material.dispose();
    const mi = definedModels.indexOf(model);
    if (mi >= 0) definedModels.splice(mi, 1);
    const ci = customGeometries.indexOf(model.mesh);
    if (ci >= 0) customGeometries.splice(ci, 1);
    const btn = document.querySelector('.geometry-btn.defined-btn[data-name="' + model.name + '"]');
    if (btn) btn.remove();
    if (selectedModel === model) deselectModel();
}

function fillModelEditor(target) {
    const mesh = target.mesh;
    document.getElementById('me-name').textContent = target.name;
    document.getElementById('me-pos-x').value = round3(mesh.position.x);
    document.getElementById('me-pos-y').value = round3(mesh.position.y);
    document.getElementById('me-pos-z').value = round3(mesh.position.z);
    if (target.kind === 'cube') {
        const u = markerUnit();
        document.getElementById('me-size-w').value = round3(mesh.scale.x * u);
        document.getElementById('me-size-h').value = round3(mesh.scale.y * u);
        document.getElementById('me-size-d').value = round3(mesh.scale.z * u);
        document.getElementById('me-tip').textContent = '小方块：可改坐标/尺寸/颜色/备注';
    } else {
        const box = mesh.geometry.parameters;
        document.getElementById('me-size-w').value = box.width;
        document.getElementById('me-size-h').value = box.height;
        document.getElementById('me-size-d').value = box.depth;
        document.getElementById('me-tip').textContent = '拖动模型可移动';
    }
    document.getElementById('me-color').value = '#' + mesh.material.color.getHexString();
}

function applyModelGeometry() {
    if (!selectedModel) return;
    const w = Math.max(0.1, parseFloat(document.getElementById('me-size-w').value) || 1);
    const h = Math.max(0.1, parseFloat(document.getElementById('me-size-h').value) || 1);
    const d = Math.max(0.1, parseFloat(document.getElementById('me-size-d').value) || 1);
    const mesh = selectedModel.mesh;

    // 标记模式小方块：按轴缩放（几何体是单位立方体，scale 表示单位数）
    if (selectedModel.kind === 'cube') {
        const u = markerUnit();
        mesh.scale.set(w / u, h / u, d / u);
        updateNotePosition(mesh);
        return;
    }

    // 记录旧底面高度，改大小后保持底部不漂移
    const oldBox = new THREE.Box3().setFromObject(mesh);
    const oldBottom = oldBox.min.y;

    const oldGeo = mesh.geometry;
    const newGeo = new THREE.BoxGeometry(w, h, d);
    mesh.geometry = newGeo;
    oldGeo.dispose();
    if (selectedModel.edge) {
        selectedModel.edge.geometry.dispose();
        selectedModel.edge.geometry = new THREE.EdgesGeometry(newGeo);
    }

    const newBox = new THREE.Box3().setFromObject(mesh);
    mesh.position.y += (oldBottom - newBox.min.y);
    updateModelNameLabel(selectedModel);
    updateModelNotePosition(selectedModel);
}

function bindDefineModelUI() {
    const input = document.getElementById('define-model-input');
    const btn = document.getElementById('define-model-btn');
    if (input) input.addEventListener('change', function() { handleDefineModelFile(this); });
    if (btn) btn.addEventListener('click', function() {
        if (defineImage) {
            defineModelFromImage();
        } else {
            input.click();
        }
    });

    const close = document.getElementById('me-close');
    if (close) close.addEventListener('click', deselectModel);

    const sync = function(e) {
        if (!selectedModel) return;
        const v = parseFloat(e.target.value);
        if (isNaN(v)) return;
        const axis = e.target.id.replace('me-pos-', '');
        selectedModel.mesh.position[axis] = v;
        if (axis === 'y') {
            selectedModel.mesh.position.y = Math.max(selectedModel.mesh.position.y, 0.05);
        }
        if (selectedModel.kind === 'cube') {
            updateNotePosition(selectedModel.mesh);
        } else {
            updateModelNameLabel(selectedModel);
            updateModelNotePosition(selectedModel);
        }
    };
    ['me-pos-x', 'me-pos-y', 'me-pos-z'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', sync);
    });
    ['me-size-w', 'me-size-h', 'me-size-d'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', function(e) { applyModelGeometry(); });
    });
    const color = document.getElementById('me-color');
    if (color) color.addEventListener('input', function() {
        if (!selectedModel) return;
        selectedModel.mesh.material.color.set(this.value);
        if (selectedModel.kind === 'cube') selectedModel.mesh.userData.userColor = this.value;
    });

    const meNote = document.getElementById('me-note');
    if (meNote) meNote.addEventListener('click', function() {
        if (!selectedModel) return;
        if (typeof openNoteFor === 'function') {
            openNoteFor(selectedModel.mesh);
            return;
        }
        currentNoteCube = selectedModel.mesh;
        const modal = document.getElementById('note-modal');
        const textarea = document.getElementById('note-text');
        const preview = document.getElementById('note-image-preview');
        const note = selectedModel.mesh.userData.note || {};
        textarea.value = note.text || '';
        if (note.image) {
            preview.src = note.image;
            preview.style.display = 'block';
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }
        document.getElementById('note-image-input').value = '';
        modal.style.display = 'flex';
    });

    const meDelete = document.getElementById('me-delete');
    if (meDelete) meDelete.addEventListener('click', function() {
        if (!selectedModel) return;
        if (selectedModel.kind === 'cube') {
            if (confirm('删除该小方块？')) removeSingleCube(selectedModel.mesh);
        } else if (confirm('删除「' + selectedModel.name + '」？')) {
            removeModel(selectedModel);
        }
    });
}

// 备注保存后同步到模型浮层（由 cubic.js 的 saveNote 调用）
function syncModelNoteAfterSave(mesh) {
    const model = definedModels.find(m => m.mesh === mesh);
    if (!model) return;
    const note = mesh.userData.note || {};
    if (note.text || note.image) {
        updateModelNoteVisual(model, note);
    } else {
        clearModelNote(model);
    }
}

bindDefineModelUI();