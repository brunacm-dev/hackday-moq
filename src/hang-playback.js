import { Watch } from "@kixelated/hang/watch"
import { Playback, Events } from "@clappr/player";

/**
 * TODOS:
 * - observe watch.broadcast.status for connection status so that we 
 *   can update playback status accordingly
 * - volume control stopped working after this refactor
 */

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

  getDuration() {
    return this._duration || 0;
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


  destroy() {
    super.destroy();
    this.stop();
    if (this._watch) this._watch.close();
    if (this._frameMonitor) clearInterval(this._frameMonitor);
  }

  _setupFrameMonitor() {
    if (this._frameMonitor) clearInterval(this._frameMonitor);
    let lastFrameId = null;
    this._frameMonitor = setInterval(() => {
      const frame = this._watch?.video?.source?.frame;
      const frameId = frame && (frame.timestamp || frame.id || JSON.stringify(frame));
      if (lastFrameId !== null && frameId === lastFrameId && this._currentStatus === "PLAYING") {
        console.warn("Video frame not updating: possible freeze");
      }
      lastFrameId = frameId;
    }, 1000);
  }
}