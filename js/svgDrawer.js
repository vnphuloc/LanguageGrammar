class SvgDrawer {
    constructor(svgId, wrapperId) {
        this.svgCanvas = document.getElementById(svgId);
        this.boardWrapper = document.getElementById(wrapperId);
    }

    clearSVG() {
        const paths = this.svgCanvas.querySelectorAll('path:not([d="M 0 0 L 10 5 L 0 10 z"])');
        paths.forEach(p => p.remove());
    }

    createSVGPath(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--accent-color)');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('marker-end', 'url(#arrow)');
        path.classList.add('connector-path');
        
        this.svgCanvas.appendChild(path);
    }

    drawConnectionsForTag(tagId) {
        this.clearSVG();
        const activeBlocks = document.querySelectorAll(`.block.active`);
        if (activeBlocks.length < 2) return;

        const wrapperRect = this.boardWrapper.getBoundingClientRect();
        const blocksArray = Array.from(activeBlocks).sort((a, b) => 
            a.getBoundingClientRect().top - b.getBoundingClientRect().top
        );

        for (let i = 0; i < blocksArray.length - 1; i++) {
            const startBlock = blocksArray[i];
            const endBlock = blocksArray[i + 1];

            const startRect = startBlock.getBoundingClientRect();
            const endRect = endBlock.getBoundingClientRect();

            const startX = startRect.left + (startRect.width / 2) - wrapperRect.left;
            const startY = startRect.bottom - wrapperRect.top;

            const endX = endRect.left + (endRect.width / 2) - wrapperRect.left;
            const endY = endRect.top - wrapperRect.top;

            const diffX = endX - startX;
            const diffY = Math.abs(endY - startY);
            
            // Điểm uốn 1: Giữ hướng xuất phát dọc xuống để nét đứt rời khỏi khối gọn gàng
            const cp1x = startX;
            const cp1y = startY + (diffY * 0.4);
            
            // Điểm uốn 2: Trượt nhẹ theo trục X và Y để đường kẻ đi vào đích theo góc chéo
            const cp2x = endX - (diffX * 0.3);
            const cp2y = endY - (diffY * 0.3);

            this.createSVGPath(startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY);
        }
    }
}

window.svgDrawer = new SvgDrawer('svg-canvas', 'board-wrapper');
