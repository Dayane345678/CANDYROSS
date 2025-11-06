 
        // =======================================================
        // VARIÁVEIS DE ESTADO DO JOGO (ESCOPO GLOBAL)
        // =======================================================
        const PIECE_ID = { T:1, O:2, L:3, J:4, I:5, S:6, Z:7 };
        const PIECES = {
            T: [[0,1,0],[1,1,1]], O: [[1,1],[1,1]], L: [[0,0,1],[1,1,1]], J: [[1,0,0],[1,1,1]], 
            I: [[1,1,1,1]], S: [[0,1,1],[1,1,0]], Z: [[1,1,0],[0,1,1]],
        }; 
        const colors = [null,"#ff80bf","#ff4da6","#ff99cc","#ff66b2","#ff1a8c","#ffb3d9","#e60073"];
        const BLOCK_SIZE = 20; 

        let context = null;
        let nextCtx = null;
        let arena = createMatrix(12, 20);
        let player = { pos: { x: 0, y: 0 }, matrix: null };
        let nextPiece = createPiece(randomPiece()); // Peça inicial
        
        let gameActive = false;
        let isPaused = false;
        let playerName = "Jogador";
        let avatarURL = "https://placehold.co/35x35/ff4da6/ffffff?text=A";
        let hasReached100 = false; 

        let score = 0;
        let time = 0; 
        let highScore = 0;
        let bestTimeSeconds = 0;
        
        let timerInterval = null;
        let animationFrameId = null;
        let dropCounter = 0; 
        const dropInterval = 1000;
        let lastTime = 0;

        // =======================================================
        // LÓGICA DE ÁUDIO (TONE.JS) - SONS DOCES/CANDY
        // =======================================================
        
        // ***************************************************************
        // PASSO CRUCIAL: INSIRA A URL RAW (BRUTA) DO SEU ARQUIVO DE ÁUDIO AQUI!
        // EXEMPLO: https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPOSITORIO/master/musica.mp3
        const AUDIO_URL = "https://files.catbox.moe/2q6d5i.mp3" ; 
        // ***************************************************************
        
        // Sweet/Candy Synth: Usa onda triangular para um som mais suave, como um sino doce ou caixa de música.
        const sweetSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, // Onda triangular para som mais suave/doce
            envelope: {
                attack: 0.005,
                decay: 0.3, // Decaimento mais longo para suavidade
                sustain: 0.1,
                release: 0.5
            },
            volume: -8 // Um pouco mais alto, mas ainda suave
        }).toDestination();
        
        // Notas para o arpejo de linha (mais doce e melódico)
        const lineClearNotes = ["G5", "B5", "D6", "G6"];
        let lineClearIndex = 0;

        function playLineClearSFX() {
            if (Tone.context.state === 'running') {
                 // Sequencia rápida das notas para som de "doce/sino"
                 sweetSynth.triggerAttackRelease(lineClearNotes[lineClearIndex], "16n");
                 lineClearIndex = (lineClearIndex + 1) % lineClearNotes.length;
            }
        }
        
        function playFiveByFiveSFX() {
            if (Tone.context.state === 'running') {
                // Acorde mais suave e mágico para o 5x5
                sweetSynth.triggerAttackRelease(["G6", "C7", "E7", "G7"], "4n");
            }
        }
        
        const bgPlayer = new Tone.Player({
            url: AUDIO_URL,
            loop: true,
            volume: -10 
        }).toDestination();

        function resumeAudioContextAndPlayConfirmation() {
            if (Tone.context.state !== 'running') {
                Tone.start().then(() => {
                    console.log("Contexto de Áudio Tone.js iniciado com sucesso.");
                    // Um pequeno som de confirmação para quando o áudio é ativado
                    sweetSynth.triggerAttackRelease("G5", "32n"); 
                }).catch(err => {
                    console.error("Erro ao iniciar o Tone.js:", err);
                });
            } else {
                 sweetSynth.triggerAttackRelease("G5", "32n");
            }
        }
        function startBackgroundMusic() {
            if (AUDIO_URL === "https://files.catbox.moe/2q6d5i.mp3") {
                 console.warn("Música de fundo não iniciada. Por favor, insira a URL RAW do seu arquivo de áudio.");
                 return;
            }
            if (bgPlayer.loaded) {
                bgPlayer.start();
            } else {
                bgPlayer.autostart = true;
            }
        }
        function stopBackgroundMusic() { bgPlayer.stop(); }

        // =======================================================
        // FUNÇÕES UTILITÁRIAS E DE PERSISTÊNCIA (ESCOPO GLOBAL)
        // =======================================================
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const sec = seconds % 60;
            const secDisplay = sec < 10 ? "0" + sec : sec;
            return `${minutes}:${secDisplay}`;
        }
        
        function loadRecords(highScoreDisplay, bestTimeDisplay) {
            highScore = parseInt(localStorage.getItem('blockross_highScore') || '0', 10);
            bestTimeSeconds = parseInt(localStorage.getItem('blockross_bestTime') || '0', 10);
            
            const savedVolume = localStorage.getItem('blockross_volume') || '-10';
            const volumeSlider = document.getElementById('volume-slider');
            if (volumeSlider) {
                 volumeSlider.value = savedVolume;
                 Tone.Destination.volume.value = parseFloat(savedVolume); 
                 bgPlayer.volume.value = parseFloat(savedVolume); 
            }
            
            highScoreDisplay.innerText = highScore;
            bestTimeDisplay.innerText = formatTime(bestTimeSeconds);
        }

        function saveRecord(newScore, newTimeSeconds, highScoreDisplay, bestTimeDisplay) {
            let recordBroken = false;
            if (newScore > highScore) {
                highScore = newScore;
                localStorage.setItem('blockross_highScore', highScore);
                highScoreDisplay.innerText = highScore;
                recordBroken = true;
            }
            if (newTimeSeconds > bestTimeSeconds) {
                bestTimeSeconds = newTimeSeconds;
                localStorage.setItem('blockross_bestTime', bestTimeSeconds);
                bestTimeDisplay.innerText = formatTime(bestTimeSeconds);
                recordBroken = true;
            }
            return recordBroken;
        }
        
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }
        
        // =======================================================
        // FUNÇÕES DE LÓGICA DO JOGO (UTILIZAM VARIÁVEIS GLOBAIS)
        // =======================================================
        function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; } 
        function randomPiece(){ const types='TJLOSZI'; return types[types.length*Math.random()|0]; } 
        function createPiece(type){ return PIECES[type].map(row=>row.map(v=>v?PIECE_ID[type]:0)); } 
        function rotate(matrix,dir=1){ const rows=matrix.length,cols=matrix[0].length,res=Array.from({length:cols},()=>Array(rows).fill(0)); for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) if(dir>0) res[x][rows-1-y]=matrix[y][x]; else res[cols-1-x][y]=matrix[y][x]; return res; } 

        function collide(arena, player){ const m=player.matrix,o=player.pos; for(let y=0;y<m.length;y++){ for(let x=0;x<m[y].length;x++){ if(m[y][x]!==0 && ((arena[y+o.y] && arena[y+o.y][x+o.x])!==0)) return true; } } return false; } 
        
        // FUNÇÃO MERGE CORRIGIDA: usa 'player.pos.x' em vez de 'o.x' (que não estava definido aqui)
        function merge(arena, player){ 
             player.matrix.forEach((row,y)=>{ 
                 row.forEach((val,x)=>{ 
                     if(val!==0) 
                         arena[y+player.pos.y][x+player.pos.x]=val; 
                 }); 
             }); 
        } 

        function drawBlock(ctx,x,y,color){ ctx.fillStyle=color; ctx.fillRect(x,y,1,1); ctx.strokeStyle="#7a004d"; ctx.lineWidth=0.06; ctx.strokeRect(x+0.03,y+0.03,0.94,0.94); ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.fillRect(x+0.65,y+0.65,0.32,0.32); }
        function drawMatrix(matrix,offset,ctx=context){ matrix.forEach((row,y)=>{ row.forEach((val,x)=>{ if(val!==0) drawBlock(ctx,x+offset.x,y+offset.y,colors[val]); }); }); }
        function draw(){ 
            if (!context) return;
            context.fillStyle="#ffe6f0"; 
            context.fillRect(0,0,12,20); // Usa 12x20 que são as coordenadas escaladas
            drawMatrix(arena,{x:0,y:0}); 
            drawMatrix(player.matrix,player.pos); 
        }
        function drawNext(){ 
            if (!nextCtx || !nextPiece) return;
            nextCtx.fillStyle="#ffe6f0"; 
            nextCtx.fillRect(0,0,5,5); // Usa 5x5 que são as coordenadas escaladas
            const gridW=(100/20)|0; const gridH=(100/20)|0; 
            const offX=Math.max(0,((gridW-nextPiece[0].length)/2)|0); 
            const offY=Math.max(0,((gridH-nextPiece.length)/2)|0); 
            drawMatrix(nextPiece,{x:offX,y:offY},nextCtx); 
        }

        function updateScore(){ 
            document.getElementById("score").innerText = score; 
            const barbieRewardImg = document.getElementById('barbie-reward');

            if (score >= 1000&& !hasReached100) {
                hasReached100 = true;
                barbieRewardImg.style.opacity = 1;
                setTimeout(() => {
                    barbieRewardImg.style.opacity = 0;
                }, 3000);
            }
        }
        function updateTime(){ document.getElementById("time").innerText=formatTime(time); } 

        function showCandyEmoji(gridX, gridY) {
            const candyNotifications = document.getElementById('candy-notifications');
            const candy = document.createElement('div');
            candy.className = 'candy-emoji';
            candy.innerText = '🍭'; 
            
            candy.style.left = `${gridX * BLOCK_SIZE + (BLOCK_SIZE / 2)}px`;
            candy.style.top = `${gridY * BLOCK_SIZE + (BLOCK_SIZE / 2)}px`;

            candyNotifications.appendChild(candy); 
            setTimeout(() => { candy.remove(); }, 1000);
        }
        
        function applyGravity() {
            let moved = false;
            for (let x = 0; x < arena[0].length; x++) {
                let writeY = arena.length - 1; 
                for (let y = arena.length - 1; y >= 0; y--) {
                    if (arena[y][x] !== 0) {
                        if (y !== writeY) {
                            arena[writeY][x] = arena[y][x]; 
                            arena[y][x] = 0; 
                            moved = true;
                        }
                        writeY--; 
                    }
                }
            }
            return moved;
        }

        function findAndClear5x5() {
            let clearedBlocks = 0;
            const blocksToClear = [];
            const size = 5; 

            for (let y = 0; y <= arena.length - size; y++) {
                for (let x = 0; x <= arena[0].length - size; x++) {
                    let isSolidSquare = true;
                    outerCheck: for (let cy = y; cy < y + size; cy++) {
                        for (let cx = x; cx < x + size; cx++) {
                            if (arena[cy][cx] === 0) {
                                isSolidSquare = false;
                                break outerCheck;
                            }
                        }
                    }
                    if (isSolidSquare) {
                        for (let cy = y; cy < y + size; cy++) {
                            for (let cx = x; cx < x + size; cx++) {
                                const isUnique = !blocksToClear.some(b => b.x === cx && b.y === cy);
                                if (isUnique) { blocksToClear.push({ x: cx, y: cy }); }
                            }
                        }
                        showCandyEmoji(x + 2, y + 2); 
                    }
                }
            }

            for (const { x, y } of blocksToClear) {
                if (arena[y][x] !== 0) { 
                    arena[y][x] = 0;
                    clearedBlocks++;
                }
            }

            if (clearedBlocks > 0) {
                score += clearedBlocks * 10; 
                updateScore();
                playFiveByFiveSFX();
                return true;
            }
            return false;
        }
        
        function arenaSweep(){ 
            let linesCleared = 0;
            outer: for(let y=arena.length-1;y>=0;y--){ 
                for(let x=0;x<arena[y].length;x++) 
                    if(arena[y][x]===0) continue outer; 
                
                arena.splice(y,1); 
                arena.unshift(new Array(arena[0].length).fill(0)); 
                showCandyEmoji(6, y); 
                linesCleared++; 
                y++; 
            } 
            if (linesCleared > 0) {
                score += linesCleared * 10; 
                playLineClearSFX(); 
            }
            updateScore(); 
        } 
        
        function playerReset(){ 
            player.matrix=nextPiece; 
            nextPiece=createPiece(randomPiece()); 
            player.pos.y=0; 
            player.pos.x=(arena[0].length/2|0)-(player.matrix[0].length/2|0); 
            if(collide(arena,player)) gameOver(); 
            drawNext(); 
        }

        function gameOver(){ 
            const overlay = document.getElementById("gameover");
            const finalScoreEl = document.getElementById("finalScore");
            const finalTimeEl = document.getElementById("finalTime");
            
            gameActive=false; 
            clearInterval(timerInterval); 
            if(animationFrameId) cancelAnimationFrame(animationFrameId); 
            animationFrameId = null; 
            
            stopBackgroundMusic();
            
            const highScoreDisplay = document.getElementById('highScore');
            const bestTimeDisplay = document.getElementById('bestTime');
            saveRecord(score, time, highScoreDisplay, bestTimeDisplay);

            overlay.style.visibility="visible"; 
            finalScoreEl.innerText="Pontuação: "+score; 
            finalTimeEl.innerText=`Tempo: ${formatTime(time)} min`; 
        }
        
        function startTimer(){ 
            clearInterval(timerInterval); 
            timerInterval=setInterval(()=>{ 
                if(gameActive && !isPaused){ 
                    time++; 
                    updateTime(); 
                } 
            },1000); 
        }
        
        // Funções de Movimento expostas para Event Listeners
        function playerMove(dir){ 
            if(!gameActive || isPaused) return; 
            player.pos.x+=dir; 
            if(collide(arena,player)) player.pos.x-=dir; 
        }

        function playerRotate(dir=1){ 
            if(!gameActive || isPaused) return; 
            const pos=player.pos.x; 
            const rotated=rotate(player.matrix,dir); 
            player.matrix=rotated; 
            let offset=0; 
            while(collide(arena,player)){ 
                offset=offset?-(offset+(offset>0?1:-1)):1; 
                player.pos.x+=offset; 
                if(Math.abs(offset)>player.matrix[0].length+2){ 
                    player.matrix=rotate(player.matrix,-dir); 
                    player.pos.x=pos; 
                    return; 
                } 
            } 
        }

        function playerDrop(){ 
            if(!gameActive || isPaused) return; 
            player.pos.y++; 
            if(collide(arena,player)){ 
                player.pos.y--; 
                merge(arena,player); 
                
                let clearedBlocks = false;
                do {
                    clearedBlocks = findAndClear5x5(); 
                    if (clearedBlocks) { applyGravity(); }
                } while(clearedBlocks); 

                arenaSweep(); 
                playerReset(); 
            } 
            dropCounter=0; 
        }

        function togglePause() {
            const pauseButton = document.getElementById('pause-btn');
            isPaused = !isPaused;
            
            if (isPaused) {
                if (timerInterval) clearInterval(timerInterval);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                animationFrameId = null; 
                stopBackgroundMusic();
                
                pauseButton.innerHTML = '▶️ Retomar';
                
                // Desenha o overlay de pausa
                draw(); 
                if (context) {
                    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    context.fillRect(0, 0, 12, 20); 
                    context.font = '1px Inter'; 
                    context.fillStyle = 'white';
                    context.textAlign = 'center';
                    context.fillText('PAUSADO', 6, 10); 
                }
            } else {
                startTimer();
                pauseButton.innerHTML = '⏸️ Pausar';
                startBackgroundMusic();
                
                lastTime = performance.now(); 
                animationFrameId = requestAnimationFrame(update);
            }
        }
        
        function update(timeNow=0){ 
            if (!gameActive || isPaused) { return; }

            const delta=timeNow-lastTime; 
            lastTime=timeNow; 
            
            dropCounter+=delta; 
            if(dropCounter>dropInterval) playerDrop(); 
            draw(); 
            animationFrameId = requestAnimationFrame(update); 
        }

        function restartGame(){ 
            const overlay = document.getElementById("gameover");
            const pauseButton = document.getElementById('pause-btn');
            const highScoreDisplay = document.getElementById('highScore');
            const bestTimeDisplay = document.getElementById('bestTime');
            
            overlay.style.visibility="hidden"; 
            arena.forEach(row=>row.fill(0)); 
            score=0; 
            time=0; 
            updateScore(); 
            updateTime(); 
            gameActive=true; 
            startTimer(); 
            playerReset(); 
            isPaused = false; 
            hasReached100 = false; 
            pauseButton.innerHTML = '⏸️ Pausar'; 
            
            startBackgroundMusic();
            lastTime = performance.now(); 
            
            // Cancela qualquer frame antigo e inicia um novo
            if(animationFrameId) cancelAnimationFrame(animationFrameId); 
            animationFrameId = requestAnimationFrame(update);
        } 

        // FUNÇÃO PARA VOLTAR PARA A TELA INICIAL (Chama a função restartGame implicitamente)
        function backToStartScreen() {
            gameActive = false; 
            clearInterval(timerInterval); 
            if(animationFrameId) cancelAnimationFrame(animationFrameId); 
            animationFrameId = null; 
            stopBackgroundMusic();
            isPaused = false; 

            document.getElementById("gameover").style.visibility = "hidden"; 

            document.getElementById("title-game").style.display = "none";
            document.getElementById("top-info").style.display = "none";
            document.getElementById("game-container").style.display = "none";
            document.getElementById("controls").style.display = "none";

            document.getElementById("start-screen").style.display = "flex";
            
            // Prepara o estado para o próximo jogo, sem iniciar o loop
            arena.forEach(row=>row.fill(0)); 
            score=0; 
            time=0; 
            updateScore(); 
            updateTime(); 
            playerReset(); 
        }

        // =======================================================
        // FUNÇÃO DE INICIALIZAÇÃO ÚNICA (CHAMADA APENAS 1 VEZ)
        // =======================================================
        function initializeGame(highScoreDisplay, bestTimeDisplay) {
            // 1. Configuração dos contextos do Canvas
            const canvas = document.getElementById('tetris'); 
            context = canvas.getContext('2d');
            context.scale(20, 20); // Escala principal
            
            const nextCanvas = document.getElementById('next');
            nextCtx = nextCanvas.getContext('2d');
            nextCtx.scale(20, 20); // Escala do próximo bloco

            // 2. Anexar Listeners de Botões (feito apenas uma vez)
            document.getElementById("restart").onclick = restartGame;
            document.getElementById("back-to-start-gameover").onclick = backToStartScreen;
            document.getElementById("pause-btn").onclick = togglePause;
            document.getElementById("back-to-start-control").onclick = backToStartScreen;
            
            document.getElementById("left").onclick=()=>playerMove(-1);
            document.getElementById("right").onclick=()=>playerMove(1);
            document.getElementById("down").onclick=()=>playerDrop();
            document.getElementById("rotate").onclick=()=>playerRotate(1);

            // 3. Anexar Listener de Teclado (feito apenas uma vez)
            document.addEventListener("keydown",(e)=>{ 
                if(e.key==="p" || e.key==="P") {
                    togglePause();
                    return;
                }
                
                if(!gameActive || isPaused) return; 
                
                if(e.key==="ArrowLeft") playerMove(-1); 
                else if(e.key==="ArrowRight") playerMove(1); 
                else if(e.key==="ArrowDown") playerDrop(); 
                else if(e.key==="ArrowUp") playerRotate(1); 
            });
            
            // 4. Inicia o estado da peça inicial
            playerReset(); 
        }

        // =======================================================
        // LÓGICA DE CARREGAMENTO DO DOM
        // =======================================================
        document.addEventListener('DOMContentLoaded', () => {
            const instructions = document.getElementById('instructions');
            const closeInstructionsBtn = document.getElementById('close'); 
            const showInstructionsBtn = document.getElementById('show-instructions');
            const playBtn = document.getElementById('play-btn');
            const startScreen = document.getElementById('start-screen');
            const playerNameInput = document.getElementById('playerNameInput');
            const avatarImg = document.getElementById('avatar');
            const avatarInput = document.getElementById('avatar-input');
            const highScoreDisplay = document.getElementById('highScore');
            const bestTimeDisplay = document.getElementById('bestTime');
            const volumeSlider = document.getElementById('volume-slider');
            
            // 1. CARREGAR RECORDES E VOLUME
            loadRecords(highScoreDisplay, bestTimeDisplay);

            // 2. Lógica do Slider de Volume
            if (volumeSlider) {
                volumeSlider.addEventListener('input', () => {
                    const volumeValue = parseFloat(volumeSlider.value);
                    Tone.Destination.volume.value = volumeValue;
                    bgPlayer.volume.value = volumeValue; 
                    localStorage.setItem('blockross_volume', volumeSlider.value);
                });
            }

            // 3. CARREGAR AVATAR SALVO
            const savedAvatar = localStorage.getItem('blockross_avatar');
            if (savedAvatar) {
                avatarURL = savedAvatar;
                avatarImg.src = avatarURL;
            }

            // 4. Lógica de Avatar (Salvar com Base64)
            if (avatarImg && avatarInput) {
                avatarImg.onclick = () => avatarInput.click();
                avatarInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        try {
                            const base64Image = await fileToBase64(file);
                            avatarURL = base64Image;
                            avatarImg.src = base64Image;
                            localStorage.setItem('blockross_avatar', base64Image);
                        } catch (error) {
                            console.error("Erro ao converter arquivo para Base64:", error);
                        }
                    }
                };
            }
            
            // 5. Inicializa o nome do jogador no input e display
            const savedName = localStorage.getItem('blockross_playerName');
            if (savedName) playerName = savedName;
            
            if (playerNameInput) playerNameInput.value = playerName;
            if (document.getElementById('player-name-display')) document.getElementById('player-name-display').innerText = playerName;


            // 6. Lógica de Pop-up (Abrir e Fechar)
            if(showInstructionsBtn) showInstructionsBtn.addEventListener('click', () => { if(instructions) instructions.showModal(); });
            setTimeout(() => { if(instructions && startScreen.style.display !== 'none'){ instructions.showModal(); } }, 2000);
            if (closeInstructionsBtn && instructions) closeInstructionsBtn.addEventListener('click', () => { instructions.close(); });
            if (instructions) instructions.addEventListener('click', (event) => { if (event.target === instructions) { instructions.close(); } });

            // 7. CHAMA A FUNÇÃO DE INICIALIZAÇÃO ÚNICA DO AMBIENTE
            initializeGame(highScoreDisplay, bestTimeDisplay);

            // 8. Lógica da Tela Inicial (Apenas manipula a visualização e inicia o restartGame)
            playBtn.onclick = () => {
                resumeAudioContextAndPlayConfirmation();
                
                const name = playerNameInput.value.trim();
                playerName = name.length > 0 ? name.substring(0, 10) : "Jogador";
                document.getElementById('player-name-display').innerText = playerName;
                localStorage.setItem('blockross_playerName', playerName);
                
                document.getElementById("start-screen").style.display = "none";
                document.getElementById("title-game").style.display = "block";
                document.getElementById("top-info").style.display = "flex";
                document.getElementById("game-container").style.display = "flex";
                document.getElementById("controls").style.display = "grid";
                
                // Em vez de chamar startGame(), chamamos restartGame()
                restartGame();
            };
        });
