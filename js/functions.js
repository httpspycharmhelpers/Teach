// 函数可视化模块：2D/3D 函数图像绘制
function plotFunction3D() {
    if (functionMesh) {
        scene.remove(functionMesh);
    }

    const expression = document.getElementById('function-expression').value;

    const geometry = new THREE.ParametricGeometry((u, v, target) => {
        const x = (u - 0.5) * 20;
        const z = (v - 0.5) * 20;

        try {
            const func = new Function('x', 'z', `return ${expression};`);
            const y = func(x, z);
            target.set(x, y, z);
        } catch (error) {
            console.error('函数计算错误:', error);
            target.set(x, 0, z);
        }
    }, 50, 50);

    const material = new THREE.MeshPhongMaterial({
        color: 0x9b59b6,
        side: THREE.DoubleSide,
        wireframe: false,
        transparent: true,
        opacity: 0.8
    });

    functionMesh = new THREE.Mesh(geometry, material);
    functionMesh.rotation.x = Math.PI / 2;
    scene.add(functionMesh);

    document.getElementById('function-modal').style.display = 'none';
}

function plotFunction2D() {
    const expression = document.getElementById('function-expression').value;

    try {
        functionCtx2D.clearRect(0, 0, functionCanvas2D.width, functionCanvas2D.height);

        functionCtx2D.strokeStyle = '#000';
        functionCtx2D.lineWidth = 1;

        functionCtx2D.beginPath();
        functionCtx2D.moveTo(0, functionCanvas2D.height / 2);
        functionCtx2D.lineTo(functionCanvas2D.width, functionCanvas2D.height / 2);
        functionCtx2D.stroke();

        functionCtx2D.beginPath();
        functionCtx2D.moveTo(functionCanvas2D.width / 2, 0);
        functionCtx2D.lineTo(functionCanvas2D.width / 2, functionCanvas2D.height);
        functionCtx2D.stroke();

        functionCtx2D.strokeStyle = '#3498db';
        functionCtx2D.lineWidth = 2;
        functionCtx2D.beginPath();

        const func = new Function('x', `return ${expression};`);
        const scale = 50;
        const step = 0.1;

        for (let x = -functionCanvas2D.width / (2 * scale); x < functionCanvas2D.width / (2 * scale); x += step) {
            try {
                const y = func(x);
                const pixelX = x * scale + functionCanvas2D.width / 2;
                const pixelY = functionCanvas2D.height / 2 - y * scale;

                if (x === -functionCanvas2D.width / (2 * scale)) {
                    functionCtx2D.moveTo(pixelX, pixelY);
                } else {
                    functionCtx2D.lineTo(pixelX, pixelY);
                }
            } catch (e) {
                console.error('函数计算错误:', e);
            }
        }

        functionCtx2D.stroke();

        functionCanvas2D.style.display = 'block';

    } catch (error) {
        console.error('绘制2D函数错误:', error);
        alert('无法绘制函数，请检查函数表达式是否正确。');
    }

    document.getElementById('function-modal').style.display = 'none';
}

// 初始化2D函数画布
function init2DFunctionCanvas() {
    functionCanvas2D = document.createElement('canvas');
    functionCanvas2D.width = 600;
    functionCanvas2D.height = 400;
    functionCanvas2D.style.position = 'absolute';
    functionCanvas2D.style.top = '100px';
    functionCanvas2D.style.left = '50%';
    functionCanvas2D.style.transform = 'translateX(-50%)';
    functionCanvas2D.style.backgroundColor = 'white';
    functionCanvas2D.style.border = '1px solid #ccc';
    functionCanvas2D.style.borderRadius = '8px';
    functionCanvas2D.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    functionCanvas2D.style.zIndex = '100';
    functionCanvas2D.style.display = 'none';

    document.body.appendChild(functionCanvas2D);
    functionCtx2D = functionCanvas2D.getContext('2d');

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭2D视图';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '70px';
    closeBtn.style.left = '50%';
    closeBtn.style.transform = 'translateX(-50%)';
    closeBtn.style.zIndex = '101';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.backgroundColor = '#e74c3c';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';

    closeBtn.addEventListener('click', function() {
        functionCanvas2D.style.display = 'none';
        this.style.display = 'none';
    });

    document.body.appendChild(closeBtn);
}