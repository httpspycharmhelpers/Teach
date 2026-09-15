// 数学题目数据：去重 + 重新编号 + 支持小数 + 分难度
const MATH_PROBLEMS = [
    // ===== 基础 =====
    { level: 'base', first: 5, second: 4, third: 3, question: '一个长方体长5cm、宽4cm、高3cm，它的体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 10, second: 6, third: 8, question: '一个长方体长10cm、宽6cm、高8cm，它的体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 12, second: 12, third: 12, question: '一个正方体的棱长是12cm，它的体积是多少？', hint: 'V = 棱长×棱长×棱长' },
    { level: 'base', first: 15, second: 10, third: 5, question: '一个长方体长15cm、宽10cm、高5cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 3, second: 2, third: 2, question: '一个长方体长3cm、宽2cm、高2cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 7, second: 2, third: 2, question: '一个长方体长7cm、宽2cm、高2cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 4, second: 3, third: 4, question: '一个长方体长4cm、宽3cm、高4cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 6, second: 4, third: 3, question: '一个长方体长6cm、宽4cm、高3cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 8, second: 3, third: 2, question: '一个长方体长8cm、宽3cm、高2cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'base', first: 2.5, second: 2, third: 2, question: '一个长方体长2.5cm、宽2cm、高2cm，体积是多少？', hint: '注意小数，V = 长×宽×高' },
    { level: 'base', first: 1.5, second: 1.5, third: 1.5, question: '一个正方体的棱长是1.5cm，体积是多少？', hint: 'V = 1.5×1.5×1.5' },

    // ===== 进阶 =====
    { level: 'mid', first: 9, second: 6, third: 4, question: '一个长方体长9cm、宽6cm、高4cm，它的体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'mid', first: 15, second: 12, third: 8, question: '一个长方体长15cm、宽12cm、高8cm，体积、底面积和侧面积各是多少？', hint: '体积=长×宽×高；底面积=长×宽' },
    { level: 'mid', first: 20, second: 10, third: 6, question: '一个长方体长20cm、宽10cm、高6cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'mid', first: 16, second: 8, third: 5, question: '一个长方体长16cm、宽8cm、高5cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'mid', first: 25, second: 4, third: 4, question: '一个长方体长25cm、宽4cm、高4cm，体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'mid', first: 3.5, second: 3, third: 2, question: '一个长方体长3.5cm、宽3cm、高2cm，体积是多少？', hint: '小数乘法，V = 3.5×3×2' },
    { level: 'mid', first: 12, second: 2.5, third: 4, question: '一个长方体长12cm、宽2.5cm、高4cm，体积是多少？', hint: 'V = 12×2.5×4' },
    { level: 'mid', first: 20, second: 15, third: 12, question: '一个长方体长20cm、宽15cm、高12cm，可以分成多少个棱长1cm的小正方体？', hint: '体积是多少，就能分成多少个1立方厘米的小正方体' },
    { level: 'mid', first: 30, second: 20, third: 10, question: '一个长方体长30cm、宽20cm、高10cm，分成多少个小正方体（1cm小方块）？', hint: '总数 = 长×宽×高 个' },
    { level: 'mid', first: 8, second: 8, third: 8, question: '一个正方体棱长8cm，它的表面积和体积各是多少？', hint: 'S = 6×棱长²；V = 棱长³' },

    // ===== 挑战 =====
    { level: 'hard', first: 40, second: 30, third: 20, question: '一个长方体长40cm、宽30cm、高20cm，体积是多少？若每立方厘米重2.5克，总共多重？', hint: '先算体积，再×2.5' },
    { level: 'hard', first: 24, second: 12, third: 9, question: '一个长方体长24cm、宽12cm、高9cm，体积是多少立方厘米？合多少立方分米？', hint: '1000cm³ = 1dm³' },
    { level: 'hard', first: 32, second: 20, third: 16, question: '一个长方体长32cm、宽20cm、高16cm，体积是多少？能装下多少个棱长4cm的小正方体？', hint: '体积÷(4×4×4)' },
    { level: 'hard', first: 50, second: 30, third: 25, question: '一个水箱长50cm、宽30cm、高25cm，装满水有多少升？', hint: '1000cm³ = 1升' },
    { level: 'hard', first: 4.2, second: 3.5, third: 2.8, question: '一个长方体长4.2cm、宽3.5cm、高2.8cm，体积是多少？（精确到0.1cm³）', hint: 'V = 4.2×3.5×2.8' },
    { level: 'hard', first: 10, second: 10, third: 10, question: '一个正方体棱长10cm，体积是多少？如果熔成一个长方体，长25cm、高8cm，宽是多少？', hint: '体积不变：1000 = 25×宽×8' },
    { level: 'hard', first: 18, second: 12, third: 10, question: '一块长方体砖长18cm、宽12cm、高10cm，它的体积是多少？', hint: 'V = 长×宽×高' },
    { level: 'hard', first: 36, second: 36, third: 36, question: '一个正方体棱长36cm，体积是多少？', hint: 'V = 36³' }
];

function renderMathProblems(level) {
    const list = document.getElementById('math-problem-list');
    const problems = MATH_PROBLEMS.filter(p => p.level === (level || 'base'));
    list.innerHTML = '';

    problems.forEach((p, i) => {
        const btn = document.createElement('button');
        btn.className = 'math-problem-btn';
        btn.dataset.length = p.first;
        btn.dataset.width = p.second;
        btn.dataset.height = p.third;
        btn.dataset.answer = p.hint || '';
        btn.dataset.question = p.question;
        btn.textContent = '题目' + (i + 1) + ': ' + p.question;
        list.appendChild(btn);
    });

    document.getElementById('problem-answer').style.display = 'none';
}