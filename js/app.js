// 主应用模块：全局状态、场景初始化、事件绑定、启动入口
let scene, camera, renderer, controls;
let cube, cubeGroup, platform;
let length = 8, width = 3, height = 5;
let layerMode = false;
let currentLayer = 0;
let markerMode = false;
let functionMode = false;
let developerMode = false;
let smallCubes = [];
let selectedCube = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let functionMesh = null;
let customGeometries = [];
let functionCanvas2D = null;
let functionCtx2D = null;

// 调试面板开关：点击右下角“三个点”呼出/隐藏右上角悬浮面板
function initDebugPanel() {
    const dots = document.getElementById('debug-dots');
    const panel = document.querySelector('.controls');
    dots.addEventListener('click', function() {
        const open = panel.classList.toggle('show');
        this.classList.toggle('active', open);
    });
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(75,
        document.getElementById('cube-container').clientWidth /
        document.getElementById('cube-container').clientHeight,
        0.1, 10000);
    camera.position.set(10, 8, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
        document.getElementById('cube-container').clientWidth,
        document.getElementById('cube-container').clientHeight
    );
    document.getElementById('cube-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);

    createInfinitePlatform();
    createAxes();

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    updateCube();

    animate();

    window.addEventListener('resize', onWindowResize);

    init2DFunctionPanel();

    setupEventListeners();

    initDebugPanel();

    if (typeof setupSettingsPanel === 'function') setupSettingsPanel();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = document.getElementById('cube-container').clientWidth /
        document.getElementById('cube-container').clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(
        document.getElementById('cube-container').clientWidth,
        document.getElementById('cube-container').clientHeight
    );
}

function setupEventListeners() {
    document.getElementById('length').addEventListener('input', function() {
        document.getElementById('length-num').value = this.value;
        updateCube();
    });
    document.getElementById('length-num').addEventListener('change', function() {
        document.getElementById('length').value = this.value;
        updateCube();
    });

    document.getElementById('width').addEventListener('input', function() {
        document.getElementById('width-num').value = this.value;
        updateCube();
    });
    document.getElementById('width-num').addEventListener('change', function() {
        document.getElementById('width').value = this.value;
        updateCube();
    });

    document.getElementById('height').addEventListener('input', function() {
        document.getElementById('height-num').value = this.value;
        updateCube();
    });
    document.getElementById('height-num').addEventListener('change', function() {
        document.getElementById('height').value = this.value;
        updateCube();
    });

    document.getElementById('length-unit').addEventListener('change', updateCube);
    document.getElementById('width-unit').addEventListener('change', updateCube);
    document.getElementById('height-unit').addEventListener('change', updateCube);

    document.getElementById('reset').addEventListener('click', function() {
        document.getElementById('length').value = 8;
        document.getElementById('width').value = 3;
        document.getElementById('height').value = 5;
        document.getElementById('length-num').value = 8;
        document.getElementById('width-num').value = 3;
        document.getElementById('height-num').value = 5;
        updateCube();
    });

    document.getElementById('clear').addEventListener('click', function() {
        document.getElementById('length').value = 0.1;
        document.getElementById('width').value = 0.1;
        document.getElementById('height').value = 0.1;
        document.getElementById('length-num').value = 0.1;
        document.getElementById('width-num').value = 0.1;
        document.getElementById('height-num').value = 0.1;
        updateCube();
    });

    document.getElementById('layer-view').addEventListener('click', function() {
        layerMode = !layerMode;
        if (layerMode) {
            currentLayer = parseInt(document.getElementById('height').value);
            this.style.background = '#2c3e50';
            this.textContent = '整体';
        } else {
            this.style.background = '#9b59b6';
            this.textContent = '分层';
        }
        updateCube();
    });

    document.getElementById('fullscreen').addEventListener('click', function() {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) {
                el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            } else if (el.msRequestFullscreen) {
                el.msRequestFullscreen();
            }
            // 进入全屏后关闭调试面板，仅保留右下角“三个点”
            document.querySelector('.controls').classList.remove('show');
            document.getElementById('debug-dots').classList.remove('active');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            // 退出全屏时重新呼出调试面板，方便继续调整
            document.querySelector('.controls').classList.add('show');
            document.getElementById('debug-dots').classList.add('active');
        }
    });

    document.getElementById('marker-mode').addEventListener('click', function() {
        if (!markerMode) {
            this.style.background = '#2c3e50';
            this.textContent = '退出标记';
            setMarkerMode(true);
        } else {
            this.style.background = '#f39c12';
            this.textContent = '标记模式';
            setMarkerMode(false);
        }
        updateCube();
    });

    document.querySelectorAll('.marker-tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setMarkerTool(this.dataset.tool);
        });
    });

    document.getElementById('function-mode').addEventListener('click', function() {
        document.getElementById('function-modal').style.display = 'flex';
    });

    document.getElementById('developer-mode').addEventListener('click', function() {
        document.getElementById('developer-modal').style.display = 'flex';
    });

    document.getElementById('math-problems').addEventListener('click', function() {
        if (!document.getElementById('math-problem-list').hasChildNodes()) {
            renderMathProblems('base');
        }
        document.getElementById('math-problems-modal').style.display = 'flex';
    });

    document.getElementById('plot-3d').addEventListener('click', plotFunction3D);
    document.getElementById('plot-2d').addEventListener('click', plotFunction2D);
    document.getElementById('clear-function').addEventListener('click', clearFunction);

    document.getElementById('add-geometry').addEventListener('click', function() {
        const type = document.querySelector('.geometry-btn.active')?.dataset.type || 'box';
        const sz = {
            x: Math.max(parseFloat(document.getElementById('geo-size-x').value) || 1, 0.1),
            y: Math.max(parseFloat(document.getElementById('geo-size-y').value) || 1, 0.1),
            z: Math.max(parseFloat(document.getElementById('geo-size-z').value) || 1, 0.1)
        };
        const color = document.getElementById('geo-color').value;
        const pos = {
            x: parseFloat(document.getElementById('geo-pos-x').value),
            y: parseFloat(document.getElementById('geo-pos-y').value),
            z: parseFloat(document.getElementById('geo-pos-z').value)
        };
        const rotDeg = {
            x: parseFloat(document.getElementById('geo-rot-x').value) || 0,
            y: parseFloat(document.getElementById('geo-rot-y').value) || 0,
            z: parseFloat(document.getElementById('geo-rot-z').value) || 0
        };
        const sides = parseInt(document.getElementById('geo-sides').value) || 6;
        addGeometry(type, sz, color, pos, rotDeg, sides);
    });

    // 选择几何体类型时，仅对棱柱/棱锥显示边数滑块
    document.querySelectorAll('.geometry-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.geometry-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const showSides = this.dataset.type === 'prism' || this.dataset.type === 'pyramid';
            document.getElementById('sides-group').style.display = showSides ? 'block' : 'none';
        });
    });

    document.getElementById('geo-sides').addEventListener('input', function() {
        document.getElementById('geo-sides-value').textContent = this.value;
    });

    document.getElementById('clear-geometry').addEventListener('click', clearGeometries);

    document.querySelectorAll('.function-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('function-expression').value = this.dataset.func;
        });
    });

    document.querySelectorAll('.problem-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.problem-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderMathProblems(this.dataset.level);
        });
    });

    // 动态题目按钮事件委托
    document.getElementById('math-problem-list').addEventListener('click', function(e) {
        const btn = e.target.closest('.math-problem-btn');
        if (!btn) return;

        document.getElementById('length').value = btn.dataset.length;
        document.getElementById('width').value = btn.dataset.width;
        document.getElementById('height').value = btn.dataset.height;
        updateCube();

        // 显示答案
        const answerEl = document.getElementById('problem-answer');
        const x = parseFloat(btn.dataset.length);
        const y = parseFloat(btn.dataset.width);
        const z = parseFloat(btn.dataset.height);
        const volume = x * y * z;
        const volumeStr = volume.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
        const question = btn.dataset.question;
        answerEl.innerHTML =
            '<strong>题目：</strong>' + question + '<br>' +
            '<strong>思路：</strong>' + (btn.dataset.answer || 'V = 长×宽×高') + '<br>' +
            '<strong>答案：</strong>体积 = ' + volumeStr + ' 立方单位';
        answerEl.style.display = 'block';
        answerEl.classList.remove('problem-wrong');
        answerEl.classList.add('problem-correct');
    });

    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);

    // 编辑工具栏
    document.getElementById('note').addEventListener('click', debugPanelNote);

    // 标记工具栏
    document.getElementById('marker-select-confirm').addEventListener('click', confirmSelection);
    document.getElementById('marker-delete').addEventListener('click', deleteSelectedCube);
    document.getElementById('marker-note').addEventListener('click', onMarkerNote);
    document.getElementById('marker-clear').addEventListener('click', clearMarkedCubes);
    document.getElementById('marker-apply').addEventListener('click', applyMarkerSize);
    document.getElementById('marker-rotate-btn').addEventListener('click', rotateSelectedByAngle);
    document.getElementById('marker-notes-toggle').addEventListener('click', toggleNotes);

    // 备注模态窗口
    document.getElementById('note-save').addEventListener('click', saveNote);
    document.getElementById('note-cancel').addEventListener('click', function() {
        document.getElementById('note-modal').style.display = 'none';
        currentNoteCube = null;
    });
    document.getElementById('note-image-input').addEventListener('change', function() {
        handleNoteImage(this);
    });

    // 识别题目 → 定义模型（开发者模式内「添加/定义模型」，UI 绑定在 recognize.js）
    initAnnotationCanvas();
}

document.addEventListener('DOMContentLoaded', function() {
    init();
});