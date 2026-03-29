const COLS = 10;
const ROWS = 20;
const BLOCK = 20;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const holdCanvas = document.getElementById("hold");
const holdCtx = holdCanvas.getContext("2d");

const colors = [null,"#00f0f0","#0000f0","#f0a000","#f0f000","#00f000","#a000f0","#f00000"];
const pieces = "IJLOSTZ";

function createMatrix(w,h){
  return Array.from({length:h},()=>Array(w).fill(0));
}

function createPiece(type){
  switch(type){
    case "T": return [[0,6,0],[6,6,6],[0,0,0]];
    case "O": return [[4,4],[4,4]];
    case "L": return [[0,0,3],[3,3,3],[0,0,0]];
    case "J": return [[2,0,0],[2,2,2],[0,0,0]];
    case "I": return [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
    case "S": return [[0,5,5],[5,5,0],[0,0,0]];
    case "Z": return [[7,7,0],[0,7,7],[0,0,0]];
  }
}

function randomPiece(){
  return pieces[Math.floor(Math.random()*pieces.length)];
}

let arena = createMatrix(COLS,ROWS);

let player = {
  pos:{x:0,y:0},
  matrix:null,
  next:createPiece(randomPiece()),
  hold:null,
  canHold:true
};

let dropCounter=0;
let dropInterval=800;
let last=0;
let score=0;
let level=1;
let lines=0;
let gameOver=false;

function collide(arena,player){
  return player.matrix.some((row,y)=>
    row.some((v,x)=>v && (arena[y+player.pos.y]?.[x+player.pos.x]!==0))
  );
}

function merge(){
  player.matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v){
        arena[y+player.pos.y][x+player.pos.x]=v;
      }
    });
  });
}

function rotate(matrix){
  return matrix[0].map((_,i)=>matrix.map(r=>r[i]).reverse());
}

function playerRotate(){
  const posX = player.pos.x;
  player.matrix = rotate(player.matrix);

  let offset = 1;
  while(collide(arena,player)){
    player.pos.x += offset;
    offset = -(offset + (offset>0 ? 1 : -1));
    if(offset > player.matrix[0].length){
      // revert rotación (3 veces)
      player.matrix = rotate(rotate(rotate(player.matrix)));
      player.pos.x = posX;
      return;
    }
  }
}

function drop(){
  player.pos.y++;
  if(collide(arena,player)){
    player.pos.y--;
    merge();
    sweep();
    resetPlayer();
  }
}

function hardDrop(){
  while(!collide(arena,player)){
    player.pos.y++;
  }
  player.pos.y--;
  merge();
  sweep();
  resetPlayer();
}

function sweep(){
  outer: for(let y=arena.length-1;y>=0;y--){
    if(arena[y].every(v=>v!==0)){
      arena.splice(y,1);
      arena.unshift(new Array(COLS).fill(0));
      score+=100;
      lines++;

      if(lines % 10 === 0){
        level++;
        dropInterval *= 0.9;
      }

      y++;
    }
  }
}

function resetPlayer(){
  player.matrix = player.next;
  player.next = createPiece(randomPiece());
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS/2 - player.matrix[0].length/2);
  player.canHold = true;

  if(collide(arena,player)){
    gameOver = true;
  }
}

function hold(){
  if(!player.canHold) return;

  if(player.hold){
    [player.matrix, player.hold] = [player.hold, player.matrix];
  } else {
    player.hold = player.matrix;
    player.matrix = player.next;
    player.next = createPiece(randomPiece());
  }

  player.pos.y = 0;
  player.pos.x = Math.floor(COLS/2 - player.matrix[0].length/2);
  player.canHold = false;
}

function drawBlock(x,y,color,ghost=false){
  ctx.fillStyle = ghost ? "rgba(255,255,255,0.2)" : color;
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);

  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
}

function drawMatrix(matrix,offset,ghost=false){
  matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v){
        drawBlock(x+offset.x, y+offset.y, colors[v], ghost);
      }
    });
  });
}

function drawMini(matrix,ctxMini){
  ctxMini.clearRect(0,0,80,80);
  matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v){
        ctxMini.fillStyle = colors[v];
        ctxMini.fillRect(x*20, y*20, 20, 20);
      }
    });
  });
}

function draw(){
  ctx.fillStyle="#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawMatrix(arena,{x:0,y:0});

  // ghost
  let ghostY = player.pos.y;
  while(!collide(arena,{...player,pos:{x:player.pos.x,y:ghostY}})){
    ghostY++;
  }
  ghostY--;
  drawMatrix(player.matrix,{x:player.pos.x,y:ghostY},true);

  drawMatrix(player.matrix,player.pos);

  drawMini(player.next,nextCtx);
  if(player.hold) drawMini(player.hold,holdCtx);

  document.getElementById("score").innerText=score;
  document.getElementById("level").innerText=level;
}

function drawGameOver(){
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";

  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 10);
  ctx.fillText("ENTER para reiniciar", canvas.width/2, canvas.height/2 + 20);
}

function update(time=0){
  const delta = time - last;
  last = time;

  if(!gameOver){
    dropCounter += delta;

    if(dropCounter > dropInterval){
      drop();
      dropCounter = 0;
    }
  }

  draw();

  if(gameOver){
    drawGameOver();
  }

  requestAnimationFrame(update);
}

document.addEventListener("keydown",e=>{
  if(gameOver){
    if(e.key==="Enter"){
      arena = createMatrix(COLS,ROWS);
      score=0;
      level=1;
      lines=0;
      dropInterval=800;
      gameOver=false;
      resetPlayer();
    }
    return;
  }

  if(e.key==="ArrowLeft"){
    player.pos.x--;
    if(collide(arena,player)) player.pos.x++;
  }

  if(e.key==="ArrowRight"){
    player.pos.x++;
    if(collide(arena,player)) player.pos.x--;
  }

  if(e.key==="ArrowDown") drop();
  if(e.key==="ArrowUp") playerRotate();
  if(e.key===" ") hardDrop();
  if(e.key==="Shift") hold();
});

resetPlayer();
update();