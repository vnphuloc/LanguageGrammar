/**
 * app.js - Logic for data loading, rendering, events, and modals
 */
const API_URL = 'data/contexts.json';
let contextsData = [];

// DOM Elements
const selectEl = document.getElementById('contextSelect');
const wrapperEl = document.getElementById('sentencesWrapper');
const modalOverlay = document.getElementById('explanationModal');
const closeBtn = document.getElementById('closeModal');

// Lang Maps cho UI hiển thị đẹp
const LANG_MAP = { 'en': 'English', 'vi': 'Tiếng Việt', 'zh': '中文', 'ja': '日本語' };

// Initialize App
async function init() {
    try {
        const res = await fetch(API_URL);
        contextsData = await res.json();
        
        populateDropdown();
        
        // Listen to select change
        selectEl.addEventListener('change', (e) => {
            renderContext(e.target.value);
        });

        // Chọn cái đầu tiên làm mặc định
        if(contextsData.length > 0) {
            selectEl.value = contextsData[0].id;
            renderContext(contextsData[0].id);
        }

        // Event for closing modal
        closeBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if(e.target === modalOverlay) closeModal();
        });

        // Vẽ lại SVG khi resize cửa sổ
        window.addEventListener('resize', () => {
            window.svgDrawer.clear();
            // Xóa highlight nếu đang resize để đỡ lỗi logic UI
            document.querySelectorAll('.word-block').forEach(b => {
                b.classList.remove('highlighted', 'faded');
            });
        });

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu json:", error);
        selectEl.innerHTML = '<option>Lỗi tải dữ liệu!</option>';
    }
}

function populateDropdown() {
    selectEl.innerHTML = '';
    contextsData.forEach(ctx => {
        const opt = document.createElement('option');
        opt.value = ctx.id;
        opt.textContent = ctx.title;
        selectEl.appendChild(opt);
    });
}

function renderContext(contextId) {
    // Clear cũ
    window.svgDrawer.clear();
    wrapperEl.innerHTML = '';

    const context = contextsData.find(c => c.id === contextId);
    if(!context) return;

    ['en', 'vi', 'zh', 'ja'].forEach(langKey => {
        const langData = context.languages[langKey];
        if(!langData) return;

        // Tạo dòng ngôn ngữ (Row)
        const row = document.createElement('div');
        row.className = 'lang-row';

        const label = document.createElement('div');
        label.className = 'lang-label';
        label.textContent = langKey;
        row.appendChild(label);

        const blocksContainer = document.createElement('div');
        blocksContainer.className = 'sentence-blocks';

        langData.forEach(block => {
            const blockEl = createWordBlock(block, langKey);
            blocksContainer.appendChild(blockEl);
        });

        row.appendChild(blocksContainer);
        wrapperEl.appendChild(row);
    });
}

function createWordBlock(data, langCode) {
    const el = document.createElement('div');
    el.className = 'word-block';
    el.setAttribute('data-tag', data.tagId);
    el.setAttribute('data-lang', langCode);
    
    // Store data in DOM for easy access in events
    el.dataset.json = JSON.stringify(data);

    el.innerHTML = `
        <span class="word-label">${data.label}</span>
        <span class="word-text">${data.text}</span>
        ${data.phonetic ? `<span class="word-phonetic">${data.phonetic}</span>` : ''}
    `;

    // Events
    el.addEventListener('mouseenter', handleHoverEnter);
    el.addEventListener('mouseleave', handleHoverLeave);
    el.addEventListener('click', handleClick);

    return el;
}

// === INTERACTION LOGIC ===

function handleHoverEnter(e) {
    const target = e.currentTarget;
    const tagId = target.getAttribute('data-tag');
    
    const allBlocks = document.querySelectorAll('.word-block');
    const matchedBlocks = [];

    // Fade tất cả, Highlight những cái cùng tagId
    allBlocks.forEach(b => {
        if(b.getAttribute('data-tag') === tagId) {
            b.classList.add('highlighted');
            matchedBlocks.push(b);
        } else {
            b.classList.add('faded');
        }
    });

    // Vẽ kết nối SVG
    window.svgDrawer.connectElements(matchedBlocks);
}

function handleHoverLeave(e) {
    const allBlocks = document.querySelectorAll('.word-block');
    allBlocks.forEach(b => {
        b.classList.remove('highlighted', 'faded');
    });
    window.svgDrawer.clear();
}

function handleClick(e) {
    const target = e.currentTarget;
    const langCode = target.getAttribute('data-lang');
    const data = JSON.parse(target.dataset.json);

    openModal(data, langCode);
}

// === MODAL LOGIC ===

function openModal(data, langCode) {
    document.getElementById('modalLang').textContent = LANG_MAP[langCode];
    document.getElementById('modalTagLabel').textContent = `${data.label} (${data.tagId.toUpperCase()})`;
    document.getElementById('modalWord').textContent = data.text;
    document.getElementById('modalPhonetic').textContent = data.phonetic || '';
    document.getElementById('modalExplanation').textContent = data.explanation;

    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Khởi động
document.addEventListener('DOMContentLoaded', init);
