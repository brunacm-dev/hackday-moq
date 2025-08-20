// import {Playback /*, Log, Events, PlayerError*/} from 'clappr'

// import { Playback, Events } from '@clappr/core';
const { Playback, Events } = Clappr;

// import HangSupport from "@kixelated/hang/support/element";
// import HangWatch from "@kixelated/hang/watch/element";

// export { HangWatch, HangSupport };

export default class HangPlayback extends Playback {

  get name() {
    return 'hang_playback';
  }

  constructor(options) {
    console.log("HangPlayback constructor called with options:", options);
  }

  static canPlay (resource, mimeType = '') { 
    console.log("canPlay:", resource.endsWith('.hang'))
    return resource.endsWith('.hang');
  }

  render() {
    // Criamos a tag específica em vez de <video>
    console.log("this._el", this._el);
    this._el = document.createElement('hang-watch');
    
    // É uma boa prática passar a fonte (src) para a tag via atributo
    this._el.setAttribute('src', this.options.src);

    // Defina estilos ou atributos iniciais que sua tag precise
    this._el.style.width = '100%';
    this._el.style.height = '100%';

    // Anexamos nossa tag customizada ao elemento container do playback
    this.$el.append(this._el);

    const watch = document.querySelector("hang-watch");
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
  
  get isPlaying() {
    // TODO: Retorne `true` se a mídia estiver tocando, senão `false`.
    return false;
  }

  destroy() {
    super.destroy();
  }
}