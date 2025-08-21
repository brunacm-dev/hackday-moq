const { Playback, Events } = Clappr;

import HangWatch from "@kixelated/hang/watch/element";

export { HangWatch};

export default class HangPlayback extends Playback {

  get name() {
    return 'hang_playback';
  }

  _ensureCustomElementRegistered() {
    try {
      if (!customElements.get('hang-watch')) {
        customElements.define('hang-watch', HangWatch);
      }
    } catch (error) {
      console.error('Erro ao registrar custom element (hang-watch):', error);
    }
  }

  constructor(options) {
    super(options);
    console.log("HangPlayback constructor called with options:", options);
    this.configure(options);

    setTimeout(() => {
      this.trigger(Events.PLAYBACK_READY);

      this.settings = {
        default: ["seekbar"],
        left: ["playpause", "stop", "position", "duration"],
        right: ["fullscreen", "volume"],
        seekEnabled: true,
        
      };

      this.trigger(Events.PLAYBACK_SETTINGSUPDATE);
      if (this.state.autoPlay) this.play();
    }, 0);

    this._ensureCustomElementRegistered();
  }

  configure(options) {
    this.state = {
      volume: options.mute ? 0 : 1,
      currentTime: options.resumeAt || 0,
      autoPlay: options.autoPlay,
      mute: !!options.mute,
      duration: options.playback?.duration || 100,
    };
  }


  load(src) {
    console.log("HangPlayback load called with src:", src);
    this.state.currentStatus = "LOADING";
    this.options.source = src;
    this._hang.setAttribute('url', src);
    this.trigger(Events.PLAYBACK_LOADED, this.name);
  }


  static canPlay (resource, mimeType = '') { 
    console.log("canPlay:", resource.endsWith('.hang'))
    return resource.endsWith('.hang');
  }
  

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
   
    this.el.innerHTML = `
      <hang-watch url="" muted latency="100">
        <canvas style="max-width: 100%; height: auto; border-radius: 4px; margin: 0 auto;"></canvas>
      </hang-watch>
    `;

    this._hang = this.el.querySelector('hang-watch');

    return this;
  }

  get isReady() {
    return this.state.currentStatus !== 'LOADING';
  }

  get ended() {
    return this.state.currentStatus === "ENDED";
  }

  isPlaying() { 
  return this.state?.currentStatus === "PLAYING";
  }
 
  getDuration() {
    // return this.state.duration;
  }

  getPlaybackType() {
    // return Playback.VOD;
  }

  play() {
    if (!this.isPlaying()) {
      console.log("HangPlayback play called");
      this.state.currentStatus = "PLAYING";
      this._hang.setAttribute('url', this.options.source);
      this.trigger(Events.PLAYBACK_PLAY);
    }
  }

  pause() {
    console.log("HangPlayback pause called");
    this.state.currentStatus = "PAUSED";
    this._hang.setAttribute('url', '');
    this.trigger(Events.PLAYBACK_PAUSE);
  }

  stop() {
    console.log("HangPlayback stop called");
    this.state.currentStatus = "STOPPED";
    this._hang.setAttribute('url', '');
    this.trigger(Events.PLAYBACK_STOP);
  }

  updateTime(time) {
    // updatePlaybackTime(this, time);
  }
  seek(time) {
    // handleSeek(this, time);
  }

  seekPercentage(percentage) {
    //  handleSeekPercentage(this, percentage);
  }

  volume(value) {
    this._hang.setAttribute('volume', value / 100);
  }


  destroy() {
    super.destroy();
    this.stop();
  }
}