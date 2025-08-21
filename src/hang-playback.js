const { Playback, Events } = Clappr;

import { Watch } from "@kixelated/hang/watch"


export default class HangPlayback extends Playback {

  get name() {
    return 'hang_playback';
  }

  constructor(options) {
    super(options);
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
    console.log("HangPlayback setting connection URL to:", src);
    this._watch.connection.url.set(new URL(src));
    this.trigger(Events.PLAYBACK_LOADED, this.name);
  }


  static canPlay (resource, mimeType = '') { 
    console.log("canPlay source:", resource.endsWith('.hang'))
    console.log("canPlay mimeType:", mimeType === 'application/quic.hang')
    return resource.endsWith('.hang') || mimeType === 'application/quic.hang';
  }
  

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
   
    this.el.innerHTML = `
      <canvas style="max-width: 100%; height: auto; border-radius: 4px; margin: 0 auto;"></canvas>
    `;
    
    // Get the canvas element from the DOM after setting innerHTML
    const canvas = this.el.querySelector('canvas');
    
    this._watch = new Watch({ video: { canvas }, broadcast: { path: "" } });
    this.load(this.options.source);
    this.pause();
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
    return Playback.LIVE;
  }

  play() {
    if (!this.isPlaying()) {
      if (this.state.currentStatus === "STOPPED") {
        this.load(this.options.source);
        return;
      }
      this._watch.video.paused.set(false);
      this._watch.audio.paused.set(false);
      this.state.currentStatus = "PLAYING";
      this.trigger(Events.PLAYBACK_PLAY);
    }
  }

  pause() {
    this.state.currentStatus = "PAUSED";
    this._watch.video.paused.set(true);
    this._watch.audio.paused.set(true);
    this.trigger(Events.PLAYBACK_PAUSE);
  }

  stop() {
    this.state.currentStatus = "STOPPED";
    this._watch.connection.url.set(undefined);
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
    const newVolume = value ? value / 100 : 0.5;
    this._watch.audio.volume.set(newVolume);
  }


  destroy() {
    super.destroy();
    this.stop();
    this._watch.close()
  }
}