const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, Uint8Array, Int32Array, Float32Array, Int16Array, Array, Object, String };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/js/01-blocks.js', 'utf8') + '\n;this.B=B;this.genProps=genProps;', ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/js/02-gen.js', 'utf8') + '\n;this.genModule=genModule;', ctx);
const B = ctx.B, G = ctx.genModule(B, ctx.genProps());
const c = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const COL = {}; COL[0]=c('#bcd4ff'); COL[B.GRASS]=c('#5d9b3a'); COL[B.DIRT]=c('#8b5a2b'); COL[B.STONE]=c('#7a7a7a'); COL[B.SAND]=c('#dccf8e'); COL[B.WATER]=c('#2f64d6');
COL[B.OAK_LEAVES]=c('#3f7f25'); COL[B.BIRCH_LEAVES]=c('#6a9a3a'); COL[B.SPRUCE_LEAVES]=c('#2e5a35'); COL[B.SNOW]=c('#f4f8fb'); COL[B.SNOWY_GRASS]=c('#e8f0f4');
COL[B.ICE]=c('#9cc4f7'); COL[B.GRAVEL]=c('#857f7a'); COL[B.CLAY]=c('#9fa4b0'); COL[B.LAVA]=c('#ff7010'); COL[B.BEDROCK]=c('#222222'); COL[B.COAL_ORE]=c('#111111');
COL[B.IRON_ORE]=c('#d8a888'); COL[B.GOLD_ORE]=c('#ffd700'); COL[B.DIAMOND_ORE]=c('#40f0ff'); COL[B.OAK_LOG]=c('#6b5132'); COL[B.BIRCH_LOG]=c('#dddddd'); COL[B.SPRUCE_LOG]=c('#4a3520'); COL[B.SANDSTONE]=c('#d8c890'); COL[B.GLOWSTONE]=c('#ffe080');
function slice(name, mapId, seed, zc, x0, W) {
  const H = 128, img = Buffer.alloc(W*H*3); const cz = Math.floor(zc/16), lz = ((zc%16)+16)%16;
  for (let cx = Math.floor(x0/16); cx*16 < x0+W; cx++) {
    const b = G.generateChunk(mapId, seed, cx, cz, null).blocks;
    for (let lx = 0; lx < 16; lx++) { const x = cx*16+lx - x0; if (x<0||x>=W) continue;
      for (let y = 0; y < H; y++) { const id = b[lx|(lz<<4)|(y<<8)]; const col = COL[id] || [255,0,255]; const p = ((H-1-y)*W + x)*3; img[p]=col[0]; img[p+1]=col[1]; img[p+2]=col[2]; } }
  }
  fs.writeFileSync(__dirname+'/'+name+'.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`), img]));
}
slice('valley_slice', 'valley', 12345, 0, -256, 512);
slice('sky_slice', 'sky', 12345, 0, -256, 512);
// height histogram for valley
const hist = {};
for (let i = 0; i < 4000; i++) { const x = Math.floor(Math.random()*4000-2000), z = Math.floor(Math.random()*4000-2000); }
