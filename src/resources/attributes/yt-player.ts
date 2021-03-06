import {inject, customAttribute} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {LogManager} from 'aurelia-framework';

@inject(Element, EventAggregator, LogManager)
@customAttribute('yt-player')
export class YtPlayerCustomAttribute {

  quality = 'hd720';
  height = '1080px';
  width = '100%';
  params = {
    enablejsapi: 1,
    // origin: 'http://localhost:8081'   // specify in production
    autoplay: 0,
    showinfo: 0
  };
  duration = 0;

  constructor(private element: Element, 
              private eventAggregator: EventAggregator, 
              private logManager: LogManager) {
    this.element = element;
    this.eventAggregator = eventAggregator;
    this.logger = LogManager.getLogger('yt-player');
    this.getScript();
    this.logger.debug('Plugin loaded');
  }     

  getScript() {
    if (typeof(YT) === 'undefined' || typeof(YT.Player) === 'undefined') {
      window.onYouTubeIframeAPIReady = this.loadPlayer.bind(this);
      let payload = {publisher: this, data: 'https://www.youtube.com/iframe_api'};
      this.eventAggregator.publish('ytplayer:init:getScript', payload);
    } else {
      this.loadPlayer();
    }
  }

  valueChanged(videoId) {
    if (this.validVideoId(videoId)) {
      this.videoId = videoId;
      if (this.player) {
        this.loadVideo();
      }
    } else {
      this.logger.error('Invalid video ID: ' + videoId);
    }
  }

  loadPlayer() {
    this.player = new YT.Player(this.element, {
      height: this.height,
      width: this.width,
      playerVars: this.params,
      events: {
        'onReady': this.onPlayerReady.bind(this),
        'onStateChange': this.onPlayerStateChange.bind(this),
        'onError': this.onError.bind(this),
        'onPlaybackQualityChange': this.onPlaybackQualityChange.bind(this),
        'onPlaybackRateChange': this.onPlaybackRateChange.bind(this)
      }});
      
    this.logger.info('Player created');
  }

  onPlayerReady(event) {
    this.logger.info('Player ready');
    this.playerAPI = new PlayerAPI(this.player, this.element, this.logger);
    this.eventAggregator.publish('ytplayer:load:player', this.playerAPI);
    if (this.videoId) {
      this.loadVideo();
    }
  }

  onPlayerStateChange(event) {
    switch (event.data) {
    case YT.PlayerState.CUED:
      this.eventAggregator.publish('ytplayer:state:cued', this.playerAPI);
      break;
    case YT.PlayerState.ENDED:
      this.eventAggregator.publish('ytplayer:state:ended', this.playerAPI);
      break;
    case YT.PlayerState.PLAYING:
      this.eventAggregator.publish('ytplayer:state:playing', this.playerAPI);
      break;
    case YT.PlayerState.PAUSED:
      this.eventAggregator.publish('ytplayer:state:paused', this.playerAPI);
      break;
    case YT.PlayerState.BUFFERING:
      this.eventAggregator.publish('ytplayer:state:buffering', this.playerAPI);
      break;
    default:
      this.eventAggregator.publish('ytplayer:state:unstarted', this.playerAPI);
      break;
    }
  }

  onPlaybackQualityChange(event) {
    this.eventAggregator.publish('ytplayer:quality:change', this.playerAPI);
  }
  
  onPlaybackRateChange(event) {
    this.eventAggregator.publish('ytplayer:rate:change', this.playerAPI);
  }

  onError(event) {
    switch (event.data) {
    case 2:
      this.eventAggregator.publish('ytplayer:error:invalid-param', this.playerAPI);
      break;
    case 5:
      this.eventAggregator.publish('ytplayer:error:html5', this.playerAPI);
      break;
    case 100:
      this.eventAggregator.publish('ytplayer:error:not-found', this.playerAPI);
      break;
    case 101:
    case 150:
      this.eventAggregator.publish('ytplayer:error:access-denied', this.playerAPI);
      break;
    default:
      this.eventAggregator.publish('ytplayer:error:unknown', this.playerAPI);
      break;
    }
    this.logger.error('YT error: ' + event.data);
  }

  loadVideo() {
    this.player.cueVideoById(this.videoId, this.quality);
    this.eventAggregator.publish('ytplayer:load:video', this.playerAPI);
    this.logger.info('Loaded video: ' + this.videoId);
  }

  validVideoId(videoId:String) {
    return videoId.length === 11;
  }
}

class PlayerAPI {
  constructor(player, element, logger) {
    this.player = player;
    this.element = element;
    this.logger = logger;
  }

  play() {
    if (this.player.playVideo) {
      this.player.playVideo();
    } else {
      this.logger.warn('Unable to play video');
    }
  }

  pause() {
    if (this.player.pauseVideo) {
      this.player.pauseVideo();
    } else {
      this.logger.warn('Unable to pause video');
    }
  }

  getVideoId() {
    let playlist = this.player.getPlaylist();
    let videoId = '';
    if (playlist.lenght > 0) {
      videoId = playlist[this.player.getPlaylistIndex()];
    }
    return videoId;
  }

  getDuration() {
    return this.player.getDuration();
  }

  getContainer() {
    return this.element;
  }
}
