import { Watch } from "@kixelated/hang/watch"
import { Playback, Events } from "@clappr/player";

export default class HangPlayback extends Playback {
  get name() { return 'hang_playback'; }

  static canPlay(resource, mimeType = '') {
    return resource.endsWith('.hang') || mimeType === 'application/quic.hang';
  }

  get isReady() {
    return this._currentStatus !== 'LOADING';
  }

  get ended() {
    return this._currentStatus === "ENDED";
  }

  isPlaying() {
    return this._currentStatus === "PLAYING";
  }

  // 🕒 Duração total (caso disponível)
  getDuration() {
    return this._duration || 0;
  }

  // 🔢 Converte "HH:MM:SS:FF" para segundos
_timecodeToSeconds(timecode) {
  if (!timecode || typeof timecode !== "string") return 0;
  const parts = timecode.split(":").map(Number);
  if (parts.length < 3) return 0;

  const [hours, minutes, seconds, frames] = parts;
  return (hours * 3600) + (minutes * 60) + seconds + ((frames || 0) / 30); // assume 30 fps
}


  // 🕒 Tempo atual do vídeo (extraído do frame)
  getCurrentTime() {
  const frame = this._watch?.video?.source?.frame;
  console.log("Frame timestamp:", this._watch?.video?.source?.frame?.timestamp);

  if (!frame || !frame.timestamp) return 0;

  if (typeof frame.timestamp === "number") {
    return frame.timestamp / 1000;
  }

  // caso seja string tipo "09:14:10:55"
  return this._timecodeToSeconds(frame.timestamp);
}

  getPlaybackType() {
    return Playback.LIVE;
  }

  constructor(options) {
    super(options);
    this._options = options;
    this._currentStatus = "IDLE";
    this._duration = options.playback?.duration || 100;
    this._autoPlay = !!options.autoPlay;
    this._muted = !!options.mute;
    this._fps = 30; // FPS padrão, será detectado automaticamente se possível

    this.settings = {
      default: ["seekbar"],
      left: ["playpause", "stop", "position", "duration"],
      right: ["fullscreen", "volume"],
      seekEnabled: true,
    };

    this.trigger(Events.PLAYBACK_READY);
    if (this._autoPlay) this.play();
    

  }

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
    this.el.innerHTML = `<canvas style="max-width: 100%; height: auto; border-radius: 4px; margin: 0 auto;"></canvas>`;
    const canvas = this.el.querySelector('canvas');
    this._watch = new Watch({ video: { canvas }, broadcast: { path: "" } });
    this.load(this._options.source);
    this.pause();
    this._setupFrameMonitor();
    return this;
  }

  load(src) {
    this._currentStatus = "LOADING";
    this._options.source = src;
    this._watch.connection.url.set(new URL(src));
    this.trigger(Events.PLAYBACK_LOADED, this.name);
  }

  play() {
    if (!this.isPlaying()) {
      if (this._currentStatus === "STOPPED") {
        this.load(this._options.source);
        return;
      }
      this._watch.video.paused.set(false);
      this._watch.audio.paused.set(false);
      this._currentStatus = "PLAYING";
      this.trigger(Events.PLAYBACK_PLAY);
    }
  }

  pause() {
    this._currentStatus = "PAUSED";
    this._watch.video.paused.set(true);
    this._watch.audio.paused.set(true);
    this.trigger(Events.PLAYBACK_PAUSE);
  }

  stop() {
    this._currentStatus = "STOPPED";
    this._watch.connection.url.set(undefined);
    this.trigger(Events.PLAYBACK_STOP);
  }

  mute() {
    if (this._muted) return;
    this._muted = true;
    this._watch.audio.muted.set(true);
    this.trigger(Events.PLAYBACK_MUTE);
  }

  unmute() {
    if (!this._muted) return;
    this._muted = false;
    this._watch.audio.muted.set(false);
    this.trigger(Events.PLAYBACK_UNMUTE);
  }

  volume(value) {
    const newVolume = value ? value / 100 : 0.5;
    if (newVolume === 0.0) {
      this.mute();
    } else {
      this.unmute();
    }
    this._watch.audio.volume.set(newVolume);
  }

  // 🔍 Tenta detectar FPS do vídeo
  _detectFPS() {
    // Tenta obter informações do vídeo para detectar FPS
    const videoInfo = this._watch?.video?.source;
    if (videoInfo && videoInfo.fps) {
      this._fps = videoInfo.fps;
      console.log(`FPS detectado: ${this._fps}`);
    } else {
      // Mantém FPS padrão se não conseguir detectar
      console.log(`Usando FPS padrão: ${this._fps}`);
    }
  }

  destroy() {
    super.destroy();
    this.stop();
    if (this._watch) this._watch.close();
    if (this._frameMonitor) clearInterval(this._frameMonitor);
  }

  // 🔁 Atualiza frames e envia tempo para o Clappr
 _setupFrameMonitor() {
  if (this._frameMonitor) clearInterval(this._frameMonitor);
  let lastFrameId = null;
  let fpsDetected = false;

  this._frameMonitor = setInterval(() => {
    const frame = this._watch?.video?.source?.frame;
    if (!frame) return;

    // Detecta FPS apenas uma vez
    if (!fpsDetected) {
      this._detectFPS();
      fpsDetected = true;
    }

    const frameId = frame.timestamp || frame.id || JSON.stringify(frame);

    // ✅ Converte timestamp (ms) → segundos
    const currentTime = frame.timestamp ? frame.timestamp / 1000 : 0;

    // 🚀 Emite o evento que atualiza a barra de tempo e posição do player
    this.trigger(Events.PLAYBACK_TIMEUPDATE, {
      current: currentTime,
      total: this.getDuration(),
    });


    // ⚠️ Aviso se congelar frame
    if (lastFrameId !== null && frameId === lastFrameId && this._currentStatus === "PLAYING") {
      console.warn("Video frame not updating: possible freeze");
    }

    lastFrameId = frameId;
  }, 500); // Atualiza a cada 0.5s
}
}
