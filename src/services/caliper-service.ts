import * as Caliper from 'ims-caliper';
import environment from "../environment";
import { Lo } from "./lo";
import { Course } from "./course";

export class CaliperService {
  private sensor : Caliper.Sensor;
  private session : Caliper.Session;
  private client : Caliper.HttpClient;
  private person : Caliper.Person;
  private application : Caliper.SoftwareApplication;

  constructor() {
    this.sensor = this.initializeSensor();
    this.client = this.initializeClient();
    this.application = this.initializeApplication();
    this.session = this.startSession();

    this.sensor.registerClient(this.client);
  }
  
  private initializeClient() {
    let client = Caliper.HttpClient;

    let options = {
      uri: environment.caliper.endpoint,
      json: true
    };

    client.initialize(this.sensor.getId().concat("/clients/1"), Object.assign(Caliper.HttpOptions, options));

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

  private createPerson(userId: string) {
    let person = Caliper.EntityFactory().create(Caliper.Person, {
      id: environment.caliper.appIRI.concat(`/users/${userId}`),
      name: userId
    });

    return person;
  }

  private initializePerson(userId: string) {
    this.person = this.createPerson(userId);
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

  /**
  * Record Log in to application event
  */  
  logStartSessionEvent(userId: string, courseUrl: string) {
    // attribute logged in user to current session object
    this.initializePerson(userId);

    let sessionEventId = Caliper.Validator.generateUUID();

    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: this.person,
      action: Caliper.Actions.loggedIn.term,
      object: this.application,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: environment.caliper.appIRI,
      session: this.session
    });

    this.sendEvent(event);
  }

  /**
  * Record Log out from application event
  */  
  logEndSessionEvent(userId: string, courseUrl: string) {
    let sessionEventId = Caliper.Validator.generateUUID();

    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: this.person,
      action: Caliper.Actions.loggedOut.term,
      object: courseUrl,
      eventTime: new Date().toISOString(),
      target: courseUrl,
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
    let actor = (typeof this.person !== 'undefined') ? this.person : this.createPerson("nouser");

    let event = eventFactory().create(Caliper.NavigationEvent, {
      id: navigationEventId,
      actor: actor,
      action: Caliper.Actions.navigatedTo.term,
      object: obj,
      eventTime: new Date().toISOString(),
      edApp: this.application,
      session: this.session 
    });

    this.sendEvent(event);
  }
}