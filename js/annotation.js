// 注释模块：标记模式下的小方块注释画布
function initAnnotationCanvas() {
    const canvas = document.getElementById('annotation-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTool = this.dataset.tool;
        });
    });

    function draw(e) {
        if (!isDrawing) return;

        if (currentTool === 'pen') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        } else if (currentTool === 'eraser') {
            ctx.clearRect(e.offsetX - 10, e.offsetY - 10, 20, 20);
        }

        [lastX, lastY] = [e.offsetX, e.offsetY];
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    document.getElementById('clear-annotation').addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById('save-annotation').addEventListener('click', function() {
        if (selectedCube) {
            const dataURL = canvas.toDataURL();

            const texture = new THREE.TextureLoader().load(dataURL);
            selectedCube.material.map = texture;
            selectedCube.material.needsUpdate = true;

            document.getElementById('annotation-modal').style.display = 'none';
        }
    });
}