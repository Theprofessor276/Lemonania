// can you fix this code? it doesn't work properly and I don't know why not :( 
const box = document.getElementById('lemmy-message-box');
const text = document.getElementById('lemmy-text');
const lemmyImg = document.getElementById('lemmy-img');

let messages = [];
let currentLine = 0;
let typing = false;
let typingInterval;

function showLemmyMessage() {
  const path = window.location.pathname;

  if (path.includes("index") || path === "/") {
    messages = [
      "Hello! I'm Lemmy the Lemon!",
      "Looks like you're new to Lemonania.",
      "Someone ought to teach you how things work around here.",
      "To get started, click the account button at the top of the page."
    ];
  } else {
    messages = [
      "Error"
    ];
  }

  currentLine = 0;
  typeLine(messages[currentLine]);
}

function typeLine(line) {
  if (typing) return;
  typing = true;
  text.textContent = '';
  let i = 0;
  const speed = 40;
  let talking = false;

  typingInterval = setInterval(() => {
    text.textContent += line.charAt(i);
    i++;

    talking = !talking;
    lemmyImg.src = talking ? "lemmy_yappin.png" : "lemmy_happy.png";

    if (i >= line.length) {
      clearInterval(typingInterval);
      lemmyImg.src = "lemmy_idle.png";
      typing = false;
    }
  }, speed);
}

function nextLemmyLine() {
  if (typing) return;
  currentLine++;
  if (currentLine < messages.length) {
    typeLine(messages[currentLine]);
  } else {
    // all lines done
    box.classList.add('hidden');
    lemmyImg.src = "lemmy_idle.png";
  }
}