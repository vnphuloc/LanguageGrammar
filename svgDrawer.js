/**
 * svgDrawer.js - Handles drawing Bezier curves between HTML elements.
 */
class SvgDrawer {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        this.container = document.getElementById('matrixContainer');
    }

    clear() {
        // Keep the <defs> (arrowhead), remove only paths
        const paths = this.svg.querySelectorAll('path');
        paths.forEach(p => p.remove());
    }

    // Lấy toạ độ tâm của một element tương đối so với container
    getCenterCoordinates(element) {
        const containerRect = this.container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        return {
            x: elementRect.left - containerRect.left + (elementRect.width / 2),
            y: elementRect.top - containerRect.top + (elementRect.height / 2)
        };
    }

    drawConnection(el1, el2) {
        const pos1 = this.getCenterCoordinates(el1);
        const pos2 = this.getCenterCoordinates(el2);

        // Calculate Bezier control points to make beautiful curves
        const distanceY = Math.abs(pos2.y - pos1.y);
        const controlOffset = distanceY * 0.4; // Đường cong dựa vào khoảng cách trục Y

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        // M -> di chuyển đến điểm 1
        // C -> vẽ đường cong Bezier khối (C x1 y1, x2 y2, x y)
        const d = `
            M ${pos1.x} ${pos1.y} 
            C ${pos1.x} ${pos1.y + controlOffset}, 
              ${pos2.x} ${pos2.y - controlOffset}, 
              ${pos2.x} ${pos2.y}
        `;

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#005F73"); // Màu của primary-color
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-dasharray", "4,4"); // Nét đứt
        path.setAttribute("marker-end", "url(#arrowhead)");
        path.style.opacity = "0.7";

        this.svg.appendChild(path);
    }

    // Kết nối tất cả các phần tử trong 1 mảng theo thứ tự từ trên xuống (theo DOM)
    connectElements(elementsArray) {
        // Sort elements vertically just to be safe
        const sorted = elementsArray.sort((a, b) => {
            return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });

        for (let i = 0; i < sorted.length - 1; i++) {
            this.drawConnection(sorted[i], sorted[i+1]);
        }
    }
}

// Instantiate and attach to window
window.svgDrawer = new SvgDrawer('svgCanvas');