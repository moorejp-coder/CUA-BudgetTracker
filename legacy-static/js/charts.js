// Minimal dependency-free canvas charts (no external libraries needed).
const Charts = (() => {

  function clear(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setupHiDPI(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
    const cssHeight = Number(canvas.dataset.cssHeight) || canvas.clientHeight || 260;
    canvas.dataset.cssHeight = cssHeight;
    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    return { ctx, width: cssWidth, height: cssHeight };
  }

  function drawDonut(canvas, slices) {
    const { ctx, width, height } = setupHiDPI(canvas);
    clear(ctx, canvas);
    const total = slices.reduce((s, x) => s + x.value, 0);
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    const innerRadius = radius * 0.6;

    if (total <= 0) {
      ctx.fillStyle = "#9aa1ae";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No expense data for this month", cx, cy);
      return;
    }

    let angle = -Math.PI / 2;
    slices.forEach(slice => {
      const sliceAngle = (slice.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      angle += sliceAngle;
    });

    // punch inner hole for donut effect
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.querySelector(".panel")).backgroundColor || "#fff";
    ctx.fill();

    ctx.fillStyle = "#8b91a3";
    ctx.font = "600 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Total", cx, cy - 4);
    ctx.fillStyle = getComputedStyle(document.body).color;
    ctx.font = "700 15px sans-serif";
    ctx.fillText("$" + total.toFixed(0), cx, cy + 14);
  }

  function drawGroupedBars(canvas, labels, seriesA, seriesB, colorA, colorB) {
    const { ctx, width, height } = setupHiDPI(canvas);
    clear(ctx, canvas);

    const padding = { top: 10, right: 10, bottom: 26, left: 46 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(1, ...seriesA, ...seriesB);
    const niceMax = Math.ceil(maxVal / 100) * 100 || 100;

    // gridlines
    ctx.strokeStyle = "rgba(140,140,160,0.15)";
    ctx.fillStyle = "#8b91a3";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + chartH - (chartH * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText("$" + Math.round((niceMax * i) / steps), padding.left - 6, y + 4);
    }

    const groupCount = labels.length;
    const groupWidth = chartW / groupCount;
    const barWidth = Math.min(20, groupWidth * 0.3);

    labels.forEach((label, i) => {
      const groupX = padding.left + groupWidth * i + groupWidth / 2;
      const aH = (seriesA[i] / niceMax) * chartH;
      const bH = (seriesB[i] / niceMax) * chartH;

      ctx.fillStyle = colorA;
      ctx.fillRect(groupX - barWidth - 3, padding.top + chartH - aH, barWidth, aH);

      ctx.fillStyle = colorB;
      ctx.fillRect(groupX + 3, padding.top + chartH - bH, barWidth, bH);

      ctx.fillStyle = "#8b91a3";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, groupX, height - 8);
    });
  }

  return { drawDonut, drawGroupedBars };
})();
