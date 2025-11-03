const playBtn = document.getElementById("play-btn"); // Faz a ação de iniciar o jogo a partir do momento em que o botão e clicado 
playBtn.onclick = () => {
  document.getElementById("start-screen").style.display = "none"; // esconde a tela inicial 
  document.getElementById("title-game").style.display = "block"; // exibe o título do jogo
  document.getElementById("top-info").style.display = "flex"; // mostra a pontuação e tempo 
  document.getElementById("game-container").style.display = "flex"; // mostra a página principal do jogo 
  document.getElementById("controls").style.display = "grid"; // mostra os botões de interação do jogo
  startGame();
};

function startGame() {
  const canvas = document.getElementById('tetris'); // montando a página principal do game
  const context = canvas.getContext('2d');
  context.scale(20,20);

  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');
  nextCtx.scale(20,20);

  const overlay = document.getElementById("gameover");
  const finalScore = document.getElementById("finalScore");
  const finalTime = document.getElementById("finalTime");

  const PIECE_ID = { T:1, O:2, L:3, J:4, I:5, S:6, Z:7 };
  const PIECES = {
    T: [[0,1,0],[1,1,1]],
    O: [[1,1],[1,1]],
    L: [[0,0,1],[1,1,1]],
    J: [[1,0,0],[1,1,1]],
    I: [[1,1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
  }; // Os bloquinhos do jogo, 1 representa um quadradinho preenchido o 0 representa o contrário, as letras pra facilitar mudar os blocos de cores 
  const colors = [null,"#ff80bf","#ff4da6","#ff99cc","#ff66b2","#ff1a8c","#ffb3d9","#e60073"];
  const arena = createMatrix(12,20); // variável para o tabuleiro do jogo 
  let score = 0;  // variável dos pontos 
  let time = 0; // variável do tempo
  let timerInterval; 
  let gameRunning = true; // identificar se o jogo está ativo ou já acabou 

  function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; } // cria o tabuleiro do jogo
  function collide(arena, player){ const m=player.matrix,o=player.pos; for(let y=0;y<m.length;y++){ for(let x=0;x<m[y].length;x++){ if(m[y][x]!==0 && ((arena[y+o.y] && arena[y+o.y][x+o.x])!==0)) return true; } } return false; } // verifica se os bloquinhos do jogador colidiu ou não 
  function merge(arena, player){ player.matrix.forEach((row,y)=>{ row.forEach((val,x)=>{ if(val!==0) arena[y+player.pos.y][x+player.pos.x]=val; }); }); } // junta as peças com o tabuleiro 
  function randomPiece(){ const types='TJLOSZI'; return types[types.length*Math.random()|0]; } // escolhe aleatoriamente uma nova peça 
  function createPiece(type){ return PIECES[type].map(row=>row.map(v=>v?PIECE_ID[type]:0)); } // Então e responsável por alterar as cores dos bloquinhos de acordo com as letras

  function rotate(matrix,dir=1){ const rows=matrix.length,cols=matrix[0].length,res=Array.from({length:cols},()=>Array(rows).fill(0)); for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) if(dir>0) res[x][rows-1-y]=matrix[y][x]; else res[cols-1-x][y]=matrix[y][x]; return res; } // gira as pecinhas
// movimenta as peças dentro do jogo
  function playerDrop(){ if(!gameRunning) return; player.pos.y++; if(collide(arena,player)){ player.pos.y--; merge(arena,player); arenaSweep(); playerReset(); } dropCounter=0; }
  function playerMove(dir){ if(!gameRunning) return; player.pos.x+=dir; if(collide(arena,player)) player.pos.x-=dir; }
  function playerRotate(dir=1){ if(!gameRunning) return; const pos=player.pos.x; const rotated=rotate(player.matrix,dir); player.matrix=rotated; let offset=0; while(collide(arena,player)){ offset=offset?-(offset+(offset>0?1:-1)):1; player.pos.x+=offset; if(Math.abs(offset)>player.matrix[0].length+2){ player.matrix=rotate(player.matrix,-dir); player.pos.x=pos; return; } } }

  function arenaSweep(){ let rowCount=1; outer: for(let y=arena.length-1;y>=0;y--){ for(let x=0;x<arena[y].length;x++) if(arena[y][x]===0) continue outer; arena.splice(y,1); arena.unshift(new Array(arena[0].length).fill(0)); score+=rowCount*10; rowCount*=2; } updateScore(); } // verifica se a linha está correta pra marcar pontos 
  // desenha e redesenha as matrizes 
  function drawBlock(ctx,x,y,color){ ctx.fillStyle=color; ctx.fillRect(x,y,1,1); ctx.strokeStyle="#7a004d"; ctx.lineWidth=0.06; ctx.strokeRect(x+0.03,y+0.03,0.94,0.94); ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.fillRect(x+0.65,y+0.65,0.32,0.32); }
  function drawMatrix(matrix,offset,ctx=context){ matrix.forEach((row,y)=>{ row.forEach((val,x)=>{ if(val!==0) drawBlock(ctx,x+offset.x,y+offset.y,colors[val]); }); }); }
  function draw(){ context.fillStyle="#ffe6f0"; context.fillRect(0,0,canvas.width,canvas.height); drawMatrix(arena,{x:0,y:0}); drawMatrix(player.matrix,player.pos); }
  function drawNext(){ nextCtx.fillStyle="#ffe6f0"; nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height); const gridW=(nextCanvas.width/20)|0; const gridH=(nextCanvas.height/20)|0; const offX=Math.max(0,((gridW-nextPiece[0].length)/2)|0); const offY=Math.max(0,((gridH-nextPiece.length)/2)|0); drawMatrix(nextPiece,{x:offX,y:offY},nextCtx); }

  function updateScore(){ document.getElementById("score").innerText="Pontuação: "+score; }  // atualiza a pontuação 
  function updateTime(){ const minutes=Math.floor(time/60); const seconds=time%60; const secDisplay=seconds<10?"0"+seconds:seconds; document.getElementById("time").innerText=`Tempo: ${minutes}:${secDisplay} min`; } // atualiza o tempo de jogo

  function playerReset(){ player.matrix=nextPiece; nextPiece=createPiece(randomPiece()); player.pos.y=0; player.pos.x=(arena[0].length/2|0)-(player.matrix[0].length/2|0); if(collide(arena,player)) gameOver(); drawNext(); }
  function gameOver(){ gameRunning=false; clearInterval(timerInterval); overlay.style.visibility="visible"; finalScore.innerText="Pontuação: "+score; const minutes=Math.floor(time/60); const seconds=time%60; const secDisplay=seconds<10?"0"+seconds:seconds; finalTime.innerText=`Tempo: ${minutes}:${secDisplay} min`; }
  function restartGame(){ overlay.style.visibility="hidden"; arena.forEach(row=>row.fill(0)); score=0; time=0; updateScore(); updateTime(); gameRunning=true; startTimer(); playerReset(); } // reinicia e reseta o game 

  let dropCounter=0; let dropInterval=1000; let lastTime=0;  // variáveis de controle de queda e peça atual
  const player={pos:{x:0,y:0},matrix:null}; 
  let nextPiece=createPiece(randomPiece());

  function startTimer(){ clearInterval(timerInterval); timerInterval=setInterval(()=>{ if(gameRunning){ time++; updateTime(); } },1000); }
  function update(timeNow=0){ const delta=timeNow-lastTime; lastTime=timeNow; if(gameRunning){ dropCounter+=delta; if(dropCounter>dropInterval) playerDrop(); draw(); } requestAnimationFrame(update); }

  document.getElementById("restart").onclick=restartGame; // botões de controle principais do jogo
  playerReset(); startTimer(); update();

  document.addEventListener("keydown",(e)=>{ if(!gameRunning) return; if(e.key==="ArrowLeft") playerMove(-1); else if(e.key==="ArrowRight") playerMove(1); else if(e.key==="ArrowDown") playerDrop(); else if(e.key==="ArrowUp") playerRotate(1); });
  document.getElementById("left").onclick=()=>playerMove(-1);
  document.getElementById("right").onclick=()=>playerMove(1);
  document.getElementById("down").onclick=()=>playerDrop();
  document.getElementById("rotate").onclick=()=>playerRotate(1);
