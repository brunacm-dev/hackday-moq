// import {Playback /*, Log, Events, PlayerError*/} from 'clappr'

// import { Playback, Events } from '@clappr/core';
const { Playback, Events } = Clappr;

import HangWatch from "@kixelated/hang/watch/element";

// export { HangWatch, HangSupport };

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
        console.log('Registrando custom element hang-watch...');
        customElements.define('hang-watch', HangWatch);
        console.log('Custom element hang-watch registrado com sucesso!');
      } else {
        console.log('Custom element hang-watch já estava registrado');
      }
    } catch (error) {
      console.error('Erro ao registrar custom element:', error);
    }
  }

  static canPlay (resource, mimeType = '') { 
    console.log("canPlay:", resource.endsWith('.hang'))
    return resource.endsWith('.hang');
  }
  

  render() {
    this.el.style.width = '100%';
    this.el.style.height = '100%';
    this.el.style.color = 'red';

    const watch = new HangWatch()
    
    var canvas = document.createElement('canvas');

    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '4px';
    canvas.style.margin = '0 auto';
    watch.append(canvas);

    this.el.append(watch);

    if (watch) {
        watch.setAttribute("url", `http://localhost:4443/demo/bbb.hang`);
        console.log('Elemento hang-watch configurado com sucesso!');
    } else {
        console.warn('Elemento hang-watch não encontrado');
    }

    // É importante retornar `this` no final do render.
    return this;
  }

  play() {
    // TODO: Implemente a lógica para dar play na sua tag.
    
    this.trigger(Events.PLAYBACK_PLAY);
  }

  pause() {
    // TODO: Implemente a lógica para pausar sua tag.
    
    this.trigger(Events.PLAYBACK_PAUSE);
  }

  stop() {
    // TODO: Implemente a lógica para parar a reprodução e voltar ao início.
    
    this.trigger(Events.PLAYBACK_STOP);
  }

  seek(timeInSeconds) {
    
  }

  get duration() {
    return 0;
  }

  get currentTime() {
    // TODO: Retorne o tempo atual da reprodução em segundos.
    
    return 0;
  }
  
  // get isPlaying() {
  //   // TODO: Retorne `true` se a mídia estiver tocando, senão `false`.
  //   return false;
  // }

  destroy() {
    super.destroy();
  }
}