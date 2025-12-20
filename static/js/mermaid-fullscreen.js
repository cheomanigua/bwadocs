document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mermaid").forEach(diagram => {
    // Wrap diagram
    const wrapper = document.createElement("div");
    wrapper.className = "mermaid-wrapper";
    diagram.parentNode.insertBefore(wrapper, diagram);
    wrapper.appendChild(diagram);

    // Create button
    const btn = document.createElement("button");
    btn.className = "mermaid-fullscreen-btn";
    btn.innerHTML = "⛶";
    btn.title = "Fullscreen";

    btn.addEventListener("click", () => {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      }
    });

    wrapper.appendChild(btn);
  });
});

