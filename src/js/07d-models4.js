/* ===================== Models and skins for the fourth wish list: planes and a parachute ===================== */
// Each plane is built a quarter of a block to a skin pixel (the passenger plane's long body and wings are a few boxes
// that share one picture). The front is +z.
function buildModels4() {
  // the propeller plane: red, with white wings, an open cockpit (a seat behind it for a friend) and a propeller
  defModel('plane', 'plane', 4 / 16, [
    { name: 'body', boxes: [
      [-2.5, 2, -10, 5, 5, 16, 0, 0],   // the body
      [-2, 2.5, 6, 4, 4, 2, 44, 0],   // the engine
      [-2, 7, 3, 4, 2, 1, 44, 7],   // the windscreen
      [2.5, 4.5, -1, 12, 1, 5, 0, 22], [-14.5, 4.5, -1, 12, 1, 5, 0, 22],   // the wings
      [-6, 5.5, -10, 12, 1, 3, 0, 29],   // the tail
      [-0.5, 7, -10, 1, 5, 3, 32, 29],   // the fin
      [-3.5, 0, 2, 1, 2, 2, 44, 12], [2.5, 0, 2, 1, 2, 2, 44, 12], [-0.5, 1, -9.5, 1, 1, 1, 52, 12],   // wheels
    ] },
    { name: 'prop', boxes: [[-5, 4, 8, 10, 1, 1, 0, 42], [-1, 3.5, 8.2, 2, 2, 1, 24, 42]], pivot: [0, 4.5, 8.5] },
  ]);
  // the jet: sleek and grey, with swept-back wings, a golden canopy and its engine at the back
  defModel('jet', 'jet', 4 / 16, [
    { name: 'body', boxes: [
      [-2, 2, -12, 4, 4, 20, 0, 0],   // the body
      [-1.5, 2.5, 8, 3, 3, 4, 48, 0],   // the pointed nose
      [-1.5, 6, 0, 3, 2, 5, 48, 8],   // the canopy
      [2, 3, -6, 6, 1, 8, 0, 25], [-8, 3, -6, 6, 1, 8, 0, 25], [8, 3, -7, 5, 1, 4, 28, 25], [-13, 3, -7, 5, 1, 4, 28, 25],   // the wings
      [-0.5, 6, -12, 1, 6, 4, 46, 25],   // the fin
      [-6, 3.5, -12, 12, 1, 3, 0, 35],   // the tail
      [-1.5, 2.5, -13, 3, 3, 1, 32, 35],   // the engine
      [-2.5, 0, 3, 1, 2, 2, 40, 35], [1.5, 0, 3, 1, 2, 2, 40, 35], [-0.5, 0, -8, 1, 2, 2, 40, 35],   // wheels
    ] },
  ]);
  // the passenger plane: a long white body with a row of windows, big wings with an engine under each, and a tall fin
  defModel('airliner', 'airliner', 4 / 16, [
    { name: 'body', boxes: [
      [-5, 2, -24, 10, 10, 16, 0, 0], [-5, 2, -8, 10, 10, 16, 0, 0], [-5, 2, 8, 10, 10, 16, 0, 0],   // the body
      [-4, 3, 24, 8, 8, 4, 0, 27],   // the nose (the pilot's windows)
      [-4, 4, -28, 8, 7, 4, 24, 27],   // the tail end
      [5, 4, -2, 14, 1, 10, 0, 40], [19, 4, -2, 14, 1, 10, 0, 40], [-19, 4, -2, 14, 1, 10, 0, 40], [-33, 4, -2, 14, 1, 10, 0, 40],   // the wings
      [0, 9, -28, 12, 1, 6, 0, 52], [-12, 9, -28, 12, 1, 6, 0, 52],   // the tail
    ] },
    { name: 'parts', skin: 'airliner2', boxes: [
      [-0.5, 12, -28, 1, 12, 8, 0, 0],   // the fin
      [9, 0.5, 2, 4, 4, 8, 20, 0], [-13, 0.5, 2, 4, 4, 8, 20, 0],   // the engines
      [-1, 0, 18, 2, 2, 2, 0, 22], [-4, 0, -6, 2, 2, 2, 0, 22], [2, 0, -6, 2, 2, 2, 0, 22],   // wheels
    ] },
  ]);
  // a parachute: a striped canopy on strings, above whoever is floating down
  defModel('parachute', 'parachute', 2 / 16, [{ name: 'c', boxes: [
    [-8, 20, -8, 16, 2, 16, 0, 0],
    [-7.5, 12, -7.5, 1, 8, 1, 0, 20], [6.5, 12, -7.5, 1, 8, 1, 0, 20], [-7.5, 12, 6.5, 1, 8, 1, 0, 20], [6.5, 12, 6.5, 1, 8, 1, 0, 20],
  ] }]);
}
function buildSkins4() {
  addSkin('plane', S => {
    const red = C('#d8302a'), redL = C('#f05a48'), redD = C('#a82018'), white = C('#f4f4f4');
    paintBox(S, 0, 0, 5, 5, 16, (f, x, y, fw, fh) => {
      if (f === 'top') return x === 2 && y > 6 && y < 12 ? C('#2a2a2a') : S.jit(redL, 4);   // (the cockpit opening)
      if (f === 'bottom') return redD;
      if ((f === 'left' || f === 'right') && y === 2) return white;   // a white stripe down each side
      if ((f === 'left' || f === 'right') && y === 1 && (x === 6 || x === 7 || x === 9)) return C('#1e1e1e');   // its number
      return S.jit(red, 4);
    });
    paintBox(S, 44, 0, 4, 4, 2, (f, x, y) => f === 'front' ? ((x + y) % 3 ? C('#3a3a3a') : C('#5a5a5a')) : C('#4a4a4a'));
    paintBox(S, 44, 7, 4, 2, 1, () => C('#bfe8ff'));
    paintBox(S, 0, 22, 12, 1, 5, (f, x, y, fw) => (f === 'top' || f === 'bottom') && (x === fw - 1 || x === 0) ? red : S.jit(white, 3));
    paintBox(S, 0, 29, 12, 1, 3, (f, x, y, fw) => (f === 'top' || f === 'bottom') && (x <= 1 || x >= fw - 2) ? red : S.jit(white, 3));
    paintBox(S, 32, 29, 1, 5, 3, (f, x, y) => y === 1 ? white : S.jit(red, 4));
    paintBox(S, 44, 12, 1, 2, 2, (f, x, y) => (f === 'left' || f === 'right') && x === 1 && y === 1 ? C('#c8c8c8') : C('#1a1a1a'));
    paintBox(S, 52, 12, 1, 1, 1, () => C('#1a1a1a'));
    paintBox(S, 0, 42, 10, 1, 1, (f, x, y, fw) => x === 0 || x === fw - 1 ? C('#f2d21e') : C('#5a4630'));
    paintBox(S, 24, 42, 2, 2, 1, () => C('#c8c8c8'));
  });
  addSkin('jet', S => {
    const g = C('#8e98a6'), gL = C('#b8c0cc'), gD = C('#5a6472');
    paintBox(S, 0, 0, 4, 4, 20, (f, x, y) => f === 'top' ? S.jit(gL, 4) : f === 'bottom' ? gD : (f === 'left' || f === 'right') && y === 1 && x > 3 && x < 8 ? C('#2a6ae0') : S.jit(g, 4));
    paintBox(S, 48, 0, 3, 3, 4, f => f === 'front' ? C('#2a2e36') : S.jit(gD, 4));
    paintBox(S, 48, 8, 3, 2, 5, (f, x, y) => f === 'bottom' ? gD : (x + y) % 4 === 0 ? C('#fff0a0') : C('#e8b030'));
    paintBox(S, 0, 25, 6, 1, 8, (f, x, y) => S.jit(f === 'bottom' ? gD : g, 4));
    paintBox(S, 28, 25, 5, 1, 4, (f, x, y, fw) => (f === 'top' && x === fw - 1) ? C('#e8402a') : S.jit(g, 4));
    paintBox(S, 46, 25, 1, 6, 4, (f, x, y) => y <= 1 ? C('#2a6ae0') : S.jit(g, 4));
    paintBox(S, 0, 35, 12, 1, 3, () => S.jit(g, 4));
    paintBox(S, 32, 35, 3, 3, 1, (f, x, y) => f === 'back' ? (x === 1 && y === 1 ? C('#ffb030') : C('#1a1a1a')) : gD);
    paintBox(S, 40, 35, 1, 2, 2, () => C('#1a1a1a'));
  });
  addSkin('airliner', S => {
    const white = C('#f4f4f4'), whiteD = C('#d8d8d8'), blue = C('#2a6ae0'), win = C('#3a5a80');
    paintBox(S, 0, 0, 10, 10, 16, (f, x, y) => {
      if (f === 'top') return S.jit(white, 3);
      if (f === 'bottom') return C('#b8bcc4');
      if (f === 'left' || f === 'right') {
        if (y === 3 && x % 2 === 0) return win;   // the windows
        if (y === 6) return blue;   // a stripe
        if (y >= 8) return whiteD;
      }
      return S.jit(white, 3);
    });
    paintBox(S, 0, 27, 8, 8, 4, (f, x, y, fw) => f === 'front' && y >= 1 && y <= 2 && x >= 1 && x <= fw - 2 && x !== 3 && x !== 4 ? C('#1e2a3a') : f === 'front' && y === 5 ? blue : y >= 6 ? whiteD : S.jit(white, 3));
    paintBox(S, 24, 27, 8, 7, 4, (f, x, y) => f === 'back' && y === 4 ? blue : S.jit(white, 3));
    paintBox(S, 0, 40, 14, 1, 10, (f, x, y) => f === 'bottom' ? C('#a8acb4') : (x + y) % 7 === 0 ? C('#b8bcc4') : S.jit(C('#d0d4da'), 3));
    paintBox(S, 0, 52, 12, 1, 6, () => S.jit(C('#d0d4da'), 3));
  });
  addSkin('airliner2', S => {
    const blue = C('#2a6ae0'), blueL = C('#5a8ef0');
    paintBox(S, 0, 0, 1, 12, 8, (f, x, y) => {
      if ((f === 'left' || f === 'right') && Math.abs(x - 4.5) + Math.abs(y - 5.5) < 2.2) return C('#f2d21e');   // a star
      return y < 2 ? blueL : S.jit(blue, 4);
    });
    paintBox(S, 20, 0, 4, 4, 8, (f, x, y) => f === 'front' ? (x >= 1 && x <= 2 && y >= 1 && y <= 2 ? C('#1a1a1a') : C('#c0c4cc')) : f === 'back' ? C('#4a4e56') : S.jit(C('#9aa0a8'), 4));
    paintBox(S, 0, 22, 2, 2, 2, () => C('#1a1a1a'));
  });
  addSkin('parachute', S => {
    const cols = [C('#e8402a'), C('#f4f4f4'), C('#2a6ae0'), C('#f4f4f4')];
    paintBox(S, 0, 0, 16, 2, 16, (f, x, y) => f === 'bottom' ? mulc(cols[(x >> 2) & 3], 0.8) : cols[(x >> 2) & 3]);
    paintBox(S, 0, 20, 1, 8, 1, () => C('#d8d8d8'));
  });
}
