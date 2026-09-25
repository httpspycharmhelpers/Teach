// 函数可视化模块：2D/3D 函数图像绘制（2D 固定面板 + 人性网格 + 可拖拽）

// =================== 人性化表达式 → 标准 JS ===================
// 支持：2^n / 2ⁿ / sin(x) / π / √ 、隐式乘法 2x、(x+1)(x-1) 等
const SUP_DIGITS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n' };

function normalizeExpr(raw) {
    let e = String(raw == null ? '' : raw).trim();
    if (!e) return e;

    // 符号别名
    e = e.replace(/÷/g, '/').replace(/×/g, '*').replace(/[−－]/g, '-');
    // 科学计数法：1e-3 → 1*10**(-3)（避免误当常量 e）
    e = e.replace(/([0-9](?:\.[0-9]+)?)[eE]([+-]?\d+(?:\.\d+)?)/g, '$1*10**($2)');
    // 上标幂：2ⁿ、x²、2²ⁿ → 2**n、x**2、2**2**n
    e = e.replace(/([0-9a-zA-Z_)\]])[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/gu, (m, base) => {
        let d = '';
        for (const ch of m.slice(base.length)) d += SUP_DIGITS[ch];
        return base + '**' + d;
    });
    // 脱字符：2^n → 2**n
    e = e.replace(/\^/g, '**');
    // π（先于 pi 别名，避免 Math.PI 被二次替换）；单独 π 或 π 与字母/数字相邻都算乘积
    e = e.replace(/π([a-zA-Z0-9_])/g, 'Math.PI*$1').replace(/π/g, 'Math.PI');
    // 无穷
    e = e.replace(/∞/g, 'Infinity');
    // 平方根：√x、√(..)
    e = e.replace(/√\(/g, 'Math.sqrt(').replace(/√([0-9a-zA-Z_.]+)/g, 'Math.sqrt($1)');
    // 隐式乘法：2x、2(x+1)、(x+1)(x-1)、2sin(x)…
    e = e.replace(/([\d\]\)])([a-zA-Z_(])/g, '$1*$2').replace(/\)([a-zA-Z_])/g, ')*$1');
    // 常量：pi、e（单独出现，避开变量名、Math.* 与科学计数法）
    e = e.replace(/(^|[^A-Za-z0-9_.])pi(?![A-Za-z0-9_.])/gi, '$1Math.PI');
    e = e.replace(/(^|[^A-Za-z0-9_.])e(?![A-Za-z0-9_.])/g, '$1Math.E');
    // ln 与常用函数自动补 Math. 前缀
    e = e.replace(/(^|[^A-Za-z0-9_.])ln\s*\(/g, '$1Math.log(');
    e = e.replace(/(^|[^A-Za-z0-9_.])(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|sqrt|abs|exp|floor|ceil|round|pow|min|max|sign)\s*\(/g, '$1Math.$2(');
    // ** 统一转成 Math.pow，避免 -x^2 触发"一元负号在幂前"的语法错误
    e = convertPowToFunc(e);
    return e;
}

// 把 a**b 转成 Math.pow(a, b)：从右往左处理（右结合），支持 2^-3、(x+1)^2、x**2**3
function convertPowToFunc(e) {
    let changed = true;
    while (changed) {
        changed = false;
        const idx = e.lastIndexOf('**');
        if (idx < 0) break;
        const expRe = /^(Math\.\w+\([^()]*\)|\([^()]*\)|-?[A-Za-z0-9_.]+)/;
        const em = e.slice(idx + 2).match(expRe);
        if (!em) break;
        const baseRe = /(Math\.\w+\([^()]*\)|\([^()]*\)|[A-Za-z0-9_.]+)$/;
        const bm = e.slice(0, idx).match(baseRe);
        if (!bm) break;
        const be = idx - bm[0].length;
        e = e.slice(0, be) + 'Math.pow(' + bm[0] + ', ' + em[0] + ')' + e.slice(idx + 2 + em[0].length);
        changed = true;
    }
    return e;
}

// 把标准化后的表达式转成易读的 y = 标题
function displayExpr(e) {
    let s = String(e || '');
    s = s.replace(/Math\.pow\(\(([^()]*)\),\s*\(?([^)]*)\)?\)/g, '($1)^($2)');
    s = s.replace(/Math\.pow\(([^,]+),\s*\(?([^)]*)\)?\)/g, '$1^($2)');
    return s.replace(/\*\*/g, '^').replace(/\*/g, '·');
}

// =================== 3D 曲面 ===================
function plotFunction3D() {
    const prevNote = (functionMesh && functionMesh.userData && functionMesh.userData.note) ? functionMesh.userData.note : null;
    const prevSelected = typeof noteSelection !== 'undefined' && !!functionMesh && noteSelection === functionMesh;
    if (functionMesh) {
        if (typeof removeAnyNoteVisual === 'function') removeAnyNoteVisual(functionMesh);
        scene.remove(functionMesh);
    }

    const expression = normalizeExpr(document.getElementById('function-expression').value);

    const geometry = new THREE.ParametricGeometry((u, v, target) => {
        const x = (u - 0.5) * 20;
        const z = (v - 0.5) * 20;

        try {
            const func = new Function('x', 'z', 'n', 'return ' + expression + ';');
            const y = func(x, z, x);
            target.set(x, isFinite(y) ? y : 0, z);
        } catch (error) {
            console.error('3D 函数计算错误:', error);
            target.set(x, 0, z);
        }
    }, 50, 50);

    const material = new THREE.MeshPhongMaterial({
        color: 0x9b59b6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    functionMesh = new THREE.Mesh(geometry, material);
    functionMesh.rotation.x = Math.PI / 2;
    scene.add(functionMesh);

    // 曲线重绘后保留先前挂的备注
    if (prevNote && (prevNote.text || prevNote.image)) {
        functionMesh.userData.note = prevNote;
        if (typeof ensureAnyNoteVisual === 'function') ensureAnyNoteVisual(functionMesh, prevNote);
    }
    // 若函数3D正被点选（备注目标），选中态转到新曲面
    if (prevSelected) {
        noteSelection = functionMesh;
        if (typeof setObjHighlight === 'function') setObjHighlight(functionMesh, true);
    }
}

// =================== 2D 曲面（人性化坐标系） ===================
function plotFunction2D() {
    var panel = document.getElementById('plot2d-panel');
    var canvas = document.getElementById('plot2d-canvas');
    if (!panel || !canvas) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var expression = normalizeExpr(document.getElementById('function-expression').value);

    // 2D 只看 x 方向，z 固定为 0
    var func;
    try {
        func = new Function('x', 'z', 'n', 'return ' + expression + ';');
    } catch (e) {
        alert('函数表达式语法错误：' + e.message);
        return;
    }

    // 绘图范围
    var xMin = -10, xMax = 10, scale = 25;
    var pad = 60; // 轴文字空间

    // 预算 y 范围（采样找 min/max）
    var yVals = [];
    for (var x = xMin; x <= xMax; x += 0.2) {
        var y;
        try { y = func(x, 0, x); } catch (err) { continue; }
        if (isFinite(y) && Math.abs(y) < 1e6) yVals.push(y);
    }
    var yMinV = Math.min.apply(null, yVals);
    var yMaxV = Math.max.apply(null, yVals);
    var yPad = (yMaxV - yMinV) * 0.12 || 1;
    var yMin = yMinV - yPad;
    var yMax = yMaxV + yPad;
    // 自动缩放 scale
    scale = Math.min((W - pad * 2) / (xMax - xMin), (H - pad * 2) / (yMax - yMin));
    scale = Math.min(scale, 60); // cap

    var cx = W / 2, cy = H / 2; // 画布中心

    function toPixelX(x) { return cx + x * scale; }
    function toPixelY(y) { return cy - y * scale; }

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 网格
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    for (var gx = Math.ceil(xMin); gx <= Math.floor(xMax); gx++) {
        var px = toPixelX(gx);
        ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
    }
    for (var gy = Math.ceil(yMin); gy <= Math.floor(yMax); gy++) {
        var py = toPixelY(gy);
        ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
    }

    // 坐标轴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pad, toPixelY(0)); ctx.lineTo(W - pad, toPixelY(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toPixelX(0), pad); ctx.lineTo(toPixelX(0), H - pad); ctx.stroke();

    // 刻度数字
    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (var gx = Math.ceil(xMin); gx <= Math.floor(xMax); gx++) {
        if (gx === 0) continue;
        ctx.fillText(gx, toPixelX(gx), toPixelY(0) + 15);
    }
    ctx.textAlign = 'right';
    for (var gy = Math.ceil(yMin); gy <= Math.floor(yMax); gy++) {
        if (gy === 0) continue;
        ctx.fillText(gy, toPixelX(0) - 6, toPixelY(gy) + 4);
    }

    // 轴标签
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x', W - pad + 18, toPixelY(0) + 4);
    ctx.textAlign = 'center';
    ctx.fillText('y', toPixelX(0), pad - 10);

    // 函数曲线
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var started = false;
    for (var x = xMin; x <= xMax; x += 0.05) {
        var y;
        try { y = func(x, 0, x); } catch (err) { continue; }
        if (!isFinite(y) || Math.abs(y) > 1e6) { started = false; continue; }
        var px = toPixelX(x), py = toPixelY(y);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 公式标题
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'italic 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('y = ' + displayExpr(expression), pad + 4, pad - 4);

    // 显示面板
    panel.style.display = 'block';
}

// =================== 初始化 2D 面板（固定位置 + 拖拽） ===================
function init2DFunctionPanel() {
    var panel = document.getElementById('plot2d-panel');
    var header = panel.querySelector('.plot2d-header');
    var closeBtn = panel.querySelector('.plot2d-close');
    if (!panel || !header || !closeBtn) return;

    // 默认位置：右下角
    panel.style.position = 'fixed';
    panel.style.right = '20px';
    panel.style.bottom = '20px';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.transform = '';

    // 关闭按钮
    closeBtn.addEventListener('click', function () {
        panel.style.display = 'none';
    });

    // 拖拽
    var dragging = false, startX, startY, origLeft, origTop;
    header.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        dragging = true;
        header.setPointerCapture(e.pointerId);
        // 从 right/bottom 转成 left/top 以支持拖拽
        var rect = panel.getBoundingClientRect();
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.right = '';
        panel.style.bottom = '';
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left;
        origTop = rect.top;
    });
    header.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        panel.style.left = (origLeft + e.clientX - startX) + 'px';
        panel.style.top = (origTop + e.clientY - startY) + 'px';
    });
    header.addEventListener('pointerup', function () {
        dragging = false;
    });

    // 不让面板被其他点击关掉（阻止冒泡）
    panel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
}

function clearFunction() {
    if (functionMesh) {
        if (typeof removeAnyNoteVisual === 'function') removeAnyNoteVisual(functionMesh);
        // 若正选中的是函数3D，取消了它的选中态
        if (typeof noteSelection !== 'undefined' && noteSelection === functionMesh && typeof clearNoteSelection === 'function') {
            clearNoteSelection();
        }
        scene.remove(functionMesh);
        functionMesh = null;
    }
    document.getElementById('plot2d-panel').style.display = 'none';
}