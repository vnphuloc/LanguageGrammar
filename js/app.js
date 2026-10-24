const DATA_SOURCES = {
    contexts: 'data/contexts.json',
    contexts2: 'data/contexts2.json'
};
const COLOR_STORAGE_KEY = 'syntax_matrix_colors';
const TIMELINE_DATA_URL = 'data/tenses_timeline.json';
const TRANSFORM_DATA_URL = 'data/verb_transformations.json';
const VERB_SAMPLES = [
    { id: 'code', label: 'code', base: 'code', thirdPerson: 'codes', past: 'coded', participle: 'coded', ing: 'coding' },
    { id: 'write', label: 'write', base: 'write', thirdPerson: 'writes', past: 'wrote', participle: 'written', ing: 'writing' },
    { id: 'study', label: 'study', base: 'study', thirdPerson: 'studies', past: 'studied', participle: 'studied', ing: 'studying' },
    { id: 'eat', label: 'eat', base: 'eat', thirdPerson: 'eats', past: 'ate', participle: 'eaten', ing: 'eating' },
    { id: 'go', label: 'go', base: 'go', thirdPerson: 'goes', past: 'went', participle: 'gone', ing: 'going' }
];
const DEFAULT_COLORS = {
    '--c-subj-bg': '#D0E1FD',
    '--c-subj-text': '#0D47A1',
    '--c-verb-bg': '#FAD2E1',
    '--c-verb-text': '#B71C1C',
    '--c-obj-bg': '#D8F3DC',
    '--c-obj-text': '#1B5E20',
    '--c-time-bg': '#FFF3BF',
    '--c-time-text': '#E65100',
    '--c-modal-bg': '#E2D6F8',
    '--c-modal-text': '#4A148C',
    '--c-aux-bg': '#FFE4E1',
    '--c-aux-text': '#8B0000'
};
let contextsData = [];
let activeDataSource = 'contexts';
let currentActiveTag = null;
let resizeTimeout;

const labelToggle = document.getElementById('labelToggle');
const selector = document.getElementById('context-selector');
const contextMenu = document.querySelector('.context-menu');
const contextMenuToggle = document.getElementById('context-menu-toggle');
const contextMenuOptions = document.querySelectorAll('.context-menu-option');
const board = document.getElementById('grammar-board');
const boardWrapper = document.getElementById('board-wrapper');

const modalOverlay = document.getElementById('explanationModal');
const closeBtn = document.getElementById('closeModal');
const LANG_MAP = { 'en': 'English', 'vi': 'Tiếng Việt', 'zh': '中文', 'ja': '日本語' };
const LANG_TYPE = { 'en': 'SVO', 'vi': 'SVO', 'zh': 'S-Time-VO', 'ja': 'SOV' };

// Settings Elements
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsPanel = document.getElementById('settingsPanel');
const dimSlider = document.getElementById('dimSlider');
const fontSlider = document.getElementById('fontSlider');
const phoneticToggle = document.getElementById('phoneticToggle');
const colorManagerModal = document.getElementById('colorManagerModal');
const openColorManagerBtn = document.getElementById('openColorManagerBtn');
const closeColorManagerBtn = document.getElementById('closeColorManagerBtn');
const resetColorsBtn = document.getElementById('resetColorsBtn');
const colorInputs = document.querySelectorAll('input[type="color"][data-css-var]');
const matrixView = document.getElementById('matrix-view');
const timelineView = document.getElementById('timeline-view');
const transformView = document.getElementById('transform-view');
const viewTabs = document.querySelectorAll('.view-tab');
const timelineRows = document.getElementById('timeline-rows');
const tenseDetailModal = document.getElementById('tenseDetailModal');
const closeTenseDetailBtn = document.getElementById('closeTenseDetailBtn');
let timelineData = [];
let transformData = [];
let selectedVerb = VERB_SAMPLES[0];
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches;
let currentView = 'matrix';
const helpModal = document.getElementById('helpModal');
const helpToggleBtn = document.getElementById('helpToggleBtn');
const closeHelpBtn = document.getElementById('closeHelpBtn');

async function init() {
    loadSavedColors();
    setupSettings();
    setupColorManager();
    setupViewToggle();
    setupGlobalEscKey();
    setupHelpModal();

    contextMenuToggle.addEventListener('click', () => {
        const isOpen = contextMenu.classList.toggle('open');
        contextMenuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    contextMenuOptions.forEach(option => {
        option.addEventListener('click', () => {
            loadDataSource(option.dataset.source);
            contextMenu.classList.remove('open');
            contextMenuToggle.setAttribute('aria-expanded', 'false');
        });
    });
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.remove('open');
            contextMenuToggle.setAttribute('aria-expanded', 'false');
        }
        const transformBoard = document.querySelector('.transform-board');
        if (isTouchDevice && !boardWrapper.contains(e.target) && !(transformBoard && transformBoard.contains(e.target))) {
            clearMatrixSelection();
            clearTransformHover();
        }
    });

    try {
        selector.addEventListener('change', (e) => renderContext(e.target.value));
        await loadDataSource(activeDataSource);

        closeBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if(e.target === modalOverlay) closeModal();
        });

        window.addEventListener('resize', redrawLinesOnLayoutChange);
        await loadTimelineData();
        await loadTransformData();
    } catch (error) {
        console.error("Lỗi tải JSON:", error);
        selector.innerHTML = '<option value="">Lỗi tải dữ liệu!</option>';
    }

    function setupViewToggle() {
        viewTabs.forEach(tab => {
            tab.addEventListener('click', () => switchView(tab.dataset.view));
        });
    }

    function switchView(viewName) {
        currentView = viewName;
        const timelineIsVisible = viewName === 'timeline';
        const transformIsVisible = viewName === 'transform';
        matrixView.classList.toggle('active', !timelineIsVisible && !transformIsVisible);
        timelineView.classList.toggle('active', timelineIsVisible);
        transformView.classList.toggle('active', transformIsVisible);
        matrixView.setAttribute('aria-hidden', String(timelineIsVisible || transformIsVisible));
        timelineView.setAttribute('aria-hidden', String(!timelineIsVisible));
        transformView.setAttribute('aria-hidden', String(!transformIsVisible));
        document.body.classList.toggle('timeline-active', timelineIsVisible);
        document.body.classList.toggle('transform-active', transformIsVisible);
        viewTabs.forEach(tab => {
            const isActive = tab.dataset.view === viewName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });
    }

    function setupGlobalEscKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeColorManager();
                closeTenseDetail();
                closeTransformDetail();
                closeHelpModal();
            }
        });
    }

    function setupHelpModal() {
        helpToggleBtn.addEventListener('click', openHelpModal);
        closeHelpBtn.addEventListener('click', closeHelpModal);
        helpModal.addEventListener('click', event => {
            if (event.target === helpModal) closeHelpModal();
        });
    }

    function openHelpModal() {
        const help = {
            matrix: {
                title: 'Hướng dẫn & Giải thích: Cấu trúc Trật tự Từ (Syntax)',
                body: '<p>Trật tự từ thay đổi vì mỗi ngôn ngữ ưu tiên một mô hình cú pháp khác nhau: tiếng Anh và tiếng Việt thường dùng <strong>SVO</strong>, tiếng Nhật dùng <strong>SOV</strong>, còn tiếng Trung thường đặt thời gian trước động từ theo mô hình <strong>S-Time-VO</strong>.</p><ul><li>Một số thành phần “mất đi” hoặc được thêm mới do ngữ pháp riêng: tiếng Nhật/Trung có thể cần trợ từ hoặc từ kết cấu như <code>は</code>, <code>を</code>, <code>的</code>; tiếng Anh biến đổi động từ; tiếng Việt dùng phó từ thời gian như <code>đã/đang/sắp</code>.</li><li><strong>Mẹo:</strong> Rê chuột hoặc chạm vào một từ để xem các vị trí tương ứng và đường nối giữa các ngôn ngữ.</li></ul>'
            },
            timeline: {
                title: 'Hướng dẫn & Giải thích: Trục Thời gian 12 Thì',
                body: '<p>Hệ thống 12 thì được tạo từ ma trận <strong>3 mốc thời gian</strong> (Quá khứ, Hiện tại, Tương lai) × <strong>4 thể</strong> (Đơn, Tiếp diễn, Hoàn thành, Hoàn thành tiếp diễn).</p><ul><li>Khối có mũi tên <code>clip-path</code> biểu thị hành động đang diễn ra liên tục; khối có vạch dừng <code>stop-marker</code> biểu thị hành động đã chấm dứt.</li><li><strong>Mẹo:</strong> Nhấn vào một thanh thì để xem cấu trúc khẳng định, phủ định, nghi vấn và ngữ cảnh đặc biệt.</li></ul>'
            },
            transform: {
                title: 'Hướng dẫn & Giải thích: Biến đổi Hình thái Động từ',
                body: '<p>Khi chọn một ô, hàng ngang và hàng dọc cùng sáng vì chúng trả lời hai câu hỏi khác nhau:</p><ul><li><strong>Hàng ngang (Thời gian):</strong> cùng một thể, ví dụ Continuous, cho thấy trợ động từ <code>to-be</code> đổi qua các thời điểm: <code>was/were → is/am/are → will be → would be</code>.</li><li><strong>Hàng dọc (Thể ngữ pháp):</strong> trong cùng một mốc thời gian, cho thấy động từ đi từ nguyên mẫu sang tiếp diễn, hoàn thành và hoàn thành tiếp diễn.</li><li>Chọn động từ mẫu như <code>code</code>, <code>write</code> hoặc <code>study</code> để xem ngay dạng chia thực tế.</li></ul>'
            }
        }[currentView];
        document.getElementById('helpModalTitle').textContent = help.title;
        document.getElementById('helpModalBody').innerHTML = help.body;
        helpModal.classList.add('active');
        helpModal.setAttribute('aria-hidden', 'false');
    }

    function closeHelpModal() {
        helpModal.classList.remove('active');
        helpModal.setAttribute('aria-hidden', 'true');
    }

    async function loadTransformData() {
        const response = await fetch(TRANSFORM_DATA_URL);
        if (!response.ok) {
            throw new Error(`Không thể tải ${TRANSFORM_DATA_URL}: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length !== 16) {
            throw new Error('Dữ liệu transformation phải chứa đúng 16 thì.');
        }
        transformData = data;
        setupTransformView();
        renderTransformMatrix();
    }

    function setupTransformView() {
        const verbSelector = document.getElementById('verb-selector');
        verbSelector.innerHTML = '';
        VERB_SAMPLES.forEach(verb => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'verb-choice';
            button.dataset.verbId = verb.id;
            button.textContent = verb.label;
            button.addEventListener('click', () => {
                selectedVerb = verb;
                verbSelector.querySelectorAll('.verb-choice').forEach(item => item.classList.toggle('active', item === button));
                renderTransformMatrix();
            });
            verbSelector.appendChild(button);
        });
        verbSelector.firstElementChild.classList.add('active');

        const transformDetailModal = document.getElementById('transformDetailModal');
        document.getElementById('closeTransformDetailBtn').addEventListener('click', closeTransformDetail);
        transformDetailModal.addEventListener('click', event => {
            if (event.target === transformDetailModal) closeTransformDetail();
        });
    }

    function getTransformedVerb(tense) {
        const verb = selectedVerb;
        const forms = {
            past_simple: `${verb.past} [V2]`,
            past_continuous: `was/were ${verb.ing} [V-ing]`,
            past_perfect: `had ${verb.participle} [V3]`,
            past_perfect_continuous: `had been ${verb.ing} [V-ing]`,
            present_simple: `${verb.base} / ${verb.thirdPerson} [V1]`,
            present_continuous: `is/am/are ${verb.ing} [V-ing]`,
            present_perfect: `have/has ${verb.participle} [V3]`,
            present_perfect_continuous: `have/has been ${verb.ing} [V-ing]`,
            future_simple: `will ${verb.base} [V1]`,
            future_continuous: `will be ${verb.ing} [V-ing]`,
            future_perfect: `will have ${verb.participle} [V3]`,
            future_perfect_continuous: `will have been ${verb.ing} [V-ing]`,
            future_in_past_simple: `would ${verb.base} [V1]`,
            future_in_past_continuous: `would be ${verb.ing} [V-ing]`,
            future_in_past_perfect: `would have ${verb.participle} [V3]`,
            future_in_past_perfect_continuous: `would have been ${verb.ing} [V-ing]`
        };
        return forms[tense.id] || '';
    }

    function renderTransformMatrix() {
        const grid = document.getElementById('transform-grid');
        grid.innerHTML = '';
        const timeOrder = ['past', 'present', 'future', 'future_in_past'];
        const timeLabels = {
            past: ['Past', 'Quá khứ'],
            present: ['Present', 'Hiện tại'],
            future: ['Future', 'Tương lai'],
            future_in_past: ['Future in the Past', 'Tương lai trong QK']
        };
        timeOrder.forEach((time, rowIndex) => {
            const label = document.createElement('div');
            label.className = 'transform-row-label';
            label.dataset.time = time;
            label.innerHTML = `${timeLabels[time][0]}<small>${timeLabels[time][1]}</small>`;
            grid.appendChild(label);
            transformData.filter(item => item.time === time).forEach((tense, colIndex) => {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'transform-cell';
                cell.dataset.row = String(rowIndex);
                cell.dataset.col = String(colIndex);
                cell.dataset.tenseId = tense.id;
                cell.dataset.time = time;
                cell.innerHTML = `<h3>${tense.title_en}</h3><span class="cell-vi">${tense.title_vi}</span><code class="transform-formula">${tense.formula}</code><strong class="transform-real-form">${formatTransformedVerb(getTransformedVerb(tense))}</strong><span class="usage-badge">Thông dụng: ${tense.ratings.daily.score}/10</span>`;
                cell.addEventListener('mouseenter', () => handleTransformHover(cell));
                cell.addEventListener('focus', () => handleTransformHover(cell));
                cell.addEventListener('mouseleave', clearTransformHover);
                cell.addEventListener('blur', clearTransformHover);
                cell.addEventListener('click', () => {
                    if (isTouchDevice && !cell.classList.contains('active')) {
                        handleTransformHover(cell);
                        cell.classList.add('active');
                        return;
                    }
                    openTransformDetail(tense);
                });
                grid.appendChild(cell);
            });
        });
    }

    function formatTransformedVerb(form) {
        return form.replace(/\[(V1|V2|V3|V-ing)\]/g, (_, badge) => `<span class="form-badge form-badge-${badge.toLowerCase().replace('-', '')}">${badge}</span>`);
    }

    function handleTransformHover(cell) {
        const grid = document.getElementById('transform-grid');
        grid.classList.add('has-hover');
        grid.querySelectorAll('.transform-cell').forEach(item => {
            item.classList.remove('active');
            item.classList.toggle('cross-active', item.dataset.row === cell.dataset.row || item.dataset.col === cell.dataset.col);
        });
        //drawTransformConnections(cell);
    }

    function clearTransformHover() {
        const grid = document.getElementById('transform-grid');
        grid.classList.remove('has-hover');
        grid.querySelectorAll('.transform-cell').forEach(item => item.classList.remove('cross-active'));
        document.getElementById('transform-connection-lines').innerHTML = '';
    }

    function drawTransformConnections(activeCell) {
        const boardElement = document.querySelector('.transform-board');
        const svg = document.getElementById('transform-connections');
        const lineGroup = document.getElementById('transform-connection-lines');
        const boardRect = boardElement.getBoundingClientRect();
        const cells = [...document.querySelectorAll('.transform-cell')];
        const points = cells.reduce((result, cell) => {
            const rect = cell.getBoundingClientRect();
            result[`${cell.dataset.row}-${cell.dataset.col}`] = {
                x: rect.left - boardRect.left + rect.width / 2,
                y: rect.top - boardRect.top + rect.height / 2
            };
            return result;
        }, {});
        svg.setAttribute('viewBox', `0 0 ${boardElement.clientWidth} ${boardElement.clientHeight}`);
        const rowPoints = [0, 1, 2, 3].map(col => points[`${activeCell.dataset.row}-${col}`]);
        const colPoints = [0, 1, 2, 3].map(row => points[`${row}-${activeCell.dataset.col}`]);
        lineGroup.innerHTML = [rowPoints, colPoints].map(pathPoints => {
            const path = pathPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
            return `<path d="${path}" />`;
        }).join('');
    }

    function openTransformDetail(tense) {
        clearTransformHover();
        const timeNames = { past: 'PAST', present: 'PRESENT', future: 'FUTURE', future_in_past: 'FUTURE IN THE PAST' };
        const aspectNames = { simple: 'SIMPLE', continuous: 'CONTINUOUS', perfect: 'PERFECT', perfect_continuous: 'PERFECT CONTINUOUS' };
        document.getElementById('transformDetailTime').textContent = timeNames[tense.time];
        document.getElementById('transformDetailAspect').textContent = aspectNames[tense.aspect];
        document.getElementById('transformDetailTitle').textContent = `${tense.title_en} · ${tense.title_vi}`;
        document.getElementById('transformDetailSummary').textContent = tense.summary;
        document.getElementById('transformDetailFormula').textContent = tense.formula;
        renderRating('daily', tense.ratings.daily);
        renderRating('writing', tense.ratings.writing);
        fillList('transformDetailExamples', tense.examples);
        document.getElementById('transformDetailModal').classList.add('active');
    }

    function renderRating(type, rating) {
        document.getElementById(`transform${type[0].toUpperCase() + type.slice(1)}Score`).textContent = `${rating.score}/${rating.max}`;
        document.getElementById(`transform${type[0].toUpperCase() + type.slice(1)}Bar`).style.width = `${(rating.score / rating.max) * 100}%`;
        document.getElementById(`transform${type[0].toUpperCase() + type.slice(1)}Comment`).textContent = rating.comment;
    }

    function closeTransformDetail() {
        document.getElementById('transformDetailModal').classList.remove('active');
    }

    async function loadTimelineData() {
        const response = await fetch(TIMELINE_DATA_URL);
        if (!response.ok) {
            throw new Error(`Không thể tải ${TIMELINE_DATA_URL}: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length !== 12) {
            throw new Error('Dữ liệu timeline phải chứa đúng 12 thì.');
        }
        timelineData = data;
        renderTimeline();
        setupTenseDetailModal();
    }

    function renderTimeline() {
        const groupOrder = ['simple', 'continuous', 'perfect', 'perfect_continuous'];
        timelineRows.innerHTML = '';
        groupOrder.forEach(groupName => {
            const tensesInGroup = timelineData.filter(tense => tense.group === groupName);
            const row = document.createElement('div');
            row.className = `timeline-row${groupName === 'perfect_continuous' ? ' timeline-row-perfect-continuous' : ''}`;
            const label = document.createElement('div');
            label.className = 'timeline-row-label';
            label.textContent = groupName.replace('_', ' ');
            const track = document.createElement('div');
            track.className = 'timeline-track';

            tensesInGroup.forEach(tense => {
                const bar = document.createElement('button');
                bar.type = 'button';
                const zone = tense.timeline_pos.zone || tense.category;
                bar.className = `tense-bar zone-${zone}`;
                if (tense.is_ongoing) {
                    bar.classList.add('is-ongoing');
                } else if (tense.has_stop_marker) {
                    bar.classList.add('has-stop-marker');
                }
                if (tense.vertical_offset) {
                    bar.classList.add(`shift-${tense.vertical_offset}`);
                }
                bar.dataset.tenseId = tense.id;
                bar.style.left = tense.timeline_pos.style_left;
                bar.style.width = tense.timeline_pos.style_width;
                bar.innerHTML = `<strong class="tense-title">${tense.name_en}</strong><span class="tense-sub">${tense.name_vi}</span>`;
                bar.addEventListener('mouseenter', handleTenseMouseEnter);
                bar.addEventListener('mouseleave', handleTenseMouseLeave);
                bar.addEventListener('focus', handleTenseMouseEnter);
                bar.addEventListener('blur', handleTenseMouseLeave);
                bar.addEventListener('click', () => openTenseDetail(tense));
                track.appendChild(bar);
            });
            row.appendChild(label);
            row.appendChild(track);
            timelineRows.appendChild(row);
        });
    }

    function handleTenseMouseEnter(e) {
        const activeBar = e.currentTarget;
        timelineRows.classList.add('has-active-tense');
        activeBar.classList.add('active');
    }

    function handleTenseMouseLeave(e) {
        e.currentTarget.classList.remove('active');
        if (!timelineRows.querySelector('.tense-bar:hover, .tense-bar:focus')) {
            timelineRows.classList.remove('has-active-tense');
        }
    }

    function setupTenseDetailModal() {
        closeTenseDetailBtn.addEventListener('click', closeTenseDetail);
        tenseDetailModal.addEventListener('click', e => {
            if (e.target === tenseDetailModal) closeTenseDetail();
        });
    }

    function openTenseDetail(tense) {
        const categoryNames = { past: 'PAST', present: 'PRESENT', future: 'FUTURE' };
        document.getElementById('tenseCategory').textContent = categoryNames[tense.category];
        document.getElementById('tenseEnglishName').textContent = tense.name_en;
        document.getElementById('tenseVietnameseName').textContent = tense.name_vi;
        document.getElementById('tenseSummary').textContent = tense.summary;

        const structures = document.getElementById('tenseStructures');
        structures.innerHTML = '';
        const structureNames = { normal_verb: 'Động từ thường', to_be: 'Động từ TO BE' };
        Object.entries(tense.structures).forEach(([key, values]) => {
            const group = document.createElement('div');
            group.className = 'structure-group';
            group.innerHTML = `<h4>${structureNames[key] || key}</h4>`;
            [['Khẳng định (+)', values.pos], ['Phủ định (-)', values.neg], ['Nghi vấn (?)', values.ques]]
                .forEach(([label, value]) => {
                    const line = document.createElement('p');
                    line.innerHTML = `<span>${label}</span><code>${value}</code>`;
                    group.appendChild(line);
                });
            structures.appendChild(group);
        });

        const signals = document.getElementById('tenseSignals');
        signals.innerHTML = '';
        tense.signals.forEach(signal => {
            const item = document.createElement('span');
            item.textContent = signal;
            signals.appendChild(item);
        });
        fillList('tenseSpecialUsages', tense.special_usages);
        fillList('tenseExamples', tense.examples);
        tenseDetailModal.classList.add('active');
    }

    function fillList(elementId, items) {
        const list = document.getElementById(elementId);
        list.innerHTML = '';
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });
    }

    function closeTenseDetail() {
        tenseDetailModal.classList.remove('active');
    }
}

function getNormalizedTagGroup(tagId) {
    const normalizedTagId = String(tagId || '').trim().toLowerCase();
    const groups = {
        subj: ['subj', 'subj1', 'subj2', 's', 's1', 's2', 'new s', 'by o'],
        verb: ['verb', 'verb1', 'verb2', 'v', 'v1', 'v2', 'v-ing', 'v-ed'],
        obj: ['obj', 'obj1', 'obj2', 'o', 'o1', 'o2', 'n'],
        time: ['time', 'place', 'adv'],
        modal: ['modal', 'comp', 'result', 'if', 'prep'],
        aux: ['aux', 'modifier', 'rel', 'participle']
    };

    for (const [group, tagVariants] of Object.entries(groups)) {
        if (tagVariants.includes(normalizedTagId)) return group;
    }

    return 'aux';
}

function setupColorManager() {
    openColorManagerBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
        colorManagerModal.classList.add('active');
    });
    closeColorManagerBtn.addEventListener('click', closeColorManager);
    colorManagerModal.addEventListener('click', (e) => {
        if (e.target === colorManagerModal) closeColorManager();
    });
    colorInputs.forEach(input => {
        input.addEventListener('input', () => {
            applyColorValue(input.dataset.cssVar, input.value);
            saveColors();
        });
    });
    resetColorsBtn.addEventListener('click', resetColors);
}

function closeColorManager() {
    colorManagerModal.classList.remove('active');
}

function applyColorValue(cssVariable, value) {
    if (!cssVariable || !/^#[0-9a-f]{6}$/i.test(value)) return;
    document.documentElement.style.setProperty(cssVariable, value);
}

function loadSavedColors() {
    let savedColors;
    try {
        savedColors = JSON.parse(localStorage.getItem(COLOR_STORAGE_KEY) || '{}');
    } catch (error) {
        console.error('Không thể đọc bảng màu đã lưu:', error);
        savedColors = {};
    }
    if (!savedColors || typeof savedColors !== 'object' || Array.isArray(savedColors)) {
        savedColors = {};
    }

    Object.entries(DEFAULT_COLORS).forEach(([cssVariable, defaultValue]) => {
        const color = savedColors[cssVariable] || defaultValue;
        applyColorValue(cssVariable, color);
        const input = document.querySelector(`input[data-css-var="${cssVariable}"]`);
        if (input) input.value = color;
    });
}

function saveColors() {
    const colors = {};
    colorInputs.forEach(input => {
        colors[input.dataset.cssVar] = input.value;
    });
    try {
        localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
    } catch (error) {
        console.error('Không thể lưu bảng màu:', error);
    }
}

function resetColors() {
    Object.entries(DEFAULT_COLORS).forEach(([cssVariable, defaultValue]) => {
        applyColorValue(cssVariable, defaultValue);
        const input = document.querySelector(`input[data-css-var="${cssVariable}"]`);
        if (input) input.value = defaultValue;
    });
    saveColors();
}

async function loadDataSource(sourceKey) {
    const dataUrl = DATA_SOURCES[sourceKey];
    if (!dataUrl) return;

    try {
        const res = await fetch(dataUrl);
        if (!res.ok) {
            throw new Error(`Không thể tải ${dataUrl}: ${res.status}`);
        }

        const nextContextsData = await res.json();
        if (!Array.isArray(nextContextsData)) {
            throw new Error(`Dữ liệu ${dataUrl} không có định dạng danh sách`);
        }

        activeDataSource = sourceKey;
        contextsData = nextContextsData;
        updateActiveTab();
        populateDropdown();

        if (contextsData.length > 0) {
            selector.value = contextsData[0].id;
            renderContext(contextsData[0].id);
        } else {
            renderContext(null);
        }
    } catch (error) {
        console.error("Lỗi tải JSON:", error);
        selector.innerHTML = '<option value="">Lỗi tải dữ liệu!</option>';
    }
}

function updateActiveTab() {
    contextMenuOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.source === activeDataSource);
    });
}

function setupSettings() {
    settingsToggleBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('active');
    });

    dimSlider.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--dim-opacity', e.target.value);
    });

    fontSlider.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--block-font-size', e.target.value + 'rem');
        redrawLinesOnLayoutChange();
    });

    phoneticToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            board.classList.add('show-phonetics');
        } else {
            board.classList.remove('show-phonetics');
        }
        redrawLinesOnLayoutChange();
    });
document.body.classList.toggle('show-labels', labelToggle.checked);

labelToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('show-labels', e.target.checked);
    redrawLinesOnLayoutChange();
});
}

function redrawLinesOnLayoutChange() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentActiveTag && matrixView.classList.contains('active')) {
            window.svgDrawer.drawConnectionsForTag(currentActiveTag);
        }
    }, 100);
}

function populateDropdown() {
    selector.innerHTML = '';
    contextsData.forEach(ctx => {
        const opt = document.createElement('option');
        opt.value = ctx.id;
        opt.textContent = ctx.title;
        selector.appendChild(opt);
    });
}

function renderContext(contextId) {
    window.svgDrawer.clearSVG();
    board.innerHTML = '';
    boardWrapper.classList.remove('board-hovering');
    currentActiveTag = null;

    const context = contextsData.find(c => c.id === contextId);
    if(!context) return;

    ['en', 'vi', 'zh', 'ja'].forEach(langKey => {
        const langBlocks = context.languages[langKey];
        if(!langBlocks) return;

        const row = document.createElement('div');
        row.className = `lang-row ${langKey === 'en' ? 'en-row' : ''}`;
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'lang-label';
        labelDiv.innerHTML = `${LANG_MAP[langKey]} <span class="badge">${LANG_TYPE[langKey]}</span>`;
        
        const blocksDiv = document.createElement('div');
        blocksDiv.className = 'sentence-blocks';

        langBlocks.forEach(blockData => {
            const span = document.createElement('span');
            const normalizedGroup = getNormalizedTagGroup(blockData.tagId);
            span.className = `block tag-${normalizedGroup}`;
            span.dataset.tag = blockData.tagId;
            span.dataset.lang = langKey;
            span.dataset.json = JSON.stringify(blockData);
            
            span.innerHTML = `
                    <span class="block-text">${blockData.text}</span>
                    <span class="block-label">[${blockData.label}]</span>
                ${blockData.phonetic ? `<span class="block-phonetic">${blockData.phonetic}</span>` : ''}
            `;
            
            span.addEventListener('mouseenter', handleMouseEnter);
            span.addEventListener('mouseleave', handleMouseLeave);
            span.addEventListener('click', handleClick);
            
            blocksDiv.appendChild(span);
        });

        row.appendChild(labelDiv);
        row.appendChild(blocksDiv);
        board.appendChild(row);
    });
}

function handleMouseEnter(e) {
    if (isTouchDevice) return;
    const tagId = e.currentTarget.dataset.tag;
    currentActiveTag = tagId;
    
    boardWrapper.classList.add('board-hovering');
    document.querySelectorAll('.block').forEach(el => el.classList.remove('active'));
    
    const matchedBlocks = document.querySelectorAll(`.block[data-tag="${tagId}"]`);
    matchedBlocks.forEach(el => el.classList.add('active'));

    window.svgDrawer.drawConnectionsForTag(tagId);
}

function handleMouseLeave(e) {
    if (isTouchDevice) return;
    clearMatrixSelection();
}

function clearMatrixSelection() {
    boardWrapper.classList.remove('board-hovering');
    document.querySelectorAll('.block').forEach(el => el.classList.remove('active'));
    window.svgDrawer.clearSVG();
    currentActiveTag = null;
}

function handleClick(e) {
    const target = e.currentTarget;
    if (isTouchDevice && !target.classList.contains('active')) {
        handleTouchMatrixSelection(target);
        return;
    }
    const langCode = target.dataset.lang;
    const data = JSON.parse(target.dataset.json);

    document.getElementById('modalLang').textContent = LANG_MAP[langCode];
    document.getElementById('modalTagLabel').textContent = `${data.label} (${data.tagId.toUpperCase()})`;
    document.getElementById('modalWord').textContent = data.text;
    document.getElementById('modalPhonetic').textContent = data.phonetic || '';
    document.getElementById('modalExplanation').textContent = data.explanation;

    modalOverlay.classList.add('active');
}

function handleTouchMatrixSelection(target) {
    const tagId = target.dataset.tag;
    currentActiveTag = tagId;
    boardWrapper.classList.add('board-hovering');
    document.querySelectorAll('.block').forEach(el => el.classList.toggle('active', el.dataset.tag === tagId));
    window.svgDrawer.drawConnectionsForTag(tagId);
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);