import { UICorePlugin } from "@clappr/player";

export default class ShowTime extends UICorePlugin {
  get name() { return 'show_time'; }

  constructor(core) {
    super(core);
    this._overlay = null;
    this._currentDateEl = null;
    this._currentTimeEl = null;
    this._updateInterval = null;
    this._initialized = false;
    
    console.log('ShowTime: Plugin construído');
    
    // Inicia com delay para não interferir com MediaControl
    this.bindEvents();
    
    // Tenta criar imediatamente também como backup
    setTimeout(() => {
      if (!this._initialized) {
        console.log('ShowTime: Tentativa de backup após 3 segundos');
        this._createOverlay();
      }
    }, 3000);
  }

  bindEvents() {
    console.log('ShowTime: Configurando eventos...');
    
    // Aguarda o core estar pronto
    this.listenTo(this.core, 'ready', () => {
      console.log('ShowTime: Evento ready recebido');
      // Delay moderado para MediaControl estar pronto
      setTimeout(() => {
        if (!this._initialized) {
          console.log('ShowTime: Inicializando overlay de data/hora...');
          this._createOverlay();
          this._initialized = true;
        }
      }, 1000);
    });
    
    // Também tenta após playback estar pronto
    this.listenTo(this.core, 'playback:ready', () => {
      console.log('ShowTime: Evento playback:ready recebido');
      setTimeout(() => {
        if (!this._initialized) {
          console.log('ShowTime: Inicializando após playback ready...');
          this._createOverlay();
          this._initialized = true;
        }
      }, 500);
    });
    
    this.listenTo(this.core, 'stop', this._hideOverlay);
    
    console.log('ShowTime: Eventos configurados');
  }

  _createOverlay() {
    console.log('ShowTime: Tentando criar overlay...');
    
    if (this._overlay) {
      console.log('ShowTime: Overlay já existe');
      return; // Já existe
    }

    // Busca o container principal do player (fora da área de controles)
    let playerContainer = document.querySelector('#player-container');
    console.log('ShowTime: Container encontrado via #player-container:', playerContainer);
    
    if (!playerContainer) {
      // Fallback para o core se não encontrar o container
      playerContainer = this.core.el;
      console.log('ShowTime: Usando core.el como fallback:', playerContainer);
    }
    
    if (!playerContainer) {
      console.warn('ShowTime: Nenhum container encontrado, tentando novamente...');
      setTimeout(() => this._createOverlay(), 500);
      return;
    }

    // Cria o overlay de timestamp
    this._overlay = document.createElement('div');
    this._overlay.id = 'showtime-overlay';
    this._overlay.style.cssText = `
      position: absolute;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      text-align: center;
      line-height: 1.4;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;

    this._overlay.innerHTML = `
      <div id="showtime-date" style="margin-bottom: 4px;">--/--/----</div>
      <div id="showtime-time" style="font-size: 16px;">--:--:--</div>
    `;

    // Garante que o container tenha posicionamento relativo
    const currentPosition = window.getComputedStyle(playerContainer).position;
    if (currentPosition === 'static') {
      playerContainer.style.position = 'relative';
    }
    
    // Adiciona o overlay ao container
    playerContainer.appendChild(this._overlay);
    
    console.log('ShowTime: Overlay anexado ao container:', playerContainer);

    // Captura os elementos
    this._currentDateEl = this._overlay.querySelector('#showtime-date');
    this._currentTimeEl = this._overlay.querySelector('#showtime-time');

    if (!this._currentDateEl || !this._currentTimeEl) {
      console.error('ShowTime: Elementos internos não encontrados!');
      return;
    }

    // Verifica se MediaControl ainda está funcionando
    if (!this.core.mediaControl || !this.core.mediaControl.el) {
      console.warn('ShowTime: MediaControl não encontrado após criar overlay');
    }

    // Inicia a atualização
    this._startUpdating();
    
    console.log('✅ ShowTime overlay criado e ativado automaticamente!');
    
    // Força uma atualização imediata para teste
    this._updateDisplay();
  }

  _startUpdating() {
    if (this._updateInterval) return; // Já está rodando

    // Atualiza imediatamente
    this._updateDisplay();

    // Atualiza a cada segundo
    this._updateInterval = setInterval(() => {
      this._updateDisplay();
    }, 1000);

    console.log('⏰ ShowTime: Relógio iniciado - atualizando a cada segundo');
  }

  _stopUpdating() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
      console.log('ShowTime parado');
    }
  }

  _updateDisplay() {
    if (!this._currentDateEl || !this._currentTimeEl) return;

    // 📅 Atualiza a data e horário atual
    const now = new Date();
    const dateString = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeString = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    this._currentDateEl.textContent = dateString;
    this._currentTimeEl.textContent = timeString;
  }

  _hideOverlay() {
    this._stopUpdating();
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
      this._currentDateEl = null;
      this._currentTimeEl = null;
      console.log('ShowTime overlay removido');
    }
  }

  // Métodos públicos para controle manual
  show() {
    if (!this._overlay) {
      this._createOverlay();
    } else {
      this._overlay.style.display = 'block';
      this._startUpdating();
    }
  }

  hide() {
    if (this._overlay) {
      this._overlay.style.display = 'none';
      this._stopUpdating();
    }
  }

  toggle() {
    if (this._overlay && this._overlay.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  // Função de debug manual
  forceCreate() {
    console.log('ShowTime: Criação forçada manualmente');
    this._initialized = false;
    this._createOverlay();
  }

  destroy() {
    this._hideOverlay();
    super.destroy();
  }
}

// Expõe globalmente para debug
window.ShowTimeDebug = ShowTime;