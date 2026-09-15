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

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    updateCube();

    animate();

    window.addEventListener('resize', onWindowResize);

    init2DFunctionCanvas();

    setupEventListeners();
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
    document.getElementById('length').addEventListener('input', updateCube);
    document.getElementById('width').addEventListener('input', updateCube);
    document.getElementById('height').addEventListener('input', updateCube);

    document.getElementById('length-unit').addEventListener('change', updateCube);
    document.getElementById('width-unit').addEventListener('change', updateCube);
    document.getElementById('height-unit').addEventListener('change', updateCube);

    document.getElementById('reset').addEventListener('click', function() {
        document.getElementById('length').value = 8;
        document.getElementById('width').value = 3;
        document.getElementById('height').value = 5;
        updateCube();
    });

    document.getElementById('clear').addEventListener('click', function() {
        document.getElementById('length').value = 1;
        document.getElementById('width').value = 1;
        document.getElementById('height').value = 1;
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
        const elem = document.getElementById('cube-container');
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    });

    document.getElementById('marker-mode').addEventListener('click', function() {
        markerMode = !markerMode;
        if (markerMode) {
            this.style.background = '#2c3e50';
            this.textContent = '退出标记';
        } else {
            this.style.background = '#f39c12';
            this.textContent = '标记模式';
        }
        updateCube();
    });

    document.getElementById('function-mode').addEventListener('click', function() {
        document.getElementById('function-modal').style.display = 'flex';
    });

    document.getElementById('developer-mode').addEventListener('click', function() {
        document.getElementById('developer-modal').style.display = 'flex';
    });

    document.getElementById('math-problems').addEventListener('click', function() {
        document.getElementById('math-problems-modal').style.display = 'flex';
    });

    document.getElementById('plot-3d').addEventListener('click', plotFunction3D);
    document.getElementById('plot-2d').addEventListener('click', plotFunction2D);

    document.getElementById('add-geometry').addEventListener('click', function() {
        const type = document.querySelector('.geometry-btn.active')?.dataset.type || 'sphere';
        const size = parseInt(document.getElementById('geo-size').value);
        const color = document.getElementById('geo-color').value;
        addGeometry(type, size, color);
    });

    document.querySelectorAll('.function-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('function-expression').value = this.dataset.func;
        });
    });

    document.querySelectorAll('.math-problem-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('length').value = this.dataset.length;
            document.getElementById('width').value = this.dataset.width;
            document.getElementById('height').value = this.dataset.height;
            updateCube();
            document.getElementById('math-problems-modal').style.display = 'none';
        });
    });

    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    document.querySelectorAll('.geometry-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.geometry-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    initAnnotationCanvas();
}

document.addEventListener('DOMContentLoaded', function() {
    init();
});