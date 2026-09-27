const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, Uint8Array, Int32Array, Float32Array, Int16Array, Array, Object, String };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/js/01-blocks.js', 'utf8') + '\n;this.B=B;this.I=I;this.genProps=genProps;', ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/js/02-gen.js', 'utf8') + '\n;this.genModule=genModule;', ctx);
const B = ctx.B;
const G = ctx.genModule(B, ctx.genProps());
const COL = {};
const c = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
COL[B.GRASS]=c('#5d9b3a'); COL[B.DIRT]=c('#8b5a2b'); COL[B.STONE]=c('#8a8a8a'); COL[B.SAND]=c('#dccf8e'); COL[B.WATER]=c('#2f64d6');
COL[B.OAK_LEAVES]=c('#3f7f25'); COL[B.BIRCH_LEAVES]=c('#6a9a3a'); COL[B.SPRUCE_LEAVES]=c('#2e5a35'); COL[B.SNOW]=c('#f4f8fb'); COL[B.SNOWY_GRASS]=c('#e8f0f4');
COL[B.ICE]=c('#9cc4f7'); COL[B.GRAVEL]=c('#857f7a'); COL[B.CLAY]=c('#9fa4b0'); COL[B.CACTUS]=c('#2f7a2f'); COL[B.TALL_GRASS]=c('#6aa84f');
COL[B.LAVA]=c('#e0600f'); COL[B.SANDSTONE]=c('#d8c890');
function map(name, mapId, seed, N, cx0, cz0) {
  const W = N*16, img = Buffer.alloc(W*W*3); let t0 = Date.now(); let caveAir = 0, ores = {}, spawns = 0, lava=0;
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const r = G.generateChunk(mapId, seed, cx+cx0, cz+cz0, null); spawns += r.spawns.length;
    const b = r.blocks;
    for (let i = 0; i < b.length; i++) { const id = b[i]; if (id===B.COAL_ORE||id===B.IRON_ORE||id===B.GOLD_ORE||id===B.DIAMOND_ORE) ores[id]=(ores[id]||0)+1; if (id===B.LAVA) lava++; }
    for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
      let y = 127; while (y > 0 && (b[lx|(lz<<4)|(y<<8)] === 0)) y--;
      let id = b[lx|(lz<<4)|(y<<8)];
      let col = COL[id] || [255,0,255];
      if (mapId==='sky' && id===0) col=[200,225,255];
      let wy=y; while (wy>0 && b[lx|(lz<<4)|(wy<<8)]===B.WATER) wy--;
      let shade = mapId==='sky'? 0.55 + y/200 : 0.6 + (y/128)*0.8; if (id===B.WATER) shade = 0.6 + wy/140;
      const p = ((cz*16+lz)*W + cx*16+lx)*3;
      for (let k=0;k<3;k++) img[p+k] = Math.max(0,Math.min(255, col[k]*shade));
      for (let yy = 5; yy < y-4; yy++) if (b[lx|(lz<<4)|(yy<<8)]===0) caveAir++;
    }
  }
  const dt = Date.now()-t0;
  fs.writeFileSync(__dirname + '/' + name + '.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${W} 255\n`), img]));
  console.log(name, 'chunks', N*N, 'ms/chunk', (dt/(N*N)).toFixed(2), 'caveAir/chunk', (caveAir/(N*N)).toFixed(0), 'ores', JSON.stringify(ores), 'lava', lava, 'spawnGroups', spawns, 'spawn', JSON.stringify(G.spawnPoint(mapId, seed)));
}
const N = +process.argv[2] || 24;
map('valley', 'valley', 12345, N, -N/2, -N/2);
map('sky', 'sky', 12345, N, -N/2, -N/2);
