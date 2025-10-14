// can you fix this code? it doesn't work properly and I don't know why not :( 
// Lemmy helper: attached to window so pages can call showLemmyMessage()
(function(){
  let box = null;
  let text = null;
  let lemmyImg = null;

  let messages = [];
  let currentLine = 0;
  let typing = false;
  let typingInterval = null;
  const DEFAULT_SPEED = 40;

  function ensureElements() {
    if (!box) box = document.getElementById('lemmy-message-box');
    if (!text) text = document.getElementById('lemmy-text');
    if (!lemmyImg) lemmyImg = document.getElementById('lemmy-img');
    return !!(box && text && lemmyImg);
  }

  function setImg(name) {
    try {
      if (!lemmyImg) return;
      // If provided name already contains a path, use it; else assume same folder
      lemmyImg.src = name;
    } catch (e) { /* ignore */ }
  }

  function typeLine(line, speed = DEFAULT_SPEED) {
    if (!ensureElements()) return;
    // If currently typing, finish immediately instead of ignoring
    if (typing) {
      finishCurrentLine();
      return;
    }
    typing = true;
    text.textContent = '';
    let i = 0;
    let talking = false;

    typingInterval = setInterval(() => {
      // safety: if line changed or element gone, stop
      if (!text) { clearInterval(typingInterval); typing = false; return; }
      text.textContent += line.charAt(i) || '';
      i++;
      talking = !talking;
      setImg(talking ? 'lemmy_yappin.png' : 'lemmy_happy.png');
      if (i >= line.length) {
        clearInterval(typingInterval);
        typingInterval = null;
        setImg('lemmy_idle.png');
        typing = false;
      }
    }, Math.max(10, speed));
  }

  function finishCurrentLine() {
    if (!ensureElements()) return;
    if (!typing) return;
    clearInterval(typingInterval);
    typingInterval = null;
    // fill the rest of the line
    const line = messages[currentLine] || '';
    text.textContent = line;
    setImg('lemmy_idle.png');
    typing = false;
  }

  function showLemmyMessage() {
    // Ensure DOM elements are available; if not, wait for DOMContentLoaded
    if (!ensureElements()) {
      document.addEventListener('DOMContentLoaded', () => {
        showLemmyMessage();
      }, { once: true });
      return;
    }

    const path = window.location.pathname || window.location.href;
    if (path.includes('index') || path === '/' || path.endsWith('index.html')) {
      messages = [
        "Hello! I'm Lemmy the Lemon!",
        "Looks like you're new to Lemonania.",
        "Someone ought to teach you how things work around here.",
        "To get started, click the account button at the top of the page."
      ];
    } else {
      messages = ["Hello from Lemmy!"];
    }
    currentLine = 0;
    // show box in case it was hidden
    box.classList.remove('hidden');
    typeLine(messages[currentLine]);
  }

  function nextLemmyLine() {
    if (!ensureElements()) return;
    // If typing, finish current line
    if (typing) { finishCurrentLine(); return; }
    currentLine++;
    if (currentLine < messages.length) {
      typeLine(messages[currentLine]);
    } else {
      // all lines done
      box.classList.add('hidden');
      setImg('lemmy_idle.png');
    }
  }

  // Attach click handlers so clicking the box advances or finishes typing
  document.addEventListener('DOMContentLoaded', () => {
    ensureElements();
    if (box) {
      box.addEventListener('click', () => {
        // click anywhere in the box finishes or advances
        if (typing) finishCurrentLine(); else nextLemmyLine();
      });
    }
  });

  // expose to global so index.html can call them
  window.showLemmyMessage = showLemmyMessage;
  window.nextLemmyLine = nextLemmyLine;
  window._lemmy_internal = { typeLine, finishCurrentLine };
})();