/*
 * MoqPlayback
 *
 * This file defines a Clappr playback plugin that uses the Media‑over‑QUIC
 * (MoQ) protocol to receive live media with very low latency.  The plugin
 * leverages the high‑level `@kixelated/hang` library which provides a custom
 * `<hang-watch>` Web Component for subscribing to MoQ broadcasts.  When a
 * resource URL beginning with `moq+hang://` is supplied to Clappr, this
 * playback class creates a `<hang-watch>` element, configures it with the
 * remote relay server and broadcast name extracted from the URL, and inserts
 * the element into Clappr’s playback container.  This approach allows the
 * MoQ media to be rendered inside the player while still taking advantage
 * of Clappr’s control overlay, event system and plugin architecture.
 *
 * The implementation follows Clappr’s recommendations for custom playbacks:
 *  - A static `canPlay` function is provided to detect MoQ URLs.  Clappr
 *    invokes this method during player setup to select the appropriate
 *    playback.
 *  - The `play`, `stop` and `destroy` lifecycle methods manage the
 *    underlying `hang-watch` element.  When playback starts the
 *    component is dynamically imported and instantiated; when stopped or
 *    destroyed it is removed.
 *  - `getPlaybackType` returns `Clappr.Playback.LIVE` to indicate that
 *    the stream is a live broadcast.  MoQ is designed for real‑time
 *    delivery, so seeking and time shifting are not supported.
 *
 * Usage example (see index.html for a complete demo):
 *
 *   const player = new Clappr.Player({
 *     parentId: '#player',
 *     source: 'moq+hang://relay.moq.dev/anon/room123/my-feed',
 *     plugins: [MoqPlayback],
 *     moqOptions: {
 *       // optional: override the default canvas size
 *       width: 640,
 *       height: 360,
 *     }
 *   });
 *
 * The URL scheme `moq+hang://` encodes both the relay host and the broadcast
 * name.  In the above example the plugin will connect to
 * `https://relay.moq.dev/anon` and subscribe to the broadcast `room123/my-feed`.
 */

// eslint-disable-next-line no-undef
(() => {
  // Ensure Clappr is available in the global scope.  When using the
  // CDN distribution of Clappr this global will be defined as
  // window.Clappr.  If Clappr is imported via ES modules, you should
  // modify this line to import the Playback base class directly.
  const Clappr = window.Clappr || {};
  const { Playback, Events } = Clappr;

  /**
   * Extracts the relay URL and broadcast name from a `moq+hang://` resource.
   *
   * MoQ over Hang uses a compound URL where the first path segment
   * corresponds to the relay host and any subsequent segments define the
   * broadcast name.  For example:
   *   moq+hang://relay.moq.dev/anon/room/stream
   * becomes relayURL = "https://relay.moq.dev/anon" and name = "room/stream".
   * If the resource doesn’t include a path after the host, the default
   * broadcast name is an empty string.
   *
   * @param {string} resource The full MoQ resource URL
   * @returns {{ relayURL: string, name: string }} Parsed components
   */
  function parseMoqUrl(resource) {
    // Strip the scheme prefix
    const withoutScheme = resource.replace(/^moq\+hang:\/\//, '');
    const parts = withoutScheme.split('/');
    const hostParts = [];
    const nameParts = [];
    // The first two segments form the relay host/path (e.g. relay.example.com/anon)
    if (parts.length > 0) hostParts.push(parts.shift());
    if (parts.length > 0) hostParts.push(parts.shift());
    const relayURL = `https://${hostParts.join('/')}`;
    if (parts.length > 0) nameParts.push(...parts);
    const name = nameParts.join('/');
    return { relayURL, name };
  }

  class MoqPlayback extends Playback {
    /**
     * Determine whether this playback can handle a given source.  Clappr
     * calls this static method when initializing the player.  Our plugin
     * recognises sources beginning with `moq+hang://`.
     *
     * @param {string} source The media source URL
     * @returns {boolean} True if this playback should be used
     */
    static canPlay(source) {
      return typeof source === 'string' && source.startsWith('moq+hang://');
    }

    constructor(...args) {
      super(...args);
      /**
       * Store a reference to the underlying `<hang-watch>` element when it
       * exists.  Removing the element on stop/destroy ensures that
       * resources are released and event listeners are cleaned up.
       * @type {HTMLElement|null}
       */
      this.hangElement = null;
      // Clappr sets up the root DOM element for playbacks as `this.el`.  We
      // ensure it exists here and assign a CSS class for easy styling.
      this.el = document.createElement('div');
      this.el.className = 'moq-playback';
    }

    /**
     * Returns the type of playback.  MoQ streams are live by design so
     * Clappr will adjust its UI (e.g. hiding the seek bar) accordingly.
     */
    getPlaybackType() {
      return Playback.LIVE;
    }

    /**
     * Indicates whether this playback uses an HTML5 tag.  Returning true
     * allows Clappr to treat the content as video-like.  Since our
     * implementation ultimately renders into a canvas, we mark it as
     * HTML5.
     */
    get isHTML5Video() {
      return true;
    }

    /**
     * Initialise and start the MoQ stream.  This method dynamically
     * imports the `hang-watch` element so that the component is only
     * registered when needed.  Once loaded, a new `<hang-watch>` element
     * is created and configured with the relay URL and broadcast name.
     *
     * Clappr’s event system is used to notify the player of state
     * transitions such as ready, play and ended.  Because Hang streams
     * connect asynchronously over WebTransport, we rely on the
     * `customElements.whenDefined` promise to know when the element is
     * ready for use.  After insertion, the stream will begin playing
     * automatically.
     */
    async play() {
      // If playback has already started, ignore subsequent calls.
      if (this.hangElement) return;
      const source = this.options.src || this.options.source || this.options.baseUrl;
      if (!source) {
        throw new Error('MoqPlayback: no source provided');
      }
      // Parse the MoQ URL into relay and broadcast
      const { relayURL, name } = parseMoqUrl(source);
      try {
          // Dynamically import the web component.  When used in a plain
          // browser environment this will fetch the module from the network.
          // If bundling with a module bundler (e.g. Rollup/Webpack) it will
          // include the component in your build.
          await import('https://cdn.jsdelivr.net/npm/@kixelated/hang@0.3.10/dist/watch/element.min.js');
      } catch (err) {
          console.error('Failed to load hang-watch component:', err);
          this.trigger(Events.PLAYBACK_ERROR, { message: 'Failed to load MoQ module', error: err });
          return;
      }
      // Wait until the custom element has been defined.  Without this the
      // browser may treat the tag as unknown and not attach its lifecycle.
      await customElements.whenDefined('hang-watch');
      // Create the hang-watch element and configure it
      const hang = document.createElement('hang-watch');
      hang.setAttribute('url', relayURL);
      hang.setAttribute('name', name);
      // Mirror Clappr’s muted/volume settings if available
      if (this.options.muted) hang.setAttribute('muted', '');
      if (this.options.controls) hang.setAttribute('controls', '');
      // Optionally allow custom width/height via moqOptions
      const moqOpts = this.options.moqOptions || {};
      const canvas = document.createElement('canvas');
      if (moqOpts.width) canvas.style.width = `${moqOpts.width}px`;
      if (moqOpts.height) canvas.style.height = `${moqOpts.height}px`;
      hang.appendChild(canvas);
      // Save reference and append to DOM
      this.hangElement = hang;
      this.el.appendChild(hang);
      // Notify Clappr that playback has started
      this.trigger(Events.PLAYBACK_READY);
      this.trigger(Events.PLAYBACK_PLAY);
      // Listen for end of stream events.  Hang does not provide explicit
      // ended callbacks yet, so this is left as a placeholder for future
      // enhancements.
    }

    /**
     * Stop the MoQ stream and clean up the element.  Removing the
     * `<hang-watch>` element disconnects the WebTransport session and
     * releases any associated resources.
     */
    stop() {
      if (this.hangElement) {
        this.hangElement.remove();
        this.hangElement = null;
        this.trigger(Events.PLAYBACK_STOP);
      }
    }

    /**
     * Destroy the playback instance.  Clappr calls this when the
     * container is being torn down.  We ensure that the stream is
     * stopped and call the parent destructor.
     */
    destroy() {
      this.stop();
      super.destroy();
    }
  }

  // Expose the class as a global so it can be referenced when
  // instantiating the player.  When using a module bundler you can
  // instead export it: `export default MoqPlayback;`.
  window.MoqPlayback = MoqPlayback;
})();