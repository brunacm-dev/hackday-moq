const { Playback, Events } = Clappr;

import HangWatch from "@kixelated/hang/watch/element";

export { HangWatch};

export default class HangPlayback extends Playback {

  get name() {
    return 'hang_playback';
  }

  constructor(options) {
    super(options);
    console.log("HangPlayback constructor called with options:", options);
    this._ensureCustomElementRegistered();
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

  static canPlay (resource, mimeType = '') { 
    console.log("canPlay:", resource.endsWith('.hang'))
    return resource.endsWith('.hang');
  }
  

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
   
    this.el.innerHTML = `
      <hang-watch url="${this.options.source}" muted controls latency="100">
        <canvas style="max-width: 100%; height: auto; border-radius: 4px; margin: 0 auto;"></canvas>
      </hang-watch>
    `;

    this._hang = this.el.querySelector('hang-watch');

    return super.render();
  }

  destroy() {
    super.destroy();
  }
}