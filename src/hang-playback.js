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
    return this._isReadyState;
  }

  get ended() {
    return this._currentStatus === "ENDED";
  }

  isPlaying() {
    return this._currentStatus === "PLAYING";
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
    this._volume = typeof options.volume === 'number' ? options.volume : 50;

    // new internal state flags
    this._isReadyState = false;
    this._isBuffering = false;

    this.settings = {
      // default: ["seekbar", "position", "duration"],
      left: ["playpause", "stop"],
      right: ["fullscreen", "volume"],
      seekEnabled: false,
    };

    // removed immediate READY trigger here; will call when watch is ready in render()
    // if (this._autoPlay) this.play();
  }

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
    this.el.innerHTML = `<canvas style="max-width: 100%; height: auto; border-radius: 4px; margin: 0 auto;"></canvas>`;
    const canvas = this.el.querySelector('canvas');
    this._watch = new Watch({ video: { canvas }, broadcast: { path: "" } });
    this.load(this._options.source);

    // ensure playback starts paused until user/play intent
    this.pause();

    // mark ready after watch has been constructed and initial load invoked
    // this._ready();

    this._setupFrameMonitor();

    this._broadcastListener = this._watch.broadcast.status.subscribe((status) => {
      this._onBroadcastStatusChange(status);
    })
    // this._watch?.video?.source?.frame.subscribe((frame) => {
    //   console.debug("Video frame update:", frame);
    // })
    if (this._watch?.video?.source?.frame && typeof this._watch.video.source.frame.subscribe === "function") {
      this._watch.video.source.frame.subscribe((frame) => {
        console.debug("Video frame update:", frame);
      });
    } else {
      console.warn("Frame observable not available on watch.video.source");
    }

    if (this._autoPlay) this.play();

    return this;
  }

  _onBroadcastStatusChange(status) {
    console.debug("Broadcast status change:", status, this._currentStatus);
    if (status === "live") {
        if (!this._isReadyState) {
          this._ready();
        } else if (this._currentStatus === "BUFFERING") {
          this._currentStatus = "PLAYING";
        } 
      } else if (status === "loading") {
        if (this._currentStatus === "PLAYING") {
          this._currentStatus = "BUFFERING";
          this.trigger(Events.PLAYBACK_BUFFERING, this.name);
        }
      }
  }

  load(src) {
    this._currentStatus = "LOADING";
    this._options.source = src;
    try {
      this._watch.connection.url.set(new URL(src));
    } catch (e) {
      // ignore URL construction errors
      this._watch.connection.url.set(src);
    }

    // // try to pick up duration if watch exposes it synchronously
    // const maybeDuration = this._watch?.broadcast?.duration ?? this._watch?.broadcast?.info?.duration;
    // if (typeof maybeDuration === 'number' && maybeDuration > 0) {
    //   this._duration = maybeDuration;
    //   this.trigger(Events.PLAYBACK_LOADEDMETADATA, { duration: this._duration });
    // }

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
      this._handleBufferingEvents(); // reevaluate buffering when playing
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
    // value expected 0..100
    const newVolume = typeof value === 'number' ? value / 100 : this._volume / 100;
    this._volume = typeof value === 'number' ? value : this._volume;
    if (newVolume === 0.0) {
      this.mute();
    } else {
      this.unmute();
    }
    if (this._watch?.audio?.volume?.set) {
      this._watch.audio.volume.set(newVolume);
    }
  }

  isMuted() {
    return !!this._muted || this._volume === 0;
  }

  getCurrentTime() {
    // Try to derive current time from frame timestamp if present
    const frame = this._watch?.video?.source?.frame;
    if (frame && typeof frame.timestamp === 'number') {
      return frame.timestamp;
    }
    // fallback to an internal clock estimate if available
    return this._lastKnownTime || 0;
  }
  
  destroy() {
    super.destroy();
    this.stop();
    if (this._watch) this._watch.close();
    if (this._frameMonitor) clearInterval(this._frameMonitor);
  }

  _ready() {
    if (this._isReadyState) return;
    this._isReadyState = true;
    this._updateSettings();
    // this.trigger(Events.PLAYBACK_READY, this.name);
    setTimeout(() => {
      try {
        this.trigger(Events.PLAYBACK_READY, this.name);
      } catch (e) {
        console.error("Error triggering PLAYBACK_READY", e);
      }
    }, 0);
  }

  _updateSettings() {
    this.settings.left = ['playstop'];
    this.settings.seekEnabled = false;
    this.trigger(Events.PLAYBACK_SETTINGSUPDATE);
  }

  isSeekEnabled() {
    return false;
  }

  _handleBufferingEvents() {
    // simple buffering heuristic based on frame updates and playing state
    const wasBuffering = this._isBuffering;
    if (this._currentStatus === "PLAYING" && this._framesWithoutUpdate >= 3) {
      this._isBuffering = true;
    } else {
      this._isBuffering = false;
    }

    if (wasBuffering !== this._isBuffering) {
      if (this._isBuffering) {
        this.trigger(Events.PLAYBACK_BUFFERING, this.name);
      } else {
        this.trigger(Events.PLAYBACK_BUFFERFULL, this.name);
      }
    }
  }

  _setupFrameMonitor() {
    if (this._frameMonitor) clearInterval(this._frameMonitor);
    let lastFrameId = null;
    this._framesWithoutUpdate = 0;
    this._lastKnownTime = 0;

    this._frameMonitor = setInterval(() => {
      const frame = this._watch?.video?.source?.frame;
      const frameId = frame && (frame.timestamp ?? frame.id ?? JSON.stringify(frame));
      // time update
      if (frame && typeof frame.timestamp === 'number') {
        this._lastKnownTime = frame.timestamp;
      } else if (frame && typeof frame.id === 'number') {
        // best-effort fallback: increment lastKnownTime by 1s per new frame id (not precise)
        if (lastFrameId !== null && frameId !== lastFrameId) {
          this._lastKnownTime = (this._lastKnownTime || 0) + 1;
        }
      }

      // detect frame stagnation
      if (lastFrameId !== null && frameId === lastFrameId && this._currentStatus === "PLAYING") {
        this._framesWithoutUpdate++;
        if (this._framesWithoutUpdate === 3) {
          console.warn("Video frame not updating: possible freeze");
        }
      } else {
        // frame updated
        this._framesWithoutUpdate = 0;
      }

      lastFrameId = frameId;


      // emit progress if duration and buffered info exist on watch (best-effort)
      // const bufferedStart = this._watch?.video?.source?.bufferStart;
      // const bufferedEnd = this._watch?.video?.source?.bufferEnd;
      // if (typeof bufferedStart === 'number' && typeof bufferedEnd === 'number') {
      //   const progress = { start: bufferedStart, current: bufferedEnd, total: duration };
      //   this.trigger(Events.PLAYBACK_PROGRESS, progress, [{ start: bufferedStart, end: bufferedEnd }]);
      // }

      // update buffering state if needed
      this._handleBufferingEvents();
    }, 1000);
  }
}