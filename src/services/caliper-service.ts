import * as Caliper from 'ims-caliper';
import environment from "../environment";
import { Lo } from "./lo";
import { Course } from "./course";
import { inject } from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(EventAggregator)
export class CaliperService {
  private sensor : Caliper.Sensor;
  private session : Caliper.Session;
  private client : Caliper.HttpClient;
  private person : Caliper.Person;
  private application : Caliper.SoftwareApplication;

  constructor(eventAggregator: EventAggregator) {
    this.sensor = this.initializeSensor();
    this.client = this.initializeClient();
    this.application = this.initializeApplication();
    this.session = this.startSession();

    this.sensor.registerClient(this.client);
    
    this.eventAggregator = eventAggregator;

    this.eventAggregator.subscribe('ytplayer:state:ended', event => this.logVideoEndedEvent(event));
    
    this.eventAggregator.subscribe('ytplayer:state:playing', event => this.logVideoStartedEvent(event));
    
    this.eventAggregator.subscribe('ytplayer:state:paused', event => this.logVideoPausedEvent(event));
    
    this.eventAggregator.subscribe('ytplayer:quality:change', event => this.logVideoChangeResolutionEvent(event));
    
    this.eventAggregator.subscribe('ytplayer:rate:change', event => this.logVideoChangeSpeedEvent(event));
  }
  
  private initializeClient() {
    let client = Caliper.HttpClient;

    let options = {
      uri: environment.caliper.endpoint,
      json: true
    };

    client.initialize(this.sensor.getId().concat("/clients/1"),
                     Object.assign(Caliper.HttpOptions, options));

    return client;
  }

  private initializeSensor() {
    let sensor = Caliper.Sensor;

    sensor.initialize(environment.caliper.appIRI.concat("/sensors/1"));

    return sensor;
  }

  /**
  * Initialise Caliper Session object
  */
  private startSession() {
    let sessionStart = new Date().toISOString();
    let sessionId = Caliper.Validator.generateUUID();
    
    let session = Caliper.EntityFactory().create(Caliper.Session, {
      id: environment.caliper.appIRI.concat(`/${sessionId}`),
      name: `session-${sessionId}`,
      dateCreated: sessionStart,
      startedAtTime: sessionStart
    });
    
    return session;
  }

  private createPerson(userId: string, email: string) {
    let person = Caliper.EntityFactory().create(Caliper.Person, {
      id: environment.caliper.appIRI.concat(`/users/${userId}`),
      name: email
    });

    return person;
  }

  private initializePerson(userId: string, email: string) {
    this.person = this.createPerson(userId, email);
    this.session.user = this.person;
  }

  private initializeApplication() {
    let application = Caliper.EntityFactory().create(Caliper.SoftwareApplication, {
      id: environment.caliper.appIRI,
      type: Caliper.EntityType.softwareApplication.term,
      name: "Tutors"
    });

    return application;
  }

  private sendEvent(event: caliper.Event) {
    var data = [];
    data.push(event);
    
    let opts = {
      sensor: this.sensor.getId(),
      sendTime: new Date().toISOString(),
      dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p1",
      data: data
    };
    
    let envelope = this.sensor.createEnvelope(opts);
    this.sensor.sendToClient(this.client, envelope);
  } 

  private getEntityForLo(lo: Lo, course: Course) {

    let obj = null;

    switch (lo.type) {
      case 'lab': 
        obj = Caliper.EntityFactory().create(Caliper.Page, {
          id: environment.caliper.appIRI.concat(`/lab/${lo.route}/${lo.title}`),
          type: Caliper.EntityType.page.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;

      case 'course':
        obj = Caliper.EntityFactory().create(Caliper.WebPage, {
          id: environment.caliper.appIRI.concat(`/course/${course.url}`),
          type: Caliper.EntityType.webPage.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;

      case 'topic':
        obj = Caliper.EntityFactory().create(Caliper.Chapter, {
          id: environment.caliper.appIRI.concat(`/topic/${lo.route}`),
          type: Caliper.EntityType.chapter.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;

      case 'video':
        obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
          id: environment.caliper.appIRI.concat(`/video/${lo.route}`),
          type: Caliper.EntityType.videoObject.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;

      case 'talk':
        obj = Caliper.EntityFactory().create(Caliper.MediaObject, {
          id: environment.caliper.appIRI.concat(`/talk/${lo.route}`),
          type: Caliper.EntityType.mediaObject.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;

      default:
        obj = Caliper.EntityFactory().create(Caliper.DigitalResource, {
          id: environment.caliper.appIRI.concat(`/any/${lo.route}`),
          type: Caliper.EntityType.digitalResource.term,
          name: lo.title,
          mediaType: "text/html",
          description: lo.summary,
          version: lo.version
        })
        break;
    }   

    return obj;
  }

  private getActor() {
    return (typeof this.person !== 'undefined') ? this.person : this.createPerson("nouser");
  }

  /**
  * Record Log in to application event
  */  
  logStartSessionEvent(userId: string, email: string, courseUrl: string) {
    // attribute logged in user to current session object
    this.initializePerson(userId, email);
    let sessionEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();
    
    let target = Caliper.EntityFactory().create(Caliper.DigitalResource, {
      id: environment.caliper.appIRI.concat(`/page/${courseUrl}`),
      name: courseUrl
    });
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: actor,
      action: Caliper.Actions.loggedIn.term,
      object: this.application,
      eventTime: new Date().toISOString(),
      target: target,
      edApp: environment.caliper.appIRI,
      session: this.session
    });
    
    console.log(event);
    
    this.sendEvent(event);
  }

  /**
  * Record Log out from application event
  */  
  logEndSessionEvent(userId: string, courseUrl: string) {
    let sessionEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();
    
    let target = Caliper.EntityFactory().create(Caliper.DigitalResource, {
      id: environment.caliper.appIRI.concat(`/page/${courseUrl}`),
      name: courseUrl
    });
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: actor,
      action: Caliper.Actions.loggedOut.term,
      object: this.application,
      eventTime: new Date().toISOString(),
      target: target,
      edApp: this.application,
      session: this.session
    });

    this.sendEvent(event);
    this.session = null;
  }

  /**
  * Record lo navigation event
  */  
  logNavigatedToEvent(course: Course, lo: Lo) {
    let obj = this.getEntityForLo(lo, course);
    let navigationEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();

    let event = eventFactory().create(Caliper.NavigationEvent, {
      id: navigationEventId,
      actor: actor,
      action: Caliper.Actions.navigatedTo.term,
      object: obj,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session 
    });
    
    console.log(event);
    
    this.sendEvent(event);
  }
  
  /**
  * Record video started event
  */
  logVideoStartedEvent(playerAPI) {
    let mediaEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();
    
    let obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
      id: environment.caliper.appIRI.concat(`/video/${playerAPI.player.playerInfo.videoData.video_id}`),
      name: playerAPI.player.playerInfo.videoData.title,
      description: playerAPI.player.playerInfo.videoUrl,
      duration: new Date(playerAPI.player.playerInfo.duration * 1000).toISOString().substr(11, 8)
    });

    let currentTime = new Date(playerAPI.player.playerInfo.currentTime * 1000).toISOString().substr(11, 11);
    
    let target = Caliper.EntityFactory().create(Caliper.MediaLocation, {
      id: environment.caliper.appIRI.concat(`/medialocation/${encodeURIComponent(currentTime)}`),
      currentTime: currentTime,
      dateCreated: new Date().toISOString()
    });

    let event = eventFactory().create(Caliper.MediaEvent, {
      id: mediaEventId,
      actor: actor,
      action: Caliper.Actions.started.term,
      object: obj,
      target: target,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session
    });
    
    this.sendEvent(event);
  }
  
  /**
  * Record video paused event
  */
  logVideoPausedEvent(playerAPI) {
    let mediaEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();

    let obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
      id: environment.caliper.appIRI.concat(`/video/${playerAPI.player.playerInfo.videoData.video_id}`),
      name: playerAPI.player.playerInfo.videoData.title,
      description: playerAPI.player.playerInfo.videoUrl,
      duration: new Date(playerAPI.player.playerInfo.duration * 1000).toISOString().substr(11, 8)
    });

    let currentTime = new Date(playerAPI.player.playerInfo.currentTime * 1000).toISOString().substr(11, 11);

    let target = Caliper.EntityFactory().create(Caliper.MediaLocation, {
      id: environment.caliper.appIRI.concat(`/medialocation/${encodeURIComponent(currentTime)}`),
      currentTime: currentTime,
      dateCreated: new Date().toISOString()
    });

    let event = eventFactory().create(Caliper.MediaEvent, {
      id: mediaEventId,
      actor: actor,
      action: Caliper.Actions.paused.term,
      object: obj,
      target: target,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session
    });

    this.sendEvent(event);
  }
  
  /**
  * Record video ended event
  */
  logVideoEndedEvent(playerAPI) {
    let mediaEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();

    let obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
      id: environment.caliper.appIRI.concat(`/video/${playerAPI.player.playerInfo.videoData.video_id}`),
      name: playerAPI.player.playerInfo.videoData.title,
      description: playerAPI.player.playerInfo.videoUrl,
      duration: new Date(playerAPI.player.playerInfo.duration * 1000).toISOString().substr(11, 8)
    });

    let currentTime = new Date(playerAPI.player.playerInfo.currentTime * 1000).toISOString().substr(11, 11);

    let target = Caliper.EntityFactory().create(Caliper.MediaLocation, {
      id: environment.caliper.appIRI.concat(`/medialocation/${encodeURIComponent(currentTime)}`),
      currentTime: currentTime,
      dateCreated: new Date().toISOString()
    });

    let event = eventFactory().create(Caliper.MediaEvent, {
      id: mediaEventId,
      actor: actor,
      action: Caliper.Actions.ended.term,
      object: obj,
      target: target,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session
    });

    this.sendEvent(event);
  }
  
  /**
  * Record video resolution changed event
  */
  logVideoChangeResolutionEvent(playerAPI) {
    let mediaEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();
    
    let obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
      id: environment.caliper.appIRI.concat(`/video/${playerAPI.player.playerInfo.videoData.video_id}`),
      name: playerAPI.player.playerInfo.videoData.title,
      description: playerAPI.player.playerInfo.videoUrl,
      duration: new Date(playerAPI.player.playerInfo.duration * 1000).toISOString().substr(11, 8)
    });

    let currentTime = new Date(playerAPI.player.playerInfo.currentTime * 1000).toISOString().substr(11, 11);

    let target = Caliper.EntityFactory().create(Caliper.MediaLocation, {
      id: environment.caliper.appIRI.concat(`/medialocation/${encodeURIComponent(currentTime)}`),
      currentTime: currentTime,
      dateCreated: new Date().toISOString()
    });

    let event = eventFactory().create(Caliper.MediaEvent, {
      id: mediaEventId,
      actor: actor,
      action: Caliper.Actions.changedResolution.term,
      object: obj,
      target: target,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session
    });

    this.sendEvent(event);
  }

  /**
  * Record video playback speed changed event
  */
  logVideoChangeSpeedEvent(playerAPI) {
    let mediaEventId = Caliper.Validator.generateUUID();
    let actor = this.getActor();

    let obj = Caliper.EntityFactory().create(Caliper.VideoObject, {
      id: environment.caliper.appIRI.concat(`/video/${playerAPI.player.playerInfo.videoData.video_id}`),
      name: playerAPI.player.playerInfo.videoData.title,
      description: playerAPI.player.playerInfo.videoUrl,
      duration: new Date(playerAPI.player.playerInfo.duration * 1000).toISOString().substr(11, 8)
    });

    let currentTime = new Date(playerAPI.player.playerInfo.currentTime * 1000).toISOString().substr(11, 11);
    
    let target = Caliper.EntityFactory().create(Caliper.MediaLocation, {
      id: environment.caliper.appIRI.concat(`/medialocation/${encodeURIComponent(currentTime)}`),
      currentTime: currentTime,
      dateCreated: new Date().toISOString()
    });

    let event = eventFactory().create(Caliper.MediaEvent, {
      id: mediaEventId,
      actor: actor,
      action: Caliper.Actions.changedSpeed.term,
      object: obj,
      target: target,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session
    });

    this.sendEvent(event);
  }
}