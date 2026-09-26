(() => {
  const $ = (id) => document.getElementById(id);

  const DEFAULTS = {
    to: "bạn",
    msg: "Chúc bạn một mùa Giáng Sinh an lành, ấm áp bên gia đình và những người thân yêu. Năm mới thật nhiều niềm vui, sức khỏe và may mắn! 🎁",
    from: "",
  };

  /* ---------- Card data from URL ---------- */
  function readCard() {
    const p = new URLSearchParams(location.search);
    return {
      to: (p.get("to") || DEFAULTS.to).trim(),
      msg: (p.get("msg") || DEFAULTS.msg).trim(),
      from: (p.get("from") || DEFAULTS.from).trim(),
    };
  }

  function buildLink({ to, msg, from }) {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    if (to) url.searchParams.set("to", to);
    if (msg) url.searchParams.set("msg", msg);
    if (from) url.searchParams.set("from", from);
    return url.toString();
  }

  let card = readCard();

  /* ---------- Snow ---------- */
  const canvas = $("snow");
  const ctx = canvas.getContext("2d");
  let flakes = [];
  let W = 0, H = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(220, (W * H) / 7000));
    flakes = Array.from({ length: count }, () => newFlake(true));
  }

  function newFlake(anywhere) {
    const r = Math.random() * 2.6 + 0.8;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -10,
      r,
      vy: r * 0.35 + 0.3,
      phase: Math.random() * Math.PI * 2,
      sway: Math.random() * 0.6 + 0.2,
      o: Math.random() * 0.5 + 0.5,
    };
  }

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      f.y += f.vy;
      f.x += Math.sin(t / 1000 + f.phase) * f.sway * 0.5;
      if (f.y > H + 10) Object.assign(f, newFlake(false));
      ctx.globalAlpha = f.o;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(tick);

  /* ---------- Countdown ---------- */
  function updateCountdown() {
    const now = new Date();
    let xmas = new Date(now.getFullYear(), 11, 25);
    const el = $("countdown");
    if (now.getMonth() === 11 && now.getDate() === 25) {
      el.innerHTML = "🎅 <b>Hôm nay là Giáng Sinh!</b>";
      return;
    }
    if (now > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
    const s = Math.floor((xmas - now) / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    el.innerHTML = `🎄 Còn <b>${d}</b> ngày <b>${h}</b> giờ <b>${m}</b> phút <b>${sec}</b> giây nữa là Giáng Sinh`;
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------- Envelope → card ---------- */
  const envelope = $("envelope");
  const cardEl = $("card");
  const hint = $("hint");
  const replayBtn = $("replayBtn");
  let typingTimer = null;

  function fillCard() {
    $("toText").textContent = `Gửi ${card.to},`;
    $("fromText").textContent = card.from ? `— ${card.from}` : "";
    typeMessage(card.msg);
  }

  function typeMessage(text) {
    clearTimeout(typingTimer);
    const el = $("msgText");
    const chars = Array.from(text);
    let i = 0;
    const caret = document.createElement("span");
    caret.className = "caret";
    el.textContent = "";
    el.append(caret);
    const step = () => {
      caret.before(chars[i++]);
      if (i < chars.length) typingTimer = setTimeout(step, 35);
      else typingTimer = setTimeout(() => caret.remove(), 1200);
    };
    typingTimer = setTimeout(step, 400);
  }

  function openEnvelope() {
    if (envelope.classList.contains("open")) return;
    envelope.classList.add("open");
    hint.hidden = true;
    startMusic();
    setTimeout(() => envelope.classList.add("gone"), 1500);
    setTimeout(() => {
      envelope.hidden = true;
      cardEl.hidden = false;
      replayBtn.hidden = false;
      fillCard();
      burst();
    }, 2000);
  }

  function reset() {
    clearTimeout(typingTimer);
    cardEl.hidden = true;
    replayBtn.hidden = true;
    envelope.hidden = false;
    envelope.classList.remove("open", "gone");
    hint.hidden = false;
  }

  envelope.addEventListener("click", openEnvelope);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
  });
  replayBtn.addEventListener("click", reset);

  /* ---------- Sparkle burst when card appears ---------- */
  function burst() {
    const rect = cardEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + 80;
    const colors = ["#f4c95d", "#ff4d4d", "#4dd2ff", "#ff7ae0", "#ffffff"];
    const parts = Array.from({ length: 60 }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = Math.random() * 6 + 2;
      return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, c: colors[(Math.random() * colors.length) | 0] };
    });
    const layer = document.createElement("canvas");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:5";
    layer.width = W; layer.height = H;
    document.body.append(layer);
    const c = layer.getContext("2d");
    (function frame() {
      c.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.life -= 0.012;
        if (p.life <= 0) continue;
        alive = true;
        c.globalAlpha = p.life;
        c.fillStyle = p.c;
        c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
      }
      if (alive) requestAnimationFrame(frame); else layer.remove();
    })();
  }

  /* ---------- Music: Jingle Bells via Web Audio ---------- */
  const musicBtn = $("musicBtn");
  let audio = null;
  let musicOn = false;
  let loopTimer = null;

  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25 };
  // [note, beats]
  const SONG = [
    ["E4",1],["E4",1],["E4",2], ["E4",1],["E4",1],["E4",2],
    ["E4",1],["G4",1],["C4",1.5],["D4",.5],["E4",4],
    ["F4",1],["F4",1],["F4",1.5],["F4",.5], ["F4",1],["E4",1],["E4",1],["E4",.5],["E4",.5],
    ["E4",1],["D4",1],["D4",1],["E4",1], ["D4",2],["G4",2],
    ["E4",1],["E4",1],["E4",2], ["E4",1],["E4",1],["E4",2],
    ["E4",1],["G4",1],["C4",1.5],["D4",.5],["E4",4],
    ["F4",1],["F4",1],["F4",1.5],["F4",.5], ["F4",1],["E4",1],["E4",1],["E4",.5],["E4",.5],
    ["G4",1],["G4",1],["F4",1],["D4",1], ["C4",4],
  ];
  const BEAT = 0.26;

  function playSong() {
    if (!musicOn) return;
    let t = audio.currentTime + 0.1;
    for (const [n, beats] of SONG) {
      const dur = beats * BEAT;
      bell(N[n], t, dur);
      t += dur;
    }
    loopTimer = setTimeout(playSong, (t - audio.currentTime + 1.5) * 1000);
  }

  function bell(freq, t, dur) {
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.25) + 0.4);
    master.connect(audio.destination);
    // fundamental + a bright overtone for a bell-ish tone
    [[1, "sine", 1], [2, "sine", 0.3], [3.01, "triangle", 0.08]].forEach(([mult, type, amp]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq * mult;
      g.gain.value = amp;
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + Math.max(dur, 0.25) + 0.5);
    });
  }

  function startMusic() {
    if (musicOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
    } catch { return; }
    musicOn = true;
    musicBtn.textContent = "🔊 Nhạc";
    musicBtn.setAttribute("aria-pressed", "true");
    playSong();
  }

  function stopMusic() {
    musicOn = false;
    clearTimeout(loopTimer);
    musicBtn.textContent = "🔈 Nhạc";
    musicBtn.setAttribute("aria-pressed", "false");
    if (audio) audio.close().catch(() => {});
    audio = null;
  }

  musicBtn.addEventListener("click", () => (musicOn ? stopMusic() : startMusic()));

  /* ---------- Editor ---------- */
  const editor = $("editor");
  const inTo = $("inTo"), inMsg = $("inMsg"), inFrom = $("inFrom");
  const copied = $("copied");

  function formCard() {
    return {
      to: inTo.value.trim() || DEFAULTS.to,
      msg: inMsg.value.trim() || DEFAULTS.msg,
      from: inFrom.value.trim(),
    };
  }

  $("editBtn").addEventListener("click", () => {
    inTo.value = card.to === DEFAULTS.to ? "" : card.to;
    inMsg.value = card.msg === DEFAULTS.msg ? "" : card.msg;
    inFrom.value = card.from;
    copied.textContent = "";
    editor.showModal();
  });

  $("previewBtn").addEventListener("click", () => {
    card = formCard();
    try { history.replaceState(null, "", buildLink(card)); } catch {}
    editor.close();
    reset();
  });

  $("copyBtn").addEventListener("click", async () => {
    const link = buildLink(formCard());
    try {
      await navigator.clipboard.writeText(link);
      copied.textContent = "Đã sao chép! Gửi link này cho người thân nhé 💌";
    } catch {
      copied.textContent = link;
    }
  });
})();
