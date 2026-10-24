const API_URL = 'data/contexts.json';
let contextsData = [];
let currentActiveTag = null;
let resizeTimeout;

const selector = document.getElementById('context-selector');
const board = document.getElementById('grammar-board');
const boardWrapper = document.getElementById('board-wrapper');

const modalOverlay = document.getElementById('explanationModal');
const closeBtn = document.getElementById('closeModal');
const LANG_MAP = { 'en': 'English', 'vi': 'Tiếng Việt', 'zh': '中文', 'ja': '日本語' };
const LANG_TYPE = { 'en': 'SVO', 'vi': 'SVO', 'zh': 'S-Time-VO', 'ja': 'SOV' };

async function init() {
    try {
        const res = await fetch(API_URL);
        contextsData = await res.json();
        
        populateDropdown();
        
        selector.addEventListener('change', (e) => renderContext(e.target.value));
        if(contextsData.length > 0) {
            selector.value = contextsData[0].id;
            renderContext(contextsData[0].id);
        }

        closeBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if(e.target === modalOverlay) closeModal();
        });

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (currentActiveTag) window.svgDrawer.drawConnectionsForTag(currentActiveTag);
            }, 100);
        });
    } catch (error) {
        console.error("Lỗi tải JSON:", error);
        selector.innerHTML = '<option>Lỗi tải dữ liệu!</option>';
    }
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
            span.className = `block tag-${blockData.tagId}`;
            span.dataset.tag = blockData.tagId;
            span.dataset.lang = langKey;
            span.dataset.json = JSON.stringify(blockData);
            
            span.innerHTML = `<span class="block-label">[${blockData.label}]</span> ${blockData.text}`;
            
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
    const tagId = e.currentTarget.dataset.tag;
    currentActiveTag = tagId;
    
    boardWrapper.classList.add('board-hovering');
    document.querySelectorAll('.block').forEach(el => el.classList.remove('active'));
    
    const matchedBlocks = document.querySelectorAll(`.block[data-tag="${tagId}"]`);
    matchedBlocks.forEach(el => el.classList.add('active'));

    window.svgDrawer.drawConnectionsForTag(tagId);
}

function handleMouseLeave(e) {
    boardWrapper.classList.remove('board-hovering');
    document.querySelectorAll('.block').forEach(el => el.classList.remove('active'));
    window.svgDrawer.clearSVG();
    currentActiveTag = null;
}

function handleClick(e) {
    const target = e.currentTarget;
    const langCode = target.dataset.lang;
    const data = JSON.parse(target.dataset.json);

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

document.addEventListener('DOMContentLoaded', init);
